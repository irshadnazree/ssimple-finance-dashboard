// Note: This is a mock implementation for development
// In production, you would install googleapis and google-auth-library packages
interface GoogleAuthInterface {
	getToken: (code: string) => Promise<{ tokens: unknown }>;
	setCredentials: (tokens: unknown) => void;
	generateAuthUrl: (options: unknown) => string;
}

interface OAuth2ClientInterface {
	getToken: (code: string) => Promise<{ tokens: unknown }>;
	setCredentials: (tokens: unknown) => void;
	generateAuthUrl: (options: unknown) => string;
}

interface DriveInterface {
	files: {
		list: (options: unknown) => Promise<{
			data: {
				files?: Array<{ id?: string; name?: string; modifiedTime?: string }>;
			};
		}>;
		create: (options: unknown) => Promise<{ data: { id?: string } }>;
		update: (options: unknown) => Promise<{ data: { id?: string } }>;
		get: (options: unknown) => Promise<{ data: string }>;
	};
}

const google = {
	auth: {
		OAuth2: class implements OAuth2ClientInterface {
			getToken(_code: string) {
				return Promise.resolve({ tokens: {} });
			}
			setCredentials(_tokens: unknown) {}
			generateAuthUrl(_options: unknown) {
				return "https://accounts.google.com/oauth/authorize";
			}
		},
	},
	drive: (_options: unknown): DriveInterface => ({
		files: {
			list: () => Promise.resolve({ data: { files: [] } }),
			create: () => Promise.resolve({ data: { id: "mock-file-id" } }),
			update: () => Promise.resolve({ data: { id: "mock-file-id" } }),
			get: () => Promise.resolve({ data: "{}" }),
		},
	}),
};
import type {
	Account,
	Category,
	DataConflict,
	ExternalTransactionFormat,
	SyncStatus,
	Transaction,
	UserPreferences,
} from "../../types/finance";
import { DatabaseService, db } from "../database/db";
import { CryptoUtils, type FinancialData } from "../encryption/crypto";
import { DataTransformUtils } from "../transactions/dataTransform";

export interface SyncData {
	transactions: ExternalTransactionFormat[]; // Use external format for backups
	accounts: Account[];
	categories: Category[];
	preferences: UserPreferences | null;
	lastModified: string;
	version: string;
}

export interface SyncResult {
	success: boolean;
	conflicts?: DataConflict[];
	error?: string;
	syncedAt: Date;
}

export interface GoogleDriveConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	scopes: string[];
}

export class GoogleDriveSync {
	private auth: GoogleAuthInterface;
	private drive: DriveInterface | null = null;
	private isAuthenticated = false;
	private readonly fileName = "finance-dashboard-backup.json";
	private readonly encryptedFileName = "finance-dashboard-encrypted.json";

	constructor(private config: GoogleDriveConfig) {
		this.auth = new google.auth.OAuth2();
	}

	// Authentication methods
	async authenticate(authCode?: string): Promise<boolean> {
		try {
			if (authCode) {
				// Exchange authorization code for tokens
				const { tokens } = await this.auth.getToken(authCode);
				this.auth.setCredentials(tokens);
				this.drive = google.drive({ auth: this.auth });
				this.isAuthenticated = true;
				return true;
			}
			// Check if already authenticated
			const storedTokens = localStorage.getItem("google_drive_tokens");
			if (storedTokens) {
				this.auth.setCredentials(JSON.parse(storedTokens));
				this.drive = google.drive({ auth: this.auth });
				this.isAuthenticated = true;
				return true;
			}
			return false;
		} catch (error) {
			console.error("Authentication failed:", error);
			return false;
		}
	}

	getAuthUrl(): string {
		if (this.auth.generateAuthUrl) {
			return this.auth.generateAuthUrl({
				access_type: "offline",
				scope: this.config.scopes,
				redirect_uri: this.config.redirectUri,
			});
		}
		return "https://accounts.google.com/oauth/authorize";
	}

	async signOut(): Promise<void> {
		localStorage.removeItem("google_drive_tokens");
		this.isAuthenticated = false;
		this.drive = null;
	}

	isSignedIn(): boolean {
		return this.isAuthenticated;
	}

	// File operations
	private async findFile(fileName: string): Promise<string | null> {
		try {
			if (!this.drive) return null;

			const response = await this.drive.files.list({
				q: `name='${fileName}' and trashed=false`,
				fields: "files(id, name, modifiedTime)",
			});

			const files = response.data.files;
			return files && files.length > 0 ? files[0].id || null : null;
		} catch (error) {
			console.error("Error finding file:", error);
			return null;
		}
	}

	private async uploadFile(
		fileName: string,
		content: string,
		fileId?: string,
	): Promise<string | null> {
		try {
			if (!this.drive) return null;

			const media = {
				mimeType: "application/json",
				body: content,
			};

			if (fileId) {
				// Update existing file
				const response = await this.drive.files.update({
					fileId,
					media,
				});
				return response.data.id || null;
			}
			// Create new file
			const response = await this.drive.files.create({
				requestBody: { name: fileName },
				media,
			});
			return response.data.id || null;
		} catch (error) {
			console.error("Error uploading file:", error);
			return null;
		}
	}

	private async downloadFile(fileId: string): Promise<string | null> {
		try {
			if (!this.drive) return null;

			const response = await this.drive.files.get({
				fileId,
				alt: "media",
			});

			return response.data;
		} catch (error) {
			console.error("Error downloading file:", error);
			return null;
		}
	}

	// Backup operations
	async uploadBackup(encrypted = true): Promise<boolean> {
		try {
			if (!this.isAuthenticated) {
				throw new Error("Not authenticated with Google Drive");
			}

			// Get all data from local database
			const [transactions, accounts, categories, preferences] =
				(await Promise.all([
					DatabaseService.getTransactions(),
					DatabaseService.getAccounts(),
					DatabaseService.getCategories(),
					DatabaseService.getPreferences(),
				])) as [Transaction[], Account[], Category[], UserPreferences | null];

			// Convert transactions to external format for backup
			const externalTransactions =
				DataTransformUtils.toExternalFormatArray(transactions);

			const syncData: SyncData = {
				transactions: externalTransactions,
				accounts,
				categories,
				preferences,
				lastModified: new Date().toISOString(),
				version: "1.0.0",
			};

			// Convert SyncData to FinancialData for encryption
			const financialData: FinancialData = {
				transactions: syncData.transactions.map((tx) => ({
					status: "completed", // Add required status field
					id: tx.Date || "",
					amount: tx.Amount,
					description: tx.Description || "",
					category: tx.Category || "Other",
					date: new Date(tx.Date),
					type: tx["Income/Expense"] === "Income" ? "income" : "expense",
					account: tx.Account || "",
					tags: [],
					recurring: undefined,
					createdAt: new Date(),
					updatedAt: new Date(),
					note: tx.Note || "",
					currency: tx.Currency || "MYR",
					myr: tx.MYR,
					incomeExpense: tx["Income/Expense"],
					account2: tx.Account_2,
				})),
				accounts: syncData.accounts,
				preferences: syncData.preferences || null,
			};

			const encryptedData = CryptoUtils.encryptFinancialData(financialData);
			const fileName = encrypted ? this.encryptedFileName : this.fileName;

			// Check if file already exists
			const existingFileId = await this.findFile(fileName);

			// Upload or update the file
			const content = encrypted
				? JSON.stringify(encryptedData)
				: JSON.stringify(syncData, null, 2);
			const fileId = await this.uploadFile(
				fileName,
				content,
				existingFileId || undefined,
			);

			if (fileId) {
				localStorage.setItem("last_backup_date", new Date().toISOString());
				return true;
			}
			return false;
		} catch (error) {
			console.error("Backup upload failed:", error);
			return false;
		}
	}

	async downloadBackup(encrypted = true): Promise<SyncData | null> {
		try {
			if (!this.isAuthenticated) {
				throw new Error("Not authenticated with Google Drive");
			}

			const fileName = encrypted ? this.encryptedFileName : this.fileName;
			const fileId = await this.findFile(fileName);

			if (!fileId) {
				return null;
			}

			const content = await this.downloadFile(fileId);
			if (!content) {
				return null;
			}

			if (encrypted) {
				const encryptedData = JSON.parse(content);
				const financialData = CryptoUtils.decryptFinancialData(encryptedData);

				// Convert FinancialData back to SyncData
				return {
					transactions: financialData.transactions.map((tx) => ({
						Date: tx.date.toISOString().split("T")[0],
						Account: tx.account,
						Category: tx.category,
						Subcategory: tx.subcategory || null,
						Note: tx.note || null,
						MYR: tx.myr || tx.amount,
						"Income/Expense": tx.type === "income" ? "Income" : "Expense",
						Description: tx.description || null,
						Amount: tx.amount,
						Currency: tx.currency,
						Account_2: tx.account2 || 0,
					})),
					accounts: financialData.accounts,
					categories: [], // Default empty categories
					preferences: financialData.preferences,
					lastModified: new Date().toISOString(),
					version: "1.0.0",
				} as SyncData;
			}

			return JSON.parse(content) as SyncData;
		} catch (error) {
			console.error("Backup download failed:", error);
			return null;
		}
	}

	// Sync operations
	async syncData(
		strategy: "merge" | "overwrite_local" | "overwrite_cloud" = "merge",
	): Promise<SyncResult> {
		try {
			if (!this.isAuthenticated) {
				throw new Error("Not authenticated with Google Drive");
			}

			// Get local data
			const [
				localTransactions,
				localAccounts,
				localCategories,
				localPreferences,
			] = await Promise.all([
				DatabaseService.getTransactions(),
				DatabaseService.getAccounts(),
				DatabaseService.getCategories(),
				DatabaseService.getPreferences(),
			]);

			// Convert local transactions to external format for comparison
			const externalLocalTransactions =
				DataTransformUtils.toExternalFormatArray(localTransactions);

			const localData: SyncData = {
				transactions: externalLocalTransactions,
				accounts: localAccounts,
				categories: localCategories,
				preferences: localPreferences,
				lastModified: new Date().toISOString(),
				version: "1.0.0",
			};

			// Get cloud data
			const cloudData = await this.downloadBackup(true);

			if (!cloudData) {
				// No cloud data exists, upload local data
				const uploadSuccess = await this.uploadBackup(true);
				return {
					success: uploadSuccess,
					syncedAt: new Date(),
				};
			}

			// Apply sync strategy
			switch (strategy) {
				case "overwrite_local":
					await this.applyCloudData(cloudData);
					break;
				case "overwrite_cloud":
					await this.uploadBackup(true);
					break;
				default: {
					const conflicts = await this.detectConflicts(localData, cloudData);
					if (conflicts.length > 0) {
						return {
							success: false,
							conflicts,
							syncedAt: new Date(),
						};
					}
					await this.mergeData(localData, cloudData, conflicts);
					break;
				}
			}

			return {
				success: true,
				syncedAt: new Date(),
			};
		} catch (error) {
			console.error("Sync failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				syncedAt: new Date(),
			};
		}
	}

	private async detectConflicts(
		localData: SyncData,
		cloudData: SyncData,
	): Promise<DataConflict[]> {
		const conflicts: DataConflict[] = [];

		// Check for transaction conflicts
		for (const localTx of localData.transactions) {
			const cloudTx = cloudData.transactions.find((t) => {
				// Compare by Date and Description since external format doesn't have id
				return t.Date === localTx.Date && t.Description === localTx.Description;
			});
			if (cloudTx && JSON.stringify(localTx) !== JSON.stringify(cloudTx)) {
				conflicts.push({
					id: `transaction-${localTx.Date}-${localTx.Description}`,
					type: "transaction",
					localData: localTx as unknown as Transaction | Account | Category,
					cloudData: cloudTx as unknown as Transaction | Account | Category,
					conflictDate: new Date(),
					resolved: false,
				});
			}
		}

		// Check for account conflicts
		for (const localAcc of localData.accounts) {
			const cloudAcc = cloudData.accounts.find((a) => a.id === localAcc.id);
			if (cloudAcc && JSON.stringify(localAcc) !== JSON.stringify(cloudAcc)) {
				conflicts.push({
					id: `account-${localAcc.id}`,
					type: "account",
					localData: localAcc as Transaction | Account | Category,
					cloudData: cloudAcc as Transaction | Account | Category,
					conflictDate: new Date(),
					resolved: false,
				});
			}
		}

		// Check for category conflicts
		for (const localCat of localData.categories) {
			const cloudCat = cloudData.categories.find((c) => c.id === localCat.id);
			if (cloudCat && JSON.stringify(localCat) !== JSON.stringify(cloudCat)) {
				conflicts.push({
					id: `category-${localCat.id}`,
					type: "category",
					localData: localCat as Transaction | Account | Category,
					cloudData: cloudCat as Transaction | Account | Category,
					conflictDate: new Date(),
					resolved: false,
				});
			}
		}

		return conflicts;
	}

	private async applyCloudData(cloudData: SyncData): Promise<void> {
		// Clear local data
		await db.transactions.clear();
		await db.accounts.clear();
		await db.categories.clear();

		// Convert external transactions back to internal format and add to database
		const internalTransactions = DataTransformUtils.fromExternalFormatArray(
			cloudData.transactions,
		);
		for (const transaction of internalTransactions) {
			await DatabaseService.createTransaction(transaction);
		}

		// Add accounts
		for (const account of cloudData.accounts) {
			await DatabaseService.createAccount(account);
		}

		// Add categories
		for (const category of cloudData.categories) {
			await DatabaseService.createCategory(category);
		}

		// Update preferences
		if (cloudData.preferences) {
			await DatabaseService.updatePreferences(cloudData.preferences);
		}
	}

	private async mergeData(
		localData: SyncData,
		cloudData: SyncData,
		conflicts: DataConflict[],
	): Promise<void> {
		// Merge transactions (cloud takes precedence for conflicts)
		const mergedTransactions = [...localData.transactions];
		for (const cloudTx of cloudData.transactions) {
			const existingIndex = mergedTransactions.findIndex(
				(t) => t.Date === cloudTx.Date && t.Description === cloudTx.Description,
			);
			if (existingIndex >= 0) {
				// Replace with cloud version
				mergedTransactions[existingIndex] = cloudTx;
			} else {
				// Add new transaction from cloud
				mergedTransactions.push(cloudTx);
			}
		}

		// Clear and rebuild transactions
		await db.transactions.clear();
		const internalTransactions =
			DataTransformUtils.fromExternalFormatArray(mergedTransactions);
		for (const transaction of internalTransactions) {
			await DatabaseService.createTransaction(transaction);
		}

		// Merge accounts
		const mergedAccounts = [...localData.accounts];
		for (const cloudAcc of cloudData.accounts) {
			const existingIndex = mergedAccounts.findIndex(
				(a) => a.id === cloudAcc.id,
			);
			if (existingIndex >= 0) {
				mergedAccounts[existingIndex] = cloudAcc;
			} else {
				mergedAccounts.push(cloudAcc);
			}
		}

		// Clear and rebuild accounts
		await db.accounts.clear();
		for (const account of mergedAccounts) {
			await DatabaseService.createAccount(account);
		}

		// Merge categories
		const mergedCategories = [...localData.categories];
		for (const cloudCat of cloudData.categories) {
			const existingIndex = mergedCategories.findIndex(
				(c) => c.id === cloudCat.id,
			);
			if (existingIndex >= 0) {
				mergedCategories[existingIndex] = cloudCat;
			} else {
				mergedCategories.push(cloudCat);
			}
		}

		// Clear and rebuild categories
		await db.categories.clear();
		for (const category of mergedCategories) {
			await DatabaseService.createCategory(category);
		}

		// Update preferences (cloud takes precedence)
		if (cloudData.preferences) {
			await DatabaseService.updatePreferences(cloudData.preferences);
		}

		// Upload merged data back to cloud
		await this.uploadBackup(true);
	}

	// Conflict resolution
	async resolveConflict(
		conflictId: string,
		resolution: "local" | "cloud",
	): Promise<boolean> {
		try {
			const conflicts = await this.getConflicts();
			const conflict = conflicts.find((c) => c.id === conflictId);

			if (!conflict) {
				return false;
			}

			const dataToUse =
				resolution === "local" ? conflict.localData : conflict.cloudData;

			// Apply the resolution based on conflict type
			switch (conflict.type) {
				case "transaction": {
					// Convert external format to internal if needed
					const internalTx = DataTransformUtils.fromExternalFormat(
						dataToUse as unknown as ExternalTransactionFormat,
					);
					const fullTx: Transaction = {
						...internalTx,
						id: crypto.randomUUID(),
						createdAt: new Date(),
						updatedAt: new Date(),
					};
					await DatabaseService.updateTransaction(fullTx.id, fullTx);
					break;
				}
				case "account":
					await DatabaseService.updateAccount(
						(dataToUse as Account).id,
						dataToUse as Partial<Omit<Account, "id" | "createdAt">>,
					);
					break;
				case "category":
					// Categories don't have update method in current implementation
					break;
			}

			// Remove the resolved conflict from storage
			const remainingConflicts = conflicts.filter((c) => c.id !== conflictId);
			localStorage.setItem(
				"sync_conflicts",
				JSON.stringify(remainingConflicts),
			);

			return true;
		} catch (error) {
			console.error("Error resolving conflict:", error);
			return false;
		}
	}

	async getConflicts(): Promise<DataConflict[]> {
		const stored = localStorage.getItem("sync_conflicts");
		return stored ? JSON.parse(stored) : [];
	}

	// Status and settings
	async getSyncStatus(): Promise<SyncStatus> {
		const lastSync = this.getLastSyncDate();
		const autoSync = this.getAutoSyncSetting();
		const conflicts = await this.getConflicts();

		return {
			lastSync: lastSync,
			isOnline: navigator.onLine,
			isSyncing: false,
			hasConflicts: conflicts.length > 0,
			conflictCount: conflicts.length,
			autoSync: autoSync,
		};
	}

	private getLastSyncDate(): Date | null {
		const stored = localStorage.getItem("last_sync_date");
		return stored ? new Date(stored) : null;
	}

	private getAutoSyncSetting(): boolean {
		return localStorage.getItem("auto_sync_enabled") === "true";
	}

	async setAutoSync(enabled: boolean): Promise<void> {
		localStorage.setItem("auto_sync_enabled", enabled.toString());
	}
}

// Singleton instance
let googleDriveSyncInstance: GoogleDriveSync | null = null;

export function initializeGoogleDriveSync(
	config: GoogleDriveConfig,
): GoogleDriveSync {
	if (!googleDriveSyncInstance) {
		googleDriveSyncInstance = new GoogleDriveSync(config);
	}
	return googleDriveSyncInstance;
}

export function getGoogleDriveSync(): GoogleDriveSync | null {
	return googleDriveSyncInstance;
}

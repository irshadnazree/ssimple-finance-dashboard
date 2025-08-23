// Note: This is a mock implementation for development
// In production, you would install googleapis and google-auth-library packages
interface GoogleAuthInterface {
  generateAuthUrl?: (options: unknown) => string;
}

interface OAuth2ClientInterface {
  getToken: (code: string) => Promise<{ tokens: unknown }>;
  setCredentials: (tokens: unknown) => void;
  generateAuthUrl: (options: unknown) => string;
}

interface DriveInterface {
  files: {
    list: (options: unknown) => Promise<{ data: { files?: Array<{ id?: string; name?: string; modifiedTime?: string }> } }>;
    create: (options: unknown) => Promise<{ data: { id?: string } }>;
    update: (options: unknown) => Promise<{ data: { id?: string } }>;
    get: (options: unknown) => Promise<{ data: string }>;
  };
}

const google = {
  auth: {
    OAuth2: class implements OAuth2ClientInterface {
      getToken(_code: string) { return Promise.resolve({ tokens: {} }); }
      setCredentials(_tokens: unknown) {}
      generateAuthUrl(_options: unknown) { return 'https://accounts.google.com/oauth/authorize'; }
    }
  },
  drive: (_options: unknown): DriveInterface => ({
    files: {
      list: () => Promise.resolve({ data: { files: [] } }),
      create: () => Promise.resolve({ data: { id: 'mock-file-id' } }),
      update: () => Promise.resolve({ data: { id: 'mock-file-id' } }),
      get: () => Promise.resolve({ data: '{}' })
    }
  })
};
import type {
  Transaction,
  Budget,
  Account,
  Category,
  UserPreferences,
  DataConflict,
  SyncStatus,
  EncryptedData,
} from '../../types/finance';
import { DatabaseService, db } from '../database/db';
import { CryptoUtils } from '../encryption/crypto';

export interface SyncData {
  transactions: Transaction[];
  budgets: Budget[];
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
  private readonly fileName = 'finance-dashboard-backup.json';
  private readonly encryptedFileName = 'finance-dashboard-encrypted.json';

  constructor(private config: GoogleDriveConfig) {
    this.auth = {} as GoogleAuthInterface; // Mock implementation
  }

  // Authentication methods
  async authenticate(authCode?: string): Promise<boolean> {
    try {
      if (authCode) {
        // Exchange authorization code for tokens
        const oauth2Client = new google.auth.OAuth2();

        const { tokens } = await oauth2Client.getToken(authCode);
        oauth2Client.setCredentials(tokens);
        
        // Store tokens securely with encryption
        const encryptedTokens = CryptoUtils.encryptSensitiveData(tokens);
        localStorage.setItem('google_drive_tokens', JSON.stringify(encryptedTokens));
        
        this.auth = oauth2Client;
      } else {
        // Try to use stored tokens
        const storedTokens = localStorage.getItem('google_drive_tokens');
        if (storedTokens) {
          try {
            const encryptedTokens = JSON.parse(storedTokens);
            const tokens = CryptoUtils.decryptSensitiveData(encryptedTokens);
            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials(tokens);
            this.auth = oauth2Client;
          } catch (error) {
            console.error('Failed to decrypt stored tokens:', error);
            localStorage.removeItem('google_drive_tokens');
            return false;
          }
        } else {
          return false;
        }
      }

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  getAuthUrl(): string {
    const oauth2Client = new google.auth.OAuth2();

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
      prompt: 'consent',
    });
  }

  async signOut(): Promise<void> {
    localStorage.removeItem('google_drive_tokens');
    this.isAuthenticated = false;
    this.drive = null;
  }

  isSignedIn(): boolean {
    return this.isAuthenticated;
  }

  // File operations
  private async findFile(fileName: string): Promise<string | null> {
    if (!this.drive) throw new Error('Not authenticated');

    try {
      const response = await this.drive.files.list({
        q: `name='${fileName}' and trashed=false`,
        fields: 'files(id, name, modifiedTime)',
      });

      const files = response.data.files;
      return files && files.length > 0 ? files[0].id || null : null;
    } catch (error) {
      console.error('Error finding file:', error);
      return null;
    }
  }

  private async uploadFile(fileName: string, content: string, fileId?: string): Promise<string | null> {
    if (!this.drive) throw new Error('Not authenticated');

    try {
      const media = {
        mimeType: 'application/json',
        body: content,
      };

      const fileMetadata = {
        name: fileName,
      };

      let response: { data: { id?: string } };
      if (fileId) {
        // Update existing file
        response = await this.drive.files.update({
          fileId,
          media,
          fields: 'id',
        });
      } else {
        // Create new file
        response = await this.drive.files.create({
          requestBody: fileMetadata,
          media,
          fields: 'id',
        });
      }

      return response.data.id || null;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }

  private async downloadFile(fileId: string): Promise<string | null> {
    if (!this.drive) throw new Error('Not authenticated');

    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media',
      });

      return response.data;
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }

  // Sync operations
  async uploadBackup(encrypted = true): Promise<boolean> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      // Get all data from local database
      const [transactions, budgets, accounts, categories, preferences] = await Promise.all([
        DatabaseService.getTransactions(),
        DatabaseService.getBudgets(),
        DatabaseService.getAccounts(),
        DatabaseService.getCategories(),
        DatabaseService.getPreferences(),
      ]);

      const syncData: SyncData = {
        transactions,
        budgets,
        accounts,
        categories,
        preferences,
        lastModified: new Date().toISOString(),
        version: '1.0.0',
      };

      let content: string;
      let fileName: string;

      if (encrypted) {
        // Encrypt the data
        const encryptedData = CryptoUtils.encryptFinancialData(syncData);
        content = JSON.stringify(encryptedData);
        fileName = this.encryptedFileName;
      } else {
        content = JSON.stringify(syncData);
        fileName = this.fileName;
      }

      // Check if file already exists
      const existingFileId = await this.findFile(fileName);
      
      // Upload or update file
      const fileId = await this.uploadFile(fileName, content, existingFileId || undefined);
      
      return fileId !== null;
    } catch (error) {
      console.error('Error uploading backup:', error);
      return false;
    }
  }

  async downloadBackup(encrypted = true): Promise<SyncData | null> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const fileName = encrypted ? this.encryptedFileName : this.fileName;
      const fileId = await this.findFile(fileName);
      
      if (!fileId) {
        return null; // No backup found
      }

      const content = await this.downloadFile(fileId);
      if (!content) {
        return null;
      }

      if (encrypted) {
        // Decrypt the data
        const encryptedData: EncryptedData = JSON.parse(content);
        return CryptoUtils.decryptFinancialData(encryptedData) as SyncData;
      } else {
        return JSON.parse(content) as SyncData;
      }
    } catch (error) {
      console.error('Error downloading backup:', error);
      return null;
    }
  }

  async syncData(strategy: 'merge' | 'overwrite_local' | 'overwrite_cloud' = 'merge'): Promise<SyncResult> {
    const syncResult: SyncResult = {
      success: false,
      syncedAt: new Date(),
    };

    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated with Google Drive');
      }

      // Download cloud data
      const cloudData = await this.downloadBackup(true);
      
      if (!cloudData) {
        // No cloud backup exists, upload current data
        const uploaded = await this.uploadBackup(true);
        syncResult.success = uploaded;
        return syncResult;
      }

      // Get local data
      const [localTransactions, localBudgets, localAccounts, localCategories, localPreferences] = await Promise.all([
        DatabaseService.getTransactions(),
        DatabaseService.getBudgets(),
        DatabaseService.getAccounts(),
        DatabaseService.getCategories(),
        DatabaseService.getPreferences(),
      ]);

      const localData: SyncData = {
        transactions: localTransactions,
        budgets: localBudgets,
        accounts: localAccounts,
        categories: localCategories,
        preferences: localPreferences,
        lastModified: new Date().toISOString(),
        version: '1.0.0',
      };

      // Detect conflicts and apply strategy
      const conflicts = await this.detectConflicts(localData, cloudData);
      
      if (conflicts.length > 0 && strategy === 'merge') {
        // Store conflicts for user resolution
        // Store conflicts in local storage for now
        const existingConflicts = JSON.parse(localStorage.getItem('sync_conflicts') || '[]');
        existingConflicts.push(...conflicts);
        localStorage.setItem('sync_conflicts', JSON.stringify(existingConflicts));
        syncResult.conflicts = conflicts;
      }

      // Apply sync strategy
      switch (strategy) {
        case 'overwrite_local':
          await this.applyCloudData(cloudData);
          break;
        case 'overwrite_cloud':
          await this.uploadBackup(true);
          break;
        case 'merge':
          await this.mergeData(localData, cloudData, conflicts);
          await this.uploadBackup(true);
          break;
      }

      syncResult.success = true;
      return syncResult;
    } catch (error) {
      console.error('Sync failed:', error);
      syncResult.error = error instanceof Error ? error.message : 'Unknown error';
      return syncResult;
    }
  }

  private async detectConflicts(localData: SyncData, cloudData: SyncData): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];
    const now = new Date();

    // Check transaction conflicts
    for (const cloudTransaction of cloudData.transactions) {
      const localTransaction = localData.transactions.find(t => t.id === cloudTransaction.id);
      if (localTransaction && localTransaction.updatedAt !== cloudTransaction.updatedAt) {
        conflicts.push({
          id: `conflict-transaction-${cloudTransaction.id}`,
          type: 'transaction',
          localData: localTransaction,
          cloudData: cloudTransaction,
          conflictDate: now,
          resolved: false,
        });
      }
    }

    // Check budget conflicts
    for (const cloudBudget of cloudData.budgets) {
      const localBudget = localData.budgets.find(b => b.id === cloudBudget.id);
      if (localBudget && localBudget.updatedAt !== cloudBudget.updatedAt) {
        conflicts.push({
          id: `conflict-budget-${cloudBudget.id}`,
          type: 'budget',
          localData: localBudget,
          cloudData: cloudBudget,
          conflictDate: now,
          resolved: false,
        });
      }
    }

    // Check account conflicts
    for (const cloudAccount of cloudData.accounts) {
      const localAccount = localData.accounts.find(a => a.id === cloudAccount.id);
      if (localAccount && localAccount.updatedAt !== cloudAccount.updatedAt) {
        conflicts.push({
          id: `conflict-account-${cloudAccount.id}`,
          type: 'account',
          localData: localAccount,
          cloudData: cloudAccount,
          conflictDate: now,
          resolved: false,
        });
      }
    }

    return conflicts;
  }

  private async applyCloudData(cloudData: SyncData): Promise<void> {
    // Clear local data and apply cloud data
    // Clear all data (would need to implement this method)
    await Promise.all([
      db.transactions.clear(),
      db.budgets.clear(),
      db.accounts.clear(),
      db.categories.clear()
    ]);
    
    // Insert cloud data
    for (const transaction of cloudData.transactions) {
      await DatabaseService.createTransaction(transaction);
    }
    
    for (const budget of cloudData.budgets) {
      await DatabaseService.createBudget(budget);
    }
    
    for (const account of cloudData.accounts) {
      await DatabaseService.createAccount(account);
    }
    
    for (const category of cloudData.categories) {
      await DatabaseService.createCategory(category);
    }
    
    if (cloudData.preferences) {
      await DatabaseService.updatePreferences(cloudData.preferences);
    }
  }

  private async mergeData(localData: SyncData, cloudData: SyncData, conflicts: DataConflict[]): Promise<void> {
    const conflictIds = new Set(conflicts.map(c => {
      if (typeof c.localData === 'object' && 'id' in c.localData) {
        return c.localData.id;
      }
      return '';
    }));

    // Merge transactions (skip conflicted ones)
    for (const cloudTransaction of cloudData.transactions) {
      if (!conflictIds.has(cloudTransaction.id)) {
        const localTransaction = localData.transactions.find(t => t.id === cloudTransaction.id);
        if (!localTransaction) {
          // New transaction from cloud
          await DatabaseService.createTransaction(cloudTransaction);
        }
      }
    }

    // Merge budgets (skip conflicted ones)
    for (const cloudBudget of cloudData.budgets) {
      if (!conflictIds.has(cloudBudget.id)) {
        const localBudget = localData.budgets.find(b => b.id === cloudBudget.id);
        if (!localBudget) {
          // New budget from cloud
          await DatabaseService.createBudget(cloudBudget);
        }
      }
    }

    // Merge accounts (skip conflicted ones)
    for (const cloudAccount of cloudData.accounts) {
      if (!conflictIds.has(cloudAccount.id)) {
        const localAccount = localData.accounts.find(a => a.id === cloudAccount.id);
        if (!localAccount) {
          // New account from cloud
          await DatabaseService.createAccount(cloudAccount);
        }
      }
    }

    // Merge categories
    for (const cloudCategory of cloudData.categories) {
      const localCategory = localData.categories.find(c => c.id === cloudCategory.id);
      if (!localCategory) {
        // New category from cloud
        await DatabaseService.createCategory(cloudCategory);
      }
    }
  }

  async resolveConflict(conflictId: string, resolution: 'local' | 'cloud'): Promise<boolean> {
    try {
      const conflicts = JSON.parse(localStorage.getItem('sync_conflicts') || '[]');
      const conflict = conflicts.find((c: DataConflict) => c.id === conflictId);
      if (!conflict) return false;

      const dataToKeep = resolution === 'local' ? conflict.localData : conflict.cloudData;
      
      // Apply the chosen data
      switch (conflict.type) {
        case 'transaction':
          await DatabaseService.updateTransaction((dataToKeep as Transaction).id, dataToKeep as Transaction);
          break;
        case 'budget':
          await DatabaseService.updateBudget((dataToKeep as Budget).id, dataToKeep as Budget);
          break;
        case 'account':
          await DatabaseService.updateAccount((dataToKeep as Account).id, dataToKeep as Account);
          break;
        case 'category':
          // Categories don't have update method, would need to implement
          console.log('Category update not implemented:', dataToKeep);
          break;
      }

      // Mark conflict as resolved
      const updatedConflicts = conflicts.map((c: DataConflict) => 
        c.id === conflictId ? { ...c, resolved: true } : c
      );
      localStorage.setItem('sync_conflicts', JSON.stringify(updatedConflicts));
      return true;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return false;
    }
  }

  async getConflicts(): Promise<DataConflict[]> {
    const conflicts = JSON.parse(localStorage.getItem('sync_conflicts') || '[]');
    return conflicts.filter((c: DataConflict) => !c.resolved);
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const conflicts = await this.getConflicts();
    
    return {
      lastSync: this.getLastSyncDate(),
      isOnline: navigator.onLine,
      isSyncing: false, // This would be managed by the sync process
      hasConflicts: conflicts.length > 0,
      conflictCount: conflicts.length,
      autoSync: this.getAutoSyncSetting(),
    };
  }

  private getLastSyncDate(): Date | null {
    const lastSync = localStorage.getItem('last_sync_date');
    return lastSync ? new Date(lastSync) : null;
  }

  private getAutoSyncSetting(): boolean {
    const autoSync = localStorage.getItem('auto_sync_enabled');
    return autoSync === 'true';
  }

  async setAutoSync(enabled: boolean): Promise<void> {
    localStorage.setItem('auto_sync_enabled', enabled.toString());
  }

  private updateLastSyncDate(): void {
    localStorage.setItem('last_sync_date', new Date().toISOString());
  }
}

// Singleton instance
let googleDriveSyncInstance: GoogleDriveSync | null = null;

export function initializeGoogleDriveSync(config: GoogleDriveConfig): GoogleDriveSync {
  if (!googleDriveSyncInstance) {
    googleDriveSyncInstance = new GoogleDriveSync(config);
  }
  return googleDriveSyncInstance;
}

export function getGoogleDriveSync(): GoogleDriveSync | null {
  return googleDriveSyncInstance;
}
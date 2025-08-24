import Dexie from 'dexie';
import type { Transaction, Budget, Account, Category, UserPreferences } from '../../types/finance';

/**
 * Main database service for the finance dashboard
 */
export class FinanceDashboard extends Dexie {
	transactions!: Dexie.Table<Transaction, string>;
	budgets!: Dexie.Table<Budget, string>;
	accounts!: Dexie.Table<Account, string>;
	categories!: Dexie.Table<Category, string>;
	preferences!: Dexie.Table<UserPreferences, string>;

	constructor() {
		super('FinanceDashboard');
		
		// Define schemas
		this.version(1).stores({
			transactions: '++id, amount, category, date, type, account, currency, myr, incomeExpense, note, account2, createdAt, updatedAt',
			budgets: '++id, name, category, period, startDate, endDate, isActive',
			accounts: '++id, name, type, balance, currency, isActive',
			categories: '++id, name, type, isDefault',
			preferences: '++id'
		});
	}
}

// Create database instance
export const db = new FinanceDashboard();

/**
 * Database service with CRUD operations
 */
export const DatabaseService = {
	// Transaction operations
	async createTransaction(
		transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
	): Promise<Transaction> {
		const now = new Date();
		const newTransaction: Transaction = {
			...transaction,
			id: crypto.randomUUID(),
			createdAt: now,
			updatedAt: now,
			// Ensure required fields have defaults
			currency: transaction.currency || 'MYR',
			myr: transaction.myr || transaction.amount,
			incomeExpense: transaction.incomeExpense || (transaction.type === 'income' ? 'Income' : 'Expense'),
			account2: transaction.account2 || undefined
		};
		
		await db.transactions.add(newTransaction);
		return newTransaction;
	},

	async getTransactions(): Promise<Transaction[]> {
		return await db.transactions.toArray();
	},

	async getTransaction(id: string): Promise<Transaction | undefined> {
		return await db.transactions.get(id);
	},

	async updateTransaction(
		id: string,
		updates: Partial<Omit<Transaction, "id" | "createdAt">>
	): Promise<Transaction> {
		const updatedTransaction = {
			...updates,
			updatedAt: new Date()
		};
		await db.transactions.update(id, updatedTransaction);
		const result = await db.transactions.get(id);
		if (!result) {
			throw new Error(`Transaction with id ${id} not found`);
		}
		return result;
	},

	async deleteTransaction(id: string): Promise<void> {
		await db.transactions.delete(id);
	},

	// Budget operations
	async createBudget(
		budget: Omit<Budget, "id" | "spent" | "createdAt" | "updatedAt">
	): Promise<Budget> {
		const now = new Date();
		const newBudget: Budget = {
			...budget,
			id: crypto.randomUUID(),
			spent: 0,
			createdAt: now,
			updatedAt: now
		};
		
		await db.budgets.add(newBudget);
		return newBudget;
	},

	async getBudgets(): Promise<Budget[]> {
		return await db.budgets.toArray();
	},

	async getBudget(id: string): Promise<Budget | undefined> {
		return await db.budgets.get(id);
	},

	async updateBudget(
		id: string,
		updates: Partial<Omit<Budget, "id" | "createdAt">>
	): Promise<Budget> {
		const updatedBudget = {
			...updates,
			updatedAt: new Date()
		};
		await db.budgets.update(id, updatedBudget);
		const result = await db.budgets.get(id);
		if (!result) {
			throw new Error(`Budget with id ${id} not found`);
		}
		return result;
	},

	async deleteBudget(id: string): Promise<void> {
		await db.budgets.delete(id);
	},

	// Account operations
	async createAccount(
		account: Omit<Account, "id" | "createdAt" | "updatedAt">
	): Promise<Account> {
		const now = new Date();
		const newAccount: Account = {
			...account,
			id: crypto.randomUUID(),
			createdAt: now,
			updatedAt: now
		};
		
		await db.accounts.add(newAccount);
		return newAccount;
	},

	async getAccounts(): Promise<Account[]> {
		return await db.accounts.toArray();
	},

	async getAccount(id: string): Promise<Account | undefined> {
		return await db.accounts.get(id);
	},

	async updateAccount(
		id: string,
		updates: Partial<Omit<Account, "id" | "createdAt">>
	): Promise<Account> {
		const updatedAccount = {
			...updates,
			updatedAt: new Date()
		};
		await db.accounts.update(id, updatedAccount);
		const result = await db.accounts.get(id);
		if (!result) {
			throw new Error(`Account with id ${id} not found`);
		}
		return result;
	},

	async deleteAccount(id: string): Promise<void> {
		await db.accounts.delete(id);
	},

	// Category operations
	async getCategories(): Promise<Category[]> {
		return await db.categories.toArray();
	},

	async createCategory(
		category: Omit<Category, "id" | "createdAt">
	): Promise<Category> {
		const newCategory: Category = {
			...category,
			id: crypto.randomUUID(),
			createdAt: new Date()
		};
		
		await db.categories.add(newCategory);
		return newCategory;
	},

	// Preferences operations
	async getPreferences(): Promise<UserPreferences | null> {
		const preferences = await db.preferences.toArray();
		return preferences.length > 0 ? preferences[0] : null;
	},

	async updatePreferences(preferences: UserPreferences): Promise<UserPreferences> {
		const existing = await DatabaseService.getPreferences();
		const preferencesWithId = preferences as UserPreferences & { id?: string };
		if (existing && 'id' in existing) {
			const existingWithId = existing as UserPreferences & { id: string };
			await db.preferences.update(existingWithId.id || '1', preferencesWithId);
		} else {
			const newPreferences = {
				...preferencesWithId,
				id: '1'
			};
			await db.preferences.add(newPreferences);
		}
		return preferences;
	}
};

// Legacy function for backward compatibility
export async function createTransaction(
	transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
): Promise<Transaction> {
	return DatabaseService.createTransaction(transaction);
}

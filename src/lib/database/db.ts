import Dexie, { type EntityTable } from 'dexie';
import type {
  Transaction,
  Budget,
  Account,
  Category,
  UserPreferences,
  DataConflict,
  EncryptedData,
} from '../../types/finance';

export interface FinanceDB extends Dexie {
  transactions: EntityTable<Transaction, 'id'>;
  budgets: EntityTable<Budget, 'id'>;
  accounts: EntityTable<Account, 'id'>;
  categories: EntityTable<Category, 'id'>;
  preferences: EntityTable<UserPreferences & { id: string }, 'id'>;
  conflicts: EntityTable<DataConflict, 'id'>;
  encryptedBackups: EntityTable<EncryptedData & { id: string }, 'id'>;
}

export const db = new Dexie('FinanceDashboardDB') as FinanceDB;

// Define schemas
db.version(1).stores({
  transactions: '++id, amount, category, date, type, account, createdAt, updatedAt',
  budgets: '++id, name, category, period, startDate, endDate, isActive, createdAt, updatedAt',
  accounts: '++id, name, type, balance, currency, isActive, createdAt, updatedAt',
  categories: '++id, name, type, isDefault, createdAt',
  preferences: '++id',
  conflicts: '++id, type, conflictDate, resolved',
  encryptedBackups: '++id, timestamp',
});

interface ExportData {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  categories: Category[];
  preferences: UserPreferences | null;
  exportDate: string;
  version: string;
}

// Database utility functions
export namespace DatabaseService {
  // Transaction operations
  export async function createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    await db.transactions.add(newTransaction);
    return newTransaction;
  }

  export async function updateTransaction(id: string, updates: Partial<Transaction>) {
    const updatedTransaction = {
      ...updates,
      updatedAt: new Date(),
    };
    
    await db.transactions.update(id, updatedTransaction);
    return db.transactions.get(id);
  }

  export async function deleteTransaction(id: string) {
    await db.transactions.delete(id);
  }

  export async function getTransactions(filters?: {
    startDate?: Date;
    endDate?: Date;
    category?: string;
    account?: string;
    type?: Transaction['type'];
  }) {
    let query = db.transactions.orderBy('date').reverse();
    
    if (filters) {
      if (filters.startDate || filters.endDate) {
        query = query.filter(t => {
          const date = new Date(t.date);
          if (filters.startDate && date < filters.startDate) return false;
          if (filters.endDate && date > filters.endDate) return false;
          return true;
        });
      }
      
      if (filters.category) {
        query = query.filter(t => t.category === filters.category);
      }
      
      if (filters.account) {
        query = query.filter(t => t.account === filters.account);
      }
      
      if (filters.type) {
        query = query.filter(t => t.type === filters.type);
      }
    }
    
    return query.toArray();
  }

  // Budget operations
  export async function createBudget(budget: Omit<Budget, 'id' | 'spent' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const newBudget: Budget = {
      ...budget,
      id: crypto.randomUUID(),
      spent: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    await db.budgets.add(newBudget);
    return newBudget;
  }

  export async function updateBudget(id: string, updates: Partial<Budget>) {
    const updatedBudget = {
      ...updates,
      updatedAt: new Date(),
    };
    
    await db.budgets.update(id, updatedBudget);
    return db.budgets.get(id);
  }

  export async function getBudgets(activeOnly = false) {
    let query = db.budgets.orderBy('createdAt').reverse();
    
    if (activeOnly) {
      query = query.filter(b => b.isActive);
    }
    
    return query.toArray();
  }

  // Account operations
  export async function createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const newAccount: Account = {
      ...account,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    await db.accounts.add(newAccount);
    return newAccount;
  }

  export async function updateAccount(id: string, updates: Partial<Account>) {
    const updatedAccount = {
      ...updates,
      updatedAt: new Date(),
    };
    
    await db.accounts.update(id, updatedAccount);
    return db.accounts.get(id);
  }

  export async function getAccounts(activeOnly = false) {
    let query = db.accounts.orderBy('name');
    
    if (activeOnly) {
      query = query.filter(a => a.isActive);
    }
    
    return query.toArray();
  }

  // Category operations
  export async function createCategory(category: Omit<Category, 'id' | 'createdAt'>) {
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    await db.categories.add(newCategory);
    return newCategory;
  }

  export async function getCategories(type?: Category['type']) {
    let query = db.categories.orderBy('name');
    
    if (type) {
      query = query.filter(c => c.type === type);
    }
    
    return query.toArray();
  }

  // Preferences operations
  export async function getPreferences(): Promise<UserPreferences | null> {
    const prefs = await db.preferences.orderBy('id').first();
    return prefs || null;
  }

  export async function updatePreferences(preferences: UserPreferences) {
    const existing = await db.preferences.orderBy('id').first();
    
    if (existing) {
      await db.preferences.update(existing.id, preferences);
    } else {
      await db.preferences.add({ ...preferences, id: crypto.randomUUID() });
    }
  }

  // Data management
  export async function clearAllData() {
    await db.transaction('rw', [db.transactions, db.budgets, db.accounts, db.categories, db.preferences, db.conflicts], async () => {
      await db.transactions.clear();
      await db.budgets.clear();
      await db.accounts.clear();
      await db.categories.clear();
      await db.preferences.clear();
      await db.conflicts.clear();
    });
  }

  export async function exportData(): Promise<ExportData> {
    const [transactions, budgets, accounts, categories, preferences] = await Promise.all([
      db.transactions.toArray(),
      db.budgets.toArray(),
      db.accounts.toArray(),
      db.categories.toArray(),
      db.preferences.toArray(),
    ]);

    return {
      transactions,
      budgets,
      accounts,
      categories,
      preferences: preferences[0] || null,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
  }

  export async function importData(data: ExportData) {
    await db.transaction('rw', [db.transactions, db.budgets, db.accounts, db.categories, db.preferences], async () => {
      if (data.transactions) {
        await db.transactions.bulkAdd(data.transactions);
      }
      if (data.budgets) {
        await db.budgets.bulkAdd(data.budgets);
      }
      if (data.accounts) {
        await db.accounts.bulkAdd(data.accounts);
      }
      if (data.categories) {
        await db.categories.bulkAdd(data.categories);
      }
      if (data.preferences) {
        await db.preferences.add({ ...data.preferences, id: crypto.randomUUID() });
      }
    });
  }
}

// Initialize default data
export async function initializeDefaultData() {
  const existingCategories = await db.categories.count();
  
  if (existingCategories === 0) {
    const defaultCategories: Omit<Category, 'id' | 'createdAt'>[] = [
      { name: 'Food & Dining', type: 'expense', color: '#FF6B6B', isDefault: true },
      { name: 'Transportation', type: 'expense', color: '#4ECDC4', isDefault: true },
      { name: 'Shopping', type: 'expense', color: '#45B7D1', isDefault: true },
      { name: 'Entertainment', type: 'expense', color: '#96CEB4', isDefault: true },
      { name: 'Bills & Utilities', type: 'expense', color: '#FFEAA7', isDefault: true },
      { name: 'Healthcare', type: 'expense', color: '#DDA0DD', isDefault: true },
      { name: 'Salary', type: 'income', color: '#98D8C8', isDefault: true },
      { name: 'Freelance', type: 'income', color: '#F7DC6F', isDefault: true },
      { name: 'Investments', type: 'income', color: '#BB8FCE', isDefault: true },
    ];

    for (const category of defaultCategories) {
      await DatabaseService.createCategory(category);
    }
  }

  const existingPreferences = await DatabaseService.getPreferences();
  
  if (!existingPreferences) {
    const defaultPreferences: UserPreferences = {
      currency: 'USD',
      dateFormat: 'MM/dd/yyyy',
      theme: 'system',
      defaultAccount: '',
      budgetAlerts: true,
      syncSettings: {
        autoSync: false,
        syncInterval: 30,
        backupRetention: 30,
      },
    };

    await DatabaseService.updatePreferences(defaultPreferences);
  }
}
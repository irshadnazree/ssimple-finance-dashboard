import { DatabaseService } from './db';
import type { Account, Category } from '../../types/finance';

/**
 * Database initialization service
 * Creates default accounts and categories if they don't exist
 */
export namespace DatabaseInitService {
  let initialized = false;

  /**
   * Initialize the database with default data
   */
  export async function initialize(): Promise<void> {
    if (initialized) return;

    try {
      await createDefaultCategories();
      await createDefaultAccounts();
      initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create default categories if none exist
   */
  async function createDefaultCategories(): Promise<void> {
    const existingCategories = await DatabaseService.getCategories();
    if (existingCategories.length > 0) return;

    const defaultCategories: Omit<Category, 'id' | 'createdAt'>[] = [
      // Income categories
      { name: 'Salary', type: 'income', color: '#10B981', icon: '💰', isDefault: true },
      { name: 'Freelance', type: 'income', color: '#3B82F6', icon: '💼', isDefault: true },
      { name: 'Investment', type: 'income', color: '#8B5CF6', icon: '📈', isDefault: true },
      { name: 'Business', type: 'income', color: '#F59E0B', icon: '🏢', isDefault: true },
      { name: 'Other Income', type: 'income', color: '#6B7280', icon: '💵', isDefault: true },

      // Expense categories
      { name: 'Food & Dining', type: 'expense', color: '#EF4444', icon: '🍽️', isDefault: true },
      { name: 'Transportation', type: 'expense', color: '#F97316', icon: '🚗', isDefault: true },
      { name: 'Shopping', type: 'expense', color: '#EC4899', icon: '🛍️', isDefault: true },
      { name: 'Entertainment', type: 'expense', color: '#8B5CF6', icon: '🎬', isDefault: true },
      { name: 'Bills & Utilities', type: 'expense', color: '#06B6D4', icon: '⚡', isDefault: true },
      { name: 'Healthcare', type: 'expense', color: '#10B981', icon: '🏥', isDefault: true },
      { name: 'Education', type: 'expense', color: '#3B82F6', icon: '📚', isDefault: true },
      { name: 'Travel', type: 'expense', color: '#F59E0B', icon: '✈️', isDefault: true },
      { name: 'Insurance', type: 'expense', color: '#6366F1', icon: '🛡️', isDefault: true },
      { name: 'Savings', type: 'expense', color: '#059669', icon: '🏦', isDefault: true },
      { name: 'Other Expenses', type: 'expense', color: '#6B7280', icon: '📝', isDefault: true },
    ];

    for (const category of defaultCategories) {
      await DatabaseService.createCategory(category);
    }

    console.log(`Created ${defaultCategories.length} default categories`);
  }

  /**
   * Create default accounts if none exist
   */
  async function createDefaultAccounts(): Promise<void> {
    const existingAccounts = await DatabaseService.getAccounts();
    if (existingAccounts.length > 0) return;

    const defaultAccounts: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Cash',
        type: 'cash',
        balance: 0,
        currency: 'MYR',
        isActive: true
      },
      {
        name: 'Checking Account',
        type: 'checking',
        balance: 0,
        currency: 'MYR',
        isActive: true
      },
      {
        name: 'Savings Account',
        type: 'savings',
        balance: 0,
        currency: 'MYR',
        isActive: true
      },
      {
        name: 'Credit Card',
        type: 'credit',
        balance: 0,
        currency: 'MYR',
        isActive: true
      }
    ];

    for (const account of defaultAccounts) {
      await DatabaseService.createAccount(account);
    }

    console.log(`Created ${defaultAccounts.length} default accounts`);
  }

  /**
   * Reset database to default state (for testing/development)
   */
  export async function reset(): Promise<void> {
    try {
      // Clear all data
      const { db } = await import('./db');
      await db.transactions.clear();
      await db.accounts.clear();
      await db.categories.clear();
      await db.preferences.clear();

      // Reset initialization flag
      initialized = false;

      // Reinitialize with defaults
      await initialize();

      console.log('Database reset successfully');
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  }

  /**
   * Check if database has been initialized
   */
  export function isInitialized(): boolean {
    return initialized;
  }
}

// Auto-initialize on import
DatabaseInitService.initialize().catch(console.error);
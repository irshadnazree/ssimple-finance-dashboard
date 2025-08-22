import type {
  Transaction,
  Category,
  Account,
  RecurringTransaction,
  ValidationError,
} from '../../types/finance';
import { DatabaseService } from '../database/db';
import { ValidationUtils, FinanceCalculations } from '../calculations/finance';
import { CryptoUtils } from '../encryption/crypto';

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  account?: string;
  type?: Transaction['type'];
  minAmount?: number;
  maxAmount?: number;
  description?: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  averageTransaction: number;
  categoryBreakdown: Record<string, number>;
  accountBreakdown: Record<string, number>;
}

export interface BulkTransactionResult {
  successful: Transaction[];
  failed: Array<{ transaction: Partial<Transaction>; error: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export class TransactionManager {
  private static instance: TransactionManager;
  private categories: Category[] = [];
  private accounts: Account[] = [];

  private constructor() {
    this.loadCategoriesAndAccounts();
  }

  static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  private async loadCategoriesAndAccounts(): Promise<void> {
    try {
      [this.categories, this.accounts] = await Promise.all([
        DatabaseService.getCategories(),
        DatabaseService.getAccounts(),
      ]);
    } catch (error) {
      console.error('Failed to load categories and accounts:', error);
    }
  }

  // CRUD Operations
  async createTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    // Validate transaction data
    const validationErrors = await this.validateTransaction(transactionData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Create transaction
    const transaction = await DatabaseService.createTransaction(transactionData);
    
    // Update account balance
    await this.updateAccountBalance(transaction);
    
    return transaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    // Get original transaction
    const transactions = await DatabaseService.getTransactions();
    const originalTransaction = transactions.find(t => t.id === id);
    if (!originalTransaction) {
      throw new Error('Transaction not found');
    }

    // Validate updates
    const updatedData = { ...originalTransaction, ...updates };
    const validationErrors = await this.validateTransaction(updatedData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Revert original transaction's effect on account balance
    await this.revertAccountBalance(originalTransaction);
    
    // Update transaction
    const updatedTransaction = await DatabaseService.updateTransaction(id, updates);
    
    if (updatedTransaction) {
      // Apply new transaction's effect on account balance
      await this.updateAccountBalance(updatedTransaction);
    }
    
    return updatedTransaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    // Get transaction to revert its effect on account balance
    const transactions = await DatabaseService.getTransactions();
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      await this.revertAccountBalance(transaction);
    }
    
    await DatabaseService.deleteTransaction(id);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const transactions = await DatabaseService.getTransactions();
    return transactions.find(t => t.id === id);
  }

  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    const dbFilters = filters ? {
      startDate: filters.startDate,
      endDate: filters.endDate,
      category: filters.category,
      account: filters.account,
      type: filters.type,
    } : undefined;

    let transactions = await DatabaseService.getTransactions(dbFilters);

    // Apply additional filters
    if (filters) {
      if (filters.minAmount !== undefined) {
        const minAmount = filters.minAmount;
        transactions = transactions.filter(t => t.amount >= minAmount);
      }
      if (filters.maxAmount !== undefined) {
        const maxAmount = filters.maxAmount;
        transactions = transactions.filter(t => t.amount <= maxAmount);
      }
      if (filters.description) {
        const searchTerm = filters.description.toLowerCase();
        transactions = transactions.filter(t => 
          t.description.toLowerCase().includes(searchTerm)
        );
      }
    }

    return transactions;
  }

  // Bulk Operations
  async createBulkTransactions(transactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BulkTransactionResult> {
    const result: BulkTransactionResult = {
      successful: [],
      failed: [],
      summary: {
        total: transactions.length,
        successful: 0,
        failed: 0,
      },
    };

    for (const transactionData of transactions) {
      try {
        const transaction = await this.createTransaction(transactionData);
        result.successful.push(transaction);
        result.summary.successful++;
      } catch (error) {
        result.failed.push({
          transaction: transactionData,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.summary.failed++;
      }
    }

    return result;
  }

  async deleteBulkTransactions(ids: string[]): Promise<{ successful: string[]; failed: Array<{ id: string; error: string }> }> {
    const result = {
      successful: [] as string[],
      failed: [] as Array<{ id: string; error: string }>,
    };

    for (const id of ids) {
      try {
        await this.deleteTransaction(id);
        result.successful.push(id);
      } catch (error) {
        result.failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  // Transaction Analysis
  async getTransactionSummary(filters?: TransactionFilters): Promise<TransactionSummary> {
    const transactions = await this.getTransactions(filters);
    
    const summary: TransactionSummary = {
      totalIncome: 0,
      totalExpenses: 0,
      netAmount: 0,
      transactionCount: transactions.length,
      averageTransaction: 0,
      categoryBreakdown: {},
      accountBreakdown: {},
    };

    for (const transaction of transactions) {
      const amount = transaction.amount;
      
      if (transaction.type === 'income') {
        summary.totalIncome += amount;
      } else {
        summary.totalExpenses += amount;
      }

      // Category breakdown
      if (!summary.categoryBreakdown[transaction.category]) {
        summary.categoryBreakdown[transaction.category] = 0;
      }
      summary.categoryBreakdown[transaction.category] += amount;

      // Account breakdown
      if (!summary.accountBreakdown[transaction.account]) {
        summary.accountBreakdown[transaction.account] = 0;
      }
      summary.accountBreakdown[transaction.account] += amount;
    }

    summary.netAmount = summary.totalIncome - summary.totalExpenses;
    summary.averageTransaction = transactions.length > 0 ? 
      (summary.totalIncome + summary.totalExpenses) / transactions.length : 0;

    return summary;
  }

  async getTopCategories(limit = 5, type?: Transaction['type']): Promise<Array<{ category: string; amount: number; count: number }>> {
    const filters = type ? { type } : undefined;
    const transactions = await this.getTransactions(filters);
    
    const categoryStats = new Map<string, { amount: number; count: number }>();
    
    for (const transaction of transactions) {
      const existing = categoryStats.get(transaction.category) || { amount: 0, count: 0 };
      existing.amount += transaction.amount;
      existing.count += 1;
      categoryStats.set(transaction.category, existing);
    }

    return Array.from(categoryStats.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  async getMonthlyTrends(months = 12): Promise<Array<{ month: string; income: number; expenses: number; net: number }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.getTransactions({ startDate, endDate });
    const monthlyData = new Map<string, { income: number; expenses: number }>();

    for (const transaction of transactions) {
      const monthKey = new Date(transaction.date).toISOString().slice(0, 7); // YYYY-MM
      const existing = monthlyData.get(monthKey) || { income: 0, expenses: 0 };
      
      if (transaction.type === 'income') {
        existing.income += transaction.amount;
      } else {
        existing.expenses += transaction.amount;
      }
      
      monthlyData.set(monthKey, existing);
    }

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // Categorization
  async suggestCategory(description: string, amount: number): Promise<string | null> {
    // Simple keyword-based categorization
    const keywords = {
      'food': ['restaurant', 'grocery', 'food', 'cafe', 'pizza', 'burger', 'coffee'],
      'transport': ['gas', 'fuel', 'uber', 'taxi', 'bus', 'train', 'parking'],
      'entertainment': ['movie', 'cinema', 'game', 'music', 'netflix', 'spotify'],
      'shopping': ['amazon', 'store', 'mall', 'shop', 'purchase', 'buy'],
      'utilities': ['electric', 'water', 'internet', 'phone', 'cable', 'utility'],
      'healthcare': ['doctor', 'hospital', 'pharmacy', 'medical', 'health'],
      'salary': ['salary', 'wage', 'payroll', 'income', 'pay'],
    };

    const lowerDescription = description.toLowerCase();
    
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => lowerDescription.includes(word))) {
        // Check if this category exists in our database
        const existingCategory = this.categories.find(c => c.name.toLowerCase() === category);
        return existingCategory ? existingCategory.id : null;
      }
    }

    return null;
  }

  async autoCategorizePendingTransactions(): Promise<{ categorized: number; total: number }> {
    const uncategorizedTransactions = await this.getTransactions({
      category: '', // Assuming empty string means uncategorized
    });

    let categorizedCount = 0;

    for (const transaction of uncategorizedTransactions) {
      const suggestedCategory = await this.suggestCategory(transaction.description, transaction.amount);
      
      if (suggestedCategory) {
        await this.updateTransaction(transaction.id, { category: suggestedCategory });
        categorizedCount++;
      }
    }

    return {
      categorized: categorizedCount,
      total: uncategorizedTransactions.length,
    };
  }

  // Recurring Transactions
  async processRecurringTransactions(): Promise<Transaction[]> {
    // Get all transactions with recurring data
    const allTransactions = await DatabaseService.getTransactions();
    const recurringTransactions = allTransactions.filter(t => t.recurring);
    const processedTransactions: Transaction[] = [];
    const today = new Date();

    for (const transaction of recurringTransactions) {
      if (transaction.recurring && this.shouldProcessRecurring(transaction.recurring, today)) {
        try {
          const transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
            amount: transaction.amount,
            description: transaction.description,
            category: transaction.category,
            account: transaction.account,
            type: transaction.type,
            date: today,
          };

          const newTransaction = await this.createTransaction(transactionData);
          processedTransactions.push(newTransaction);

          // Update next occurrence date
          const nextDue = this.calculateNextOccurrence(transaction.recurring.nextDue, transaction.recurring.frequency);
          await DatabaseService.updateTransaction(transaction.id, { 
            recurring: { ...transaction.recurring, nextDue }
          });
        } catch (error) {
          console.error(`Failed to process recurring transaction ${transaction.id}:`, error);
        }
      }
    }

    return processedTransactions;
  }

  private shouldProcessRecurring(recurring: RecurringTransaction, today: Date): boolean {
    const nextDate = new Date(recurring.nextDue);
    return nextDate <= today;
  }

  private calculateNextOccurrence(currentDate: Date, frequency: RecurringTransaction['frequency']): Date {
    const nextDate = new Date(currentDate);
    
    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    
    return nextDate;
  }

  // Account Balance Management
  private async updateAccountBalance(transaction: Transaction): Promise<void> {
    const accounts = await DatabaseService.getAccounts();
    const account = accounts.find(a => a.id === transaction.account);
    if (!account) return;

    const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
    const newBalance = account.balance + balanceChange;
    
    await DatabaseService.updateAccount(transaction.account, { balance: newBalance });
  }

  private async revertAccountBalance(transaction: Transaction): Promise<void> {
    const accounts = await DatabaseService.getAccounts();
    const account = accounts.find(a => a.id === transaction.account);
    if (!account) return;

    const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
    const newBalance = account.balance + balanceChange;
    
    await DatabaseService.updateAccount(transaction.account, { balance: newBalance });
  }

  // Validation
  private async validateTransaction(transaction: Partial<Transaction>): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Use existing validation from ValidationUtils
    const validationErrors = ValidationUtils.validateTransaction(transaction as Transaction);
    errors.push(...validationErrors);

    // Additional business logic validation
    if (transaction.category) {
      const categoryExists = this.categories.some(c => c.id === transaction.category);
      if (!categoryExists) {
        errors.push({
          field: 'category',
          message: 'Category does not exist',
          code: 'INVALID_CATEGORY',
        });
      }
    }

    if (transaction.account) {
      const accountExists = this.accounts.some(a => a.id === transaction.account);
      if (!accountExists) {
        errors.push({
          field: 'account',
          message: 'Account does not exist',
          code: 'INVALID_ACCOUNT',
        });
      }
    }

    return errors;
  }

  // Search and Filtering
  async searchTransactions(query: string, filters?: TransactionFilters): Promise<Transaction[]> {
    const searchFilters: TransactionFilters = {
      ...filters,
      description: query,
    };
    
    return this.getTransactions(searchFilters);
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return this.getTransactions({ startDate, endDate });
  }

  async getTransactionsByCategory(categoryId: string): Promise<Transaction[]> {
    return this.getTransactions({ category: categoryId });
  }

  async getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
    return this.getTransactions({ account: accountId });
  }

  // Export/Import
  async exportTransactions(filters?: TransactionFilters, format: 'json' | 'csv' = 'json'): Promise<string> {
    const transactions = await this.getTransactions(filters);
    
    if (format === 'csv') {
      return this.convertToCSV(transactions);
    }
    
    return JSON.stringify(transactions, null, 2);
  }

  private convertToCSV(transactions: Transaction[]): string {
    if (transactions.length === 0) return '';
    
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Account'];
    const rows = transactions.map(t => [
      new Date(t.date).toISOString().split('T')[0],
      t.description,
      t.amount.toString(),
      t.type,
      t.category,
      t.account,
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  async importTransactions(data: string, format: 'json' | 'csv' = 'json'): Promise<BulkTransactionResult> {
    let transactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>;
    
    if (format === 'csv') {
      transactions = this.parseCSV(data);
    } else {
      transactions = JSON.parse(data);
    }
    
    return this.createBulkTransactions(transactions);
  }

  private parseCSV(csvData: string): Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>> {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, ''));
      
      return {
        date: new Date(values[0]),
        description: values[1],
        amount: Number.parseFloat(values[2]),
        type: values[3] as Transaction['type'],
        category: values[4],
        account: values[5],
      };
    });
  }

  // Utility Methods
  async refreshCategoriesAndAccounts(): Promise<void> {
    await this.loadCategoriesAndAccounts();
  }

  getAvailableCategories(): Category[] {
    return [...this.categories];
  }

  getAvailableAccounts(): Account[] {
    return [...this.accounts];
  }
}

// Export singleton instance
export const transactionManager = TransactionManager.getInstance();

// Utility functions
export namespace TransactionUtils {
  export function formatAmount(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  export function getTransactionIcon(type: Transaction['type']): string {
    return type === 'income' ? '↗️' : '↘️';
  }

  export function getTransactionColor(type: Transaction['type']): string {
    return type === 'income' ? '#10B981' : '#EF4444';
  }

  export function calculateRunningBalance(transactions: Transaction[], initialBalance = 0): Array<Transaction & { runningBalance: number }> {
    let balance = initialBalance;
    
    return transactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(transaction => {
        balance += transaction.type === 'income' ? transaction.amount : -transaction.amount;
        return { ...transaction, runningBalance: balance };
      });
  }

  export function groupTransactionsByDate(transactions: Transaction[]): Record<string, Transaction[]> {
    return transactions.reduce((groups, transaction) => {
      const dateKey = new Date(transaction.date).toISOString().split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
      return groups;
    }, {} as Record<string, Transaction[]>);
  }

  export function filterTransactionsByAmount(transactions: Transaction[], min?: number, max?: number): Transaction[] {
    return transactions.filter(t => {
      if (min !== undefined && t.amount < min) return false;
      if (max !== undefined && t.amount > max) return false;
      return true;
    });
  }
}
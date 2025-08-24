import Dexie from 'dexie';
import type { Transaction, Account } from '../../types/finance';
import { PerformanceOptimizer } from './optimization';

/**
 * Optimized database operations for handling large financial datasets
 */
export class OptimizedDatabaseService extends Dexie {
  transactions!: Dexie.Table<Transaction, string>;
  accounts!: Dexie.Table<Account, string>;

  constructor() {
    super('FinanceDashboardOptimized');
    
    this.version(1).stores({
      transactions: '++id, date, category, type, account, amount, *tags',
      accounts: '++id, name, type, balance'
    });

    // Add hooks for performance monitoring
    this.transactions.hook('creating', (primKey, obj, trans) => {
      console.debug('Creating transaction:', obj.id);
    });

    this.transactions.hook('updating', (modifications, primKey, obj, trans) => {
      console.debug('Updating transaction:', primKey);
    });
  }

  /**
   * Efficiently get transactions with pagination and filtering
   */
  async getTransactionsPaginated(
    config: PerformanceOptimizer.PaginationConfig & {
      filters?: {
        dateRange?: { start: Date; end: Date };
        categories?: string[];
        types?: ('income' | 'expense')[];
        accounts?: string[];
        minAmount?: number;
        maxAmount?: number;
        searchTerm?: string;
      };
    }
  ): Promise<PerformanceOptimizer.PaginatedResult<Transaction>> {
    let query = this.transactions.orderBy(config.sortBy || 'date');
    
    // Apply filters using database indices for better performance
    if (config.filters) {
      const { filters } = config;
      
      // Date range filter using index
      if (filters.dateRange) {
        query = this.transactions.where('date').between(
          filters.dateRange.start.toISOString(),
          filters.dateRange.end.toISOString(),
          true,
          true
        );
      }
      
      // Category filter using index
      if (filters.categories && filters.categories.length > 0) {
        query = query.and(transaction => 
          filters.categories?.includes(transaction.category) ?? false
        );
      }
      
      // Type filter using index
      if (filters.types && filters.types.length > 0) {
        query = query.and(transaction => 
          filters.types?.includes(transaction.type as 'income' | 'expense') ?? false
        );
      }
      
      // Account filter using index
      if (filters.accounts && filters.accounts.length > 0) {
        query = query.and(transaction => 
          filters.accounts?.includes(transaction.account) ?? false
        );
      }
      
      // Amount range filter
      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        query = query.and(transaction => {
          if (filters.minAmount !== undefined && transaction.amount < filters.minAmount) {
            return false;
          }
          if (filters.maxAmount !== undefined && transaction.amount > filters.maxAmount) {
            return false;
          }
          return true;
        });
      }
      
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        query = query.and(transaction => 
          transaction.description.toLowerCase().includes(searchLower) ||
          transaction.category.toLowerCase().includes(searchLower)
        );
      }
    }
    
    // Apply sorting
    if (config.sortOrder === 'asc') {
      query = query.reverse();
    }
    
    // Get total count for pagination
    const total = await query.count();
    
    // Apply pagination
    const offset = (config.page - 1) * config.limit;
    const data = await query.offset(offset).limit(config.limit).toArray();
    
    const totalPages = Math.ceil(total / config.limit);
    
    return {
      data,
      total,
      page: config.page,
      limit: config.limit,
      totalPages,
      hasNext: config.page < totalPages,
      hasPrev: config.page > 1
    };
  }

  /**
   * Bulk insert transactions with optimized performance
   */
  async bulkInsertTransactions(transactions: Transaction[]): Promise<void> {
    const batchSize = 500; // Optimal batch size for IndexedDB
    
    await PerformanceOptimizer.processBatches(
      transactions,
      async (batch) => {
        await this.transactions.bulkAdd(batch);
        return [];
      },
      batchSize
    );
  }

  /**
   * Bulk update transactions with optimized performance
   */
  async bulkUpdateTransactions(
    updates: Array<{ id: string; changes: Partial<Transaction> }>
  ): Promise<void> {
    const batchSize = 200;
    
    await PerformanceOptimizer.processBatches(
      updates,
      async (batch) => {
        await this.transaction('rw', this.transactions, async () => {
          for (const update of batch) {
            await this.transactions.update(update.id, update.changes);
          }
        });
        return [];
      },
      batchSize
    );
  }

  /**
   * Get aggregated data for charts with database-level optimization
   */
  async getAggregatedChartData(
    timeframe: 'week' | 'month' | 'year',
    dateRange?: { start: Date; end: Date }
  ): Promise<Array<{ date: string; income: number; expense: number; net: number }>> {
    let query = this.transactions.orderBy('date');
    
    if (dateRange) {
      query = this.transactions.where('date').between(
        dateRange.start.toISOString(),
        dateRange.end.toISOString(),
        true,
        true
      );
    }
    
    const transactions = await query.toArray();
    
    // Group by timeframe
    const groupedData = new Map<string, { income: number; expense: number }>();
    
    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      let key: string;
      
      switch (timeframe) {
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'month': {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        }
        case 'year': {
          key = String(date.getFullYear());
          break;
        }
      }
      
      if (!groupedData.has(key)) {
        groupedData.set(key, { income: 0, expense: 0 });
      }
      
      const group = groupedData.get(key);
      if (group) {
        if (transaction.type === 'income') {
          group.income += transaction.amount;
        } else if (transaction.type === 'expense') {
          group.expense += transaction.amount;
        }
      }
    }
    
    return Array.from(groupedData.entries())
      .map(([date, amounts]) => ({
        date,
        income: amounts.income,
        expense: amounts.expense,
        net: amounts.income - amounts.expense
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get category spending analysis with optimized queries
   */
  async getCategoryAnalysis(
    dateRange?: { start: Date; end: Date }
  ): Promise<Array<{ category: string; amount: number; count: number; percentage: number }>> {
    let query = this.transactions.where('type').equals('expense');
    
    if (dateRange) {
      query = query.and(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= dateRange.start && transactionDate <= dateRange.end;
      });
    }
    
    const expenses = await query.toArray();
    const totalAmount = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    // Group by category
    const categoryData = new Map<string, { amount: number; count: number }>();
    
    for (const expense of expenses) {
      if (!categoryData.has(expense.category)) {
        categoryData.set(expense.category, { amount: 0, count: 0 });
      }
      
      const data = categoryData.get(expense.category);
      if (data) {
        data.amount += expense.amount;
        data.count += 1;
      }
    }
    
    return Array.from(categoryData.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Clean up old data to maintain performance
   */
  async cleanupOldData(retentionDays = 365): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const oldTransactions = await this.transactions
      .where('date')
      .below(cutoffDate.toISOString())
      .count();
    
    if (oldTransactions > 0) {
      console.log(`Cleaning up ${oldTransactions} old transactions`);
      
      await this.transactions
        .where('date')
        .below(cutoffDate.toISOString())
        .delete();
    }
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats(): Promise<{
    transactionCount: number;
    accountCount: number;
    oldestTransaction?: string;
    newestTransaction?: string;
    databaseSize?: number;
  }> {
    const [transactionCount, accountCount] = await Promise.all([
      this.transactions.count(),
      this.accounts.count()
    ]);
    
    let oldestTransaction: string | undefined;
    let newestTransaction: string | undefined;
    
    if (transactionCount > 0) {
      const oldest = await this.transactions.orderBy('date').first();
      const newest = await this.transactions.orderBy('date').last();
      
      oldestTransaction = oldest?.date instanceof Date ? oldest.date.toISOString() : oldest?.date;
      newestTransaction = newest?.date instanceof Date ? newest.date.toISOString() : newest?.date;
    }
    
    return {
      transactionCount,
      accountCount,
      oldestTransaction,
      newestTransaction
    };
  }

  /**
   * Optimize database performance
   */
  async optimizeDatabase(): Promise<void> {
    // Clean up old data
    await this.cleanupOldData();
    
    // Log database statistics
    const stats = await this.getDatabaseStats();
    console.log('Database optimization complete:', stats);
  }
}

// Export singleton instance
export const optimizedDb = new OptimizedDatabaseService();
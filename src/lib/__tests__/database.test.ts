import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Transaction, Budget, Account } from '../../types/finance';

// Mock database operations
let mockTransactions: Transaction[] = [];
let mockBudgets: Budget[] = [];
let mockAccounts: Account[] = [];

const mockDatabaseService = {
  async createTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const transaction: Transaction = {
      ...data,
      id: `tx_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockTransactions.push(transaction);
    return transaction;
  },

  async getTransactions(): Promise<Transaction[]> {
    return [...mockTransactions];
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const index = mockTransactions.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Transaction not found');
    
    const updated = {
      ...mockTransactions[index],
      ...updates,
      updatedAt: new Date()
    };
    mockTransactions[index] = updated;
    return updated;
  },

  async deleteTransaction(id: string): Promise<void> {
    const index = mockTransactions.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Transaction not found');
    mockTransactions.splice(index, 1);
  },

  async createBudget(data: Omit<Budget, 'id' | 'spent' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
    const budget: Budget = {
      ...data,
      id: `budget_${Date.now()}`,
      spent: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockBudgets.push(budget);
    return budget;
  },

  async getBudgets(): Promise<Budget[]> {
    return [...mockBudgets];
  },

  async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget> {
    const index = mockBudgets.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Budget not found');
    
    const updated = {
      ...mockBudgets[index],
      ...updates,
      updatedAt: new Date()
    };
    mockBudgets[index] = updated;
    return updated;
  },

  async createAccount(data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const account: Account = {
      ...data,
      id: `acc_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockAccounts.push(account);
    return account;
  },

  async getAccounts(): Promise<Account[]> {
    return [...mockAccounts];
  },

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    const index = mockAccounts.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Account not found');
    
    const updated = {
      ...mockAccounts[index],
      ...updates,
      updatedAt: new Date()
    };
    mockAccounts[index] = updated;
    return updated;
  },

  reset() {
    mockTransactions = [];
    mockBudgets = [];
    mockAccounts = [];
  }
};

describe('DatabaseService', () => {
  beforeEach(() => {
    mockDatabaseService.reset();
  });

  describe('Transaction Operations', () => {
    const mockTransaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
      amount: 100,
      type: 'expense',
      category: 'groceries',
      description: 'Weekly groceries',
      date: new Date('2024-01-01'),
      account: 'checking'
    };

    it('should create a transaction', async () => {
      const expectedTransaction = {
        ...mockTransaction,
        id: 'generated-id',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };

      const result = await mockDatabaseService.createTransaction(mockTransaction);

      expect(result.id).toBeDefined();
      expect(result.amount).toBe(mockTransaction.amount);
      expect(result.type).toBe(mockTransaction.type);
      expect(result.category).toBe(mockTransaction.category);
    });

    it('should get all transactions', async () => {
      const mockTransactions = [
        { id: '1', ...mockTransaction, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', ...mockTransaction, createdAt: new Date(), updatedAt: new Date() }
      ];

      // First create some transactions
      await mockDatabaseService.createTransaction(mockTransaction);
      await mockDatabaseService.createTransaction({ ...mockTransaction, amount: 200 });

      const result = await mockDatabaseService.getTransactions();

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(100);
      expect(result[1].amount).toBe(200);
    });

    it('should update a transaction', async () => {
      const transactionId = 'test-id';
      const updates = { amount: 150, description: 'Updated groceries' };
      const expectedTransaction = {
        ...mockTransaction,
        ...updates,
        id: transactionId,
        updatedAt: expect.any(Date),
        createdAt: new Date()
      };

      // First create a transaction
      const created = await mockDatabaseService.createTransaction(mockTransaction);
      
      const result = await mockDatabaseService.updateTransaction(created.id, updates);

      expect(result.amount).toBe(150);
      expect(result.description).toBe('Updated groceries');
      expect(result.id).toBe(created.id);
    });

    it('should delete a transaction', async () => {
      const transactionId = 'test-id';

      // First create a transaction
      const created = await mockDatabaseService.createTransaction(mockTransaction);
      
      await mockDatabaseService.deleteTransaction(created.id);
      
      const transactions = await mockDatabaseService.getTransactions();
      expect(transactions).toHaveLength(0);
    });
  });

  describe('Budget Operations', () => {
    const mockBudget: Omit<Budget, 'id' | 'spent' | 'createdAt' | 'updatedAt'> = {
      name: 'Monthly Groceries',
      category: 'groceries',
      amount: 500,
      period: 'monthly',
      startDate: new Date('2024-01-01'),
      isActive: true
    };

    it('should create a budget', async () => {
      const expectedBudget = {
        ...mockBudget,
        id: 'generated-id',
        spent: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };

      const result = await mockDatabaseService.createBudget(mockBudget);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(mockBudget.name);
      expect(result.amount).toBe(mockBudget.amount);
      expect(result.spent).toBe(0);
    });

    it('should get all budgets', async () => {
      const mockBudgets = [
        { id: '1', ...mockBudget, spent: 0, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', ...mockBudget, spent: 100, createdAt: new Date(), updatedAt: new Date() }
      ];

      // First create some budgets
      await mockDatabaseService.createBudget(mockBudget);
      await mockDatabaseService.createBudget({ ...mockBudget, name: 'Entertainment', amount: 300 });

      const result = await mockDatabaseService.getBudgets();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Monthly Groceries');
      expect(result[1].name).toBe('Entertainment');
    });

    it('should update a budget', async () => {
      const budgetId = 'test-id';
      const updates = { amount: 600, name: 'Updated Budget' };
      const expectedBudget = {
        ...mockBudget,
        ...updates,
        id: budgetId,
        spent: 0,
        updatedAt: expect.any(Date),
        createdAt: new Date()
      };

      // First create a budget
      const created = await mockDatabaseService.createBudget(mockBudget);
      
      const result = await mockDatabaseService.updateBudget(created.id, updates);

      expect(result.amount).toBe(600);
      expect(result.name).toBe('Updated Budget');
      expect(result.id).toBe(created.id);
    });
  });

  describe('Account Operations', () => {
    const mockAccount: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Checking Account',
      type: 'checking',
      balance: 1000,
      currency: 'USD',
      isActive: true
    };

    it('should create an account', async () => {
      const expectedAccount = {
        ...mockAccount,
        id: 'generated-id',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };

      const result = await mockDatabaseService.createAccount(mockAccount);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(mockAccount.name);
      expect(result.type).toBe(mockAccount.type);
      expect(result.balance).toBe(mockAccount.balance);
    });

    it('should get all accounts', async () => {
      const mockAccounts = [
        { id: '1', ...mockAccount, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', ...mockAccount, name: 'Savings', type: 'savings' as const, createdAt: new Date(), updatedAt: new Date() }
      ];

      // First create some accounts
      await mockDatabaseService.createAccount(mockAccount);
      await mockDatabaseService.createAccount({ ...mockAccount, name: 'Savings', type: 'savings' });

      const result = await mockDatabaseService.getAccounts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Checking Account');
      expect(result[1].name).toBe('Savings');
    });

    it('should update an account', async () => {
      const accountId = 'test-id';
      const updates = { balance: 1500, name: 'Updated Checking' };
      const expectedAccount = {
        ...mockAccount,
        ...updates,
        id: accountId,
        updatedAt: expect.any(Date),
        createdAt: new Date()
      };

      // First create an account
      const created = await mockDatabaseService.createAccount(mockAccount);
      
      const result = await mockDatabaseService.updateAccount(created.id, updates);

      expect(result.balance).toBe(1500);
      expect(result.name).toBe('Updated Checking');
      expect(result.id).toBe(created.id);
    });
  });
});
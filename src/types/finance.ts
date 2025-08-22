export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  subcategory?: string;
  date: Date;
  type: 'income' | 'expense' | 'transfer';
  account: string;
  tags?: string[];
  recurring?: RecurringTransaction;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringTransaction {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g., every 2 weeks = frequency: 'weekly', interval: 2
  endDate?: Date;
  nextDue: Date;
}

export interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  spent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  subcategories?: Subcategory[];
  isDefault: boolean;
  createdAt: Date;
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  color?: string;
  icon?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  cashFlow: number;
  budgetUtilization: number;
  period: 'week' | 'month' | 'year';
  periodStart: Date;
  periodEnd: Date;
}

export interface SyncStatus {
  lastSync: Date | null;
  isOnline: boolean;
  isSyncing: boolean;
  hasConflicts: boolean;
  conflictCount: number;
  autoSync: boolean;
}

export interface UserPreferences {
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  defaultAccount: string;
  budgetAlerts: boolean;
  syncSettings: {
    autoSync: boolean;
    syncInterval: number; // minutes
    backupRetention: number; // days
  };
}

export interface EncryptedData {
  data: string; // encrypted JSON string
  iv: string; // initialization vector
  timestamp: number;
}

export interface DataConflict {
  id: string;
  type: 'transaction' | 'budget' | 'account' | 'category';
  localData: Transaction | Budget | Account | Category;
  cloudData: Transaction | Budget | Account | Category;
  conflictDate: Date;
  resolved: boolean;
}

export type ChartTimeframe = '7d' | '30d' | '90d' | '1y' | 'all';

export interface ChartDataPoint {
  date: string;
  value: number;
  category?: string;
  label?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}
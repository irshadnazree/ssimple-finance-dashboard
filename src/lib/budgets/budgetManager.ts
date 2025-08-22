import type {
  Budget,
  Transaction,
  Category,
  ValidationError,
  FinancialSummary,
} from '../../types/finance';
import { DatabaseService, db } from '../database/db';
import { ValidationUtils } from '../calculations/finance';
import { transactionManager } from '../transactions/transactionManager';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

export interface BudgetFilters {
  category?: string;
  period?: Budget['period'];
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  utilizationRate: number;
  budgetCount: number;
  overBudgetCount: number;
  categoryBreakdown: Record<string, {
    budgeted: number;
    spent: number;
    remaining: number;
    utilization: number;
  }>;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  budgetName: string;
  type: 'warning' | 'exceeded' | 'approaching';
  message: string;
  threshold: number;
  currentSpent: number;
  budgetAmount: number;
  createdAt: Date;
}

export interface BudgetPerformance {
  budgetId: string;
  budgetName: string;
  category: string;
  period: Budget['period'];
  budgetAmount: number;
  actualSpent: number;
  remaining: number;
  utilizationRate: number;
  variance: number;
  variancePercentage: number;
  status: 'under' | 'on-track' | 'over' | 'exceeded';
  daysRemaining: number;
  projectedSpend: number;
  isOnTrack: boolean;
}

export interface BudgetTrend {
  period: string;
  budgeted: number;
  spent: number;
  variance: number;
  utilizationRate: number;
}

export class BudgetManager {
  private static instance: BudgetManager;
  private categories: Category[] = [];
  private alertThresholds = {
    warning: 0.75, // 75%
    approaching: 0.9, // 90%
    exceeded: 1.0, // 100%
  };

  private constructor() {
    this.loadCategories();
  }

  static getInstance(): BudgetManager {
    if (!BudgetManager.instance) {
      BudgetManager.instance = new BudgetManager();
    }
    return BudgetManager.instance;
  }

  private async loadCategories(): Promise<void> {
    try {
      this.categories = await DatabaseService.getCategories();
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  // CRUD Operations
  async createBudget(budgetData: Omit<Budget, 'id' | 'spent' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
    // Validate budget data
    const validationErrors = await this.validateBudget(budgetData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Check for overlapping budgets
    const overlappingBudget = await this.findOverlappingBudget(budgetData);
    if (overlappingBudget) {
      throw new Error(`A budget for category "${budgetData.category}" already exists for this period`);
    }

    // Calculate initial spent amount
    const spent = await this.calculateSpentAmount(budgetData.category, budgetData.startDate, budgetData.endDate);

    const budget = await DatabaseService.createBudget(budgetData);

    return budget;
  }

  async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget | undefined> {
    const originalBudget = await this.getBudget(id);
    if (!originalBudget) {
      throw new Error('Budget not found');
    }

    // Validate updates
    const updatedData = { ...originalBudget, ...updates };
    const validationErrors = await this.validateBudget(updatedData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Check for overlapping budgets (excluding current budget)
    if (updates.category || updates.startDate || updates.endDate || updates.period) {
      const overlappingBudget = await this.findOverlappingBudget(updatedData, id);
      if (overlappingBudget) {
        throw new Error(`A budget for category "${updatedData.category}" already exists for this period`);
      }
    }

    // Recalculate spent amount if period or category changed
    if (updates.category || updates.startDate || updates.endDate) {
      const spent = await this.calculateSpentAmount(
        updatedData.category,
        updatedData.startDate,
        updatedData.endDate
      );
      updates.spent = spent;
    }

    return DatabaseService.updateBudget(id, updates);
  }

  async deleteBudget(id: string): Promise<void> {
    await db.budgets.delete(id);
  }

  async getBudget(id: string): Promise<Budget | undefined> {
    const budgets = await DatabaseService.getBudgets();
    return budgets.find(b => b.id === id);
  }

  async getBudgets(filters?: BudgetFilters): Promise<Budget[]> {
    let budgets = await DatabaseService.getBudgets(filters?.isActive);

    // Apply category filter
    if (filters?.category) {
      budgets = budgets.filter(b => b.category === filters.category);
    }

    // Apply additional filters
    if (filters) {
      if (filters.period) {
        budgets = budgets.filter(b => b.period === filters.period);
      }
      if (filters.startDate || filters.endDate) {
        budgets = budgets.filter(b => {
          const budgetStart = new Date(b.startDate);
          const budgetEnd = b.endDate ? new Date(b.endDate) : this.calculatePeriodEnd(budgetStart, b.period);
          
          if (filters.startDate && budgetEnd < filters.startDate) return false;
          if (filters.endDate && budgetStart > filters.endDate) return false;
          return true;
        });
      }
    }

    return budgets;
  }

  // Budget Analysis
  async getBudgetSummary(filters?: BudgetFilters): Promise<BudgetSummary> {
    const budgets = await this.getBudgets(filters);
    
    const summary: BudgetSummary = {
      totalBudgeted: 0,
      totalSpent: 0,
      totalRemaining: 0,
      utilizationRate: 0,
      budgetCount: budgets.length,
      overBudgetCount: 0,
      categoryBreakdown: {},
    };

    for (const budget of budgets) {
      summary.totalBudgeted += budget.amount;
      summary.totalSpent += budget.spent;
      
      if (budget.spent > budget.amount) {
        summary.overBudgetCount++;
      }

      // Category breakdown
      if (!summary.categoryBreakdown[budget.category]) {
        summary.categoryBreakdown[budget.category] = {
          budgeted: 0,
          spent: 0,
          remaining: 0,
          utilization: 0,
        };
      }
      
      const categoryData = summary.categoryBreakdown[budget.category];
      categoryData.budgeted += budget.amount;
      categoryData.spent += budget.spent;
      categoryData.remaining = categoryData.budgeted - categoryData.spent;
      categoryData.utilization = categoryData.budgeted > 0 ? 
        (categoryData.spent / categoryData.budgeted) * 100 : 0;
    }

    summary.totalRemaining = summary.totalBudgeted - summary.totalSpent;
    summary.utilizationRate = summary.totalBudgeted > 0 ? 
      (summary.totalSpent / summary.totalBudgeted) * 100 : 0;

    return summary;
  }

  async getBudgetPerformance(budgetId?: string): Promise<BudgetPerformance[]> {
    const budgets = budgetId ? 
      [await this.getBudget(budgetId)].filter(Boolean) as Budget[] :
      await this.getBudgets({ isActive: true });

    const performances: BudgetPerformance[] = [];

    for (const budget of budgets) {
      const performance = await this.calculateBudgetPerformance(budget);
      performances.push(performance);
    }

    return performances;
  }

  private async calculateBudgetPerformance(budget: Budget): Promise<BudgetPerformance> {
    const now = new Date();
    const startDate = new Date(budget.startDate);
    const endDate = budget.endDate ? new Date(budget.endDate) : this.calculatePeriodEnd(startDate, budget.period);
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDays - elapsedDays);
    
    const timeProgress = totalDays > 0 ? Math.min(1, elapsedDays / totalDays) : 1;
    const expectedSpend = budget.amount * timeProgress;
    const projectedSpend = elapsedDays > 0 ? (budget.spent / elapsedDays) * totalDays : 0;
    
    const remaining = budget.amount - budget.spent;
    const utilizationRate = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
    const variance = budget.spent - expectedSpend;
    const variancePercentage = expectedSpend > 0 ? (variance / expectedSpend) * 100 : 0;
    
    let status: BudgetPerformance['status'];
    if (budget.spent > budget.amount) {
      status = 'exceeded';
    } else if (utilizationRate > 90) {
      status = 'over';
    } else if (utilizationRate > 75) {
      status = 'on-track';
    } else {
      status = 'under';
    }
    
    const isOnTrack = projectedSpend <= budget.amount * 1.1; // 10% tolerance

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      category: budget.category,
      period: budget.period,
      budgetAmount: budget.amount,
      actualSpent: budget.spent,
      remaining,
      utilizationRate,
      variance,
      variancePercentage,
      status,
      daysRemaining,
      projectedSpend,
      isOnTrack,
    };
  }

  async getBudgetTrends(months = 12): Promise<BudgetTrend[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const budgets = await this.getBudgets({ startDate, endDate });
    const monthlyData = new Map<string, { budgeted: number; spent: number }>();

    for (const budget of budgets) {
      const budgetStart = new Date(budget.startDate);
      const monthKey = budgetStart.toISOString().slice(0, 7); // YYYY-MM
      
      const existing = monthlyData.get(monthKey) || { budgeted: 0, spent: 0 };
      existing.budgeted += budget.amount;
      existing.spent += budget.spent;
      monthlyData.set(monthKey, existing);
    }

    return Array.from(monthlyData.entries())
      .map(([period, data]) => {
        const variance = data.spent - data.budgeted;
        const utilizationRate = data.budgeted > 0 ? (data.spent / data.budgeted) * 100 : 0;
        
        return {
          period,
          budgeted: data.budgeted,
          spent: data.spent,
          variance,
          utilizationRate,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  // Budget Alerts
  async generateBudgetAlerts(): Promise<BudgetAlert[]> {
    const activeBudgets = await this.getBudgets({ isActive: true });
    const alerts: BudgetAlert[] = [];

    for (const budget of activeBudgets) {
      const utilizationRate = budget.amount > 0 ? budget.spent / budget.amount : 0;
      
      let alertType: BudgetAlert['type'] | null = null;
      let threshold = 0;
      
      if (utilizationRate >= this.alertThresholds.exceeded) {
        alertType = 'exceeded';
        threshold = this.alertThresholds.exceeded;
      } else if (utilizationRate >= this.alertThresholds.approaching) {
        alertType = 'approaching';
        threshold = this.alertThresholds.approaching;
      } else if (utilizationRate >= this.alertThresholds.warning) {
        alertType = 'warning';
        threshold = this.alertThresholds.warning;
      }
      
      if (alertType) {
        const alert: BudgetAlert = {
          id: crypto.randomUUID(),
          budgetId: budget.id,
          budgetName: budget.name,
          type: alertType,
          message: this.generateAlertMessage(budget, alertType, utilizationRate),
          threshold,
          currentSpent: budget.spent,
          budgetAmount: budget.amount,
          createdAt: new Date(),
        };
        
        alerts.push(alert);
      }
    }

    return alerts;
  }

  private generateAlertMessage(budget: Budget, type: BudgetAlert['type'], utilizationRate: number): string {
    const percentage = Math.round(utilizationRate * 100);
    const remaining = budget.amount - budget.spent;
    
    switch (type) {
      case 'exceeded':
        return `Budget "${budget.name}" has been exceeded by $${Math.abs(remaining).toFixed(2)} (${percentage}% used)`;
      case 'approaching':
        return `Budget "${budget.name}" is approaching its limit with $${remaining.toFixed(2)} remaining (${percentage}% used)`;
      case 'warning':
        return `Budget "${budget.name}" has used ${percentage}% of its allocation with $${remaining.toFixed(2)} remaining`;
      default:
        return `Budget "${budget.name}" requires attention`;
    }
  }

  // Budget Refresh and Sync
  async refreshBudgetSpending(budgetId?: string): Promise<void> {
    const budgets = budgetId ? 
      [await this.getBudget(budgetId)].filter(Boolean) as Budget[] :
      await this.getBudgets({ isActive: true });

    for (const budget of budgets) {
      const spent = await this.calculateSpentAmount(
        budget.category,
        budget.startDate,
        budget.endDate
      );
      
      if (spent !== budget.spent) {
        await DatabaseService.updateBudget(budget.id, { spent });
      }
    }
  }

  async refreshAllBudgets(): Promise<void> {
    await this.refreshBudgetSpending();
    await this.loadCategories();
  }

  // Utility Methods
  private async calculateSpentAmount(categoryId: string, startDate: Date, endDate?: Date): Promise<number> {
    const actualEndDate = endDate || this.calculatePeriodEnd(startDate, 'monthly');
    
    const transactions = await transactionManager.getTransactions({
      category: categoryId,
      startDate,
      endDate: actualEndDate,
      type: 'expense',
    });

    return transactions.reduce((total, transaction) => total + transaction.amount, 0);
  }

  private calculatePeriodEnd(startDate: Date, period: Budget['period']): Date {
    const endDate = new Date(startDate);
    
    switch (period) {
      case 'weekly':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    
    return endDate;
  }

  private async findOverlappingBudget(budgetData: Partial<Budget>, excludeId?: string): Promise<Budget | null> {
    const budgets = await this.getBudgets({ 
      category: budgetData.category,
      isActive: true,
    });

    if (!budgetData.startDate || !budgetData.period) {
      return null;
    }
    
    const startDate = new Date(budgetData.startDate);
    const endDate = budgetData.endDate ? 
      new Date(budgetData.endDate) : 
      this.calculatePeriodEnd(startDate, budgetData.period);

    for (const budget of budgets) {
      if (excludeId && budget.id === excludeId) continue;
      
      const budgetStart = new Date(budget.startDate);
      const budgetEnd = budget.endDate ? 
        new Date(budget.endDate) : 
        this.calculatePeriodEnd(budgetStart, budget.period);

      // Check for overlap
      if (startDate <= budgetEnd && endDate >= budgetStart) {
        return budget;
      }
    }

    return null;
  }

  private async validateBudget(budget: Partial<Budget>): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Use existing validation from ValidationUtils
    const validationErrors = ValidationUtils.validateBudget(budget as Budget);
    errors.push(...validationErrors);

    // Additional business logic validation
    if (budget.category) {
      const categoryExists = this.categories.some(c => c.id === budget.category);
      if (!categoryExists) {
        errors.push({
          field: 'category',
          message: 'Category does not exist',
          code: 'INVALID_CATEGORY',
        });
      }
    }

    if (budget.startDate && budget.endDate) {
      if (new Date(budget.startDate) >= new Date(budget.endDate)) {
        errors.push({
          field: 'endDate',
          message: 'End date must be after start date',
          code: 'INVALID_DATE_RANGE',
        });
      }
    }

    return errors;
  }

  // Category Budget Management
  async getBudgetsByCategory(categoryId: string): Promise<Budget[]> {
    return this.getBudgets({ category: categoryId });
  }

  async getTotalBudgetForCategory(categoryId: string, period?: Budget['period']): Promise<number> {
    const filters: BudgetFilters = { category: categoryId, isActive: true };
    if (period) filters.period = period;
    
    const budgets = await this.getBudgets(filters);
    return budgets.reduce((total, budget) => total + budget.amount, 0);
  }

  async getCategoryBudgetUtilization(categoryId: string): Promise<{
    budgeted: number;
    spent: number;
    remaining: number;
    utilizationRate: number;
  }> {
    const budgets = await this.getBudgets({ category: categoryId, isActive: true });
    
    const budgeted = budgets.reduce((total, budget) => total + budget.amount, 0);
    const spent = budgets.reduce((total, budget) => total + budget.spent, 0);
    const remaining = budgeted - spent;
    const utilizationRate = budgeted > 0 ? (spent / budgeted) * 100 : 0;

    return { budgeted, spent, remaining, utilizationRate };
  }

  // Budget Templates and Suggestions
  async suggestBudgetAmount(categoryId: string, period: Budget['period']): Promise<number> {
    // Get historical spending for this category
    const endDate = new Date();
    const startDate = new Date();
    
    // Look back 6 months for pattern analysis
    startDate.setMonth(startDate.getMonth() - 6);
    
    const transactions = await transactionManager.getTransactions({
      category: categoryId,
      startDate,
      endDate,
      type: 'expense',
    });

    if (transactions.length === 0) {
      return 0;
    }

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const monthsOfData = 6;
    const averageMonthlySpend = totalSpent / monthsOfData;

    // Adjust for different periods
    switch (period) {
      case 'weekly':
        return Math.round(averageMonthlySpend / 4.33); // Average weeks per month
      case 'monthly':
        return Math.round(averageMonthlySpend);
      case 'yearly':
        return Math.round(averageMonthlySpend * 12);
      default:
        return Math.round(averageMonthlySpend);
    }
  }

  async createBudgetFromTemplate(templateName: string, customizations?: Partial<Budget>): Promise<Budget> {
    const templates = this.getBudgetTemplates();
    const template = templates[templateName];
    
    if (!template) {
      throw new Error(`Budget template "${templateName}" not found`);
    }

    const budgetData = {
      ...template,
      ...customizations,
      startDate: customizations?.startDate || new Date(),
    };

    return this.createBudget(budgetData);
  }

  private getBudgetTemplates(): Record<string, Omit<Budget, 'id' | 'spent' | 'createdAt' | 'updatedAt'>> {
    return {
      'monthly-essentials': {
        name: 'Monthly Essentials',
        category: '', // To be filled
        amount: 2000,
        period: 'monthly',
        startDate: new Date(),
        isActive: true,
      },
      'weekly-groceries': {
        name: 'Weekly Groceries',
        category: '', // To be filled
        amount: 150,
        period: 'weekly',
        startDate: new Date(),
        isActive: true,
      },
      'annual-vacation': {
        name: 'Annual Vacation',
        category: '', // To be filled
        amount: 3000,
        period: 'yearly',
        startDate: new Date(),
        isActive: true,
      },
    };
  }

  // Export/Import
  async exportBudgets(filters?: BudgetFilters): Promise<string> {
    const budgets = await this.getBudgets(filters);
    return JSON.stringify(budgets, null, 2);
  }

  async importBudgets(data: string): Promise<{ successful: Budget[]; failed: Array<{ budget: Partial<Budget>; error: string }> }> {
    const budgets = JSON.parse(data) as Partial<Budget>[];
    const result = {
      successful: [] as Budget[],
      failed: [] as Array<{ budget: Partial<Budget>; error: string }>,
    };

    for (const budgetData of budgets) {
      try {
        // Remove id and timestamps for import
        const { id, createdAt, updatedAt, spent, ...importData } = budgetData;
        
        // Validate required fields
        if (!importData.name || !importData.category || !importData.amount || !importData.period || !importData.startDate) {
          throw new Error('Missing required fields');
        }
        
        const budget = await this.createBudget(importData as Omit<Budget, 'id' | 'spent' | 'createdAt' | 'updatedAt'>);
        result.successful.push(budget);
      } catch (error) {
        result.failed.push({
          budget: budgetData,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  // Utility Methods
  getAvailableCategories(): Category[] {
    return [...this.categories];
  }

  setAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  getAlertThresholds(): typeof this.alertThresholds {
    return { ...this.alertThresholds };
  }
}

// Export singleton instance
export const budgetManager = BudgetManager.getInstance();

// Utility functions
export namespace BudgetUtils {
  export function formatBudgetPeriod(period: Budget['period']): string {
    const periodMap = {
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    return periodMap[period] || period;
  }

  export function calculateBudgetProgress(spent: number, amount: number): number {
    return amount > 0 ? Math.min(100, (spent / amount) * 100) : 0;
  }

  export function getBudgetStatusColor(utilizationRate: number): string {
    if (utilizationRate >= 100) return '#EF4444'; // Red - exceeded
    if (utilizationRate >= 90) return '#F59E0B'; // Orange - approaching
    if (utilizationRate >= 75) return '#EAB308'; // Yellow - warning
    return '#10B981'; // Green - on track
  }

  export function getBudgetStatusIcon(utilizationRate: number): string {
    if (utilizationRate >= 100) return '🚨';
    if (utilizationRate >= 90) return '⚠️';
    if (utilizationRate >= 75) return '📊';
    return '✅';
  }

  export function formatBudgetAmount(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  export function calculateDaysInPeriod(startDate: Date, period: Budget['period']): number {
    const start = new Date(startDate);
    const end = new Date(startDate);
    
    switch (period) {
      case 'weekly':
        end.setDate(end.getDate() + 7);
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  export function groupBudgetsByCategory(budgets: Budget[]): Record<string, Budget[]> {
    return budgets.reduce((groups, budget) => {
      if (!groups[budget.category]) {
        groups[budget.category] = [];
      }
      groups[budget.category].push(budget);
      return groups;
    }, {} as Record<string, Budget[]>);
  }

  export function sortBudgetsByUtilization(budgets: Budget[], descending = true): Budget[] {
    return [...budgets].sort((a, b) => {
      const aUtilization = a.amount > 0 ? a.spent / a.amount : 0;
      const bUtilization = b.amount > 0 ? b.spent / b.amount : 0;
      return descending ? bUtilization - aUtilization : aUtilization - bUtilization;
    });
  }
}
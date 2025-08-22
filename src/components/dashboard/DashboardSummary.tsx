import React, { useState, useEffect } from 'react';
import type { Transaction, Budget, Account } from '../../types/finance';
import { DatabaseService } from '../../lib/database/db';
import { transactionManager } from '../../lib/transactions/transactionManager';
import { budgetManager } from '../../lib/budgets/budgetManager';

interface DashboardSummaryProps {
  className?: string;
}

interface SummaryData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  activeBudgets: number;
  recentTransactions: Transaction[];
  budgetAlerts: Array<{ budget: Budget; percentUsed: number }>;
}

export default function DashboardSummary({ className = '' }: DashboardSummaryProps) {
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    activeBudgets: 0,
    recentTransactions: [],
    budgetAlerts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummaryData();
  }, []);

  const loadSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current month date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Load accounts and calculate total balance
      const accounts = await DatabaseService.getAccounts();
      const totalBalance = accounts
        .filter(account => account.isActive)
        .reduce((sum, account) => sum + account.balance, 0);

      // Load transactions for current month
      const transactions = await transactionManager.getTransactions({
        startDate: startOfMonth,
        endDate: endOfMonth,
      });

      // Calculate monthly income and expenses
      const monthlyIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const monthlyExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      // Get recent transactions (last 5)
      const allTransactions = await transactionManager.getTransactions({});
      const recentTransactions = allTransactions.slice(0, 5);

      // Load active budgets
      const budgets = await budgetManager.getBudgets({ isActive: true });
      const activeBudgets = budgets.length;

      // Check for budget alerts (>80% used)
      const budgetAlerts = budgets
        .map(budget => {
          const percentUsed = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
          return { budget, percentUsed };
        })
        .filter(({ percentUsed }) => percentUsed > 80)
        .sort((a, b) => b.percentUsed - a.percentUsed);

      setSummaryData({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        activeBudgets,
        recentTransactions,
        budgetAlerts,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded" />
              ))}
            </div>
            <div className="h-32 bg-gray-200 rounded" />
          </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Error loading dashboard: {error}</p>
          <button
            type="button"
            onClick={loadSummaryData}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h2>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600">Total Balance</h3>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(summaryData.totalBalance)}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600">Monthly Income</h3>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(summaryData.monthlyIncome)}</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-600">Monthly Expenses</h3>
            <p className="text-2xl font-bold text-red-900">{formatCurrency(summaryData.monthlyExpenses)}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-600">Active Budgets</h3>
            <p className="text-2xl font-bold text-purple-900">{summaryData.activeBudgets}</p>
          </div>
        </div>

        {/* Budget Alerts */}
        {summaryData.budgetAlerts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-3">Budget Alerts</h3>
            <div className="space-y-2">
              {summaryData.budgetAlerts.slice(0, 3).map(({ budget, percentUsed }) => (
                <div key={budget.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <p className="font-medium text-yellow-800">{budget.name}</p>
                    <p className="text-sm text-yellow-600">
                      {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)} used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-800">{percentUsed.toFixed(0)}%</p>
                    <div className="w-16 h-2 bg-yellow-200 rounded-full mt-1">
                      <div 
                        className="h-2 bg-yellow-500 rounded-full" 
                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-3">Recent Transactions</h3>
          {summaryData.recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent transactions</p>
          ) : (
            <div className="space-y-2">
              {summaryData.recentTransactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {transaction.category} • {formatDate(transaction.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
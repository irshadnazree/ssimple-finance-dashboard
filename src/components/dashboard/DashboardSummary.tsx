import React, { useState, useEffect } from 'react';
import type { Transaction, Budget, Account } from '../../types/finance';
import { DatabaseService } from '../../lib/database/db';
import { transactionManager } from '../../lib/transactions/transactionManager';
import { budgetManager } from '../../lib/budgets/budgetManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

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
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Error loading dashboard: {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={loadSummaryData} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>Your financial summary at a glance</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-blue-600">Total Balance</div>
              <div className="text-2xl font-bold">{formatCurrency(summaryData.totalBalance)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-green-600">Monthly Income</div>
              <div className="text-2xl font-bold">{formatCurrency(summaryData.monthlyIncome)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-red-600">Monthly Expenses</div>
              <div className="text-2xl font-bold">{formatCurrency(summaryData.monthlyExpenses)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-purple-600">Active Budgets</div>
              <div className="text-2xl font-bold">{summaryData.activeBudgets}</div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Alerts */}
        {summaryData.budgetAlerts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-md font-medium mb-3">Budget Alerts</h3>
            <div className="space-y-3">
              {summaryData.budgetAlerts.slice(0, 3).map(({ budget, percentUsed }) => (
                <Alert key={budget.id} className="border-yellow-200 bg-yellow-50">
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{budget.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)} used
                        </div>
                        <Progress value={percentUsed} className="mt-2 w-full" />
                      </div>
                      <div className="ml-4">
                        <Badge variant={percentUsed > 90 ? "destructive" : "secondary"}>
                          {percentUsed.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div>
          <h3 className="text-md font-medium mb-3">Recent Transactions</h3>
          {summaryData.recentTransactions.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">No recent transactions</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {summaryData.recentTransactions.map(transaction => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.category} • {formatDate(transaction.date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={transaction.type === 'income' ? 'default' : 'secondary'}
                          className={transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
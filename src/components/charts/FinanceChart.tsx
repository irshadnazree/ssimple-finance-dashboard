import React, { useState, useEffect } from 'react';
import type { Transaction } from '../../types/finance';
import { transactionManager } from '../../lib/transactions/transactionManager';

interface ChartDataPoint {
  date: string;
  income: number;
  expenses: number;
  net: number;
}

interface FinanceChartProps {
  timeframe: 'week' | 'month' | 'year';
  className?: string;
}

export default function FinanceChart({ timeframe, className = '' }: FinanceChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChartData();
  }, [timeframe]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      let startDate: Date;
      let dateFormat: Intl.DateTimeFormatOptions;
      let groupBy: 'day' | 'week' | 'month';

      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFormat = { weekday: 'short' };
          groupBy = 'day';
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFormat = { day: 'numeric' };
          groupBy = 'day';
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          dateFormat = { month: 'short' };
          groupBy = 'month';
          break;
      }

      const transactions = await transactionManager.getTransactions({
        startDate,
        endDate: now,
      });

      const groupedData = groupTransactionsByPeriod(transactions, groupBy, startDate, now);
      const formattedData = groupedData.map(item => ({
        ...item,
        date: new Intl.DateTimeFormat('en-US', dateFormat).format(new Date(item.date)),
      }));

      setChartData(formattedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const groupTransactionsByPeriod = (
    transactions: Transaction[],
    groupBy: 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date
  ): ChartDataPoint[] => {
    const groups = new Map<string, { income: number; expenses: number }>();

    // Initialize all periods with zero values
    const current = new Date(startDate);
    while (current <= endDate) {
      const key = getDateKey(current, groupBy);
      groups.set(key, { income: 0, expenses: 0 });
      
      // Increment by the appropriate period
      switch (groupBy) {
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    // Group transactions
    for (const transaction of transactions) {
      const key = getDateKey(new Date(transaction.date), groupBy);
      const group = groups.get(key);
      
      if (group) {
        if (transaction.type === 'income') {
          group.income += transaction.amount;
        } else {
          group.expenses += transaction.amount;
        }
      }
    }

    // Convert to array and calculate net
    return Array.from(groups.entries())
      .map(([date, { income, expenses }]) => ({
        date,
        income,
        expenses,
        net: income - expenses,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getDateKey = (date: Date, groupBy: 'day' | 'week' | 'month'): string => {
    switch (groupBy) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      }
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxValue = Math.max(
    ...chartData.map(d => Math.max(d.income, d.expenses)),
    0
  );

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Error loading chart: {error}</p>
          <button
            type="button"
            onClick={loadChartData}
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Income vs Expenses ({timeframe})
        </h3>
        
        {chartData.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No data available for the selected timeframe</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex justify-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2" />
                <span>Income</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-2" />
                <span>Expenses</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2" />
                <span>Net</span>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="relative h-64 border-l border-b border-gray-300">
              <div className="absolute inset-0 flex items-end justify-around px-2">
                {chartData.map((dataPoint) => {
                  const incomeHeight = maxValue > 0 ? (dataPoint.income / maxValue) * 100 : 0;
                  const expenseHeight = maxValue > 0 ? (dataPoint.expenses / maxValue) * 100 : 0;
                  
                  return (
                    <div key={dataPoint.date} className="flex flex-col items-center space-y-1 flex-1 max-w-16">
                      {/* Bars */}
                      <div className="flex items-end space-x-1 h-48">
                        {/* Income bar */}
                        <div 
                          className="w-4 bg-green-500 rounded-t" 
                          style={{ height: `${incomeHeight}%` }}
                          title={`Income: ${formatCurrency(dataPoint.income)}`}
                        />
                        {/* Expense bar */}
                        <div 
                          className="w-4 bg-red-500 rounded-t" 
                          style={{ height: `${expenseHeight}%` }}
                          title={`Expenses: ${formatCurrency(dataPoint.expenses)}`}
                        />
                      </div>
                      
                      {/* Date label */}
                      <div className="text-xs text-gray-600 text-center transform -rotate-45 origin-center">
                        {dataPoint.date}
                      </div>
                      
                      {/* Net value */}
                      <div className={`text-xs font-medium ${
                        dataPoint.net >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {dataPoint.net >= 0 ? '+' : ''}{formatCurrency(dataPoint.net)}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-12">
                <span>{formatCurrency(maxValue)}</span>
                <span>{formatCurrency(maxValue * 0.75)}</span>
                <span>{formatCurrency(maxValue * 0.5)}</span>
                <span>{formatCurrency(maxValue * 0.25)}</span>
                <span>$0</span>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Income</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(chartData.reduce((sum, d) => sum + d.income, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(chartData.reduce((sum, d) => sum + d.expenses, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Net Total</p>
                <p className={`text-lg font-semibold ${
                  chartData.reduce((sum, d) => sum + d.net, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(chartData.reduce((sum, d) => sum + d.net, 0))}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
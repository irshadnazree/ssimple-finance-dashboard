import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import FinanceChart from '../components/charts/FinanceChart';

export const Route = createFileRoute('/')({component: Dashboard,})

function Dashboard() {
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month' | 'year'>('month');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your financial health</p>
        </div>

        <div className="space-y-8">
          {/* Summary Section */}
          <DashboardSummary />

          {/* Chart Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Financial Trends</h2>
                <div className="flex space-x-2">
                  {(['week', 'month', 'year'] as const).map(timeframe => (
                    <button
                      key={timeframe}
                      type="button"
                      onClick={() => setChartTimeframe(timeframe)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        chartTimeframe === timeframe
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <FinanceChart timeframe={chartTimeframe} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
              >
                <div className="text-blue-600 text-2xl mb-2">+</div>
                <div className="font-medium text-gray-900">Add Transaction</div>
                <div className="text-sm text-gray-500">Record income or expense</div>
              </button>
              
              <button
                type="button"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-center"
              >
                <div className="text-green-600 text-2xl mb-2">📊</div>
                <div className="font-medium text-gray-900">Create Budget</div>
                <div className="text-sm text-gray-500">Set spending limits</div>
              </button>
              
              <button
                type="button"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-center"
              >
                <div className="text-purple-600 text-2xl mb-2">📈</div>
                <div className="font-medium text-gray-900">View Reports</div>
                <div className="text-sm text-gray-500">Analyze your finances</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

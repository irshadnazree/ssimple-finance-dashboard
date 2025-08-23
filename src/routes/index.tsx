import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import FinanceChart from '../components/charts/FinanceChart';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export const Route = createFileRoute('/')({component: Dashboard,})

function Dashboard() {
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month' | 'year'>('month');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your financial health</p>
        </div>

        <div className="space-y-8">
          {/* Summary Section */}
          <DashboardSummary />

          {/* Chart Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Financial Trends</CardTitle>
                <div className="flex space-x-2">
                  {(['week', 'month', 'year'] as const).map(timeframe => (
                    <Button
                      key={timeframe}
                      variant={chartTimeframe === timeframe ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChartTimeframe(timeframe)}
                    >
                      {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FinanceChart timeframe={chartTimeframe} />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center space-y-2"
                >
                  <div className="text-blue-600 text-2xl">+</div>
                  <div className="font-medium">Add Transaction</div>
                  <div className="text-sm text-muted-foreground">Record income or expense</div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center space-y-2"
                >
                  <div className="text-green-600 text-2xl">📊</div>
                  <div className="font-medium">Create Budget</div>
                  <div className="text-sm text-muted-foreground">Set spending limits</div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center space-y-2"
                >
                  <div className="text-purple-600 text-2xl">📈</div>
                  <div className="font-medium">View Reports</div>
                  <div className="text-sm text-muted-foreground">Analyze your finances</div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

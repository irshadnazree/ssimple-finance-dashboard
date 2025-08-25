import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, DollarSign, Target, PieChart, BarChart3, AlertTriangle, CheckCircle } from 'lucide-react';
import type { PerformanceMetrics, FinancialSummaryReport } from '../../types/finance';

interface PerformanceMetricsDashboardProps {
  metrics: PerformanceMetrics;
  financialSummary?: FinancialSummaryReport;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description: string;
  status: 'good' | 'warning' | 'poor';
  target?: number;
}

function MetricCard({ title, value, change, icon, description, status, target }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (title.includes('Rate') || title.includes('Ratio') || title.includes('Score')) {
        return `${val.toFixed(1)}%`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <Card className={`border-l-4 ${getStatusColor()}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
            )}
            <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="ml-1">from last period</span>
          </div>
        )}
        {target !== undefined && (
          <div className="text-xs text-muted-foreground mt-1">
            Target: {target.toFixed(1)}%
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}

function HealthScoreGauge({ score }: { score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Financial Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120" aria-label="Financial Health Score Gauge">
            <title>Financial Health Score Gauge</title>
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 314} 314`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score.toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground">out of 100</span>
          </div>
        </div>
        <div className="text-center mt-4">
          <p className={`font-medium ${getScoreColor(score)}`}>
            {getScoreLabel(score)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Based on savings rate, expense ratio, and income stability
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickInsights({ metrics, financialSummary }: PerformanceMetricsDashboardProps) {
  const insights = [];

  // Savings rate insights
  if (metrics.savingsRate < 10) {
    insights.push({
      type: 'warning' as const,
      title: 'Low Savings Rate',
      message: `Your savings rate of ${metrics.savingsRate.toFixed(1)}% is below the recommended 20%. Consider reducing expenses or increasing income.`
    });
  } else if (metrics.savingsRate >= 20) {
    insights.push({
      type: 'good' as const,
      title: 'Excellent Savings Rate',
      message: `Your savings rate of ${metrics.savingsRate.toFixed(1)}% exceeds the recommended 20%. Great job!`
    });
  }

  // Expense ratio insights
  if (metrics.expenseRatio > 80) {
    insights.push({
      type: 'warning' as const,
      title: 'High Expense Ratio',
      message: `${metrics.expenseRatio.toFixed(1)}% of your income goes to expenses. Look for areas to cut back.`
    });
  }

  // Income growth insights
  if (metrics.incomeGrowthRate > 5) {
    insights.push({
      type: 'good' as const,
      title: 'Strong Income Growth',
      message: `Your income has grown by ${metrics.incomeGrowthRate.toFixed(1)}% - consider increasing your savings rate.`
    });
  } else if (metrics.incomeGrowthRate < 0) {
    insights.push({
      type: 'warning' as const,
      title: 'Declining Income',
      message: `Your income has decreased by ${Math.abs(metrics.incomeGrowthRate).toFixed(1)}%. Focus on expense management.`
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'good' as const,
      title: 'Stable Financial Position',
      message: 'Your financial metrics are within healthy ranges. Keep up the good work!'
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Quick Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.slice(0, 3).map((insight, index) => (
          <div key={`${insight.type}-${insight.title}-${index}`} className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              {insight.type === 'good' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">{insight.title}</p>
              <p className="text-xs text-muted-foreground">{insight.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PerformanceMetricsDashboard({ metrics, financialSummary }: PerformanceMetricsDashboardProps) {
  const getMetricStatus = (value: number, thresholds: { good: number; warning: number }): 'good' | 'warning' | 'poor' => {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.warning) return 'warning';
    return 'poor';
  };

  const getSavingsRateStatus = () => getMetricStatus(metrics.savingsRate, { good: 20, warning: 10 });
  const getExpenseRatioStatus = () => {
    // Lower is better for expense ratio
    if (metrics.expenseRatio <= 70) return 'good';
    if (metrics.expenseRatio <= 85) return 'warning';
    return 'poor';
  };
  const getIncomeGrowthStatus = () => getMetricStatus(metrics.incomeGrowthRate, { good: 3, warning: 0 });

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Savings Rate"
          value={metrics.savingsRate}
          change={metrics.incomeGrowthRate - metrics.expenseGrowthRate}
          icon={<DollarSign className="h-4 w-4" />}
          description="Percentage of income saved"
          status={getSavingsRateStatus()}
          target={20}
        />
        <MetricCard
          title="Expense Ratio"
          value={metrics.expenseRatio}
          change={metrics.expenseGrowthRate}
          icon={<PieChart className="h-4 w-4" />}
          description="Percentage of income spent"
          status={getExpenseRatioStatus()}
          target={70}
        />
        <MetricCard
          title="Income Growth"
          value={metrics.incomeGrowthRate}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Year-over-year income change"
          status={getIncomeGrowthStatus()}
          target={5}
        />
        <MetricCard
          title="Expense Growth"
          value={metrics.expenseGrowthRate}
          icon={<TrendingDown className="h-4 w-4" />}
          description="Year-over-year expense change"
          status={metrics.expenseGrowthRate <= 3 ? 'good' : metrics.expenseGrowthRate <= 7 ? 'warning' : 'poor'}
          target={3}
        />
      </div>

      {/* Additional Metrics (if available) */}
      {(metrics.budgetAdherence !== undefined || metrics.debtToIncomeRatio !== undefined || 
        metrics.emergencyFundRatio !== undefined || metrics.investmentAllocation !== undefined) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.budgetAdherence !== undefined && (
            <MetricCard
              title="Budget Adherence"
              value={metrics.budgetAdherence}
              icon={<Target className="h-4 w-4" />}
              description="How well you stick to your budget"
              status={getMetricStatus(metrics.budgetAdherence, { good: 90, warning: 75 })}
              target={95}
            />
          )}
          {metrics.debtToIncomeRatio !== undefined && (
            <MetricCard
              title="Debt-to-Income"
              value={metrics.debtToIncomeRatio}
              icon={<AlertTriangle className="h-4 w-4" />}
              description="Debt payments as % of income"
              status={metrics.debtToIncomeRatio <= 20 ? 'good' : metrics.debtToIncomeRatio <= 36 ? 'warning' : 'poor'}
              target={20}
            />
          )}
          {metrics.emergencyFundRatio !== undefined && (
            <MetricCard
              title="Emergency Fund"
              value={metrics.emergencyFundRatio}
              icon={<CheckCircle className="h-4 w-4" />}
              description="Months of expenses covered"
              status={getMetricStatus(metrics.emergencyFundRatio, { good: 6, warning: 3 })}
              target={6}
            />
          )}
          {metrics.investmentAllocation !== undefined && (
            <MetricCard
              title="Investment Allocation"
              value={metrics.investmentAllocation}
              icon={<BarChart3 className="h-4 w-4" />}
              description="% of portfolio in investments"
              status={getMetricStatus(metrics.investmentAllocation, { good: 60, warning: 30 })}
              target={70}
            />
          )}
        </div>
      )}

      {/* Health Score and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthScoreGauge score={metrics.financialHealthScore} />
        <QuickInsights metrics={metrics} financialSummary={financialSummary} />
      </div>
    </div>
  );
}

export default PerformanceMetricsDashboard;
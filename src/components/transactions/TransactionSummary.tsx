import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { LoadingCard } from '../ui/loading-spinner';
import type { TransactionSummary as TransactionSummaryType } from '../../stores/transactionStore';

interface TransactionSummaryProps {
  summary: TransactionSummaryType;
  loading?: boolean;
}

export function TransactionSummary({ summary, loading }: TransactionSummaryProps) {
  if (loading) {
    const skeletonCards = ['Income', 'Expenses', 'Net Amount', 'Total Transactions'];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {skeletonCards.map((cardType) => (
          <LoadingCard 
            key={`skeleton-${cardType}`}
            text={`Loading ${cardType.toLowerCase()}...`}
            className="bg-card/60 backdrop-blur-sm border-border/50"
          />
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getNetAmountColor = (amount: number) => {
    if (amount > 0) return 'text-green-600 dark:text-green-400';
    if (amount < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  const getNetAmountBadge = (amount: number) => {
    if (amount > 0) return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Profit</Badge>;
    if (amount < 0) return <Badge variant="destructive">Loss</Badge>;
    return <Badge variant="secondary">Break Even</Badge>;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {/* Total Income */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-colors">
        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground font-mono uppercase tracking-wider">
            Total Income
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
            {formatCurrency(summary.totalIncome)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Income transactions
          </p>
        </CardContent>
      </Card>

      {/* Total Expenses */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-colors">
        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground font-mono uppercase tracking-wider">
            Total Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 font-mono">
            {formatCurrency(Math.abs(summary.totalExpenses))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Expense transactions
          </p>
        </CardContent>
      </Card>

      {/* Net Amount */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-colors">
        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground font-mono uppercase tracking-wider">
            Net Amount
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className={`text-xl sm:text-2xl font-bold font-mono ${getNetAmountColor(summary.netAmount)}`}>
            {formatCurrency(summary.netAmount)}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              This period
            </p>
            {getNetAmountBadge(summary.netAmount)}
          </div>
        </CardContent>
      </Card>

      {/* Total Transactions */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-colors">
        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground font-mono uppercase tracking-wider">
            Total Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-xl sm:text-2xl font-bold text-foreground font-mono">
            {summary.transactionCount}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              All time
            </p>
            <Badge variant="outline" className="text-xs">
              {summary.averageTransaction ? formatCurrency(summary.averageTransaction) : 'N/A'} avg
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
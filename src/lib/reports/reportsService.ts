import type {
	Transaction,
	Account,
	Category,
	ReportType,
	ReportFilters,
	FinancialSummaryReport,
	TransactionAnalysisReport,
	CategoryBreakdownReport,
	AccountPerformanceReport,
	CashFlowReport,
	PerformanceMetrics,
	ReportMetadata,
	DateRange,
	ExportFormat,
} from '../../types/finance';
import { useTransactionStore } from '../../stores/transactionStore';
import { DatabaseService } from '../database/db';
import { format, subDays, subMonths, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';

export class ReportsService {
	private static instance: ReportsService;

	private constructor() {}

	static getInstance(): ReportsService {
		if (!ReportsService.instance) {
			ReportsService.instance = new ReportsService();
		}
		return ReportsService.instance;
	}

	// Date Range Utilities
	getPredefinedDateRanges(): Array<{ label: string; value: string; range: DateRange }> {
		const now = new Date();
		return [
			{
				label: 'Last 7 Days',
				value: '7d',
				range: {
					startDate: subDays(now, 7),
					endDate: now,
					label: 'Last 7 Days'
				}
			},
			{
				label: 'Last 30 Days',
				value: '30d',
				range: {
					startDate: subDays(now, 30),
					endDate: now,
					label: 'Last 30 Days'
				}
			},
			{
				label: 'Last 3 Months',
				value: '90d',
				range: {
					startDate: subMonths(now, 3),
					endDate: now,
					label: 'Last 3 Months'
				}
			},
			{
				label: 'This Year',
				value: 'ytd',
				range: {
					startDate: startOfYear(now),
					endDate: now,
					label: 'Year to Date'
				}
			},
			{
				label: 'This Month',
				value: 'month',
				range: {
					startDate: startOfMonth(now),
					endDate: endOfMonth(now),
					label: 'This Month'
				}
			}
		];
	}

	// Report Generation Methods
	async generateFinancialSummaryReport(filters: ReportFilters): Promise<FinancialSummaryReport> {
		const transactions = useTransactionStore.getState().getTransactions({
			startDate: filters.dateRange.startDate,
			endDate: filters.dateRange.endDate,
			account: filters.accounts?.[0],
			category: filters.categories?.[0],
			type: filters.transactionTypes?.[0],
			minAmount: filters.amountRange?.min,
			maxAmount: filters.amountRange?.max
		});

		const accounts = await DatabaseService.getAccounts();
		
		const totalIncome = transactions
			.filter(t => t.type === 'income')
			.reduce((sum, t) => sum + t.amount, 0);

		const totalExpenses = transactions
			.filter(t => t.type === 'expense')
			.reduce((sum, t) => sum + t.amount, 0);

		const netIncome = totalIncome - totalExpenses;
		const totalBalance = accounts
			.filter(a => a.isActive)
			.reduce((sum, a) => sum + a.balance, 0);

		const daysDiff = Math.ceil(
			(filters.dateRange.endDate.getTime() - filters.dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
		);
		const averageDailySpending = totalExpenses / daysDiff;

		const expenseTransactions = transactions.filter(t => t.type === 'expense');
		const incomeTransactions = transactions.filter(t => t.type === 'income');

		const largestExpense = expenseTransactions.reduce((max, t) => 
			t.amount > max.amount ? t : max, expenseTransactions[0] || {} as Transaction
		);

		const largestIncome = incomeTransactions.reduce((max, t) => 
			t.amount > max.amount ? t : max, incomeTransactions[0] || {} as Transaction
		);

		const metadata: ReportMetadata = {
			id: `financial-summary-${Date.now()}`,
			name: 'Financial Summary Report',
			type: 'financial-summary',
			description: `Financial summary for ${filters.dateRange.label || 'custom period'}`,
			generatedAt: new Date(),
			filters
		};

		return {
			metadata,
			summary: {
				totalIncome,
				totalExpenses,
				netIncome,
				cashFlow: netIncome,
				totalBalance,
				averageDailySpending,
				largestExpense,
				largestIncome
			}
		};
	}

	async generateTransactionAnalysisReport(filters: ReportFilters): Promise<TransactionAnalysisReport> {
		const transactions = useTransactionStore.getState().getTransactions({
			startDate: filters.dateRange.startDate,
			endDate: filters.dateRange.endDate,
			account: filters.accounts?.[0],
			category: filters.categories?.[0],
			type: filters.transactionTypes?.[0]
		});

		const totalTransactions = transactions.length;
		const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
		const averageTransactionAmount = totalAmount / totalTransactions || 0;

		// Calculate median
		const sortedAmounts = transactions.map(t => t.amount).sort((a, b) => a - b);
		const medianTransactionAmount = sortedAmounts.length > 0 
			? sortedAmounts[Math.floor(sortedAmounts.length / 2)] 
			: 0;

		// Calculate frequency
		const daysDiff = Math.ceil(
			(filters.dateRange.endDate.getTime() - filters.dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
		);
		const daily = totalTransactions / daysDiff;
		const weekly = daily * 7;
		const monthly = daily * 30;

		// Top transactions
		const expenseTransactions = transactions.filter(t => t.type === 'expense');
		const incomeTransactions = transactions.filter(t => t.type === 'income');

		const largestExpenses = expenseTransactions
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 10);

		const largestIncomes = incomeTransactions
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 10);

		// Category frequency
		const categoryStats = new Map<string, { count: number; totalAmount: number }>();
		for (const t of transactions) {
			const existing = categoryStats.get(t.category) || { count: 0, totalAmount: 0 };
			categoryStats.set(t.category, {
				count: existing.count + 1,
				totalAmount: existing.totalAmount + t.amount
			});
		}

		const mostFrequentCategories = Array.from(categoryStats.entries())
			.map(([category, stats]) => ({ category, ...stats }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// Generate trend data
		const trendData = this.generateTrendData(transactions, filters.dateRange);

		const metadata: ReportMetadata = {
			id: `transaction-analysis-${Date.now()}`,
			name: 'Transaction Analysis Report',
			type: 'transaction-analysis',
			description: `Transaction analysis for ${filters.dateRange.label || 'custom period'}`,
			generatedAt: new Date(),
			filters
		};

		return {
			metadata,
			transactionStats: {
				totalTransactions,
				averageTransactionAmount,
				medianTransactionAmount,
				transactionFrequency: {
					daily,
					weekly,
					monthly
				}
			},
			topTransactions: {
				largestExpenses,
				largestIncomes,
				mostFrequentCategories
			},
			trendData
		};
	}

	async generateCategoryBreakdownReport(filters: ReportFilters): Promise<CategoryBreakdownReport> {
		const transactions = useTransactionStore.getState().getTransactions({
			startDate: filters.dateRange.startDate,
			endDate: filters.dateRange.endDate,
			account: filters.accounts?.[0],
			type: filters.transactionTypes?.[0]
		});

		const categories = await DatabaseService.getCategories();
		const categoryMap = new Map(categories.map(c => [c.id, c]));

		// Separate income and expense transactions
		const incomeTransactions = transactions.filter(t => t.type === 'income');
		const expenseTransactions = transactions.filter(t => t.type === 'expense');

		const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
		const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

		// Process income categories
		const incomeCategories = this.processCategoryBreakdown(
			incomeTransactions, 
			totalIncome, 
			categoryMap
		);

		// Process expense categories
		const expenseCategories = this.processCategoryBreakdown(
			expenseTransactions, 
			totalExpenses, 
			categoryMap
		);

		// Generate chart data
		const chartData = [...expenseCategories, ...incomeCategories].map(cat => ({
			category: cat.category,
			value: cat.amount,
			color: categoryMap.get(cat.category)?.color || '#8884d8'
		}));

		const metadata: ReportMetadata = {
			id: `category-breakdown-${Date.now()}`,
			name: 'Category Breakdown Report',
			type: 'category-breakdown',
			description: `Category breakdown for ${filters.dateRange.label || 'custom period'}`,
			generatedAt: new Date(),
			filters
		};

		return {
			metadata,
			incomeCategories,
			expenseCategories,
			chartData
		};
	}

	async generateAccountPerformanceReport(filters: ReportFilters): Promise<AccountPerformanceReport> {
		const accounts = await DatabaseService.getAccounts();
		const transactions = useTransactionStore.getState().getTransactions({
			startDate: filters.dateRange.startDate,
			endDate: filters.dateRange.endDate
		});

		const accountPerformance = await Promise.all(
			accounts.map(async account => {
				const accountTransactions = transactions.filter(t => t.account === account.id);
				
				const totalInflows = accountTransactions
					.filter(t => t.type === 'income')
					.reduce((sum, t) => sum + t.amount, 0);

				const totalOutflows = accountTransactions
					.filter(t => t.type === 'expense')
					.reduce((sum, t) => sum + t.amount, 0);

				const netChange = totalInflows - totalOutflows;
				const startingBalance = account.balance - netChange;
				const changePercentage = startingBalance !== 0 
					? (netChange / Math.abs(startingBalance)) * 100 
					: 0;

				const transactionCount = accountTransactions.length;
				const averageTransactionAmount = transactionCount > 0 
					? accountTransactions.reduce((sum, t) => sum + t.amount, 0) / transactionCount 
					: 0;

				// Simple performance score based on growth and activity
				const performanceScore = Math.min(100, Math.max(0, 
					50 + (changePercentage * 2) + (transactionCount * 0.1)
				));

				return {
					id: account.id,
					name: account.name,
					type: account.type,
					startingBalance,
					endingBalance: account.balance,
					netChange,
					changePercentage,
					totalInflows,
					totalOutflows,
					transactionCount,
					averageTransactionAmount,
					performanceScore
				};
			})
		);

		const totalNetWorth = accounts
			.filter(a => a.isActive)
			.reduce((sum, a) => sum + a.balance, 0);

		const netWorthChange = accountPerformance.reduce((sum, a) => sum + a.netChange, 0);

		const bestPerforming = accountPerformance.reduce((best, current) => 
			current.performanceScore > best.performanceScore ? current : best
		);

		const worstPerforming = accountPerformance.reduce((worst, current) => 
			current.performanceScore < worst.performanceScore ? current : worst
		);

		const metadata: ReportMetadata = {
			id: `account-performance-${Date.now()}`,
			name: 'Account Performance Report',
			type: 'account-performance',
			description: `Account performance for ${filters.dateRange.label || 'custom period'}`,
			generatedAt: new Date(),
			filters
		};

		return {
			metadata,
			accounts: accountPerformance,
			overallPerformance: {
				totalNetWorth,
				netWorthChange,
				bestPerformingAccount: bestPerforming.name,
				worstPerformingAccount: worstPerforming.name
			}
		};
	}

	async generateCashFlowReport(filters: ReportFilters): Promise<CashFlowReport> {
		const transactions = useTransactionStore.getState().getTransactions({
			startDate: filters.dateRange.startDate,
			endDate: filters.dateRange.endDate
		});

		// Group transactions by date
		const dailyData = new Map<string, { inflows: number; outflows: number; transactions: Transaction[] }>();
		
		for (const transaction of transactions) {
			const dateKey = format(transaction.date, 'yyyy-MM-dd');
			const existing = dailyData.get(dateKey) || { inflows: 0, outflows: 0, transactions: [] };
			
			if (transaction.type === 'income') {
				existing.inflows += transaction.amount;
			} else if (transaction.type === 'expense') {
				existing.outflows += transaction.amount;
			}
			
			existing.transactions.push(transaction);
			dailyData.set(dateKey, existing);
		}

		// Generate cash flow data
		let cumulativeFlow = 0;
		let runningBalance = 0;
		
		const accounts = await DatabaseService.getAccounts();
		const initialBalance = accounts
			.filter(a => a.isActive)
			.reduce((sum, a) => sum + a.balance, 0);
		
		runningBalance = initialBalance;

		const cashFlowData = Array.from(dailyData.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, data]) => {
				const netFlow = data.inflows - data.outflows;
				cumulativeFlow += netFlow;
				runningBalance += netFlow;
				
				return {
					date,
					inflows: data.inflows,
					outflows: data.outflows,
					netFlow,
					cumulativeFlow,
					runningBalance
				};
			});

		// Calculate summary statistics
		const monthlyInflows = cashFlowData.reduce((sum, d) => sum + d.inflows, 0) / 
			(cashFlowData.length / 30 || 1);
		const monthlyOutflows = cashFlowData.reduce((sum, d) => sum + d.outflows, 0) / 
			(cashFlowData.length / 30 || 1);

		// Calculate volatility (standard deviation of daily net flows)
		const netFlows = cashFlowData.map(d => d.netFlow);
		const avgNetFlow = netFlows.reduce((sum, f) => sum + f, 0) / netFlows.length;
		const variance = netFlows.reduce((sum, f) => sum + (f - avgNetFlow) ** 2, 0) / netFlows.length;
		const volatility = Math.sqrt(variance);

		// Calculate streaks
		let longestPositiveStreak = 0;
		let longestNegativeStreak = 0;
		let currentPositiveStreak = 0;
		let currentNegativeStreak = 0;

		for (const d of cashFlowData) {
			if (d.netFlow > 0) {
				currentPositiveStreak++;
				currentNegativeStreak = 0;
				longestPositiveStreak = Math.max(longestPositiveStreak, currentPositiveStreak);
			} else if (d.netFlow < 0) {
				currentNegativeStreak++;
				currentPositiveStreak = 0;
				longestNegativeStreak = Math.max(longestNegativeStreak, currentNegativeStreak);
			}
		}

		const metadata: ReportMetadata = {
			id: `cash-flow-${Date.now()}`,
			name: 'Cash Flow Report',
			type: 'cash-flow',
			description: `Cash flow analysis for ${filters.dateRange.label || 'custom period'}`,
			generatedAt: new Date(),
			filters
		};

		return {
			metadata,
			cashFlowData,
			summary: {
				averageMonthlyInflow: monthlyInflows,
				averageMonthlyOutflow: monthlyOutflows,
				cashFlowVolatility: volatility,
				longestPositiveStreak,
				longestNegativeStreak
			}
		};
	}

	async calculatePerformanceMetrics(filters: ReportFilters): Promise<PerformanceMetrics> {
		const transactions = useTransactionStore.getState().getTransactions({
			startDate: filters.dateRange.startDate,
			endDate: filters.dateRange.endDate
		});

		const totalIncome = transactions
			.filter(t => t.type === 'income')
			.reduce((sum, t) => sum + t.amount, 0);

		const totalExpenses = transactions
			.filter(t => t.type === 'expense')
			.reduce((sum, t) => sum + t.amount, 0);

		const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
		const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

		// Calculate growth rates (simplified - would need historical data for accurate calculation)
		const incomeGrowthRate = 0; // Placeholder
		const expenseGrowthRate = 0; // Placeholder

		// Financial health score (simplified calculation)
		let healthScore = 50; // Base score
		if (savingsRate > 20) healthScore += 20;
		else if (savingsRate > 10) healthScore += 10;
		if (expenseRatio < 80) healthScore += 15;
		if (totalIncome > totalExpenses) healthScore += 15;

		return {
			savingsRate,
			expenseRatio,
			incomeGrowthRate,
			expenseGrowthRate,
			financialHealthScore: Math.min(100, Math.max(0, healthScore))
		};
	}

	// Helper Methods
	private processCategoryBreakdown(
		transactions: Transaction[], 
		total: number, 
		categoryMap: Map<string, Category>
	) {
		const categoryStats = new Map<string, { amount: number; count: number; transactions: Transaction[] }>();
		
		for (const transaction of transactions) {
			const existing = categoryStats.get(transaction.category) || { amount: 0, count: 0, transactions: [] };
			existing.amount += transaction.amount;
			existing.count += 1;
			existing.transactions.push(transaction);
			categoryStats.set(transaction.category, existing);
		}

		return Array.from(categoryStats.entries())
			.map(([categoryId, stats]) => {
				const category = categoryMap.get(categoryId);
				return {
					category: category?.name || categoryId,
					amount: stats.amount,
					percentage: total > 0 ? (stats.amount / total) * 100 : 0,
					transactionCount: stats.count,
					averageAmount: stats.amount / stats.count
				};
			})
			.sort((a, b) => b.amount - a.amount);
	}

	private generateTrendData(transactions: Transaction[], dateRange: DateRange) {
		const dailyData = new Map<string, { income: number; expenses: number; count: number }>();
		
		for (const transaction of transactions) {
			const dateKey = format(transaction.date, 'yyyy-MM-dd');
			const existing = dailyData.get(dateKey) || { income: 0, expenses: 0, count: 0 };
			
			if (transaction.type === 'income') {
				existing.income += transaction.amount;
			} else if (transaction.type === 'expense') {
				existing.expenses += transaction.amount;
			}
			
			existing.count += 1;
			dailyData.set(dateKey, existing);
		}

		return Array.from(dailyData.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, data]) => ({
				date,
				income: data.income,
				expenses: data.expenses,
				net: data.income - data.expenses,
				transactionCount: data.count
			}));
	}

	// Export functionality
	async exportReport(
		reportData: FinancialSummaryReport | TransactionAnalysisReport | CategoryBreakdownReport | AccountPerformanceReport | CashFlowReport,
		format: ExportFormat
	): Promise<string> {
		switch (format) {
			case 'json':
				return JSON.stringify(reportData, null, 2);
			case 'csv':
				return this.convertReportToCSV(reportData);
			case 'excel':
				// Would need additional library like xlsx
				throw new Error('Excel export not yet implemented');
			case 'pdf':
				// Would need additional library like jsPDF
				throw new Error('PDF export not yet implemented');
			default:
				throw new Error(`Unsupported export format: ${format}`);
		}
	}

	private convertReportToCSV(reportData: FinancialSummaryReport | TransactionAnalysisReport | CategoryBreakdownReport | AccountPerformanceReport | CashFlowReport): string {
		// Basic CSV conversion - would need more sophisticated handling for different report types
		const headers = Object.keys(reportData.metadata);
		const values = Object.values(reportData.metadata);
		
		return `${headers.join(',')}
${values.join(',')}`;
	}
}

export const reportsService = ReportsService.getInstance();
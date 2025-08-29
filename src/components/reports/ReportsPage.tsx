import {
	Activity,
	BarChart3,
	Calendar,
	Download,
	Filter,
	PieChart,
	TrendingUp,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	usePerformanceMonitor,
	useReportPerformance,
} from "../../lib/hooks/useReportPerformance";
import { useToast } from "../../lib/hooks/useToast";
import { reportsService } from "../../lib/reports/reportsService";
import { ErrorHandler } from "../../lib/utils/errorHandler";
import type {
	AccountPerformanceReport,
	CashFlowReport,
	CategoryBreakdownReport,
	DateRange,
	ExportFormat,
	FinancialSummaryReport,
	ReportFilters as ReportFiltersType,
	ReportType,
	TransactionAnalysisReport,
} from "../../types/finance";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { LoadingSpinner } from "../ui/loading-spinner";
import {
	DateRangeDisplay,
	DateRangeSelector,
	QuickDateRanges,
} from "./DateRangeSelector";
import { ExportDialog } from "./ExportDialog";
import { PerformanceDemo } from "./PerformanceDemo";
import { PerformanceMetricsDashboard } from "./PerformanceMetricsDashboard";
import {
	AccountPerformanceChart,
	CashFlowChart,
	CategoryBreakdownChart,
	FinancialSummaryChart,
	PerformanceMetricsChart,
	TransactionTrendChart,
} from "./ReportCharts";
import { ReportFiltersComponent } from "./ReportFilters";

// Mock data for demonstration
const mockTransactions = [
	{
		id: "1",
		date: new Date("2024-01-15"),
		amount: -85.5,
		description: "Grocery Store",
		category: "Food & Dining",
		account: "Checking",
		type: "expense" as const,
		status: "completed" as const,
		tags: ["groceries"],
		createdAt: new Date(),
		updatedAt: new Date(),
		currency: "USD",
	},
	{
		id: "2",
		date: new Date("2024-01-16"),
		amount: 3200.0,
		description: "Salary Deposit",
		category: "Income",
		account: "Checking",
		type: "income" as const,
		status: "completed" as const,
		tags: ["salary"],
		createdAt: new Date(),
		updatedAt: new Date(),
		currency: "USD",
	},
	{
		id: "3",
		date: new Date("2024-01-17"),
		amount: -1200.0,
		description: "Rent Payment",
		category: "Housing",
		account: "Checking",
		type: "expense" as const,
		status: "completed" as const,
		tags: ["rent", "housing"],
		createdAt: new Date(),
		updatedAt: new Date(),
		currency: "USD",
	},
];

const mockAccounts = [
	{
		id: "1",
		name: "Checking",
		type: "checking" as const,
		balance: 5420.75,
		currency: "USD",
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
	{
		id: "2",
		name: "Savings",
		type: "savings" as const,
		balance: 12350.0,
		currency: "USD",
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
	{
		id: "3",
		name: "Investment",
		type: "investment" as const,
		balance: 8750.25,
		currency: "USD",
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
];

const mockCategories = [
	{
		id: "1",
		name: "Food & Dining",
		type: "expense" as const,
		color: "#ef4444",
		isDefault: false,
		createdAt: new Date(),
	},
	{
		id: "2",
		name: "Housing",
		type: "expense" as const,
		color: "#f97316",
		isDefault: false,
		createdAt: new Date(),
	},
	{
		id: "3",
		name: "Transportation",
		type: "expense" as const,
		color: "#eab308",
		isDefault: false,
		createdAt: new Date(),
	},
	{
		id: "4",
		name: "Income",
		type: "income" as const,
		color: "#22c55e",
		isDefault: false,
		createdAt: new Date(),
	},
	{
		id: "5",
		name: "Entertainment",
		type: "expense" as const,
		color: "#8b5cf6",
		isDefault: false,
		createdAt: new Date(),
	},
];

interface ReportsPageProps {
	className?: string;
}

export function ReportsPage({ className }: ReportsPageProps) {
	const [selectedReportType, setSelectedReportType] =
		useState<ReportType>("financial-summary");
	const [dateRange, setDateRange] = useState<DateRange>(
		reportsService.getPredefinedDateRanges().find((r) => r.value === "30d")
			?.range || {
			startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			endDate: new Date(),
			label: "Last 30 Days",
		},
	);
	const [filters, setFilters] = useState<ReportFiltersType>({
		dateRange,
		accounts: [],
		categories: [],
		transactionTypes: [],
		tags: [],
		status: [],
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showFilters, setShowFilters] = useState(false);
	const [showExportDialog, setShowExportDialog] = useState(false);
	const [showPerformanceStats, setShowPerformanceStats] = useState(false);

	// Performance monitoring
	const { renderTime, renderCount, logPerformance } =
		usePerformanceMonitor("ReportsPage");

	// Toast notifications
	const { toast } = useToast();

	// Performance optimization hooks
	const {
		isLoading: isFilterLoading,
		error: filterError,
		performanceStats,
		applyFilters,
		getPerformanceStats,
		clearCache,
	} = useReportPerformance(mockTransactions);

	// Report data states
	const [financialSummary, setFinancialSummary] =
		useState<FinancialSummaryReport | null>(null);
	const [transactionAnalysis, setTransactionAnalysis] =
		useState<TransactionAnalysisReport | null>(null);
	const [categoryBreakdown, setCategoryBreakdown] =
		useState<CategoryBreakdownReport | null>(null);
	const [accountPerformance, setAccountPerformance] =
		useState<AccountPerformanceReport | null>(null);
	const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);

	// Mock performance metrics data
	const mockPerformanceMetrics = {
		savingsRate: 22.5,
		expenseRatio: 68.2,
		incomeGrowthRate: 8.3,
		expenseGrowthRate: 4.1,
		financialHealthScore: 78,
		budgetAdherence: 85.7,
		debtToIncomeRatio: 15.2,
		emergencyFundRatio: 4.8,
		investmentAllocation: 65.3,
	};

	// Performance metrics
	const performanceMetrics = useMemo(
		() => ({
			savingsRate: 22.5,
			expenseRatio: 68.3,
			financialHealthScore: 78.9,
		}),
		[],
	);

	// Memoize effective filters to prevent unnecessary re-renders
	const effectiveFilters = useMemo(
		() => ({
			...filters,
			dateRange: dateRange || {
				startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
				endDate: new Date(),
			},
		}),
		[filters, dateRange],
	);

	// Update filters when date range changes
	useEffect(() => {
		setFilters((prev) => ({ ...prev, dateRange }));
	}, [dateRange]);

	// Apply filters when they change (with conditional check)
	useEffect(() => {
		if (effectiveFilters && !isFilterLoading) {
			applyFilters(effectiveFilters);
		}
	}, [effectiveFilters, applyFilters, isFilterLoading]);

	const isLoadingRef = useRef(false);

	const generateReports = useCallback(async () => {
		// Prevent unnecessary report generation
		if (isLoadingRef.current || !effectiveFilters) return;

		isLoadingRef.current = true;
		setIsLoading(true);
		setError(null);

		try {
			// Generate all reports with current filters
			const [financial, transaction, category, account, cash] =
				await Promise.all([
					reportsService.generateFinancialSummaryReport(effectiveFilters),
					reportsService.generateTransactionAnalysisReport(effectiveFilters),
					reportsService.generateCategoryBreakdownReport(effectiveFilters),
					reportsService.generateAccountPerformanceReport(effectiveFilters),
					reportsService.generateCashFlowReport(effectiveFilters),
				]);

			setFinancialSummary(financial);
			setTransactionAnalysis(transaction);
			setCategoryBreakdown(category);
			setAccountPerformance(account);
			setCashFlow(cash);
		} catch (err) {
			const userError = ErrorHandler.handleError(err, {
				component: "ReportsPage",
				action: "generateReports",
			});
			setError(userError.message);
		} finally {
			isLoadingRef.current = false;
			setIsLoading(false);
		}
	}, [effectiveFilters]);

	// Generate reports when effective filters change (with debouncing)
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			generateReports();
		}, 300); // 300ms debounce

		return () => clearTimeout(timeoutId);
	}, [generateReports]);

	const _handleExport = async (format: ExportFormat) => {
		if (!financialSummary) return;

		try {
			setIsLoading(true);
			await reportsService.exportReport(financialSummary, format);
		} catch (err) {
			const userError = ErrorHandler.handleError(err, {
				component: "ReportsPage",
				action: "exportReport",
			});
			setError(userError.message);
			toast({
				title: userError.title,
				description: userError.message,
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const reportTypeOptions = [
		{
			value: "financial-summary",
			label: "Financial Summary",
			icon: TrendingUp,
		},
		{
			value: "transaction-analysis",
			label: "Transaction Analysis",
			icon: BarChart3,
		},
		{
			value: "category-breakdown",
			label: "Category Breakdown",
			icon: PieChart,
		},
		{
			value: "account-performance",
			label: "Account Performance",
			icon: Activity,
		},
		{ value: "cash-flow", label: "Cash Flow", icon: Activity },
	] as const;

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-mono font-bold tracking-tight">
						Reports
					</h1>
					<p className="text-muted-foreground font-mono text-sm">
						Comprehensive financial analysis and insights
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowFilters(!showFilters)}
						className="font-mono"
					>
						<Filter className="h-4 w-4 mr-2" />
						Filters
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowExportDialog(true)}
						disabled={isLoading || !financialSummary}
						className="font-mono"
					>
						<Download className="h-4 w-4 mr-2" />
						Export
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							getPerformanceStats();
							setShowPerformanceStats(!showPerformanceStats);
						}}
						className="font-mono"
					>
						<Activity className="h-4 w-4 mr-2" />
						Performance
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							clearCache();
							logPerformance();
						}}
						title="Clear cache and log performance metrics"
						className="font-mono"
					>
						<Zap className="h-4 w-4 mr-2" />
						Optimize
					</Button>
				</div>
			</div>

			{/* Date Range and Report Type Selection */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="font-mono text-sm uppercase tracking-wider flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							Date Range
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<QuickDateRanges
							selectedRange={dateRange}
							onRangeSelect={setDateRange}
						/>
						<DateRangeSelector
							selectedRange={dateRange}
							onRangeChange={setDateRange}
						/>
						<DateRangeDisplay range={dateRange} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="font-mono text-sm uppercase tracking-wider">
							Report Type
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{reportTypeOptions.map((option) => {
								const Icon = option.icon;
								return (
									<Button
										key={option.value}
										variant={
											selectedReportType === option.value
												? "default"
												: "outline"
										}
										size="sm"
										onClick={() => setSelectedReportType(option.value)}
										className="font-mono justify-start h-auto p-3"
									>
										<Icon className="h-4 w-4 mr-2" />
										<span className="text-xs">{option.label}</span>
									</Button>
								);
							})}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			{showFilters && (
				<Card>
					<CardHeader>
						<CardTitle className="font-mono text-sm uppercase tracking-wider">
							Advanced Filters
							{isFilterLoading && (
								<span className="text-blue-600 ml-2">(Filtering...)</span>
							)}
							{filterError && (
								<span className="text-red-600 ml-2">Error: {filterError}</span>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ReportFiltersComponent
							filters={filters}
							onFiltersChange={setFilters}
							availableAccounts={mockAccounts}
							availableCategories={mockCategories}
						/>
					</CardContent>
				</Card>
			)}

			{showPerformanceStats && (
				<div className="space-y-6">
					{performanceStats && (
						<Card>
							<CardHeader>
								<CardTitle className="font-mono text-sm uppercase tracking-wider">
									Performance Statistics
								</CardTitle>
								<p className="text-xs font-mono text-muted-foreground">
									Real-time performance metrics and optimization stats
									<span className="ml-2">
										Renders: {renderCount} | Last render:{" "}
										{renderTime.toFixed(2)}ms
									</span>
								</p>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div className="p-4 bg-blue-50 rounded-lg">
										<h4 className="font-semibold text-blue-900 font-mono text-sm">
											Cache Stats
										</h4>
										<p className="text-xs font-mono text-blue-700">
											Size:{" "}
											{((performanceStats.cache as Record<string, unknown>)
												?.size as number) || 0}
											/
											{((performanceStats.cache as Record<string, unknown>)
												?.maxSize as number) || 0}
										</p>
									</div>
									<div className="p-4 bg-green-50 rounded-lg">
										<h4 className="font-semibold text-green-900 font-mono text-sm">
											Transaction Loader
										</h4>
										<p className="text-xs font-mono text-green-700">
											Loaded:{" "}
											{((
												performanceStats.transactionLoader as Record<
													string,
													unknown
												>
											)?.loadedItems as number) || 0}
											/
											{((
												performanceStats.transactionLoader as Record<
													string,
													unknown
												>
											)?.totalItems as number) || 0}
										</p>
									</div>
									<div className="p-4 bg-purple-50 rounded-lg">
										<h4 className="font-semibold text-purple-900 font-mono text-sm">
											Performance
										</h4>
										<p className="text-xs font-mono text-purple-700">
											Operations tracked:{" "}
											{
												Object.keys(
													(performanceStats.performance as Record<
														string,
														unknown
													>) || {},
												).length
											}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					<PerformanceDemo transactions={mockTransactions} />
				</div>
			)}

			{/* Error Display */}
			{error && (
				<Alert variant="destructive">
					<AlertDescription className="font-mono text-sm">
						{error}
					</AlertDescription>
				</Alert>
			)}

			{/* Loading State */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<LoadingSpinner className="h-8 w-8" />
					<span className="ml-2 font-mono text-sm text-muted-foreground">
						Generating reports...
					</span>
				</div>
			)}

			{/* Performance Metrics */}
			{!isLoading && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<PerformanceMetricsChart metrics={performanceMetrics} />

					{/* Quick Stats */}
					<Card className="lg:col-span-2">
						<CardHeader>
							<CardTitle className="font-mono text-sm uppercase tracking-wider">
								Quick Stats
							</CardTitle>
						</CardHeader>
						<CardContent>
							{financialSummary && (
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									<div className="space-y-2">
										<p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
											Total Income
										</p>
										<p className="text-xl font-mono font-bold text-green-500">
											${financialSummary.summary.totalIncome.toLocaleString()}
										</p>
									</div>
									<div className="space-y-2">
										<p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
											Total Expenses
										</p>
										<p className="text-xl font-mono font-bold text-red-500">
											$
											{Math.abs(
												financialSummary.summary.totalExpenses,
											).toLocaleString()}
										</p>
									</div>
									<div className="space-y-2">
										<p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
											Net Income
										</p>
										<p
											className={`text-xl font-mono font-bold ${
												financialSummary.summary.netIncome >= 0
													? "text-green-500"
													: "text-red-500"
											}`}
										>
											${financialSummary.summary.netIncome.toLocaleString()}
										</p>
									</div>
									<div className="space-y-2">
										<p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
											Total Balance
										</p>
										<p className="text-xl font-mono font-bold">
											${financialSummary.summary.totalBalance.toLocaleString()}
										</p>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{/* Main Report Charts */}
			{!isLoading && (
				<div className="space-y-6">
					{selectedReportType === "financial-summary" && financialSummary && (
						<FinancialSummaryChart report={financialSummary} />
					)}

					{selectedReportType === "transaction-analysis" &&
						transactionAnalysis && (
							<TransactionTrendChart report={transactionAnalysis} />
						)}

					{selectedReportType === "category-breakdown" && categoryBreakdown && (
						<CategoryBreakdownChart report={categoryBreakdown} />
					)}

					{selectedReportType === "account-performance" &&
						accountPerformance && (
							<AccountPerformanceChart report={accountPerformance} />
						)}

					{selectedReportType === "cash-flow" && cashFlow && (
						<CashFlowChart report={cashFlow} />
					)}

					{/* Performance Metrics Dashboard */}
					{financialSummary && (
						<div className="mt-8">
							<h3 className="text-lg font-semibold mb-4">
								Performance Metrics
							</h3>
							<PerformanceMetricsDashboard
								metrics={mockPerformanceMetrics}
								financialSummary={financialSummary}
							/>
						</div>
					)}
				</div>
			)}

			<ExportDialog
				isOpen={showExportDialog}
				onClose={() => setShowExportDialog(false)}
				reportType={selectedReportType}
				reportData={getCurrentReportData()}
				transactions={mockTransactions}
				dateRange={
					dateRange
						? { start: dateRange.startDate, end: dateRange.endDate }
						: undefined
				}
			/>
		</div>
	);

	function getCurrentReportData() {
		switch (selectedReportType) {
			case "financial-summary":
				return financialSummary;
			case "transaction-analysis":
				return transactionAnalysis;
			case "category-breakdown":
				return categoryBreakdown;
			case "account-performance":
				return accountPerformance;
			case "cash-flow":
				return cashFlow;
			default:
				return null;
		}
	}
}

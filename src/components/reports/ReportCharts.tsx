import { format } from "date-fns";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type {
    AccountPerformanceReport,
    CashFlowReport,
    CategoryBreakdownReport,
    FinancialSummaryReport,
    TransactionAnalysisReport,
} from "../../types/finance";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

// Color palette for charts
const CHART_COLORS = {
	primary: "#3b82f6",
	secondary: "#10b981",
	accent: "#f59e0b",
	danger: "#ef4444",
	warning: "#f97316",
	info: "#06b6d4",
	muted: "#6b7280",
	success: "#22c55e",
};

const CATEGORY_COLORS = [
	"#3b82f6",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#06b6d4",
	"#f97316",
	"#22c55e",
	"#ec4899",
	"#6366f1",
];

// Custom tooltip component
interface TooltipProps {
	active?: boolean;
	payload?: Array<{
		name: string;
		value: number;
		color: string;
	}>;
	label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
	if (active && payload && payload.length) {
		return (
			<div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-lg">
				<p className="font-mono text-xs text-muted-foreground mb-2">{label}</p>
				{payload.map((entry) => (
					<div
						key={`tooltip-${entry.name}`}
						className="flex items-center gap-2 font-mono text-xs"
					>
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: entry.color }}
						/>
						<span className="text-foreground">
							{entry.name}: ${entry.value?.toLocaleString()}
						</span>
					</div>
				))}
			</div>
		);
	}
	return null;
}

// Trend indicator component
function TrendIndicator({
	value,
	className,
}: {
	value: number;
	className?: string;
}) {
	const isPositive = value > 0;
	const isNegative = value < 0;

	return (
		<div className={`flex items-center gap-1 ${className}`}>
			{isPositive && <TrendingUp className="h-4 w-4 text-green-500" />}
			{isNegative && <TrendingDown className="h-4 w-4 text-red-500" />}
			{!isPositive && !isNegative && (
				<Minus className="h-4 w-4 text-muted-foreground" />
			)}
			<span
				className={`font-mono text-sm ${
					isPositive
						? "text-green-500"
						: isNegative
							? "text-red-500"
							: "text-muted-foreground"
				}`}
			>
				{isPositive ? "+" : ""}
				{value.toFixed(1)}%
			</span>
		</div>
	);
}

// Financial Summary Chart
export function FinancialSummaryChart({
	report,
}: {
	report: FinancialSummaryReport;
}) {
	const data = [
		{
			name: "Income",
			value: report.summary.totalIncome,
			color: CHART_COLORS.success,
		},
		{
			name: "Expenses",
			value: report.summary.totalExpenses,
			color: CHART_COLORS.danger,
		},
		{
			name: "Net Income",
			value: report.summary.netIncome,
			color: CHART_COLORS.primary,
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-mono text-sm uppercase tracking-wider">
					Financial Overview
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Bar Chart */}
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data}>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="#374151"
									opacity={0.3}
								/>
								<XAxis
									dataKey="name"
									tick={{ fontSize: 12, fontFamily: "monospace" }}
									stroke="#9ca3af"
								/>
								<YAxis
									tick={{ fontSize: 12, fontFamily: "monospace" }}
									stroke="#9ca3af"
									tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
								/>
								<Tooltip content={<CustomTooltip />} />
								<Bar dataKey="value" radius={[4, 4, 0, 0]}>
									{data.map((entry) => (
										<Cell key={`bar-${entry.name}`} fill={entry.color} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>

					{/* Summary Stats */}
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
									Total Balance
								</p>
								<p className="text-2xl font-mono font-bold">
									${report.summary.totalBalance.toLocaleString()}
								</p>
							</div>
							<div className="space-y-2">
								<p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
									Cash Flow
								</p>
								<p
									className={`text-2xl font-mono font-bold ${
										report.summary.cashFlow >= 0
											? "text-green-500"
											: "text-red-500"
									}`}
								>
									${report.summary.cashFlow.toLocaleString()}
								</p>
							</div>
						</div>

						{report.periodComparison && (
							<div className="space-y-3 pt-4 border-t border-border/50">
								<p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
									Period Comparison
								</p>
								<div className="space-y-2">
									<div className="flex justify-between items-center">
										<span className="text-sm font-mono">Income</span>
										<TrendIndicator
											value={report.periodComparison.changePercentage.income}
										/>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm font-mono">Expenses</span>
										<TrendIndicator
											value={report.periodComparison.changePercentage.expenses}
										/>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm font-mono">Net Income</span>
										<TrendIndicator
											value={report.periodComparison.changePercentage.netIncome}
										/>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// Transaction Analysis Trend Chart
export function TransactionTrendChart({
	report,
}: {
	report: TransactionAnalysisReport;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-mono text-sm uppercase tracking-wider">
					Transaction Trends
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-80">
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart data={report.trendData}>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="#374151"
								opacity={0.3}
							/>
							<XAxis
								dataKey="date"
								tick={{ fontSize: 12, fontFamily: "monospace" }}
								stroke="#9ca3af"
								tickFormatter={(value) => format(new Date(value), "MMM dd")}
							/>
							<YAxis
								yAxisId="amount"
								tick={{ fontSize: 12, fontFamily: "monospace" }}
								stroke="#9ca3af"
								tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
							/>
							<YAxis
								yAxisId="count"
								orientation="right"
								tick={{ fontSize: 12, fontFamily: "monospace" }}
								stroke="#9ca3af"
							/>
							<Tooltip content={<CustomTooltip />} />
							<Legend />
							<Area
								yAxisId="amount"
								type="monotone"
								dataKey="income"
								stroke={CHART_COLORS.success}
								fill={CHART_COLORS.success}
								fillOpacity={0.3}
								name="Income"
							/>
							<Area
								yAxisId="amount"
								type="monotone"
								dataKey="expenses"
								stroke={CHART_COLORS.danger}
								fill={CHART_COLORS.danger}
								fillOpacity={0.3}
								name="Expenses"
							/>
							<Line
								yAxisId="count"
								type="monotone"
								dataKey="transactionCount"
								stroke={CHART_COLORS.accent}
								strokeWidth={2}
								dot={{ fill: CHART_COLORS.accent, strokeWidth: 2, r: 4 }}
								name="Transaction Count"
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}

// Category Breakdown Pie Chart
export function CategoryBreakdownChart({
	report,
}: {
	report: CategoryBreakdownReport;
}) {
	const expenseData = report.expenseCategories.map((category, index) => ({
		...category,
		color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
	}));

	const incomeData = report.incomeCategories.map((category, index) => ({
		...category,
		color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-mono text-sm uppercase tracking-wider">
					Category Breakdown
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Expenses Pie Chart */}
					<div>
						<h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">
							Expenses by Category
						</h3>
						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={expenseData}
										cx="50%"
										cy="50%"
										labelLine={false}
										label={({ percentage }) => `${percentage.toFixed(0)}%`}
										outerRadius={80}
										fill="#8884d8"
										dataKey="amount"
									>
										{expenseData.map((entry, index) => (
											<Cell
												key={`expense-cell-${entry.category}-${index}`}
												fill={entry.color}
											/>
										))}
									</Pie>
									<Tooltip content={<CustomTooltip />} />
								</PieChart>
							</ResponsiveContainer>
						</div>
						<div className="space-y-2 mt-4">
							{expenseData.slice(0, 5).map((category, index) => (
								<div
									key={`expense-${category.category}-${index}`}
									className="flex items-center justify-between"
								>
									<div className="flex items-center gap-2">
										<div
											className="w-3 h-3 rounded-full"
											style={{ backgroundColor: category.color }}
										/>
										<span className="text-xs font-mono">
											{category.category}
										</span>
									</div>
									<Badge variant="secondary" className="font-mono text-xs">
										${category.amount.toLocaleString()}
									</Badge>
								</div>
							))}
						</div>
					</div>

					{/* Income Pie Chart */}
					<div>
						<h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">
							Income by Category
						</h3>
						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={incomeData}
										cx="50%"
										cy="50%"
										labelLine={false}
										label={({ percentage }) => `${percentage.toFixed(0)}%`}
										outerRadius={80}
										fill="#8884d8"
										dataKey="amount"
									>
										{incomeData.map((entry, index) => (
											<Cell
												key={`income-cell-${entry.category}-${index}`}
												fill={entry.color}
											/>
										))}
									</Pie>
									<Tooltip content={<CustomTooltip />} />
								</PieChart>
							</ResponsiveContainer>
						</div>
						<div className="space-y-2 mt-4">
							{incomeData.slice(0, 5).map((category, index) => (
								<div
									key={`income-${category.category}-${index}`}
									className="flex items-center justify-between"
								>
									<div className="flex items-center gap-2">
										<div
											className="w-3 h-3 rounded-full"
											style={{ backgroundColor: category.color }}
										/>
										<span className="text-xs font-mono">
											{category.category}
										</span>
									</div>
									<Badge variant="secondary" className="font-mono text-xs">
										${category.amount.toLocaleString()}
									</Badge>
								</div>
							))}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// Account Performance Chart
export function AccountPerformanceChart({
	report,
}: {
	report: AccountPerformanceReport;
}) {
	const chartData = report.accounts.map((account) => ({
		name: account.name,
		startingBalance: account.startingBalance,
		endingBalance: account.endingBalance,
		netChange: account.netChange,
		performanceScore: account.performanceScore,
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-mono text-sm uppercase tracking-wider">
					Account Performance
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-80">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={chartData} layout="horizontal">
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="#374151"
								opacity={0.3}
							/>
							<XAxis
								type="number"
								tick={{ fontSize: 12, fontFamily: "monospace" }}
								stroke="#9ca3af"
								tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
							/>
							<YAxis
								type="category"
								dataKey="name"
								tick={{ fontSize: 12, fontFamily: "monospace" }}
								stroke="#9ca3af"
								width={100}
							/>
							<Tooltip content={<CustomTooltip />} />
							<Legend />
							<Bar
								dataKey="startingBalance"
								fill={CHART_COLORS.muted}
								name="Starting Balance"
								radius={[0, 4, 4, 0]}
							/>
							<Bar
								dataKey="endingBalance"
								fill={CHART_COLORS.primary}
								name="Ending Balance"
								radius={[0, 4, 4, 0]}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}

// Cash Flow Chart
export function CashFlowChart({ report }: { report: CashFlowReport }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-mono text-sm uppercase tracking-wider">
					Cash Flow Analysis
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-80">
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart data={report.cashFlowData}>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="#374151"
								opacity={0.3}
							/>
							<XAxis
								dataKey="date"
								tick={{ fontSize: 12, fontFamily: "monospace" }}
								stroke="#9ca3af"
								tickFormatter={(value) => format(new Date(value), "MMM dd")}
							/>
							<YAxis
								tick={{ fontSize: 12, fontFamily: "monospace" }}
								stroke="#9ca3af"
								tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
							/>
							<Tooltip content={<CustomTooltip />} />
							<Legend />
							<Bar
								dataKey="inflows"
								fill={CHART_COLORS.success}
								name="Inflows"
								radius={[4, 4, 0, 0]}
							/>
							<Bar
								dataKey="outflows"
								fill={CHART_COLORS.danger}
								name="Outflows"
								radius={[4, 4, 0, 0]}
							/>
							<Line
								type="monotone"
								dataKey="runningBalance"
								stroke={CHART_COLORS.primary}
								strokeWidth={3}
								dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
								name="Running Balance"
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}

// Performance Metrics Dashboard
interface PerformanceMetrics {
	savingsRate: number;
	expenseRatio: number;
	financialHealthScore: number;
}

export function PerformanceMetricsChart({
	metrics,
}: {
	metrics: PerformanceMetrics;
}) {
	const metricsData = [
		{
			name: "Savings Rate",
			value: metrics.savingsRate,
			target: 20,
			color: CHART_COLORS.success,
		},
		{
			name: "Expense Ratio",
			value: metrics.expenseRatio,
			target: 80,
			color: CHART_COLORS.warning,
		},
		{
			name: "Financial Health",
			value: metrics.financialHealthScore,
			target: 85,
			color: CHART_COLORS.primary,
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-mono text-sm uppercase tracking-wider">
					Performance Metrics
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					{metricsData.map((metric, index) => (
						<div key={`metric-${metric.name}-${index}`} className="space-y-2">
							<div className="flex justify-between items-center">
								<span className="text-sm font-mono">{metric.name}</span>
								<span className="text-sm font-mono font-bold">
									{metric.value.toFixed(1)}%
								</span>
							</div>
							<div className="relative">
								<div className="w-full bg-muted rounded-full h-2">
									<div
										className="h-2 rounded-full transition-all duration-300"
										style={{
											width: `${Math.min(metric.value, 100)}%`,
											backgroundColor: metric.color,
										}}
									/>
								</div>
								{/* Target indicator */}
								<div
									className="absolute top-0 w-0.5 h-2 bg-foreground/50"
									style={{ left: `${metric.target}%` }}
								/>
							</div>
							<div className="flex justify-between text-xs text-muted-foreground font-mono">
								<span>0%</span>
								<span>Target: {metric.target}%</span>
								<span>100%</span>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

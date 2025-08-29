import {
	AlertTriangle,
	BarChart3,
	CheckCircle,
	DollarSign,
	PieChart,
	Target,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { memo } from "react";
import type {
	FinancialSummaryReport,
	PerformanceMetrics,
} from "../../types/finance";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

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
	status: "good" | "warning" | "poor";
	target?: number;
}

const MetricCard = memo(function MetricCard({
	title,
	value,
	change,
	icon,
	description,
	status,
	target,
}: MetricCardProps) {
	const getStatusColor = () => {
		switch (status) {
			case "good":
				return "text-green-600 bg-green-50 border-green-200";
			case "warning":
				return "text-yellow-600 bg-yellow-50 border-yellow-200";
			case "poor":
				return "text-red-600 bg-red-50 border-red-200";
			default:
				return "text-gray-600 bg-gray-50 border-gray-200";
		}
	};

	const formatValue = (val: string | number) => {
		if (typeof val === "number") {
			return val % 1 === 0 ? val.toString() : val.toFixed(1);
		}
		return val;
	};

	return (
		<Card className={`border-2 ${getStatusColor()}`}>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{icon}
						<span className="font-mono text-sm font-medium">{title}</span>
					</div>
					{target && (
						<span className="text-xs text-muted-foreground">
							Target: {target}%
						</span>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<div className="flex items-baseline gap-2">
						<span className="text-2xl font-bold">
							{formatValue(value)}
							{typeof value === "number" && "%"}
						</span>
						{change !== undefined && (
							<span
								className={`text-sm font-mono ${
									change > 0
										? "text-green-600"
										: change < 0
											? "text-red-600"
											: "text-gray-600"
								}`}
							>
								{change > 0 ? "+" : ""}
								{change.toFixed(1)}%
							</span>
						)}
					</div>
					{target && (
						<div className="w-full bg-gray-200 rounded-full h-2">
							<div
								className={`h-2 rounded-full transition-all duration-300 ${
									status === "good"
										? "bg-green-500"
										: status === "warning"
											? "bg-yellow-500"
											: "bg-red-500"
								}`}
								style={{
									width: `${Math.min((Number(value) / target) * 100, 100)}%`,
								}}
							/>
						</div>
					)}
				</div>
				<p className="text-xs text-muted-foreground mt-2">{description}</p>
			</CardContent>
		</Card>
	);
});

const HealthScoreGauge = memo(function HealthScoreGauge({
	score,
}: {
	score: number;
}) {
	const getScoreColor = (score: number) => {
		if (score >= 80) return "text-green-600";
		if (score >= 60) return "text-yellow-600";
		return "text-red-600";
	};

	const getScoreLabel = (score: number) => {
		if (score >= 80) return "Excellent";
		if (score >= 60) return "Good";
		if (score >= 40) return "Fair";
		return "Needs Improvement";
	};

	const circumference = 2 * Math.PI * 45;
	const strokeDasharray = circumference;
	const strokeDashoffset = circumference - (score / 100) * circumference;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Target className="h-5 w-5" />
					Financial Health Score
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col items-center space-y-4">
					<div className="relative w-32 h-32">
						<svg
							className="w-32 h-32 transform -rotate-90"
							viewBox="0 0 100 100"
							aria-label="Financial Health Score Gauge"
						>
							<circle
								cx="50"
								cy="50"
								r="45"
								stroke="currentColor"
								strokeWidth="8"
								fill="transparent"
								className="text-gray-200"
							/>
							<circle
								cx="50"
								cy="50"
								r="45"
								stroke="currentColor"
								strokeWidth="8"
								fill="transparent"
								strokeDasharray={strokeDasharray}
								strokeDashoffset={strokeDashoffset}
								strokeLinecap="round"
								className={`transition-all duration-1000 ease-out ${
									score >= 80
										? "text-green-500"
										: score >= 60
											? "text-yellow-500"
											: "text-red-500"
								}`}
							/>
						</svg>
						<div className="absolute inset-0 flex items-center justify-center">
							<span className="text-2xl font-bold">{score}</span>
						</div>
					</div>
					<p className={`text-lg font-semibold ${getScoreColor(score)}`}>
						{getScoreLabel(score)}
					</p>
					<p className="text-xs text-muted-foreground mt-1">
						Based on savings rate, expense ratio, and income stability
					</p>
				</div>
			</CardContent>
		</Card>
	);
});

const QuickInsights = memo(function QuickInsights({
	metrics,
	financialSummary: _financialSummary,
}: PerformanceMetricsDashboardProps) {
	const insights = [];

	// Savings rate insights
	if (metrics.savingsRate >= 20) {
		insights.push({
			type: "positive",
			message:
				"Excellent savings rate! You're on track for financial security.",
		});
	} else if (metrics.savingsRate >= 10) {
		insights.push({
			type: "warning",
			message:
				"Good savings rate, but consider increasing to 20% for better security.",
		});
	} else {
		insights.push({
			type: "negative",
			message: "Low savings rate. Try to save at least 10% of your income.",
		});
	}

	// Expense ratio insights
	if (metrics.expenseRatio <= 70) {
		insights.push({
			type: "positive",
			message: "Great expense control! You're living well within your means.",
		});
	} else if (metrics.expenseRatio <= 85) {
		insights.push({
			type: "warning",
			message: "Moderate expenses. Look for areas to optimize spending.",
		});
	} else {
		insights.push({
			type: "negative",
			message: "High expense ratio. Consider reducing discretionary spending.",
		});
	}

	// Income growth insights
	if (metrics.incomeGrowthRate >= 5) {
		insights.push({
			type: "positive",
			message: "Strong income growth! Your earning power is increasing.",
		});
	} else if (metrics.incomeGrowthRate >= 0) {
		insights.push({
			type: "warning",
			message: "Stable income. Consider opportunities for growth.",
		});
	} else {
		insights.push({
			type: "negative",
			message:
				"Declining income. Focus on career development or additional income sources.",
		});
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<AlertTriangle className="h-5 w-5" />
					Quick Insights
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{insights.map((insight, index) => (
						<div
							key={`${insight.type}-${insight.message.slice(0, 20)}-${index}`}
							className={`p-3 rounded-lg border-l-4 ${
								insight.type === "positive"
									? "bg-green-50 border-green-400 text-green-800"
									: insight.type === "warning"
										? "bg-yellow-50 border-yellow-400 text-yellow-800"
										: "bg-red-50 border-red-400 text-red-800"
							}`}
						>
							<p className="text-sm font-medium">{insight.message}</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
});

export const PerformanceMetricsDashboard = memo(
	function PerformanceMetricsDashboard({
		metrics,
		financialSummary,
	}: PerformanceMetricsDashboardProps) {
		const getMetricStatus = (
			value: number,
			thresholds: { good: number; warning: number },
		): "good" | "warning" | "poor" => {
			if (value >= thresholds.good) return "good";
			if (value >= thresholds.warning) return "warning";
			return "poor";
		};

		const getSavingsRateStatus = () =>
			getMetricStatus(metrics.savingsRate, { good: 20, warning: 10 });
		const getExpenseRatioStatus = () => {
			// Lower is better for expense ratio
			if (metrics.expenseRatio <= 70) return "good";
			if (metrics.expenseRatio <= 85) return "warning";
			return "poor";
		};
		const getIncomeGrowthStatus = () =>
			getMetricStatus(metrics.incomeGrowthRate, { good: 3, warning: 0 });

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
						status={
							metrics.expenseGrowthRate <= 3
								? "good"
								: metrics.expenseGrowthRate <= 7
									? "warning"
									: "poor"
						}
						target={3}
					/>
				</div>

				{/* Additional Metrics (if available) */}
				{(metrics.budgetAdherence !== undefined ||
					metrics.debtToIncomeRatio !== undefined ||
					metrics.emergencyFundRatio !== undefined ||
					metrics.investmentAllocation !== undefined) && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{metrics.budgetAdherence !== undefined && (
							<MetricCard
								title="Budget Adherence"
								value={metrics.budgetAdherence}
								icon={<Target className="h-4 w-4" />}
								description="How well you stick to your budget"
								status={getMetricStatus(metrics.budgetAdherence, {
									good: 90,
									warning: 75,
								})}
								target={95}
							/>
						)}
						{metrics.debtToIncomeRatio !== undefined && (
							<MetricCard
								title="Debt-to-Income"
								value={metrics.debtToIncomeRatio}
								icon={<AlertTriangle className="h-4 w-4" />}
								description="Debt payments as % of income"
								status={
									metrics.debtToIncomeRatio <= 20
										? "good"
										: metrics.debtToIncomeRatio <= 36
											? "warning"
											: "poor"
								}
								target={20}
							/>
						)}
						{metrics.emergencyFundRatio !== undefined && (
							<MetricCard
								title="Emergency Fund"
								value={metrics.emergencyFundRatio}
								icon={<CheckCircle className="h-4 w-4" />}
								description="Months of expenses covered"
								status={getMetricStatus(metrics.emergencyFundRatio, {
									good: 6,
									warning: 3,
								})}
								target={6}
							/>
						)}
						{metrics.investmentAllocation !== undefined && (
							<MetricCard
								title="Investment Allocation"
								value={metrics.investmentAllocation}
								icon={<BarChart3 className="h-4 w-4" />}
								description="% of portfolio in investments"
								status={getMetricStatus(metrics.investmentAllocation, {
									good: 60,
									warning: 30,
								})}
								target={70}
							/>
						)}
					</div>
				)}

				{/* Health Score and Insights */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<HealthScoreGauge score={metrics.financialHealthScore} />
					<QuickInsights
						metrics={metrics}
						financialSummary={financialSummary}
					/>
				</div>
			</div>
		);
	},
);

export default PerformanceMetricsDashboard;

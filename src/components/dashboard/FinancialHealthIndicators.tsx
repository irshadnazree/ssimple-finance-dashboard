import {
	AlertTriangle,
	CheckCircle,
	DollarSign,
	Target,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";

interface FinancialHealthData {
	savingsRate: number;
	debtToIncomeRatio: number;
	emergencyFundMonths: number;
	monthlyBudgetUsage: number;
	incomeGrowth: number;
	expenseGrowth: number;
}

interface FinancialHealthIndicatorsProps {
	className?: string;
	healthData: FinancialHealthData;
}

interface HealthMetric {
	id: string;
	label: string;
	value: number;
	unit: string;
	status: "excellent" | "good" | "warning" | "poor";
	icon: React.ComponentType<{ className?: string }>;
	description: string;
	target?: number;
}

export function FinancialHealthIndicators({
	className = "",
	healthData,
}: FinancialHealthIndicatorsProps) {
	// Calculate health status based on common financial health metrics
	const getHealthStatus = (
		value: number,
		thresholds: { excellent: number; good: number; warning: number },
	) => {
		if (value >= thresholds.excellent) return "excellent";
		if (value >= thresholds.good) return "good";
		if (value >= thresholds.warning) return "warning";
		return "poor";
	};

	const metrics: HealthMetric[] = [
		{
			id: "savings-rate",
			label: "Savings Rate",
			value: healthData.savingsRate,
			unit: "%",
			status: getHealthStatus(healthData.savingsRate, {
				excellent: 20,
				good: 15,
				warning: 10,
			}),
			icon: TrendingUp,
			description: "Percentage of income saved",
			target: 20,
		},
		{
			id: "debt-ratio",
			label: "Debt-to-Income",
			value: healthData.debtToIncomeRatio,
			unit: "%",
			status: getHealthStatus(100 - healthData.debtToIncomeRatio, {
				excellent: 64,
				good: 50,
				warning: 30,
			}),
			icon: AlertTriangle,
			description: "Debt as percentage of income",
			target: 36,
		},
		{
			id: "emergency-fund",
			label: "Emergency Fund",
			value: healthData.emergencyFundMonths,
			unit: " months",
			status: getHealthStatus(healthData.emergencyFundMonths, {
				excellent: 6,
				good: 4,
				warning: 2,
			}),
			icon: CheckCircle,
			description: "Months of expenses covered",
			target: 6,
		},
		{
			id: "budget-usage",
			label: "Budget Usage",
			value: healthData.monthlyBudgetUsage,
			unit: "%",
			status: getHealthStatus(100 - healthData.monthlyBudgetUsage, {
				excellent: 20,
				good: 10,
				warning: 5,
			}),
			icon: Target,
			description: "Monthly budget utilization",
			target: 85,
		},
	];

	const getStatusColor = (status: HealthMetric["status"]) => {
		switch (status) {
			case "excellent":
				return "text-green-600 bg-green-50 border-green-200";
			case "good":
				return "text-blue-600 bg-blue-50 border-blue-200";
			case "warning":
				return "text-yellow-600 bg-yellow-50 border-yellow-200";
			case "poor":
				return "text-red-600 bg-red-50 border-red-200";
		}
	};

	const getStatusIcon = (status: HealthMetric["status"]) => {
		switch (status) {
			case "excellent":
				return CheckCircle;
			case "good":
				return TrendingUp;
			case "warning":
				return AlertTriangle;
			case "poor":
				return TrendingDown;
		}
	};

	const overallScore =
		metrics.reduce((acc, metric) => {
			const score =
				metric.status === "excellent"
					? 4
					: metric.status === "good"
						? 3
						: metric.status === "warning"
							? 2
							: 1;
			return acc + score;
		}, 0) / metrics.length;

	const overallStatus =
		overallScore >= 3.5
			? "excellent"
			: overallScore >= 2.5
				? "good"
				: overallScore >= 1.5
					? "warning"
					: "poor";

	return (
		<Card className={`bg-card/60 backdrop-blur-sm ${className}`}>
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<DollarSign className="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle className="text-lg font-mono font-bold tracking-wider uppercase">
								Financial Health
							</CardTitle>
							<p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
								Key performance indicators
							</p>
						</div>
					</div>
					<Badge className={getStatusColor(overallStatus)}>
						{overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{metrics.map((metric) => {
						const Icon = metric.icon;
						const StatusIcon = getStatusIcon(metric.status);
						const progress = metric.target
							? Math.min((metric.value / metric.target) * 100, 100)
							: 0;

						return (
							<div
								key={metric.id}
								className="p-4 border rounded-lg bg-background/50"
							>
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2">
										<Icon className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium text-sm">{metric.label}</span>
									</div>
									<StatusIcon
										className={`h-4 w-4 ${getStatusColor(metric.status).split(" ")[0]}`}
									/>
								</div>
								<div className="flex items-baseline gap-1 mb-1">
									<span className="text-2xl font-bold">
										{metric.value.toFixed(metric.unit === "%" ? 1 : 0)}
									</span>
									<span className="text-sm text-muted-foreground">
										{metric.unit}
									</span>
								</div>
								<p className="text-xs text-muted-foreground mb-2">
									{metric.description}
								</p>
								{metric.target && (
									<div className="space-y-1">
										<div className="flex justify-between text-xs text-muted-foreground">
											<span>Progress</span>
											<span>
												Target: {metric.target}
												{metric.unit}
											</span>
										</div>
										<Progress value={progress} className="h-2" />
									</div>
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}

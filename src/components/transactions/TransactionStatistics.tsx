import { memo, useMemo } from "react";
import type { Transaction } from "../../types/finance";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";

interface TransactionStatisticsProps {
	transactions: Transaction[];
	loading?: boolean;
}

interface StatisticItem {
	label: string;
	value: string;
	change?: string;
	changeType?: "positive" | "negative" | "neutral";
	icon: string;
}

interface CategoryStat {
	name: string;
	amount: number;
	count: number;
	percentage: number;
}

export const TransactionStatistics = memo(function TransactionStatistics({
	transactions,
	loading = false,
}: TransactionStatisticsProps) {
	const statistics = useMemo(() => {
		if (loading || transactions.length === 0) {
			return {
				totalIncome: 0,
				totalExpenses: 0,
				netAmount: 0,
				transactionCount: 0,
				averageTransaction: 0,
				largestTransaction: 0,
				categoryStats: [] as CategoryStat[],
				statusStats: {
					completed: 0,
					pending: 0,
					failed: 0,
					cancelled: 0,
				},
			};
		}

		const income = transactions
			.filter((t) => t.type === "income")
			.reduce((sum, t) => sum + t.amount, 0);

		const expenses = transactions
			.filter((t) => t.type === "expense")
			.reduce((sum, t) => sum + Math.abs(t.amount), 0);

		const netAmount = income - expenses;
		const transactionCount = transactions.length;
		const averageTransaction =
			transactionCount > 0
				? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) /
					transactionCount
				: 0;

		const largestTransaction =
			transactions.length > 0
				? Math.max(...transactions.map((t) => Math.abs(t.amount)))
				: 0;

		// Category statistics
		const categoryMap = new Map<string, { amount: number; count: number }>();
		for (const t of transactions) {
			const categoryId = t.category || "uncategorized";
			const existing = categoryMap.get(categoryId) || { amount: 0, count: 0 };
			categoryMap.set(categoryId, {
				amount: existing.amount + Math.abs(t.amount),
				count: existing.count + 1,
			});
		}

		const totalAmount = Array.from(categoryMap.values()).reduce(
			(sum, cat) => sum + cat.amount,
			0,
		);
		const categoryStats: CategoryStat[] = Array.from(categoryMap.entries())
			.map(([name, data]) => ({
				name: name === "uncategorized" ? "Uncategorized" : name,
				amount: data.amount,
				count: data.count,
				percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
			}))
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 5); // Top 5 categories

		// Status statistics
		const statusStats = {
			completed: transactions.filter((t) => t.status === "completed").length,
			pending: transactions.filter((t) => t.status === "pending").length,
			failed: transactions.filter((t) => t.status === "failed").length,
			cancelled: transactions.filter((t) => t.status === "cancelled").length,
		};

		return {
			totalIncome: income,
			totalExpenses: expenses,
			netAmount,
			transactionCount,
			averageTransaction,
			largestTransaction,
			categoryStats,
			statusStats,
		};
	}, [transactions, loading]);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	const getChangeType = (
		value: number,
	): "positive" | "negative" | "neutral" => {
		if (value > 0) return "positive";
		if (value < 0) return "negative";
		return "neutral";
	};

	const mainStats: StatisticItem[] = [
		{
			label: "Total Income",
			value: formatCurrency(statistics.totalIncome),
			icon: "💰",
			changeType: "positive",
		},
		{
			label: "Total Expenses",
			value: formatCurrency(statistics.totalExpenses),
			icon: "💸",
			changeType: "negative",
		},
		{
			label: "Net Amount",
			value: formatCurrency(statistics.netAmount),
			icon: statistics.netAmount >= 0 ? "📈" : "📉",
			changeType: getChangeType(statistics.netAmount),
		},
		{
			label: "Transactions",
			value: statistics.transactionCount.toString(),
			icon: "📊",
			changeType: "neutral",
		},
		{
			label: "Average Transaction",
			value: formatCurrency(statistics.averageTransaction),
			icon: "📋",
			changeType: "neutral",
		},
		{
			label: "Largest Transaction",
			value: formatCurrency(statistics.largestTransaction),
			icon: "🎯",
			changeType: "neutral",
		},
	];

	if (loading) {
		return (
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="font-mono uppercase tracking-wider text-sm sm:text-base">
						Transaction Statistics
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
						{Array.from({ length: 6 }, (_, i) => i).map((i) => (
							<div key={`loading-stat-${i}`} className="space-y-2">
								<div className="h-4 bg-muted animate-pulse rounded" />
								<div className="h-6 bg-muted animate-pulse rounded" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6 mb-6">
			{/* Main Statistics */}
			<Card>
				<CardHeader>
					<CardTitle className="font-mono uppercase tracking-wider text-sm sm:text-base">
						Transaction Statistics
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
						{mainStats.map((stat) => (
							<div key={stat.label} className="space-y-2">
								<div className="flex items-center gap-2">
									<span className="text-lg">{stat.icon}</span>
									<span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
										{stat.label}
									</span>
								</div>
								<div className="space-y-1">
									<div
										className={`text-lg font-bold ${
											stat.changeType === "positive"
												? "text-green-600"
												: stat.changeType === "negative"
													? "text-red-600"
													: "text-foreground"
										}`}
									>
										{stat.value}
									</div>
									{stat.change && (
										<div
											className={`text-xs font-mono ${
												stat.changeType === "positive"
													? "text-green-600"
													: stat.changeType === "negative"
														? "text-red-600"
														: "text-muted-foreground"
											}`}
										>
											{stat.change}
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Category Breakdown */}
				<Card>
					<CardHeader>
						<CardTitle className="font-mono uppercase tracking-wider text-sm">
							Top Categories
						</CardTitle>
					</CardHeader>
					<CardContent>
						{statistics.categoryStats.length > 0 ? (
							<div className="space-y-4">
								{statistics.categoryStats.map((category) => (
									<div key={category.name} className="space-y-2">
										<div className="flex items-center justify-between">
											<span className="font-mono text-sm">{category.name}</span>
											<div className="flex items-center gap-2">
												<Badge variant="outline" className="text-xs">
													{category.count} txns
												</Badge>
												<span className="font-mono text-sm font-bold">
													{formatCurrency(category.amount)}
												</span>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Progress
												value={category.percentage}
												className="flex-1"
											/>
											<span className="font-mono text-xs text-muted-foreground w-12">
												{category.percentage.toFixed(1)}%
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								<span className="font-mono text-sm">
									No category data available
								</span>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Status Breakdown */}
				<Card>
					<CardHeader>
						<CardTitle className="font-mono uppercase tracking-wider text-sm">
							Transaction Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{Object.entries(statistics.statusStats).map(([status, count]) => {
								const percentage =
									statistics.transactionCount > 0
										? (count / statistics.transactionCount) * 100
										: 0;

								const statusConfig = {
									completed: {
										icon: "✅",
										color: "text-green-600",
										bgColor: "bg-green-100",
									},
									pending: {
										icon: "⏳",
										color: "text-yellow-600",
										bgColor: "bg-yellow-100",
									},
									failed: {
										icon: "❌",
										color: "text-red-600",
										bgColor: "bg-red-100",
									},
									cancelled: {
										icon: "🚫",
										color: "text-gray-600",
										bgColor: "bg-gray-100",
									},
								}[status] || {
									icon: "❓",
									color: "text-gray-600",
									bgColor: "bg-gray-100",
								};

								return (
									<div key={status} className="space-y-2">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<span className="text-lg">{statusConfig.icon}</span>
												<span className="font-mono text-sm capitalize">
													{status}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<Badge variant="outline" className="text-xs">
													{count} txns
												</Badge>
												<span
													className={`font-mono text-sm font-bold ${statusConfig.color}`}
												>
													{percentage.toFixed(1)}%
												</span>
											</div>
										</div>
										<Progress value={percentage} className="flex-1" />
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
});

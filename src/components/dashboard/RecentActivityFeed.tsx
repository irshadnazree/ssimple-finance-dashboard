import { Link } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowDownLeft,
	ArrowUpRight,
	Clock,
	RefreshCw,
} from "lucide-react";
import type { Transaction } from "../../types/finance";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface ActivityItem {
	id: string;
	type: "transaction" | "sync" | "report" | "alert";
	title: string;
	description: string;
	timestamp: Date;
	amount?: number;
	status?: "completed" | "pending" | "failed" | "cancelled";
	category?: string;
	account?: string;
}

interface RecentActivityFeedProps {
	className?: string;
	recentTransactions?: Transaction[];
	maxItems?: number;
}

export function RecentActivityFeed({
	className = "",
	recentTransactions = [],
	maxItems = 8,
}: RecentActivityFeedProps) {
	// Convert transactions to activity items and add mock system activities
	const transactionActivities: ActivityItem[] = recentTransactions
		.slice(0, maxItems - 2)
		.map((transaction) => ({
			id: transaction.id,
			type: "transaction",
			title: transaction.description,
			description: `${transaction.type === "income" ? "Income" : "Expense"} • ${
				transaction.category
			}`,
			timestamp: transaction.date,
			amount: transaction.amount,
			status: transaction.status,
			category: transaction.category,
			account: transaction.account,
		}));

	// Add some mock system activities for demonstration
	const systemActivities: ActivityItem[] = [
		{
			id: "sync-1",
			type: "sync",
			title: "Google Drive Sync",
			description: "Data synchronized successfully",
			timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
			status: "completed",
		},
		{
			id: "report-1",
			type: "report",
			title: "Monthly Report Generated",
			description: "Financial summary for current month",
			timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
			status: "completed",
		},
	];

	// Combine and sort activities by timestamp
	const allActivities = [...transactionActivities, ...systemActivities]
		.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
		.slice(0, maxItems);

	const getActivityIcon = (type: ActivityItem["type"], amount?: number) => {
		switch (type) {
			case "transaction":
				return amount && amount > 0 ? ArrowDownLeft : ArrowUpRight;
			case "sync":
				return RefreshCw;
			case "report":
				return Clock;
			case "alert":
				return AlertCircle;
			default:
				return Clock;
		}
	};

	const getStatusColor = (status?: ActivityItem["status"]) => {
		switch (status) {
			case "completed":
				return "text-green-600";
			case "pending":
				return "text-yellow-600";
			case "failed":
				return "text-red-600";
			default:
				return "text-muted-foreground";
		}
	};

	const formatAmount = (amount: number) => {
		const isIncome = amount > 0;
		const absAmount = Math.abs(amount);
		return {
			formatted: `${isIncome ? "+" : "-"}$${absAmount.toFixed(2)}`,
			color: isIncome ? "text-green-600" : "text-red-600",
		};
	};

	const formatTimestamp = (timestamp: Date) => {
		const now = new Date();
		const diffMs = now.getTime() - timestamp.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMins < 60) {
			return `${diffMins}m ago`;
		}
		if (diffHours < 24) {
			return `${diffHours}h ago`;
		}
		if (diffDays < 7) {
			return `${diffDays}d ago`;
		}
		return timestamp.toLocaleDateString();
	};

	return (
		<Card className={`bg-card/60 backdrop-blur-sm ${className}`}>
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<Clock className="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle className="text-lg font-mono font-bold tracking-wider uppercase">
								Recent Activity
							</CardTitle>
							<p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
								Latest financial activities
							</p>
						</div>
					</div>
					<Button variant="outline" size="sm" asChild>
						<Link to="/transactions">View All</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{allActivities.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						<Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
						<p className="text-sm">No recent activity</p>
						<p className="text-xs">
							Your financial activities will appear here
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{allActivities.map((activity, _index) => {
							const Icon = getActivityIcon(activity.type, activity.amount);
							const amountInfo = activity.amount
								? formatAmount(activity.amount)
								: null;

							return (
								<div
									key={activity.id}
									className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
								>
									<div
										className={`p-2 rounded-full ${getStatusColor(
											activity.status,
										)} bg-current/10`}
									>
										<Icon className="h-3 w-3" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1 min-w-0">
												<p className="font-medium text-sm truncate">
													{activity.title}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{activity.description}
												</p>
											</div>
											{amountInfo && (
												<span
													className={`text-sm font-medium ${amountInfo.color}`}
												>
													{amountInfo.formatted}
												</span>
											)}
										</div>
										<div className="flex items-center gap-2 mt-1">
											<span className="text-xs text-muted-foreground">
												{formatTimestamp(activity.timestamp)}
											</span>
											{activity.status && (
												<Badge
													variant="outline"
													className={`text-xs ${getStatusColor(
														activity.status,
													)}`}
												>
													{activity.status}
												</Badge>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

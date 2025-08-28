import { useEffect, useState } from "react";
import { useTransactionStore } from "../../stores/transactionStore";
import { useUIStore } from "../../stores/uiStore";
import type { Transaction } from "../../types/finance";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

interface DashboardSummaryProps {
	className?: string;
}

interface SummaryData {
	totalBalance: number;
	monthlyIncome: number;
	monthlyExpenses: number;
	recentTransactions: Transaction[];
}

export default function DashboardSummary({
	className = "",
}: DashboardSummaryProps) {
	const { transactions, accounts, getTransactionSummary, refreshTransactions } =
		useTransactionStore();
	const {
		loading: { isLoading },
		setLoading,
	} = useUIStore();
	const [summaryData, setSummaryData] = useState<SummaryData>({
		totalBalance: 0,
		monthlyIncome: 0,
		monthlyExpenses: 0,
		recentTransactions: [],
	});
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadSummaryData();
	}, []);

	const loadSummaryData = async () => {
		try {
			setLoading(true, "Loading dashboard summary...");
			setError(null);

			// Refresh transactions from store
			await refreshTransactions();

			// Get current month date range
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

			// Calculate total balance from accounts
			const totalBalance = accounts
				.filter((account) => account.isActive)
				.reduce((sum, account) => sum + account.balance, 0);

			// Filter transactions for current month
			const monthlyTransactions = transactions.filter(
				(t) => t.date >= startOfMonth && t.date <= endOfMonth,
			);

			// Calculate monthly income and expenses
			const monthlyIncome = monthlyTransactions
				.filter((t) => t.type === "income")
				.reduce((sum, t) => sum + t.amount, 0);

			const monthlyExpenses = monthlyTransactions
				.filter((t) => t.type === "expense")
				.reduce((sum, t) => sum + t.amount, 0);

			// Get recent transactions (last 5)
			const recentTransactions = transactions
				.sort((a, b) => b.date.getTime() - a.date.getTime())
				.slice(0, 5);

			setSummaryData({
				totalBalance,
				monthlyIncome,
				monthlyExpenses,
				recentTransactions,
			});
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load dashboard data",
			);
		} finally {
			setLoading(false);
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
		}).format(new Date(date));
	};

	if (isLoading) {
		return (
			<Card className={className}>
				<CardContent className="p-3 sm:p-6">
					<div className="animate-pulse">
						<div className="h-3 sm:h-4 bg-muted rounded w-1/4 mb-3 sm:mb-4" />
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
							{[1, 2, 3].map((i) => (
								<div key={i} className="h-16 sm:h-20 bg-muted rounded" />
							))}
						</div>
						<div className="h-24 sm:h-32 bg-muted rounded" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className={className}>
				<CardContent className="p-3 sm:p-6">
					<Alert variant="destructive">
						<AlertDescription className="text-sm">
							Error loading dashboard: {error}
						</AlertDescription>
					</Alert>
					<div className="mt-3 sm:mt-4 text-center">
						<Button onClick={loadSummaryData} variant="outline" size="sm">
							Retry
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className={`space-y-4 sm:space-y-6 lg:space-y-8 ${className}`}>
			{/* Header */}
			<div className="space-y-2">
				<h1 className="text-lg sm:text-xl lg:text-2xl font-mono font-bold tracking-wider uppercase">
					Financial Overview
				</h1>
				<div className="h-px bg-gradient-to-r from-primary via-primary/50 to-transparent" />
			</div>

			{/* Summary Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
				<div className="bg-card/60 backdrop-blur-sm p-4 sm:p-6 relative overflow-hidden group hover:bg-card/80 transition-all duration-300">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
					<div className="relative z-10">
						<div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
							Total Balance
						</div>
						<div className="text-xl sm:text-2xl font-mono font-bold text-primary">
							{formatCurrency(summaryData.totalBalance)}
						</div>
					</div>
				</div>

				<div className="bg-card/60 backdrop-blur-sm p-4 sm:p-6 relative overflow-hidden group hover:bg-card/80 transition-all duration-300">
					<div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
					<div className="relative z-10">
						<div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
							Monthly Income
						</div>
						<div className="text-xl sm:text-2xl font-mono font-bold text-accent">
							{formatCurrency(summaryData.monthlyIncome)}
						</div>
					</div>
				</div>

				<div className="bg-card/60 backdrop-blur-sm p-4 sm:p-6 relative overflow-hidden group hover:bg-card/80 transition-all duration-300">
					<div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent" />
					<div className="relative z-10">
						<div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
							Monthly Expenses
						</div>
						<div className="text-xl sm:text-2xl font-mono font-bold text-destructive">
							{formatCurrency(summaryData.monthlyExpenses)}
						</div>
					</div>
				</div>
			</div>

			{/* Recent Transactions */}
			<div className="space-y-3 sm:space-y-4">
				<div className="flex items-center gap-2 sm:gap-4">
					<h2 className="text-base sm:text-lg font-mono font-bold tracking-wider uppercase">
						Recent Transactions
					</h2>
					<div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
				</div>
				{summaryData.recentTransactions.length === 0 ? (
					<div className="bg-card/40 backdrop-blur-sm p-4 sm:p-8 text-center">
						<p className="text-muted-foreground font-mono text-xs sm:text-sm uppercase tracking-wider">
							No recent transactions
						</p>
					</div>
				) : (
					<div className="space-y-2">
						{summaryData.recentTransactions.map((transaction) => (
							<div
								key={transaction.id}
								className="bg-card/40 backdrop-blur-sm p-3 sm:p-4 hover:bg-card/60 transition-all duration-200 group"
							>
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
									<div className="flex-1 min-w-0">
										<div className="font-mono font-medium text-sm sm:text-base truncate">
											{transaction.description}
										</div>
										<div className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-wider">
											{transaction.category} • {formatDate(transaction.date)}
										</div>
									</div>
									<div className="text-left sm:text-right flex-shrink-0">
										<Badge
											variant="outline"
											className={
												transaction.type === "income"
													? "border-accent/30 bg-accent/10 text-accent text-xs sm:text-sm"
													: "border-destructive/30 bg-destructive/10 text-destructive text-xs sm:text-sm"
											}
										>
											{transaction.type === "income" ? "+" : "-"}
											{formatCurrency(transaction.amount)}
										</Badge>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

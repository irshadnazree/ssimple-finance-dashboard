import { useEffect, useState } from "react";
import { DatabaseService } from "../../lib/database/db";
import { transactionManager } from "../../lib/transactions/transactionManager";
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
	const [summaryData, setSummaryData] = useState<SummaryData>({
		totalBalance: 0,
		monthlyIncome: 0,
		monthlyExpenses: 0,
		recentTransactions: [],
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadSummaryData();
	}, []);

	const loadSummaryData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Get current month date range
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

			// Load accounts and calculate total balance
			const accounts = await DatabaseService.getAccounts();
			const totalBalance = accounts
				.filter((account) => account.isActive)
				.reduce((sum, account) => sum + account.balance, 0);

			// Load transactions for current month
			const transactions = await transactionManager.getTransactions({
				startDate: startOfMonth,
				endDate: endOfMonth,
			});

			// Calculate monthly income and expenses
			const monthlyIncome = transactions
				.filter((t) => t.type === "income")
				.reduce((sum, t) => sum + t.amount, 0);

			const monthlyExpenses = transactions
				.filter((t) => t.type === "expense")
				.reduce((sum, t) => sum + t.amount, 0);

			// Get recent transactions (last 5)
			const allTransactions = await transactionManager.getTransactions({});
			const recentTransactions = allTransactions.slice(0, 5);

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

	if (loading) {
		return (
			<Card className={className}>
				<CardContent className="p-6">
					<div className="animate-pulse">
						<div className="h-4 bg-muted rounded w-1/4 mb-4" />
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
							{[1, 2, 3, 4].map((i) => (
								<div key={i} className="h-20 bg-muted rounded" />
							))}
						</div>
						<div className="h-32 bg-muted rounded" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className={className}>
				<CardContent className="p-6">
					<Alert variant="destructive">
						<AlertDescription>
							Error loading dashboard: {error}
						</AlertDescription>
					</Alert>
					<div className="mt-4 text-center">
						<Button onClick={loadSummaryData} variant="outline">
							Retry
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className={`space-y-8 ${className}`}>
			{/* Header */}
			<div className="space-y-2">
				<h1 className="text-2xl font-mono font-bold tracking-wider uppercase">
					Financial Overview
				</h1>
				<div className="h-px bg-gradient-to-r from-primary via-primary/50 to-transparent" />
			</div>

			{/* Summary Grid */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-card/60 backdrop-blur-sm p-6 relative overflow-hidden group hover:bg-card/80 transition-all duration-300">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
					<div className="relative z-10">
						<div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
							Total Balance
						</div>
						<div className="text-2xl font-mono font-bold text-primary">
							{formatCurrency(summaryData.totalBalance)}
						</div>
					</div>
				</div>

				<div className="bg-card/60 backdrop-blur-sm p-6 relative overflow-hidden group hover:bg-card/80 transition-all duration-300">
					<div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
					<div className="relative z-10">
						<div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
							Monthly Income
						</div>
						<div className="text-2xl font-mono font-bold text-accent">
							{formatCurrency(summaryData.monthlyIncome)}
						</div>
					</div>
				</div>

				<div className="bg-card/60 backdrop-blur-sm p-6 relative overflow-hidden group hover:bg-card/80 transition-all duration-300">
					<div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent" />
					<div className="relative z-10">
						<div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
							Monthly Expenses
						</div>
						<div className="text-2xl font-mono font-bold text-destructive">
							{formatCurrency(summaryData.monthlyExpenses)}
						</div>
					</div>
				</div>


			</div>



			{/* Recent Transactions */}
			<div className="space-y-4">
				<div className="flex items-center gap-4">
					<h2 className="text-lg font-mono font-bold tracking-wider uppercase">
						Recent Transactions
					</h2>
					<div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
				</div>
				{summaryData.recentTransactions.length === 0 ? (
					<div className="bg-card/40 backdrop-blur-sm p-8 text-center">
						<p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
							No recent transactions
						</p>
					</div>
				) : (
					<div className="space-y-2">
						{summaryData.recentTransactions.map((transaction) => (
							<div
								key={transaction.id}
								className="bg-card/40 backdrop-blur-sm p-4 hover:bg-card/60 transition-all duration-200 group"
							>
								<div className="flex items-center justify-between">
									<div className="flex-1">
										<div className="font-mono font-medium">
											{transaction.description}
										</div>
										<div className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-wider">
											{transaction.category} • {formatDate(transaction.date)}
										</div>
									</div>
									<div className="text-right">
										<Badge
											variant="outline"
											className={
												transaction.type === "income"
													? "border-accent/30 bg-accent/10 text-accent"
													: "border-destructive/30 bg-destructive/10 text-destructive"
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

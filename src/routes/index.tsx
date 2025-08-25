import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import FinanceChart from "../components/charts/FinanceChart";
import DashboardSummary from "../components/dashboard/DashboardSummary";
import { QuickActions } from "../components/dashboard/QuickActions";
import { FinancialHealthIndicators } from "../components/dashboard/FinancialHealthIndicators";
import { RecentActivityFeed } from "../components/dashboard/RecentActivityFeed";
import { Button } from "../components/ui/button";
import { DatabaseService } from "../lib/database/db";
import { DatabaseInitService } from "../lib/database/init";
import { DashboardLayout, DashboardSection, DashboardGrid } from "../components/layout";
import type { Transaction } from "../types/finance";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
	const [chartTimeframe, setChartTimeframe] = useState<
		"week" | "month" | "year"
	>("month");
	const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
	const [showAddTransaction, setShowAddTransaction] = useState(false);

	// Mock financial health data - in a real app, this would come from calculations
	const healthData = {
		savingsRate: 18.5,
		debtToIncomeRatio: 28.0,
		emergencyFundMonths: 4.2,
		monthlyBudgetUsage: 82.3,
		incomeGrowth: 5.2,
		expenseGrowth: 3.1
	};

	useEffect(() => {
		loadRecentTransactions();
	}, []);

	const loadRecentTransactions = async () => {
		try {
			await DatabaseInitService.initialize();
			const transactions = await DatabaseService.getTransactions();
			// Get the 5 most recent transactions
			const recent = transactions
				.sort((a, b) => b.date.getTime() - a.date.getTime())
				.slice(0, 5);
			setRecentTransactions(recent);
		} catch (error) {
			console.error('Failed to load recent transactions:', error);
		}
	};

	const handleAddTransaction = () => {
		setShowAddTransaction(true);
		// In a real app, this would open a transaction form modal or navigate to transactions page
		console.log('Add transaction clicked');
	};

	return (
		<DashboardLayout>
			{/* Top Row - Summary and Quick Actions */}
			<DashboardSection>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2">
						<DashboardSummary />
					</div>
					<div>
						<QuickActions onAddTransaction={handleAddTransaction} />
					</div>
				</div>
			</DashboardSection>

			{/* Middle Row - Financial Health and Recent Activity */}
			<DashboardSection>
				<DashboardGrid>
					<FinancialHealthIndicators healthData={healthData} />
					<RecentActivityFeed recentTransactions={recentTransactions} />
				</DashboardGrid>
			</DashboardSection>

			{/* Bottom Row - Chart Section */}
			<DashboardSection>
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-4">
						<h2 className="text-xl font-mono font-bold tracking-wider uppercase">
							Financial Trends
						</h2>
						<div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
					</div>
					<div className="flex gap-2">
						{(["week", "month", "year"] as const).map((timeframe) => (
							<Button
								key={timeframe}
								variant={
									chartTimeframe === timeframe ? "default" : "outline"
								}
								size="sm"
								onClick={() => setChartTimeframe(timeframe)}
							>
								{timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
							</Button>
						))}
					</div>
				</div>
				<div className="bg-card/60 backdrop-blur-sm p-6 relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
					<div className="relative z-10">
						<FinanceChart timeframe={chartTimeframe} />
					</div>
				</div>
			</DashboardSection>

			{/* Additional Quick Actions */}
			<DashboardSection>
				<div className="flex items-center gap-4 mb-6">
					<h2 className="text-xl font-mono font-bold tracking-wider uppercase">
						Quick Actions
					</h2>
					<div className="flex-1 h-px bg-gradient-to-r from-accent/50 to-transparent" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<Button
						variant="outline"
						className="h-auto p-8 flex flex-col items-center gap-4 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300 group"
					>
						<div className="text-primary text-3xl font-mono font-bold group-hover:scale-110 transition-transform duration-200">
							+
						</div>
						<div className="font-mono font-medium uppercase tracking-wide">
							Add Transaction
						</div>
						<div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
							Record income or expense
						</div>
					</Button>

					<Button
						variant="outline"
						className="h-auto p-8 flex flex-col items-center gap-4 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300 group"
					>
						<div className="text-secondary-foreground text-3xl font-mono font-bold group-hover:scale-110 transition-transform duration-200">
							📈
						</div>
						<div className="font-mono font-medium uppercase tracking-wide">
							View Reports
						</div>
						<div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
							Analyze your finances
						</div>
					</Button>
				</div>
			</DashboardSection>
		</DashboardLayout>
	);
}

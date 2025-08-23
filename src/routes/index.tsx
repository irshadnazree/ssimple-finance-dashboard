import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import FinanceChart from "../components/charts/FinanceChart";
import DashboardSummary from "../components/dashboard/DashboardSummary";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
	const [chartTimeframe, setChartTimeframe] = useState<
		"week" | "month" | "year"
	>("month");

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
				<div className="space-y-12">
					{/* Summary Section */}
					<DashboardSummary />

					{/* Chart Section */}
					<div className="space-y-6">
						<div className="flex items-center justify-between">
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
					</div>

					{/* Quick Actions */}
					<div className="space-y-6">
						<div className="flex items-center gap-4">
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
								<div className="text-accent text-3xl font-mono font-bold group-hover:scale-110 transition-transform duration-200">
									📊
								</div>
								<div className="font-mono font-medium uppercase tracking-wide">
									Create Budget
								</div>
								<div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
									Set spending limits
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
					</div>
				</div>
			</div>
		</div>
	);
}

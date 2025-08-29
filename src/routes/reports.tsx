import { createFileRoute } from "@tanstack/react-router";
import {
	Activity,
	BarChart3,
	FileText,
	PieChart,
	TrendingUp,
} from "lucide-react";
import {
	ReportsGrid,
	ReportsLayout,
	ReportsSection,
} from "../components/layout";
import { ReportsPage } from "../components/reports/ReportsPage";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "../components/ui/tabs";

export const Route = createFileRoute("/reports")({ component: Reports });

function Reports() {
	return (
		<ReportsLayout>
			<ReportsSection>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-mono font-bold tracking-wider uppercase">
							Financial Reports
						</h1>
						<p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
							Analyze your financial data with comprehensive reports
						</p>
					</div>
				</div>
				<div className="h-px bg-gradient-to-r from-primary via-primary/50 to-transparent" />
			</ReportsSection>

			<ReportsSection>
				<Card className="bg-card/60 backdrop-blur-sm">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-lg font-mono font-bold tracking-wider uppercase">
							<FileText className="h-5 w-5" />
							Report Categories
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="overview" className="w-full">
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="overview">Overview</TabsTrigger>
								<TabsTrigger value="analysis">Analysis</TabsTrigger>
								<TabsTrigger value="performance">Performance</TabsTrigger>
							</TabsList>
							<TabsContent value="overview" className="mt-6">
								<ReportsGrid>
									<Card className="cursor-pointer transition-all hover:shadow-md hover:bg-accent/50">
										<CardContent className="p-4">
											<div className="flex items-start gap-3">
												<div className="p-2 rounded-lg bg-blue-100 text-blue-600">
													<BarChart3 className="h-5 w-5" />
												</div>
												<div className="flex-1">
													<h3 className="font-semibold text-sm mb-1">
														Financial Summary
													</h3>
													<p className="text-xs text-muted-foreground">
														Overview of income, expenses, and net worth
													</p>
												</div>
											</div>
										</CardContent>
									</Card>
								</ReportsGrid>
							</TabsContent>
							<TabsContent value="analysis" className="mt-6">
								<ReportsGrid>
									<Card className="cursor-pointer transition-all hover:shadow-md hover:bg-accent/50">
										<CardContent className="p-4">
											<div className="flex items-start gap-3">
												<div className="p-2 rounded-lg bg-purple-100 text-purple-600">
													<PieChart className="h-5 w-5" />
												</div>
												<div className="flex-1">
													<h3 className="font-semibold text-sm mb-1">
														Category Breakdown
													</h3>
													<p className="text-xs text-muted-foreground">
														Spending distribution across categories
													</p>
												</div>
											</div>
										</CardContent>
									</Card>
									<Card className="cursor-pointer transition-all hover:shadow-md hover:bg-accent/50">
										<CardContent className="p-4">
											<div className="flex items-start gap-3">
												<div className="p-2 rounded-lg bg-red-100 text-red-600">
													<Activity className="h-5 w-5" />
												</div>
												<div className="flex-1">
													<h3 className="font-semibold text-sm mb-1">
														Cash Flow Analysis
													</h3>
													<p className="text-xs text-muted-foreground">
														Money flow in and out over time
													</p>
												</div>
											</div>
										</CardContent>
									</Card>
								</ReportsGrid>
							</TabsContent>
							<TabsContent value="performance" className="mt-6">
								<ReportsGrid>
									<Card className="cursor-pointer transition-all hover:shadow-md hover:bg-accent/50">
										<CardContent className="p-4">
											<div className="flex items-start gap-3">
												<div className="p-2 rounded-lg bg-orange-100 text-orange-600">
													<TrendingUp className="h-5 w-5" />
												</div>
												<div className="flex-1">
													<h3 className="font-semibold text-sm mb-1">
														Account Performance
													</h3>
													<p className="text-xs text-muted-foreground">
														Growth and performance metrics by account
													</p>
												</div>
											</div>
										</CardContent>
									</Card>
								</ReportsGrid>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</ReportsSection>

			<ReportsSection>
				{/* Main Reports Component */}
				<ReportsPage />
			</ReportsSection>
		</ReportsLayout>
	);
}

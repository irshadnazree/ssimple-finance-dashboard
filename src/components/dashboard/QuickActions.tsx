import { Link } from "@tanstack/react-router";
import { ArrowUpDown, FileText, Plus, TrendingUp, Wallet } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface QuickActionsProps {
	className?: string;
	onAddTransaction?: () => void;
}

export function QuickActions({
	className = "",
	onAddTransaction,
}: QuickActionsProps) {
	const quickActions = [
		{
			id: "add-transaction",
			label: "Add Transaction",
			icon: Plus,
			variant: "default" as const,
			onClick: onAddTransaction,
			description: "Record a new transaction",
		},
		{
			id: "transfer",
			label: "Transfer Funds",
			icon: ArrowUpDown,
			variant: "outline" as const,
			href: "/transactions?action=transfer",
			description: "Move money between accounts",
		},
		{
			id: "reports",
			label: "View Reports",
			icon: FileText,
			variant: "outline" as const,
			href: "/reports",
			description: "Analyze your finances",
		},
		{
			id: "budget",
			label: "Budget Tracker",
			icon: TrendingUp,
			variant: "outline" as const,
			href: "/reports?type=budget",
			description: "Track spending goals",
		},
	];

	return (
		<Card className={`bg-card/60 backdrop-blur-sm ${className}`}>
			<CardHeader className="pb-4">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-primary/10 rounded-lg">
						<Wallet className="h-5 w-5 text-primary" />
					</div>
					<div>
						<CardTitle className="text-lg font-mono font-bold tracking-wider uppercase">
							Quick Actions
						</CardTitle>
						<p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
							Common financial tasks
						</p>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{quickActions.map((action) => {
						const Icon = action.icon;

						if (action.onClick) {
							return (
								<Button
									key={action.id}
									variant={action.variant}
									size="lg"
									onClick={action.onClick}
									className="h-auto p-4 flex flex-col items-start gap-2 text-left"
								>
									<div className="flex items-center gap-2 w-full">
										<Icon className="h-4 w-4" />
										<span className="font-medium">{action.label}</span>
									</div>
									<span className="text-xs text-muted-foreground">
										{action.description}
									</span>
								</Button>
							);
						}

						if (action.href) {
							return (
								<Button
									key={action.id}
									variant={action.variant}
									size="lg"
									asChild
									className="h-auto p-4 flex flex-col items-start gap-2 text-left"
								>
									<Link to={action.href}>
										<div className="flex items-center gap-2 w-full">
											<Icon className="h-4 w-4" />
											<span className="font-medium">{action.label}</span>
										</div>
										<span className="text-xs text-muted-foreground">
											{action.description}
										</span>
									</Link>
								</Button>
							);
						}

						return null;
					})}
				</div>
			</CardContent>
		</Card>
	);
}

import {
	Bell,
	Database,
	Download,
	Palette,
	Settings,
	Shield,
	User,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface SettingsNavigationProps {
	activeSection: string;
	onSectionChange: (section: string) => void;
	className?: string;
}

const settingsSections = [
	{
		id: "profile",
		label: "Profile",
		description: "Personal information and preferences",
		icon: User,
	},
	{
		id: "security",
		label: "Security",
		description: "Password and authentication settings",
		icon: Shield,
	},
	{
		id: "notifications",
		label: "Notifications",
		description: "Email and push notification preferences",
		icon: Bell,
	},
	{
		id: "data",
		label: "Data & Storage",
		description: "Backup, sync, and data management",
		icon: Database,
	},
	{
		id: "appearance",
		label: "Appearance",
		description: "Theme, layout, and display preferences",
		icon: Palette,
	},
	{
		id: "export",
		label: "Export & Import",
		description: "Data export and import options",
		icon: Download,
	},
];

export function SettingsNavigation({
	activeSection,
	onSectionChange,
	className,
}: SettingsNavigationProps) {
	return (
		<nav className={cn("space-y-2", className)}>
			<div className="mb-6">
				<h2 className="flex items-center gap-2 text-lg font-mono font-bold tracking-wider uppercase mb-2">
					<Settings className="h-5 w-5" />
					Settings
				</h2>
				<p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
					Manage your application preferences
				</p>
			</div>
			{settingsSections.map((section) => {
				const Icon = section.icon;
				const isActive = activeSection === section.id;
				return (
					<button
						type="button"
						key={section.id}
						onClick={() => onSectionChange(section.id)}
						className={cn(
							"w-full text-left p-4 rounded-lg transition-all hover:bg-accent/50",
							isActive
								? "bg-primary/10 border-l-4 border-primary"
								: "hover:bg-accent/30",
						)}
					>
						<div className="flex items-start gap-3">
							<div
								className={cn(
									"p-2 rounded-lg",
									isActive
										? "bg-primary/20 text-primary"
										: "bg-muted text-muted-foreground",
								)}
							>
								<Icon className="h-4 w-4" />
							</div>
							<div className="flex-1">
								<h3
									className={cn(
										"font-semibold text-sm mb-1",
										isActive ? "text-primary" : "text-foreground",
									)}
								>
									{section.label}
								</h3>
								<p className="text-xs text-muted-foreground">
									{section.description}
								</p>
							</div>
						</div>
					</button>
				);
			})}
		</nav>
	);
}

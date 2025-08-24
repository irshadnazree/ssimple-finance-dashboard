import { Link } from "@tanstack/react-router";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from "./ui/navigation-menu";

export default function Header() {
	return (
		<header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-14 items-center px-6">
				<div className="mr-6">
					<h1 className="text-sm font-semibold tracking-tight text-foreground/80 font-mono">
						$ ssimple-finance
					</h1>
				</div>

				<NavigationMenu>
					<NavigationMenuList>
						<NavigationMenuItem>
							<NavigationMenuLink
								className={navigationMenuTriggerStyle()}
								asChild
							>
								<Link to="/">Dashboard</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>

						<NavigationMenuItem>
							<NavigationMenuLink
								className={navigationMenuTriggerStyle()}
								asChild
							>
								<Link to="/transactions">Transactions</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>

						<NavigationMenuItem>
							<NavigationMenuLink
								className={navigationMenuTriggerStyle()}
								asChild
							>
								<Link to="/reports">Reports</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>

						<NavigationMenuItem>
							<NavigationMenuLink
								className={navigationMenuTriggerStyle()}
								asChild
							>
								<Link to="/settings">Settings</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
					</NavigationMenuList>
				</NavigationMenu>
			</div>
		</header>
	);
}

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface RouteLayoutProps {
	children: ReactNode;
	className?: string;
}

/**
 * Base layout wrapper for all route components
 * Provides consistent spacing and background
 */
export function RouteLayout({ children, className }: RouteLayoutProps) {
	return (
		<div className={cn("min-h-screen bg-background", className)}>
			<div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">{children}</div>
		</div>
	);
}

interface RouteHeaderProps {
	title: string;
	description?: string;
	actions?: ReactNode;
	className?: string;
}

/**
 * Standardized header component for routes
 * Provides consistent typography and spacing
 */
export function RouteHeader({
	title,
	description,
	actions,
	className,
}: RouteHeaderProps) {
	return (
		<div className={cn("space-y-4", className)}>
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-mono font-bold tracking-wider uppercase">
						{title}
					</h1>
					{description && (
						<p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
							{description}
						</p>
					)}
				</div>
				{actions && <div className="flex items-center gap-2">{actions}</div>}
			</div>
			<div className="h-px bg-gradient-to-r from-primary via-primary/50 to-transparent" />
		</div>
	);
}

interface RouteContentProps {
	children: ReactNode;
	className?: string;
}

/**
 * Content wrapper for route main content
 * Provides consistent spacing between sections
 */
export function RouteContent({ children, className }: RouteContentProps) {
	return <div className={cn("space-y-8", className)}>{children}</div>;
}

interface RouteSectionProps {
	children: ReactNode;
	className?: string;
}

/**
 * Individual section wrapper within route content
 * Provides consistent spacing for content sections
 */
export function RouteSection({ children, className }: RouteSectionProps) {
	return <div className={cn("space-y-6", className)}>{children}</div>;
}

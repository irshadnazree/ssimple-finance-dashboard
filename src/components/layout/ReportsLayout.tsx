import type { ReactNode } from "react";
import {
	RouteContent,
	RouteHeader,
	RouteLayout,
	RouteSection,
} from "./RouteLayout";

interface ReportsLayoutProps {
	children: ReactNode;
	headerActions?: ReactNode;
}

/**
 * Specialized layout for the reports route
 * Provides the specific structure for financial reports and analytics
 */
export function ReportsLayout({ children, headerActions }: ReportsLayoutProps) {
	return (
		<RouteLayout>
			<RouteHeader
				title="Financial Reports"
				description="Analyze your financial data with comprehensive reports"
				actions={headerActions}
			/>
			<RouteContent>{children}</RouteContent>
		</RouteLayout>
	);
}

interface ReportsSectionProps {
	children: ReactNode;
	className?: string;
}

/**
 * Reports-specific section wrapper
 * Provides consistent spacing for report sections
 */
export function ReportsSection({ children, className }: ReportsSectionProps) {
	return <RouteSection className={className}>{children}</RouteSection>;
}

interface ReportsGridProps {
	children: ReactNode;
	columns?: 1 | 2 | 3;
	className?: string;
}

/**
 * Grid layout for report cards and widgets
 * Provides responsive grid layout for report components
 */
export function ReportsGrid({
	children,
	columns = 2,
	className,
}: ReportsGridProps) {
	const gridClasses = {
		1: "grid-cols-1",
		2: "grid-cols-1 md:grid-cols-2",
		3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
	};

	return (
		<div className={`grid ${gridClasses[columns]} gap-4 ${className || ""}`}>
			{children}
		</div>
	);
}

interface ReportsTabContentProps {
	children: ReactNode;
	className?: string;
}

/**
 * Content wrapper for report tab sections
 * Provides consistent spacing and styling for tabbed content
 */
export function ReportsTabContent({
	children,
	className,
}: ReportsTabContentProps) {
	return <div className={`mt-6 ${className || ""}`}>{children}</div>;
}

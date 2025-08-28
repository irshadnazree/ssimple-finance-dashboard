import type { ReactNode } from "react";
import {
	RouteContent,
	RouteHeader,
	RouteLayout,
	RouteSection,
} from "./RouteLayout";

interface TransactionsLayoutProps {
	children: ReactNode;
	headerActions?: ReactNode;
}

/**
 * Specialized layout for the transactions route
 * Provides the specific structure for transaction management components
 */
export function TransactionsLayout({
	children,
	headerActions,
}: TransactionsLayoutProps) {
	return (
		<RouteLayout>
			<RouteHeader
				title="Transactions"
				description="Manage and track your financial transactions"
				actions={headerActions}
			/>
			<RouteContent>{children}</RouteContent>
		</RouteLayout>
	);
}

interface TransactionsSectionProps {
	children: ReactNode;
	className?: string;
}

/**
 * Transactions-specific section wrapper
 * Provides consistent spacing for transaction sections
 */
export function TransactionsSection({
	children,
	className,
}: TransactionsSectionProps) {
	return <RouteSection className={className}>{children}</RouteSection>;
}

interface TransactionsToolbarProps {
	children: ReactNode;
	className?: string;
}

/**
 * Toolbar section for transaction operations
 * Provides consistent styling for transaction toolbars
 */
export function TransactionsToolbar({
	children,
	className,
}: TransactionsToolbarProps) {
	return (
		<div
			className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${className || ""}`}
		>
			{children}
		</div>
	);
}

interface TransactionsContentGridProps {
	children: ReactNode;
	className?: string;
}

/**
 * Grid layout for transaction content areas
 * Provides responsive layout for filters, statistics, and transaction list
 */
export function TransactionsContentGrid({
	children,
	className,
}: TransactionsContentGridProps) {
	return <div className={`space-y-6 ${className || ""}`}>{children}</div>;
}

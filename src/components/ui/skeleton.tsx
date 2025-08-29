import { cn } from "../../lib/utils";

interface SkeletonProps {
	className?: string;
	style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
	return (
		<div
			className={cn("animate-pulse rounded-md bg-muted", className)}
			style={style}
		/>
	);
}

// Table skeleton for data tables
export function TableSkeleton({
	rows = 5,
	columns = 4,
	className,
}: {
	rows?: number;
	columns?: number;
	className?: string;
}) {
	return (
		<div className={cn("space-y-3", className)}>
			{/* Header skeleton */}
			<div
				className="grid gap-3"
				style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
			>
				{Array.from({ length: columns }, (_, i) => (
					<Skeleton key={`header-col-${columns}-${i}`} className="h-4 w-full" />
				))}
			</div>
			{/* Row skeletons */}
			{Array.from({ length: rows }, (_, rowIndex) => (
				<div
					key={`table-row-${rows}-${rowIndex}`}
					className="grid gap-3"
					style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
				>
					{Array.from({ length: columns }, (_, colIndex) => (
						<Skeleton
							key={`table-cell-${rows}-${columns}-${rowIndex}-${colIndex}`}
							className={cn(
								"h-4",
								colIndex === 0 ? "w-3/4" : "w-full", // First column slightly shorter
							)}
						/>
					))}
				</div>
			))}
		</div>
	);
}

// Card skeleton for dashboard cards
export function CardSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("p-6 border rounded-lg bg-card", className)}>
			<div className="space-y-3">
				<Skeleton className="h-4 w-1/4" />
				<Skeleton className="h-8 w-1/2" />
				<div className="space-y-2">
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-3/4" />
				</div>
			</div>
		</div>
	);
}

// Chart skeleton for chart components
export function ChartSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("p-6 border rounded-lg bg-card", className)}>
			<div className="space-y-4">
				{/* Chart title */}
				<Skeleton className="h-5 w-1/3" />
				{/* Chart area */}
				<div className="space-y-2">
					<div className="flex items-end space-x-2 h-32">
						{Array.from({ length: 8 }, (_, i) => (
							<Skeleton
								key={`chart-bar-${i}`}
								className="flex-1"
								style={{
									height: `${Math.random() * 80 + 20}%`,
								}}
							/>
						))}
					</div>
					{/* Chart legend */}
					<div className="flex space-x-4">
						<Skeleton className="h-3 w-16" />
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-3 w-14" />
					</div>
				</div>
			</div>
		</div>
	);
}

// List skeleton for activity feeds and lists
export function ListSkeleton({
	items = 5,
	className,
}: {
	items?: number;
	className?: string;
}) {
	return (
		<div className={cn("space-y-3", className)}>
			{Array.from({ length: items }, (_, i) => (
				<div
					key={`list-item-${items}-${i}`}
					className="flex items-center space-x-3 p-3 border rounded-lg"
				>
					<Skeleton className="h-10 w-10 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
					<Skeleton className="h-4 w-16" />
				</div>
			))}
		</div>
	);
}

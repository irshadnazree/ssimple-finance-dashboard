import type {
	DateRange,
	ReportFilters,
	Transaction,
} from "../../types/finance";

// Cache interface for storing report data
interface CacheEntry<T> {
	data: T;
	timestamp: number;
	key: string;
	ttl: number; // Time to live in milliseconds
}

// Cache manager class
class ReportCache {
	private cache = new Map<string, CacheEntry<unknown>>();
	private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
	private readonly MAX_CACHE_SIZE = 100;

	// Generate cache key from filters and parameters
	private generateKey(prefix: string, params: unknown): string {
		return `${prefix}_${JSON.stringify(params)}`;
	}

	// Set cache entry
	set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
		// Remove oldest entries if cache is full
		if (this.cache.size >= this.MAX_CACHE_SIZE) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey) {
				this.cache.delete(oldestKey);
			}
		}

		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			key,
			ttl,
		});
	}

	// Get cache entry
	get<T>(key: string): T | null {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		// Check if entry has expired
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data as T;
	}

	// Clear cache
	clear(): void {
		this.cache.clear();
	}

	// Clear expired entries
	clearExpired(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > entry.ttl) {
				this.cache.delete(key);
			}
		}
	}

	// Get cache statistics
	getStats() {
		return {
			size: this.cache.size,
			maxSize: this.MAX_CACHE_SIZE,
			keys: Array.from(this.cache.keys()),
		};
	}
}

// Global cache instance
const reportCache = new ReportCache();

// Debounce utility for search/filter operations
function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

// Lazy loading utility for large datasets
class LazyLoader<T> {
	private items: T[] = [];
	private pageSize: number;
	private currentPage = 0;
	private totalItems = 0;

	constructor(pageSize = 50) {
		this.pageSize = pageSize;
	}

	// Initialize with total dataset
	initialize(items: T[]): void {
		this.items = items;
		this.totalItems = items.length;
		this.currentPage = 0;
	}

	// Get next page of items
	getNextPage(): { items: T[]; hasMore: boolean; currentPage: number } {
		const startIndex = this.currentPage * this.pageSize;
		const endIndex = Math.min(startIndex + this.pageSize, this.totalItems);

		const pageItems = this.items.slice(startIndex, endIndex);
		const hasMore = endIndex < this.totalItems;

		if (pageItems.length > 0) {
			this.currentPage++;
		}

		return {
			items: pageItems,
			hasMore,
			currentPage: this.currentPage,
		};
	}

	// Reset to first page
	reset(): void {
		this.currentPage = 0;
	}

	// Get current stats
	getStats() {
		return {
			totalItems: this.totalItems,
			currentPage: this.currentPage,
			pageSize: this.pageSize,
			loadedItems: this.currentPage * this.pageSize,
		};
	}
}

// Efficient query strategies
const QueryOptimizer = {
	// Optimize transaction filtering with indexed approach
	filterTransactions(
		transactions: Transaction[],
		filters: ReportFilters,
	): Transaction[] {
		let filtered = transactions;

		// Early return if no filters
		if (!this.hasActiveFilters(filters)) {
			return filtered;
		}

		// Apply filters in order of selectivity (most selective first)
		if (filters.dateRange) {
			filtered = this.filterByDateRange(filtered, filters.dateRange);
		}

		if (filters.accounts && filters.accounts.length > 0) {
			const accountSet = new Set(filters.accounts);
			filtered = filtered.filter((t) => accountSet.has(t.account));
		}

		if (filters.categories && filters.categories.length > 0) {
			const categorySet = new Set(filters.categories);
			filtered = filtered.filter((t) => categorySet.has(t.category));
		}

		if (filters.transactionTypes && filters.transactionTypes.length > 0) {
			const typeSet = new Set(filters.transactionTypes);
			filtered = filtered.filter((t) => typeSet.has(t.type));
		}

		if (filters.amountRange) {
			filtered = filtered.filter(
				(t) =>
					t.amount >= (filters.amountRange?.min || Number.NEGATIVE_INFINITY) &&
					t.amount <= (filters.amountRange?.max || Number.POSITIVE_INFINITY),
			);
		}

		// Note: searchTerm filtering would be implemented when ReportFilters includes this property

		return filtered;
	},

	// Check if any filters are active
	hasActiveFilters(filters: ReportFilters): boolean {
		return !!(
			filters.dateRange ||
			(filters.accounts && filters.accounts.length > 0) ||
			(filters.categories && filters.categories.length > 0) ||
			(filters.transactionTypes && filters.transactionTypes.length > 0) ||
			filters.amountRange
		);
	},

	// Efficient date range filtering
	filterByDateRange(
		transactions: Transaction[],
		dateRange: DateRange,
	): Transaction[] {
		const startTime = dateRange.startDate.getTime();
		const endTime = dateRange.endDate.getTime();

		return transactions.filter((t) => {
			const transactionTime = t.date.getTime();
			return transactionTime >= startTime && transactionTime <= endTime;
		});
	},

	// Optimize sorting with stable sort
	sortTransactions(
		transactions: Transaction[],
		sortBy: "date" | "amount" | "description",
		sortOrder: "asc" | "desc" = "desc",
	): Transaction[] {
		const multiplier = sortOrder === "asc" ? 1 : -1;

		return [...transactions].sort((a, b) => {
			let comparison = 0;

			switch (sortBy) {
				case "date":
					comparison = a.date.getTime() - b.date.getTime();
					break;
				case "amount":
					comparison = a.amount - b.amount;
					break;
				case "description":
					comparison = a.description.localeCompare(b.description);
					break;
			}

			return comparison * multiplier;
		});
	},
};

// Performance monitoring
const PerformanceMonitor = {
	metrics: new Map<string, number[]>(),

	// Start timing an operation
	startTimer(operation: string): () => number {
		const startTime = performance.now();

		return () => {
			const duration = performance.now() - startTime;
			this.recordMetric(operation, duration);
			return duration;
		};
	},

	// Record a performance metric
	recordMetric(operation: string, duration: number): void {
		if (!this.metrics.has(operation)) {
			this.metrics.set(operation, []);
		}

		const metrics = this.metrics.get(operation);
		if (metrics) {
			metrics.push(duration);

			// Keep only last 100 measurements
			if (metrics.length > 100) {
				metrics.shift();
			}
		}
	},

	// Get performance statistics
	getStats(
		operation?: string,
	):
		| Record<string, unknown>
		| { count: number; avg: number; min: number; max: number } {
		if (operation) {
			const metrics = this.metrics.get(operation) || [];
			return this.calculateStats(metrics);
		}

		const allStats: Record<string, unknown> = {};
		for (const [op, metrics] of this.metrics.entries()) {
			allStats[op] = this.calculateStats(metrics);
		}
		return allStats;
	},

	calculateStats(metrics: number[]) {
		if (metrics.length === 0) {
			return { count: 0, avg: 0, min: 0, max: 0 };
		}

		const sum = metrics.reduce((a, b) => a + b, 0);
		const avg = sum / metrics.length;
		const min = Math.min(...metrics);
		const max = Math.max(...metrics);

		return {
			count: metrics.length,
			avg: Math.round(avg * 100) / 100,
			min: Math.round(min * 100) / 100,
			max: Math.round(max * 100) / 100,
		};
	},
};

// Main performance service
const transactionLoader = new LazyLoader<Transaction>();

// Initialize performance optimizations
function initializePerformanceService(): void {
	// Clear expired cache entries every 5 minutes
	setInterval(
		() => {
			reportCache.clearExpired();
		},
		5 * 60 * 1000,
	);
}

// Get cached or compute report data
async function getCachedReportData<T>(
	cacheKey: string,
	computeFn: () => Promise<T> | T,
	ttl?: number,
): Promise<T> {
	const endTimer = PerformanceMonitor.startTimer(`cache-${cacheKey}`);

	// Try to get from cache first
	const cached = reportCache.get<T>(cacheKey);
	if (cached) {
		endTimer();
		return cached;
	}

	// Compute and cache the result
	const result = await computeFn();
	reportCache.set(cacheKey, result, ttl);

	endTimer();
	return result;
}

// Optimized transaction filtering with caching
function getFilteredTransactions(
	transactions: Transaction[],
	filters: ReportFilters,
): Promise<Transaction[]> {
	const cacheKey = `filtered_transactions_${JSON.stringify({
		transactionCount: transactions.length,
		filters,
	})}`;

	return getCachedReportData(
		cacheKey,
		() => {
			const endTimer = PerformanceMonitor.startTimer("filter_transactions");
			const result = QueryOptimizer.filterTransactions(transactions, filters);
			endTimer();
			return result;
		},
		2 * 60 * 1000, // 2 minutes cache
	);
}

// Lazy loading for transaction lists
function initializeTransactionLoader(transactions: Transaction[]): void {
	transactionLoader.initialize(transactions);
}

function getNextTransactionPage() {
	return transactionLoader.getNextPage();
}

function resetTransactionLoader(): void {
	transactionLoader.reset();
}

// Debounced search function
function createDebouncedSearch(searchFn: (term: string) => void, delay = 300) {
	return debounce(searchFn as (...args: unknown[]) => unknown, delay);
}

// Clear all caches
function clearCache(): void {
	reportCache.clear();
}

// Get performance statistics
function getPerformanceStats() {
	return {
		cache: reportCache.getStats(),
		performance: PerformanceMonitor.getStats(),
		transactionLoader: transactionLoader.getStats(),
	};
}

export const ReportPerformanceService = {
	initialize: initializePerformanceService,
	getCachedReportData,
	getFilteredTransactions,
	initializeTransactionLoader,
	getNextTransactionPage,
	resetTransactionLoader,
	createDebouncedSearch,
	clearCache,
	getPerformanceStats,
};

// Initialize the service
initializePerformanceService();

export { debounce, LazyLoader, PerformanceMonitor, QueryOptimizer };

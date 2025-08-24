import type { ChartDataPoint, Transaction } from "../../types/finance";

/**
 * Performance optimization utilities for handling large financial datasets
 */
export namespace PerformanceOptimizer {
	/**
	 * Pagination configuration
	 */
	export interface PaginationConfig {
		page: number;
		limit: number;
		sortBy?: keyof Transaction;
		sortOrder?: "asc" | "desc";
	}

	/**
	 * Paginated result interface
	 */
	export interface PaginatedResult<T> {
		data: T[];
		total: number;
		page: number;
		limit: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	}

	/**
	 * Efficiently paginate large datasets
	 */
	export function paginateData<T>(
		data: T[],
		config: PaginationConfig,
	): PaginatedResult<T> {
		const { page, limit, sortBy, sortOrder = "desc" } = config;
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;

		// Sort data if sortBy is provided
		let sortedData = data;
		if (sortBy) {
			sortedData = [...data].sort((a, b) => {
				const aVal = a[sortBy as keyof T];
				const bVal = b[sortBy as keyof T];

				if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
				if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
				return 0;
			});
		}

		const paginatedData = sortedData.slice(startIndex, endIndex);
		const total = data.length;
		const totalPages = Math.ceil(total / limit);

		return {
			data: paginatedData,
			total,
			page,
			limit,
			totalPages,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		};
	}

	/**
	 * Efficiently filter transactions with optimized algorithms
	 */
	export function filterTransactions(
		transactions: Transaction[],
		filters: {
			dateRange?: { start: Date; end: Date };
			categories?: string[];
			types?: ("income" | "expense")[];
			accounts?: string[];
			minAmount?: number;
			maxAmount?: number;
			searchTerm?: string;
		},
	): Transaction[] {
		return transactions.filter((transaction) => {
			// Date range filter
			if (filters.dateRange) {
				const transactionDate = new Date(transaction.date);
				if (
					transactionDate < filters.dateRange.start ||
					transactionDate > filters.dateRange.end
				) {
					return false;
				}
			}

			// Category filter
			if (filters.categories && filters.categories.length > 0) {
				if (!filters.categories.includes(transaction.category)) {
					return false;
				}
			}

			// Type filter
			if (filters.types && filters.types.length > 0) {
				if (!filters.types.includes(transaction.type as "income" | "expense")) {
					return false;
				}
			}

			// Account filter
			if (filters.accounts && filters.accounts.length > 0) {
				if (!filters.accounts.includes(transaction.account)) {
					return false;
				}
			}

			// Amount range filter
			if (
				filters.minAmount !== undefined &&
				transaction.amount < filters.minAmount
			) {
				return false;
			}
			if (
				filters.maxAmount !== undefined &&
				transaction.amount > filters.maxAmount
			) {
				return false;
			}

			// Search term filter
			if (filters.searchTerm) {
				const searchLower = filters.searchTerm.toLowerCase();
				const matchesDescription = transaction.description
					.toLowerCase()
					.includes(searchLower);
				const matchesCategory = transaction.category
					.toLowerCase()
					.includes(searchLower);
				if (!matchesDescription && !matchesCategory) {
					return false;
				}
			}

			return true;
		});
	}

	/**
	 * Efficiently aggregate data for charts with memoization
	 */
	export class ChartDataAggregator {
		private cache = new Map<string, ChartDataPoint[]>();
		private cacheExpiry = new Map<string, number>();
		private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

		/**
		 * Get aggregated chart data with caching
		 */
		public getAggregatedData(
			transactions: Transaction[],
			timeframe: "week" | "month" | "year",
			type: "income" | "expense" | "both" = "both",
		): ChartDataPoint[] {
			const cacheKey = `${timeframe}-${type}-${transactions.length}-${this.getDataHash(transactions)}`;

			// Check cache
			if (this.isCacheValid(cacheKey)) {
				const cachedData = this.cache.get(cacheKey);
				if (cachedData) {
					return cachedData;
				}
			}

			// Calculate aggregated data
			const aggregatedData = this.calculateAggregatedData(
				transactions,
				timeframe,
				type,
			);

			// Cache result
			this.cache.set(cacheKey, aggregatedData);
			this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

			return aggregatedData;
		}

		private isCacheValid(key: string): boolean {
			const expiry = this.cacheExpiry.get(key);
			if (!expiry || Date.now() > expiry) {
				this.cache.delete(key);
				this.cacheExpiry.delete(key);
				return false;
			}
			return this.cache.has(key);
		}

		private getDataHash(transactions: Transaction[]): string {
			// Simple hash based on transaction count and latest transaction date
			if (transactions.length === 0) return "0";
			const latest = Math.max(
				...transactions.map((t) => new Date(t.date).getTime()),
			);
			return `${transactions.length}-${latest}`;
		}

		private calculateAggregatedData(
			transactions: Transaction[],
			timeframe: "week" | "month" | "year",
			type: "income" | "expense" | "both",
		): ChartDataPoint[] {
			const filteredTransactions =
				type === "both"
					? transactions
					: transactions.filter((t) => t.type === type);

			const groupedData = new Map<
				string,
				{ income: number; expense: number }
			>();

			for (const transaction of filteredTransactions) {
				const date = new Date(transaction.date);
				let key: string;

				switch (timeframe) {
					case "week": {
						const weekStart = new Date(date);
						weekStart.setDate(date.getDate() - date.getDay());
						key = weekStart.toISOString().split("T")[0];
						break;
					}
					case "month": {
						key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
						break;
					}
					case "year": {
						key = String(date.getFullYear());
						break;
					}
				}

				if (!groupedData.has(key)) {
					groupedData.set(key, { income: 0, expense: 0 });
				}

				const group = groupedData.get(key);
				if (group) {
					if (transaction.type === "income") {
						group.income += transaction.amount;
					} else if (transaction.type === "expense") {
						group.expense += transaction.amount;
					}
				}
			}

			return Array.from(groupedData.entries())
				.map(([date, amounts]) => ({
					date,
					value: amounts.income - amounts.expense,
					income: amounts.income,
					expense: amounts.expense,
					net: amounts.income - amounts.expense,
				}))
				.sort((a, b) => a.date.localeCompare(b.date));
		}

		/**
		 * Clear cache manually
		 */
		public clearCache(): void {
			this.cache.clear();
			this.cacheExpiry.clear();
		}
	}

	/**
	 * Process large arrays in batches to avoid blocking the main thread
	 */
	export async function processBatches<T, R>(
		items: T[],
		processor: (batch: T[]) => Promise<R[]> | R[],
		batchSize = 100,
	): Promise<R[]> {
		const results: R[] = [];

		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);
			const batchResults = await processor(batch);
			results.push(...batchResults);

			// Yield control to prevent blocking
			if (i + batchSize < items.length) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
		}

		return results;
	}

	/**
	 * Debounced function execution
	 */
	export function debounce<T extends (...args: unknown[]) => unknown>(
		func: T,
		delay: number,
	): (...args: Parameters<T>) => void {
		let timeoutId: NodeJS.Timeout;

		return (...args: Parameters<T>) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func(...args), delay);
		};
	}

	/**
	 * Throttled function execution
	 */
	export function throttle<T extends (...args: unknown[]) => unknown>(
		func: T,
		delay: number,
	): (...args: Parameters<T>) => void {
		let lastCall = 0;

		return (...args: Parameters<T>) => {
			const now = Date.now();
			if (now - lastCall >= delay) {
				lastCall = now;
				func(...args);
			}
		};
	}

	/**
	 * Memory-efficient data structures for large datasets
	 */
	export class MemoryEfficientStore<T> {
		private data: T[] = [];
		private indices: Map<string, number[]> = new Map();
		private maxSize: number;

		constructor(maxSize = 10000) {
			this.maxSize = maxSize;
		}

		/**
		 * Add item with automatic cleanup when size limit is reached
		 */
		public add(item: T, indexKey?: keyof T): void {
			if (this.data.length >= this.maxSize) {
				this.cleanup();
			}

			const index = this.data.length;
			this.data.push(item);

			// Update indices
			if (indexKey && item[indexKey]) {
				const key = String(item[indexKey]);
				if (!this.indices.has(key)) {
					this.indices.set(key, []);
				}
				const indexArray = this.indices.get(key);
				if (indexArray) {
					indexArray.push(index);
				}
			}
		}

		/**
		 * Get items by index key
		 */
		public getByIndex(indexKey: string): T[] {
			const indices = this.indices.get(indexKey) || [];
			return indices.map((i) => this.data[i]).filter(Boolean);
		}

		/**
		 * Get all data
		 */
		public getAll(): T[] {
			return [...this.data];
		}

		/**
		 * Clear old data when size limit is reached
		 */
		private cleanup(): void {
			const keepSize = Math.floor(this.maxSize * 0.7); // Keep 70% of data
			const removeCount = this.data.length - keepSize;

			// Remove oldest items
			this.data.splice(0, removeCount);

			// Rebuild indices
			this.indices.clear();
			this.data.forEach((item, index) => {
				// This would need to be customized based on your indexing strategy
			});
		}

		/**
		 * Get current size
		 */
		public size(): number {
			return this.data.length;
		}

		/**
		 * Clear all data
		 */
		public clear(): void {
			this.data = [];
			this.indices.clear();
		}
	}
}

// Export singleton instances for common use cases
export const chartAggregator = new PerformanceOptimizer.ChartDataAggregator();
export const transactionStore =
	new PerformanceOptimizer.MemoryEfficientStore<Transaction>(5000);

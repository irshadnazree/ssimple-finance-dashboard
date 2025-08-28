import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportFilters, Transaction } from "../../types/finance";
import { ReportPerformanceService } from "../reports/performanceService";

// Hook for optimized report data fetching with caching and lazy loading
export function useReportPerformance(transactions: Transaction[]) {
	const [filteredTransactions, setFilteredTransactions] = useState<
		Transaction[]
	>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [performanceStats, setPerformanceStats] = useState<Record<
		string,
		unknown
	> | null>(null);

	// Initialize transaction loader
	useEffect(() => {
		if (transactions.length > 0) {
			ReportPerformanceService.initializeTransactionLoader(transactions);
		}
	}, [transactions]);

	// Apply filters with performance optimization
	const applyFilters = useCallback(
		async (filters: ReportFilters) => {
			setIsLoading(true);
			setError(null);

			try {
				const filtered = await ReportPerformanceService.getFilteredTransactions(
					transactions,
					filters,
				);
				setFilteredTransactions(filtered);
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
			} finally {
				setIsLoading(false);
			}
		},
		[transactions],
	);

	// Get next page of transactions (lazy loading)
	const getNextPage = useCallback(() => {
		return ReportPerformanceService.getNextTransactionPage();
	}, []);

	// Reset pagination
	const resetPagination = useCallback(() => {
		ReportPerformanceService.resetTransactionLoader();
	}, []);

	// Get performance statistics
	const getPerformanceStats = useCallback(() => {
		const stats = ReportPerformanceService.getPerformanceStats();
		setPerformanceStats(stats);
		return stats;
	}, []);

	// Clear cache
	const clearCache = useCallback(() => {
		ReportPerformanceService.clearCache();
	}, []);

	return {
		filteredTransactions,
		isLoading,
		error,
		performanceStats,
		applyFilters,
		getNextPage,
		resetPagination,
		getPerformanceStats,
		clearCache,
	};
}

// Hook for monitoring component performance
export function usePerformanceMonitor(componentName: string) {
	const [renderTime, setRenderTime] = useState<number>(0);
	const renderCountRef = useRef<number>(0);
	const startTimeRef = useRef<number>(0);

	useEffect(() => {
		const startTime = performance.now();
		startTimeRef.current = startTime;
		renderCountRef.current += 1;

		return () => {
			const endTime = performance.now();
			const duration = endTime - startTime;
			setRenderTime(duration);
		};
	}); // No dependencies - runs on every render but doesn't cause infinite loop

	const logPerformance = useCallback(() => {
		console.log(
			`${componentName} - Renders: ${renderCountRef.current}, Last render time: ${renderTime.toFixed(2)}ms`,
		);
	}, [componentName, renderTime]);

	return {
		renderTime,
		renderCount: renderCountRef.current,
		logPerformance,
	};
}

// Hook for lazy loading large datasets
export function useLazyLoading<T>(items: T[], pageSize = 50) {
	const [currentPage, setCurrentPage] = useState(0);
	const [loadedItems, setLoadedItems] = useState<T[]>([]);
	const [hasMore, setHasMore] = useState(true);

	// Reset when items change (with conditional check)
	useEffect(() => {
		if (items.length === 0 || currentPage !== 0 || loadedItems.length > 0) {
			setCurrentPage(0);
			setLoadedItems([]);
			setHasMore(items.length > pageSize);
		}
	}, [items, pageSize, currentPage, loadedItems.length]);

	// Load next page
	const loadMore = useCallback(() => {
		const startIndex = currentPage * pageSize;
		const endIndex = Math.min(startIndex + pageSize, items.length);
		const newItems = items.slice(startIndex, endIndex);

		if (newItems.length > 0) {
			setLoadedItems((prev) => [...prev, ...newItems]);
			setCurrentPage((prev) => prev + 1);
			setHasMore(endIndex < items.length);
		}
	}, [items, currentPage, pageSize]);

	// Load initial page (with conditional check to prevent infinite loops)
	useEffect(() => {
		if (items.length > 0 && loadedItems.length === 0 && currentPage === 0) {
			loadMore();
		}
	}, [items.length, loadedItems.length, currentPage, loadMore]);

	const reset = useCallback(() => {
		setCurrentPage(0);
		setLoadedItems([]);
		setHasMore(items.length > pageSize);
	}, [items.length, pageSize]);

	return {
		loadedItems,
		hasMore,
		loadMore,
		reset,
		currentPage,
		totalItems: items.length,
	};
}

// Hook for caching expensive computations
export function useComputationCache<T, P extends unknown[]>(
	computeFn: (...args: P) => T,
	dependencies: P,
	ttl = 5 * 60 * 1000, // 5 minutes
) {
	const [cachedResult, setCachedResult] = useState<T | null>(null);
	const [isComputing, setIsComputing] = useState(false);
	const [lastComputed, setLastComputed] = useState<number>(0);

	const compute = useCallback(async () => {
		const now = Date.now();

		// Return cached result if still valid
		if (cachedResult && now - lastComputed < ttl) {
			return cachedResult;
		}

		// Prevent concurrent computations
		if (isComputing) {
			return cachedResult;
		}

		setIsComputing(true);
		try {
			const result = computeFn(...dependencies);
			setCachedResult(result);
			setLastComputed(now);
			return result;
		} finally {
			setIsComputing(false);
		}
	}, [computeFn, ttl, cachedResult, lastComputed, isComputing, dependencies]);

	// Auto-compute when dependencies change (with conditional check)
	useEffect(() => {
		if (!isComputing) {
			compute();
		}
	}, [compute, isComputing]);

	const invalidateCache = useCallback(() => {
		setCachedResult(null);
		setLastComputed(0);
	}, []);

	return {
		result: cachedResult,
		isComputing,
		compute,
		invalidateCache,
		isValid: cachedResult && Date.now() - lastComputed < ttl,
	};
}

import type React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
// Using basic div structure instead of tabs for simplicity
import { 
	Activity, 
	Zap, 
	Database, 
	Clock, 
	TrendingUp, 
	RefreshCw,
	BarChart3,
	Settings
} from 'lucide-react';
import { useLazyLoading, useComputationCache, usePerformanceMonitor } from '../../lib/hooks/useReportPerformance';
// Performance service functionality is simulated in this demo
import type { Transaction } from '../../types/finance';

interface PerformanceDemoProps {
	transactions: Transaction[];
}

export function PerformanceDemo({ transactions }: PerformanceDemoProps) {
	const [activeDemo, setActiveDemo] = useState<string>('cache');
	const [isRunning, setIsRunning] = useState(false);
	const [results, setResults] = useState<Record<string, unknown>>({});
	
	// Performance monitoring
	const { renderTime, renderCount, logPerformance } = usePerformanceMonitor('PerformanceDemo');
	
	// Lazy loading demo
	const {
		loadedItems: lazyTransactions,
		loadMore,
		hasMore,
		totalItems: totalCount
	} = useLazyLoading(transactions, 50);
	const loadedCount = lazyTransactions.length;
	const isLazyLoading = false; // Simplified for demo
	
	// Computation cache demo
	const expensiveComputation = (data: Transaction[]) => {
		// Simulate expensive calculation
		return data.reduce((acc, transaction) => {
			return acc + Math.abs(transaction.amount) * Math.random();
		}, 0);
	};
	
	const {
		result: cachedResult,
		isComputing
	} = useComputationCache(expensiveComputation, [transactions]);
	const cacheHit = cachedResult !== null;
	const computationTime = 0; // Simplified for demo
	
	// Demo functions
	const runCacheDemo = async () => {
		setIsRunning(true);
		const startTime = performance.now();
		
		// Simulate cache performance test
		const miss1 = performance.now();
		await new Promise(resolve => setTimeout(resolve, 10)); // Simulate cache miss
		const miss2 = performance.now();
		
		const hit1 = performance.now();
		await new Promise(resolve => setTimeout(resolve, 1)); // Simulate cache hit
		const hit2 = performance.now();
		
		const endTime = performance.now();
		
		setResults({
			cacheDemo: {
				totalTime: endTime - startTime,
				cacheMissTime: miss2 - miss1,
				cacheHitTime: hit2 - hit1,
				cacheSize: 5,
				cacheMaxSize: 100,
				cachedItems: transactions.length
			}
		});
		
		setIsRunning(false);
	};
	
	const runQueryDemo = async () => {
		setIsRunning(true);
		const startTime = performance.now();
		
		// Simulate query optimization
		const filters = {
			accounts: [],
			categories: [],
			transactionTypes: ['expense' as const],
			amountRange: { min: 100, max: 1000 },
			dateRange: {
				startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
				endDate: new Date()
			}
		};
		
		// Simulate filtering
		const filtered = transactions.filter(t => 
			t.type === 'expense' && 
			Math.abs(t.amount) >= 100 && 
			Math.abs(t.amount) <= 1000
		);
		
		const endTime = performance.now();
		
		setResults({
			queryDemo: {
				totalTime: endTime - startTime,
				originalCount: transactions.length,
				filteredCount: filtered.length,
				sortedCount: filtered.length,
				optimizationRatio: ((transactions.length - filtered.length) / transactions.length * 100).toFixed(2)
			}
		});
		
		setIsRunning(false);
	};
	
	const runLazyDemo = async () => {
		setIsRunning(true);
		const startTime = performance.now();
		
		// Simulate lazy loading
		const batchSize = 25;
		const batch1 = transactions.slice(0, batchSize);
		const batch2 = transactions.slice(batchSize, batchSize * 2);
		const batch3 = transactions.slice(batchSize * 2, batchSize * 3);
		
		const endTime = performance.now();
		
		setResults({
			lazyDemo: {
				totalTime: endTime - startTime,
				batch1Size: batch1.length,
				batch2Size: batch2.length,
				batch3Size: batch3.length,
				totalLoaded: batch1.length + batch2.length + batch3.length,
				hasMore: transactions.length > batchSize * 3,
				loadProgress: ((batchSize * 3) / transactions.length * 100).toFixed(2)
			}
		});
		
		setIsRunning(false);
	};
	
	const runPerformanceDemo = async () => {
		setIsRunning(true);
		
		// Simulate performance monitoring
		const operationStart = performance.now();
		await new Promise(resolve => setTimeout(resolve, 100));
		const operationEnd = performance.now();
		
		setResults({
			performanceDemo: {
				operationTime: operationEnd - operationStart,
				totalOperations: 5,
				averageTime: 85.5,
				renderTime,
				renderCount
			}
		});
		
		setIsRunning(false);
	};
	
	// Removed problematic useEffect that caused infinite loops
	// logPerformance can be called manually when needed
	
	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Settings className="h-5 w-5" />
					Performance Optimization Demo
				</CardTitle>
				<CardDescription>
					Interactive demonstration of caching, lazy loading, and query optimization features
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					<div className="flex gap-2 mb-4">
						<Button 
							variant={activeDemo === 'cache' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setActiveDemo('cache')}
							className="flex items-center gap-2"
						>
							<Database className="h-4 w-4" />
							Cache
						</Button>
						<Button 
							variant={activeDemo === 'query' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setActiveDemo('query')}
							className="flex items-center gap-2"
						>
							<Zap className="h-4 w-4" />
							Query
						</Button>
						<Button 
							variant={activeDemo === 'lazy' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setActiveDemo('lazy')}
							className="flex items-center gap-2"
						>
							<RefreshCw className="h-4 w-4" />
							Lazy
						</Button>
						<Button 
							variant={activeDemo === 'monitor' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setActiveDemo('monitor')}
							className="flex items-center gap-2"
						>
							<Activity className="h-4 w-4" />
							Monitor
						</Button>
					</div>
					
					{activeDemo === 'cache' && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold">Cache Performance Test</h3>
							<Button onClick={runCacheDemo} disabled={isRunning}>
								{isRunning ? 'Running...' : 'Run Cache Demo'}
							</Button>
						</div>
						
						{results.cacheDemo ? (
							<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
								<div className="p-4 bg-blue-50 rounded-lg">
									<h4 className="font-semibold text-blue-900">Cache Miss</h4>
									<p className="text-2xl font-bold text-blue-700">
										{((results.cacheDemo as Record<string, number>).cacheMissTime || 0).toFixed(3)}ms
									</p>
								</div>
								<div className="p-4 bg-green-50 rounded-lg">
									<h4 className="font-semibold text-green-900">Cache Hit</h4>
									<p className="text-2xl font-bold text-green-700">
										{((results.cacheDemo as Record<string, number>).cacheHitTime || 0).toFixed(3)}ms
									</p>
								</div>
								<div className="p-4 bg-purple-50 rounded-lg">
									<h4 className="font-semibold text-purple-900">Cache Size</h4>
									<p className="text-2xl font-bold text-purple-700">
										{(results.cacheDemo as Record<string, number>).cacheSize || 0}/{(results.cacheDemo as Record<string, number>).cacheMaxSize || 0}
									</p>
								</div>
							</div>
						) : null}
					</div>
					)}
					
					{activeDemo === 'query' && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold">Query Optimization Test</h3>
							<Button onClick={runQueryDemo} disabled={isRunning}>
								{isRunning ? 'Running...' : 'Run Query Demo'}
							</Button>
						</div>
						
						{results.queryDemo ? (
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								<div className="p-4 bg-orange-50 rounded-lg">
									<h4 className="font-semibold text-orange-900">Original</h4>
									<p className="text-2xl font-bold text-orange-700">
										{(results.queryDemo as Record<string, number>).originalCount || 0}
									</p>
								</div>
								<div className="p-4 bg-blue-50 rounded-lg">
									<h4 className="font-semibold text-blue-900">Filtered</h4>
									<p className="text-2xl font-bold text-blue-700">
										{(results.queryDemo as Record<string, number>).filteredCount || 0}
									</p>
								</div>
								<div className="p-4 bg-green-50 rounded-lg">
									<h4 className="font-semibold text-green-900">Time</h4>
									<p className="text-2xl font-bold text-green-700">
										{((results.queryDemo as Record<string, number>).totalTime || 0).toFixed(3)}ms
									</p>
								</div>
								<div className="p-4 bg-purple-50 rounded-lg">
									<h4 className="font-semibold text-purple-900">Reduction</h4>
									<p className="text-2xl font-bold text-purple-700">
										{(results.queryDemo as Record<string, string>).optimizationRatio || '0'}%
									</p>
								</div>
							</div>
						) : null}
					</div>
					)}
					
					{activeDemo === 'lazy' && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold">Lazy Loading Test</h3>
							<div className="flex gap-2">
								<Button onClick={runLazyDemo} disabled={isRunning}>
									{isRunning ? 'Running...' : 'Run Lazy Demo'}
								</Button>
								<Button onClick={loadMore} disabled={!hasMore || isLazyLoading}>
									{isLazyLoading ? 'Loading...' : 'Load More'}
								</Button>
							</div>
						</div>
						
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">Loading Progress</span>
								<Badge variant="outline">
									{loadedCount} / {totalCount}
								</Badge>
							</div>
							<Progress value={(loadedCount / totalCount) * 100} className="w-full" />
						</div>
						
						{results.lazyDemo ? (
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								<div className="p-4 bg-blue-50 rounded-lg">
									<h4 className="font-semibold text-blue-900">Batch 1</h4>
									<p className="text-2xl font-bold text-blue-700">
										{(results.lazyDemo as Record<string, number>).batch1Size || 0}
									</p>
								</div>
								<div className="p-4 bg-green-50 rounded-lg">
									<h4 className="font-semibold text-green-900">Batch 2</h4>
									<p className="text-2xl font-bold text-green-700">
										{(results.lazyDemo as Record<string, number>).batch2Size || 0}
									</p>
								</div>
								<div className="p-4 bg-purple-50 rounded-lg">
									<h4 className="font-semibold text-purple-900">Total Loaded</h4>
									<p className="text-2xl font-bold text-purple-700">
										{(results.lazyDemo as Record<string, number>).totalLoaded || 0}
									</p>
								</div>
								<div className="p-4 bg-orange-50 rounded-lg">
									<h4 className="font-semibold text-orange-900">Progress</h4>
									<p className="text-2xl font-bold text-orange-700">
										{(results.lazyDemo as Record<string, string>).loadProgress || '0'}%
									</p>
								</div>
							</div>
						) : null}
					</div>
					)}
					
					{activeDemo === 'monitor' && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold">Performance Monitoring</h3>
							<Button onClick={runPerformanceDemo} disabled={isRunning}>
								{isRunning ? 'Running...' : 'Run Monitor Demo'}
							</Button>
						</div>
						
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="p-4 bg-blue-50 rounded-lg">
								<h4 className="font-semibold text-blue-900">Render Time</h4>
								<p className="text-2xl font-bold text-blue-700">
									{renderTime.toFixed(2)}ms
								</p>
							</div>
							<div className="p-4 bg-green-50 rounded-lg">
								<h4 className="font-semibold text-green-900">Render Count</h4>
								<p className="text-2xl font-bold text-green-700">
									{renderCount}
								</p>
							</div>
							<div className="p-4 bg-purple-50 rounded-lg">
								<h4 className="font-semibold text-purple-900">Cache Hit</h4>
								<p className="text-2xl font-bold text-purple-700">
									{cacheHit ? 'Yes' : 'No'}
								</p>
							</div>
							<div className="p-4 bg-orange-50 rounded-lg">
								<h4 className="font-semibold text-orange-900">Computation</h4>
								<p className="text-2xl font-bold text-orange-700">
									{isComputing ? 'Running' : `${computationTime.toFixed(2)}ms`}
								</p>
							</div>
						</div>
						
						{results.performanceDemo ? (
							<div className="mt-4 p-4 bg-gray-50 rounded-lg">
								<h4 className="font-semibold mb-2">Operation Results</h4>
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<span className="font-medium">Operation Time:</span>
										<span className="ml-2">{((results.performanceDemo as Record<string, number>).operationTime).toFixed(2)}ms</span>
									</div>
									<div>
										<span className="font-medium">Average Time:</span>
										<span className="ml-2">{((results.performanceDemo as Record<string, number>).averageTime).toFixed(2)}ms</span>
									</div>
								</div>
							</div>
						) : null}
					</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
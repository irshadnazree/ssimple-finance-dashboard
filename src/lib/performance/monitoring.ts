/**
 * Performance monitoring utilities for the finance dashboard
 */
export namespace PerformanceMonitor {
  
  /**
   * Performance metrics interface
   */
  export interface PerformanceMetrics {
    timestamp: number;
    operation: string;
    duration: number;
    memoryUsage?: number;
    dataSize?: number;
    success: boolean;
    error?: string;
  }

  /**
   * Performance threshold configuration
   */
  export interface PerformanceThresholds {
    slow: number; // milliseconds
    warning: number; // milliseconds
    critical: number; // milliseconds
  }

  /**
   * Default performance thresholds
   */
  const DEFAULT_THRESHOLDS: PerformanceThresholds = {
    slow: 100,
    warning: 500,
    critical: 1000
  };

  /**
   * Performance metrics storage
   */
  class MetricsStore {
    private metrics: PerformanceMetrics[] = [];
    private maxSize = 1000;

    add(metric: PerformanceMetrics): void {
      this.metrics.push(metric);
      
      // Keep only recent metrics
      if (this.metrics.length > this.maxSize) {
        this.metrics = this.metrics.slice(-this.maxSize);
      }
    }

    getMetrics(operation?: string, limit = 100): PerformanceMetrics[] {
      let filtered = this.metrics;
      
      if (operation) {
        filtered = filtered.filter(m => m.operation === operation);
      }
      
      return filtered.slice(-limit);
    }

    getAverageTime(operation: string, timeWindow = 300000): number { // 5 minutes
      const cutoff = Date.now() - timeWindow;
      const recentMetrics = this.metrics.filter(
        m => m.operation === operation && m.timestamp > cutoff && m.success
      );
      
      if (recentMetrics.length === 0) return 0;
      
      const totalTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
      return totalTime / recentMetrics.length;
    }

    getSlowOperations(threshold = DEFAULT_THRESHOLDS.slow): PerformanceMetrics[] {
      return this.metrics.filter(m => m.duration > threshold);
    }

    clear(): void {
      this.metrics = [];
    }

    getStats(): {
      totalOperations: number;
      successRate: number;
      averageDuration: number;
      slowOperations: number;
    } {
      const total = this.metrics.length;
      const successful = this.metrics.filter(m => m.success).length;
      const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
      const slow = this.getSlowOperations().length;
      
      return {
        totalOperations: total,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        averageDuration: total > 0 ? totalDuration / total : 0,
        slowOperations: slow
      };
    }
  }

  // Global metrics store
  const metricsStore = new MetricsStore();

  /**
   * Performance timer for measuring operation duration
   */
  export class PerformanceTimer {
    private startTime: number;
    private operation: string;
    private dataSize?: number;

    constructor(operation: string, dataSize?: number) {
      this.operation = operation;
      this.dataSize = dataSize;
      this.startTime = performance.now();
    }

    /**
     * End the timer and record the metric
     */
    end(success = true, error?: string): number {
      const duration = performance.now() - this.startTime;
      
      const metric: PerformanceMetrics = {
        timestamp: Date.now(),
        operation: this.operation,
        duration,
        dataSize: this.dataSize,
        success,
        error
      };

      // Add memory usage if available
      if ('memory' in performance) {
        const memInfo = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
        metric.memoryUsage = memInfo.usedJSHeapSize;
      }

      metricsStore.add(metric);
      
      // Log slow operations
      if (duration > DEFAULT_THRESHOLDS.warning) {
        console.warn(`Slow operation detected: ${this.operation} took ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
  }

  /**
   * Decorator for measuring function performance
   */
  export function measurePerformance<T extends (...args: unknown[]) => unknown>(
    operation: string
  ) {
    return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = function (...args: Parameters<T>) {
        const timer = new PerformanceTimer(`${operation}.${propertyKey}`);
        
        try {
          const result = originalMethod.apply(this, args);
          
          // Handle async functions
          if (result instanceof Promise) {
            return result
              .then((value) => {
                timer.end(true);
                return value;
              })
              .catch((error) => {
                timer.end(false, error.message);
                throw error;
              });
          }
          
          timer.end(true);
          return result;
        } catch (error) {
          timer.end(false, error instanceof Error ? error.message : 'Unknown error');
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Measure async operation performance
   */
  export async function measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    dataSize?: number
  ): Promise<T> {
    const timer = new PerformanceTimer(operation, dataSize);
    
    try {
      const result = await fn();
      timer.end(true);
      return result;
    } catch (error) {
      timer.end(false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Measure synchronous operation performance
   */
  export function measureSync<T>(
    operation: string,
    fn: () => T,
    dataSize?: number
  ): T {
    const timer = new PerformanceTimer(operation, dataSize);
    
    try {
      const result = fn();
      timer.end(true);
      return result;
    } catch (error) {
      timer.end(false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  export function getMetrics(operation?: string, limit = 100): PerformanceMetrics[] {
    return metricsStore.getMetrics(operation, limit);
  }

  /**
   * Get average operation time
   */
  export function getAverageTime(operation: string, timeWindow = 300000): number {
    return metricsStore.getAverageTime(operation, timeWindow);
  }

  /**
   * Get slow operations
   */
  export function getSlowOperations(threshold = DEFAULT_THRESHOLDS.slow): PerformanceMetrics[] {
    return metricsStore.getSlowOperations(threshold);
  }

  /**
   * Get performance statistics
   */
  export function getStats(): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    slowOperations: number;
  } {
    return metricsStore.getStats();
  }

  /**
   * Clear all metrics
   */
  export function clearMetrics(): void {
    metricsStore.clear();
  }

  /**
   * Memory usage monitoring
   */
  export class MemoryMonitor {
    private static instance: MemoryMonitor;
    private intervalId?: NodeJS.Timeout;
    private memoryHistory: Array<{ timestamp: number; usage: number }> = [];
    private maxHistorySize = 100;

    static getInstance(): MemoryMonitor {
      if (!MemoryMonitor.instance) {
        MemoryMonitor.instance = new MemoryMonitor();
      }
      return MemoryMonitor.instance;
    }

    /**
     * Start monitoring memory usage
     */
    startMonitoring(intervalMs = 30000): void { // 30 seconds
      if (this.intervalId) {
        this.stopMonitoring();
      }

      this.intervalId = setInterval(() => {
        this.recordMemoryUsage();
      }, intervalMs);
    }

    /**
     * Stop monitoring memory usage
     */
    stopMonitoring(): void {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = undefined;
      }
    }

    /**
     * Record current memory usage
     */
    private recordMemoryUsage(): void {
      if ('memory' in performance) {
        const memInfo = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
        const usage = memInfo.usedJSHeapSize;
        
        this.memoryHistory.push({
          timestamp: Date.now(),
          usage
        });
        
        // Keep only recent history
        if (this.memoryHistory.length > this.maxHistorySize) {
          this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
        }
        
        // Check for memory leaks (significant increase over time)
        if (this.memoryHistory.length > 10) {
          const recent = this.memoryHistory.slice(-10);
          const oldest = recent[0].usage;
          const newest = recent[recent.length - 1].usage;
          const increase = ((newest - oldest) / oldest) * 100;
          
          if (increase > 50) { // 50% increase
            console.warn(`Potential memory leak detected: ${increase.toFixed(2)}% increase`);
          }
        }
      }
    }

    /**
     * Get memory usage history
     */
    getMemoryHistory(): Array<{ timestamp: number; usage: number }> {
      return [...this.memoryHistory];
    }

    /**
     * Get current memory usage
     */
    getCurrentMemoryUsage(): number | null {
      if ('memory' in performance) {
        const memInfo = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
        return memInfo.usedJSHeapSize;
      }
      return null;
    }

    /**
     * Clear memory history
     */
    clearHistory(): void {
      this.memoryHistory = [];
    }
  }

  /**
   * Performance report generator
   */
  export function generatePerformanceReport(): {
    summary: ReturnType<typeof getStats>;
    slowOperations: PerformanceMetrics[];
    memoryUsage: number | null;
    recommendations: string[];
  } {
    const stats = getStats();
    const slowOps = getSlowOperations();
    const memoryMonitor = MemoryMonitor.getInstance();
    const currentMemory = memoryMonitor.getCurrentMemoryUsage();
    
    const recommendations: string[] = [];
    
    // Generate recommendations based on metrics
    if (stats.successRate < 95) {
      recommendations.push('Success rate is below 95%. Consider improving error handling.');
    }
    
    if (stats.averageDuration > DEFAULT_THRESHOLDS.warning) {
      recommendations.push('Average operation duration is high. Consider optimization.');
    }
    
    if (slowOps.length > stats.totalOperations * 0.1) {
      recommendations.push('More than 10% of operations are slow. Review performance bottlenecks.');
    }
    
    if (currentMemory && currentMemory > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Memory usage is high. Consider implementing data cleanup.');
    }
    
    return {
      summary: stats,
      slowOperations: slowOps.slice(-10), // Last 10 slow operations
      memoryUsage: currentMemory,
      recommendations
    };
  }

  /**
   * Initialize performance monitoring
   */
  export function initialize(): void {
    // Start memory monitoring
    const memoryMonitor = MemoryMonitor.getInstance();
    memoryMonitor.startMonitoring();
    
    // Log performance report periodically
    setInterval(() => {
      const report = generatePerformanceReport();
      if (report.recommendations.length > 0) {
        console.log('Performance Report:', report);
      }
    }, 300000); // Every 5 minutes
  }
}

// Export singleton memory monitor
export const memoryMonitor = PerformanceMonitor.MemoryMonitor.getInstance();
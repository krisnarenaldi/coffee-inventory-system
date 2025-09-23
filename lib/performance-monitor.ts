/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing an operation
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  // End timing and record metric
  endTimer(name: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    this.recordMetric({
      name,
      duration,
      timestamp: new Date(),
      metadata,
    });

    return duration;
  }

  // Record a metric directly
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log slow operations in development
    if (process.env.NODE_ENV === "development" && metric.duration > 1000) {
      console.warn(`🐌 Slow operation detected: ${metric.name} took ${metric.duration}ms`);
    }
  }

  // Get performance statistics
  getStats(name?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
  } {
    const filteredMetrics = name 
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalDuration: 0,
      };
    }

    const durations = filteredMetrics.map(m => m.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      count: filteredMetrics.length,
      avgDuration: Math.round(totalDuration / filteredMetrics.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration,
    };
  }

  // Get recent slow operations
  getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  // Get all metric names
  getMetricNames(): string[] {
    return [...new Set(this.metrics.map(m => m.name))];
  }
}

// Global instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Utility functions
export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    performanceMonitor.startTimer(name);
    try {
      const result = await fn();
      performanceMonitor.endTimer(name, metadata);
      resolve(result);
    } catch (error) {
      performanceMonitor.endTimer(name, { ...metadata, error: true });
      reject(error);
    }
  });
}

export function measureSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  performanceMonitor.startTimer(name);
  try {
    const result = fn();
    performanceMonitor.endTimer(name, metadata);
    return result;
  } catch (error) {
    performanceMonitor.endTimer(name, { ...metadata, error: true });
    throw error;
  }
}

// Middleware for measuring API response times
export function createPerformanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(data: any) {
      const duration = Date.now() - startTime;
      performanceMonitor.recordMetric({
        name: `api_${req.method}_${req.route?.path || req.path}`,
        duration,
        timestamp: new Date(),
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
        },
      });

      return originalSend.call(this, data);
    };

    next();
  };
}

// Database query performance wrapper
export async function measureDatabaseQuery<T>(
  queryName: string,
  query: () => Promise<T>
): Promise<T> {
  return measureAsync(`db_${queryName}`, query);
}

export default performanceMonitor;

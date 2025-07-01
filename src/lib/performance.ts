/**
 * Performance monitoring utilities for GremlinLink
 * Tracks redirect performance, database queries, and user experience metrics
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface RedirectMetrics {
  redirectTime: number;
  databaseQueryTime: number;
  middlewareTime: number;
  totalTime: number;
}

/**
 * Performance monitor class for tracking application metrics
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  /**
   * Record a performance metric
   */
  static recordMetric(name: string, value: number, metadata?: Record<string, unknown>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log performance issues
    if (this.isPerformanceIssue(name, value)) {
      // Performance issue detected: ${name} took ${value}ms
    }
  }

  /**
   * Measure and record the execution time of an async function
   */
  static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Measure and record the execution time of a synchronous function
   */
  static measure<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific operation
   */
  static getMetrics(name?: string, since?: Date): PerformanceMetric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(metric => metric.name === name);
    }

    if (since) {
      filtered = filtered.filter(metric => metric.timestamp >= since);
    }

    return filtered;
  }

  /**
   * Get performance statistics for a specific metric
   */
  static getStats(name: string, since?: Date): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } {
    const metrics = this.getMetrics(name, since);
    
    if (metrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count,
      avg: sum / count,
      min: values[0],
      max: values[count - 1],
      p95: values[Math.floor(count * 0.95)],
      p99: values[Math.floor(count * 0.99)],
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  static clearMetrics() {
    this.metrics = [];
  }

  /**
   * Check if a metric value indicates a performance issue
   */
  private static isPerformanceIssue(name: string, value: number): boolean {
    const thresholds: Record<string, number> = {
      'redirect_total': 100, // Total redirect should be under 100ms
      'database_query': 50,  // Database queries should be under 50ms
      'middleware_execution': 25, // Middleware should be under 25ms
      'analytics_dashboard': 2000, // Dashboard should load under 2s
      'csv_export': 5000, // CSV export should complete under 5s
    };

    return thresholds[name] ? value > thresholds[name] : false;
  }
}

/**
 * Measure redirect performance specifically
 */
export async function measureRedirectPerformance<T>(
  slug: string,
  fn: () => Promise<T>
): Promise<T> {
  return PerformanceMonitor.measureAsync(
    'redirect_total',
    fn,
    { slug, type: 'redirect' }
  );
}

/**
 * Measure database query performance
 */
export async function measureDatabaseQuery<T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<T> {
  return PerformanceMonitor.measureAsync(
    'database_query',
    fn,
    { query: queryName, type: 'database' }
  );
}

/**
 * Client-side performance tracking
 */
export class ClientPerformanceMonitor {
  /**
   * Track page load performance
   */
  static trackPageLoad(pageName: string) {
    if (typeof window === 'undefined') return;

    // Use the Navigation Timing API
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const metrics = {
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp: navigation.connectEnd - navigation.connectStart,
          request: navigation.responseStart - navigation.requestStart,
          response: navigation.responseEnd - navigation.responseStart,
          dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          load: navigation.loadEventEnd - navigation.loadEventStart,
          total: navigation.loadEventEnd - navigation.fetchStart,
        };

        // Send metrics to analytics (could be extended to send to external service)
        // Record the metrics for potential debugging
        PerformanceMonitor.recordMetric(`page_load_${pageName}`, metrics.total, metrics);
        
        // Record critical metrics
        if (metrics.total > 3000) {
          PerformanceMonitor.recordMetric(`slow_page_load_${pageName}`, metrics.total, { ...metrics, slow: true });
        }
      }
    });
  }

  /**
   * Track Core Web Vitals
   */
  static trackWebVitals() {
    if (typeof window === 'undefined') return;

    // Track Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      PerformanceMonitor.recordMetric('lcp', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Track First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
              entries.forEach((entry: PerformanceEntry & { processingStart?: number }) => {
        if (entry.processingStart) {
          PerformanceMonitor.recordMetric('fid', entry.processingStart - entry.startTime);
        }
      });
    }).observe({ entryTypes: ['first-input'] });

    // Track Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: PerformanceEntry & { hadRecentInput?: boolean; value?: number }) => {
        if (!entry.hadRecentInput && entry.value) {
          clsValue += entry.value;
        }
      });
      PerformanceMonitor.recordMetric('cls', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }
}

/**
 * Performance middleware for API routes
 */
export function withPerformanceTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  name: string,
  handler: T
): T {
  return (async (...args: unknown[]) => {
    return PerformanceMonitor.measureAsync(name, () => handler(...args));
  }) as T;
}
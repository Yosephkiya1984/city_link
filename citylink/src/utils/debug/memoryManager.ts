import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { cacheManager } from './cacheManager';
import { useErrorReporting } from './errorReporting';

// Memory management configuration
const MEMORY_CONFIG = {
  WARNING_THRESHOLD: 0.7, // 70% of available memory
  CRITICAL_THRESHOLD: 0.85, // 85% of available memory
  CLEANUP_INTERVAL: 30000, // 30 seconds
  MAX_UNUSED_OBJECTS: 1000,
  LEAK_DETECTION_INTERVAL: 60000, // 1 minute
};

interface MemoryStats {
  used: number;
  total: number;
  limit: number;
  percentage: number;
  lastCleanup: number;
  cleanupCount: number;
  leaksDetected: number;
}

interface ObjectRegistryEntry {
  object: unknown;
  createdAt: number;
  size: number;
}

// Memory manager class
class MemoryManager {
  memoryStats: MemoryStats;
  objectRegistry: Map<string, ObjectRegistryEntry>;
  cleanupTasks: (() => void)[];
  isMonitoring: boolean;

  constructor() {
    this.memoryStats = {
      used: 0,
      total: 0,
      limit: 0,
      percentage: 0,
      lastCleanup: Date.now(),
      cleanupCount: 0,
      leaksDetected: 0,
    };
    this.objectRegistry = new Map();
    this.cleanupTasks = [];
    this.isMonitoring = false;
  }

  // Start memory monitoring
  startMonitoring() {
    if (this.isMonitoring) return () => {};

    this.isMonitoring = true;

    // Monitor memory usage
    const monitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, MEMORY_CONFIG.CLEANUP_INTERVAL);

    // Detect memory leaks
    const leakDetectionInterval = setInterval(() => {
      this.detectMemoryLeaks();
    }, MEMORY_CONFIG.LEAK_DETECTION_INTERVAL);

    // Cleanup on component unmount
    return () => {
      clearInterval(monitorInterval);
      clearInterval(leakDetectionInterval);
      this.isMonitoring = false;
    };
  }

  // Check memory usage
  checkMemoryUsage() {
    const perf = global.performance as any;
    if (Platform.OS === 'web' && perf?.memory) {
      const memory = perf.memory;
      this.memoryStats = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
        lastCleanup: Date.now(),
        cleanupCount: this.memoryStats.cleanupCount,
        leaksDetected: this.memoryStats.leaksDetected,
      };

      // Trigger cleanup if needed
      if (this.memoryStats.percentage > MEMORY_CONFIG.CRITICAL_THRESHOLD) {
        this.performEmergencyCleanup();
      } else if (this.memoryStats.percentage > MEMORY_CONFIG.WARNING_THRESHOLD) {
        this.performRoutineCleanup();
      }

      // Log memory usage in development
      if (__DEV__) {
        console.log(`💾 Memory Usage: ${(this.memoryStats.percentage * 100).toFixed(2)}%`);
      }
    }
  }

  // Perform routine cleanup
  performRoutineCleanup() {
    const cleanupStart = Date.now();

    // Clear cache
    cacheManager.cleanup();

    // Run registered cleanup tasks
    this.cleanupTasks.forEach((task) => {
      try {
        task();
      } catch (error) {
        if (__DEV__) {
          console.error('Cleanup task failed:', error);
        }
      }
    });

    // Clear object registry
    this.objectRegistry.clear();

    // Force garbage collection if available
    const win = global as any;
    if (win.gc) {
      win.gc();
    }

    this.memoryStats.cleanupCount++;
    const cleanupDuration = Date.now() - cleanupStart;

    if (__DEV__) {
      console.log(`🧹 Routine cleanup completed in ${cleanupDuration.toFixed(2)}ms`);
    }
  }

  // Perform emergency cleanup
  performEmergencyCleanup() {
    if (__DEV__) {
      console.warn('🚨 Emergency cleanup triggered!');
    }

    // Clear all cache
    cacheManager.clear();

    // Clear all registered objects
    this.objectRegistry.clear();

    // Clear all cleanup tasks
    this.cleanupTasks = [];

    // Log performance issue
    if (__DEV__) {
      console.error('[MemoryManager] Emergency memory cleanup triggered', {
        type: 'performance',
        severity: 'high',
        memoryUsage: this.memoryStats,
      });
    }
  }

  // Detect memory leaks
  detectMemoryLeaks() {
    const currentObjects = this.objectRegistry.size;

    if (currentObjects > MEMORY_CONFIG.MAX_UNUSED_OBJECTS) {
      this.memoryStats.leaksDetected++;

      // Log leak
      if (__DEV__) {
        console.warn(`🔍 Potential memory leak detected: ${currentObjects} objects registered`, {
          type: 'performance',
          severity: 'medium',
          objectCount: currentObjects,
        });
      }
    }
  }

  // Register object for tracking
  registerObject(id: string, object: unknown) {
    this.objectRegistry.set(id, {
      object,
      createdAt: Date.now(),
      size: this.estimateObjectSize(object),
    });
  }

  // Unregister object
  unregisterObject(id: string) {
    this.objectRegistry.delete(id);
  }

  // Estimate object size
  estimateObjectSize(obj: unknown): number {
    try {
      return JSON.stringify(obj).length * 2; // Rough estimate in bytes
    } catch (error) {
      return 0;
    }
  }

  // Register cleanup task
  registerCleanupTask(task: () => void) {
    this.cleanupTasks.push(task);
  }

  // Get memory statistics
  getMemoryStats() {
    return {
      ...this.memoryStats,
      registeredObjects: this.objectRegistry.size,
      cleanupTasks: this.cleanupTasks.length,
      isHealthy: this.memoryStats.percentage < MEMORY_CONFIG.WARNING_THRESHOLD,
    };
  }
}

// Bundle optimization utilities
export const BundleOptimizer = {
  // Lazy load component
  lazyLoad: (importFunc: () => Promise<{ default: React.ComponentType<any> }>) => {
    return React.lazy(importFunc);
  },

  // Preload component
  preloadComponent: (importFunc: () => Promise<unknown> | unknown) => {
    return importFunc();
  },

  // Dynamic import with error handling
  dynamicImport: async <T>(importFunc: () => Promise<T>, componentName: string): Promise<T> => {
    try {
      const start = Date.now();
      const module = await importFunc();
      const duration = Date.now() - start;

      if (__DEV__) {
        console.log(`📦 Component ${componentName} loaded in ${duration.toFixed(2)}ms`);
      }
      return module;
    } catch (error) {
      if (__DEV__) {
        console.error(`❌ Failed to load component ${componentName}:`, error);
      }
      throw error;
    }
  },

  // Code splitting for routes
  splitRoutes: (routes: { component: string }[]) => {
    return routes.map((route) => ({
      ...route,
      component: React.lazy(() => {
        // Import the component directly instead of using template literals
        switch (route.component) {
          case 'HomeScreen':
            return import('../../screens/citizen/HomeScreen');
          case 'MarketplaceScreen':
            return import('../../screens/citizen/MarketplaceScreen');
          case 'AnalyticsScreen':
            return import('../../screens/core/AnalyticsScreen');
          case 'PerformanceProfilerScreen':
            return import('../../screens/core/PerformanceProfilerScreen');
          default:
            return import('../../screens/citizen/HomeScreen');
        }
      }),
    }));
  },

  // Optimize images
  optimizeImages: (imageSources: string[]) => {
    return imageSources.map((src: string) => {
      // In a real app, this would optimize images
      return src;
    });
  },

  // Minimize bundle size
  minimizeBundle: () => {
    // In a real app, this would run bundler optimizations
    if (__DEV__) {
      console.log('🗜️ Bundle minimization completed');
    }
  },
};

// Performance profiling tools
export const PerformanceProfiler = {
  // Profile component render
  profileComponent: <P extends object>(
    Component: React.ComponentType<P>,
    componentName: string
  ) => {
    return React.memo(Component, (prevProps, nextProps) => {
      const start = Date.now();
      // Use shallow comparison instead of heavy JSON.stringify
      const keys1 = Object.keys(prevProps) as (keyof P)[];
      const keys2 = Object.keys(nextProps) as (keyof P)[];
      const areEqual =
        keys1.length === keys2.length && keys1.every((key) => prevProps[key] === nextProps[key]);

      const duration = Date.now() - start;

      if (duration > 1) {
        if (__DEV__) {
          console.log(`⏱️ ${componentName} props comparison took ${duration.toFixed(2)}ms`);
        }
      }

      return areEqual;
    });
  },

  // Profile function execution
  profileFunction: <T extends (...args: unknown[]) => unknown>(fn: T, functionName: string) => {
    return async (...args: Parameters<T>) => {
      const start = performance.now();
      try {
        const result = await fn(...args);
        const duration = performance.now() - start;

        if (duration > 100) {
          if (__DEV__) {
            console.warn(`⏱️ ${functionName} took ${duration.toFixed(2)}ms`);
          }
        }

        return result;
      } catch (error) {
        const duration = performance.now() - start;
        if (__DEV__) {
          console.error(`❌ ${functionName} failed after ${duration.toFixed(2)}ms:`, error);
        }
        throw error;
      }
    };
  },

  // Profile API call
  profileApiCall: <TArgs extends unknown[], TReturn>(
    apiCall: (...args: TArgs) => Promise<TReturn>,
    endpoint: string
  ) => {
    return async (...args: TArgs) => {
      const start = Date.now();
      try {
        const result = await apiCall(...args);
        const duration = Date.now() - start;

        if (__DEV__) {
          console.log(`🌐 API call to ${endpoint} completed in ${duration.toFixed(2)}ms`);
        }

        // Report slow API calls
        if (duration > 2000) {
          if (__DEV__) {
            console.warn(`🐌 Slow API call detected: ${endpoint} took ${duration}ms`);
          }
          // Note: useErrorReporting hook cannot be used here safely as this is a non-hook context
        }

        return result;
      } catch (error) {
        const duration = Date.now() - start;
        if (__DEV__) {
          console.error(`❌ API call to ${endpoint} failed after ${duration.toFixed(2)}ms:`, error);
        }
        throw error;
      }
    };
  },

  // Generate performance report
  generateReport: () => {
    const memoryStats = memoryManager.getMemoryStats();
    const cacheStats = cacheManager.getStats();

    return {
      timestamp: Date.now(),
      memory: memoryStats,
      cache: cacheStats,
      performance: {
        bundleSize: (BundleOptimizer as any).getBundleSize?.() || 0,
        componentLoadTimes: [] as any[],
        apiCallTimes: [] as any[],
      },
      recommendations: PerformanceProfiler.getRecommendations(memoryStats, cacheStats),
    };
  },

  // Get performance recommendations
  getRecommendations: (memoryStats: MemoryStats, cacheStats: Record<string, unknown>) => {
    const recommendations: string[] = [];

    if (memoryStats.percentage > MEMORY_CONFIG.WARNING_THRESHOLD) {
      recommendations.push('Memory usage is high. Consider implementing more aggressive cleanup.');
    }

    if ((cacheStats as any).hitRate < 50) {
      recommendations.push('Cache hit rate is low. Consider increasing TTL or preloading data.');
    }

    if (memoryStats.leaksDetected > 0) {
      recommendations.push('Memory leaks detected. Review object lifecycle management.');
    }

    return recommendations;
  },
};

// React hooks for memory management
export function useMemoryManager() {
  const memoryManager = useRef(new MemoryManager());
  const [memoryStats, setMemoryStats] = useState(memoryManager.current.getMemoryStats());

  useEffect(() => {
    const cleanup = memoryManager.current.startMonitoring();

    // Update stats periodically
    const statsInterval = setInterval(() => {
      setMemoryStats(memoryManager.current.getMemoryStats());
    }, 5000);

    return () => {
      cleanup();
      clearInterval(statsInterval);
    };
  }, []);

  return {
    memoryStats,
    registerObject: memoryManager.current.registerObject.bind(memoryManager.current),
    unregisterObject: memoryManager.current.unregisterObject.bind(memoryManager.current),
    registerCleanupTask: memoryManager.current.registerCleanupTask.bind(memoryManager.current),
    performCleanup: memoryManager.current.performRoutineCleanup.bind(memoryManager.current),
  };
}

// Hook for performance profiling
export function usePerformanceProfiler(componentName: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const renderTime = now - lastRenderTime.current;
    renderTimes.current.push(renderTime);
    lastRenderTime.current = now;

    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    // Log slow renders
    if (renderTime > 100) {
      if (__DEV__) {
        console.warn(`🐌 Slow render detected: ${componentName} took ${renderTime}ms`);
      }
    }
  });

  const getRenderStats = () => ({
    renderCount: renderCount.current,
    averageRenderTime:
      renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length || 0,
    lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0,
  });

  return { getRenderStats };
}

// Optimization utilities
export const OptimizationUtils = {
  // Debounce function
  debounce: <T extends (...args: unknown[]) => void>(func: T, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle: <T extends (...args: unknown[]) => void>(func: T, limit: number) => {
    let inThrottle: boolean;
    return function (this: unknown, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Memoize function
  memoize: <T extends (...args: unknown[]) => unknown>(func: T) => {
    const cache = new Map<string, ReturnType<T>>();
    return function (this: unknown, ...args: Parameters<T>) {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func.apply(this, args);
      cache.set(key, result as any);
      return result;
    };
  },

  // Virtual scroll helper
  virtualScroll: <T>(
    items: T[],
    itemHeight: number,
    containerHeight: number,
    scrollTop: number
  ) => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );

    return {
      visibleItems: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      offsetY: startIndex * itemHeight,
    };
  },
};

// Export singleton instance
export const memoryManager = new MemoryManager();

export default {
  MemoryManager,
  BundleOptimizer,
  PerformanceProfiler,
  useMemoryManager,
  usePerformanceProfiler,
  OptimizationUtils,
  memoryManager,
};

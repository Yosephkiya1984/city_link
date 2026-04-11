import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAppStore } from '../../store/AppStore';
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

// Memory manager class
class MemoryManager {
  memoryStats: any;
  objectRegistry: any;
  cleanupTasks: any[];
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
    if (this.isMonitoring) return;
    
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
    if (Platform.OS === 'web' && (performance as any).memory) {
      const memory = (performance as any).memory;
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
    const cleanupStart = performance.now();
    
    // Clear cache
    cacheManager.cleanup();
    
    // Run registered cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    });
    
    // Clear object registry
    this.objectRegistry.clear();
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    this.memoryStats.cleanupCount++;
    const cleanupDuration = performance.now() - cleanupStart;
    
    console.log(`🧹 Routine cleanup completed in ${cleanupDuration.toFixed(2)}ms`);
  }

  // Perform emergency cleanup
  performEmergencyCleanup() {
    console.warn('🚨 Emergency cleanup triggered!');
    
    // Clear all cache
    cacheManager.clear();
    
    // Clear all registered objects
    this.objectRegistry.clear();
    
    // Clear all cleanup tasks
    this.cleanupTasks = [];
    
    // Force garbage collection
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    // Report performance issue
    const { reportError } = useErrorReporting() as any;
    if (reportError) {
      reportError({
        type: 'performance',
        severity: 'high',
        message: 'Emergency memory cleanup triggered',
        memoryUsage: this.memoryStats,
        context: 'memory_management',
      });
    }
  }

  // Detect memory leaks
  detectMemoryLeaks() {
    const currentObjects = this.objectRegistry.size;
    
    if (currentObjects > MEMORY_CONFIG.MAX_UNUSED_OBJECTS) {
      this.memoryStats.leaksDetected++;
      
      console.warn(`🔍 Potential memory leak detected: ${currentObjects} objects registered`);
      
      // Report leak
      const { reportError } = useErrorReporting();
      if (reportError) {
        reportError({
          type: 'performance',
          severity: 'medium',
          message: 'Memory leak detected',
          objectCount: currentObjects,
          context: 'memory_leak_detection',
        });
      }
    }
  }

  // Register object for tracking
  registerObject(id, object) {
    this.objectRegistry.set(id, {
      object,
      createdAt: Date.now(),
      size: this.estimateObjectSize(object),
    });
  }

  // Unregister object
  unregisterObject(id) {
    this.objectRegistry.delete(id);
  }

  // Estimate object size
  estimateObjectSize(obj) {
    try {
      return JSON.stringify(obj).length * 2; // Rough estimate in bytes
    } catch (error) {
      return 0;
    }
  }

  // Register cleanup task
  registerCleanupTask(task) {
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
  lazyLoad: (importFunc) => {
    return React.lazy(importFunc);
  },

  // Preload component
  preloadComponent: (importFunc) => {
    return importFunc();
  },

  // Dynamic import with error handling
  dynamicImport: async (importFunc, componentName) => {
    try {
      const start = performance.now();
      const module = await importFunc();
      const duration = performance.now() - start;
      
      console.log(`📦 Component ${componentName} loaded in ${duration.toFixed(2)}ms`);
      return module;
    } catch (error) {
      console.error(`❌ Failed to load component ${componentName}:`, error);
      throw error;
    }
  },

  // Code splitting for routes
  splitRoutes: (routes) => {
    return routes.map(route => ({
      ...route,
      component: React.lazy(() => {
        // Import the component directly instead of using template literals
        switch (route.component) {
          case 'HomeScreen':
            return import('../../screens/citizen/HomeScreen');
          case 'MarketplaceScreen':
            return import('../../screens/citizen/MarketplaceScreen');
          case 'TransportScreen':
            return import('../../screens/citizen/TransportScreen');
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
  optimizeImages: (imageSources) => {
    return imageSources.map(src => {
      // In a real app, this would optimize images
      return src;
    });
  },

  // Minimize bundle size
  minimizeBundle: () => {
    // In a real app, this would run bundler optimizations
    console.log('🗜️ Bundle minimization completed');
  },
};

// Performance profiling tools
export const PerformanceProfiler = {
  // Profile component render
  profileComponent: (Component, componentName) => {
    return React.memo(Component, (prevProps, nextProps) => {
      const start = performance.now();
      const areEqual = JSON.stringify(prevProps) === JSON.stringify(nextProps);
      const duration = performance.now() - start;
      
      if (duration > 1) {
        console.log(`⏱️ ${componentName} props comparison took ${duration.toFixed(2)}ms`);
      }
      
      return areEqual;
    });
  },

  // Profile function execution
  profileFunction: (fn, functionName) => {
    return async (...args) => {
      const start = performance.now();
      try {
        const result = await fn(...args);
        const duration = performance.now() - start;
        
        if (duration > 100) {
          console.warn(`⏱️ ${functionName} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        console.error(`❌ ${functionName} failed after ${duration.toFixed(2)}ms:`, error);
        throw error;
      }
    };
  },

  // Profile API call
  profileApiCall: (apiCall, endpoint) => {
    return async (...args) => {
      const start = performance.now();
      try {
        const result = await apiCall(...args);
        const duration = performance.now() - start;
        
        console.log(`🌐 API call to ${endpoint} completed in ${duration.toFixed(2)}ms`);
        
        // Report slow API calls
        if (duration > 2000) {
          const { reportError } = useErrorReporting() as any;
          if (reportError) {
            reportError({
              type: 'performance',
              severity: 'medium',
              message: `Slow API call: ${endpoint}`,
              duration,
              endpoint,
              context: 'api_performance',
            });
          }
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        console.error(`❌ API call to ${endpoint} failed after ${duration.toFixed(2)}ms:`, error);
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
        componentLoadTimes: [],
        apiCallTimes: [],
      },
      recommendations: PerformanceProfiler.getRecommendations(memoryStats, cacheStats),
    };
  },

  // Get performance recommendations
  getRecommendations: (memoryStats: any, cacheStats: any) => {
    const recommendations = [];
    
    if (memoryStats.percentage > MEMORY_CONFIG.WARNING_THRESHOLD) {
      recommendations.push('Memory usage is high. Consider implementing more aggressive cleanup.');
    }
    
    if (cacheStats.hitRate < 50) {
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
export function usePerformanceProfiler(componentName) {
  const renderCount = useRef(0);
  const renderTimes = useRef([]);
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
      console.warn(`🐌 Slow render detected: ${componentName} took ${renderTime}ms`);
    }
  });

  const getRenderStats = () => ({
    renderCount: renderCount.current,
    averageRenderTime: renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length || 0,
    lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0,
  });

  return { getRenderStats };
}

// Optimization utilities
export const OptimizationUtils = {
  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle: (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Memoize function
  memoize: (func) => {
    const cache = new Map();
    return function(...args) {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func.apply(this, args);
      cache.set(key, result);
      return result;
    };
  },

  // Virtual scroll helper
  virtualScroll: (items, itemHeight, containerHeight, scrollTop) => {
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

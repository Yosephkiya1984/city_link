import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Performance monitoring context
const PerformanceContext = createContext<any>(null);

// Performance metrics storage
const PERFORMANCE_KEYS = {
  APP_STARTUP: 'app_startup_time',
  SCREEN_LOAD: 'screen_load_times',
  API_CALLS: 'api_call_times',
  MEMORY_USAGE: 'memory_usage',
  BUNDLE_SIZE: 'bundle_size_metrics',
  USER_INTERACTIONS: 'user_interactions',
};

interface MetricItem {
  duration: number;
  [key: string]: unknown;
}

interface Metrics {
  appStartupTime: number;
  screenLoadTimes: Record<string, number>;
  apiCallTimes: MetricItem[];
  memoryUsage: Record<string, unknown>[];
  bundleSize: number;
  userInteractions: MetricItem[];
}

// Performance monitoring provider
export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const appStartTime = useRef(Date.now());
  const [metrics, setMetrics] = useState<Metrics>({
    appStartupTime: 0,
    screenLoadTimes: {},
    apiCallTimes: [],
    memoryUsage: [],
    bundleSize: 0,
    userInteractions: [],
  });
  const [isMonitoring, setIsMonitoring] = useState(__DEV__);

  // Update metrics
  const updateMetrics = (key: string, value: any) => {
    setMetrics((prev) => {
      const newMetrics = { ...prev };

      switch (key) {
        case 'appStartupTime':
          newMetrics.appStartupTime = value;
          break;
        case 'screenLoadTimes':
          newMetrics.screenLoadTimes = { ...newMetrics.screenLoadTimes, ...value };
          break;
        case 'apiCallTimes':
          newMetrics.apiCallTimes = [...newMetrics.apiCallTimes, value];
          break;
        case 'memoryUsage':
          newMetrics.memoryUsage = [...newMetrics.memoryUsage, value];
          break;
        case 'bundleSize':
          newMetrics.bundleSize = value;
          break;
        case 'userInteractions':
          newMetrics.userInteractions = [...newMetrics.userInteractions, value];
          break;
      }

      return newMetrics;
    });
  };

  // Initialize performance monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    // Calculate app startup time
    const startupTime = Date.now() - appStartTime.current;
    if (__DEV__) {
      updateMetrics('appStartupTime', startupTime);
    }

    // Start memory monitoring
    if (__DEV__ && Platform.OS === 'web') {
      const memoryInterval = setInterval(() => {
        if ((performance as any).memory) {
          const memoryInfo = {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit,
            timestamp: Date.now(),
          };
          updateMetrics('memoryUsage', memoryInfo);
        }
      }, 5000); // Monitor every 5 seconds

      return () => clearInterval(memoryInterval);
    }
  }, [isMonitoring]);

  // Track screen load time
  const trackScreenLoad = (screenName: string, loadTime: number) => {
    updateMetrics('screenLoadTimes', { [screenName]: loadTime });
  };

  // Track API call performance
  const trackApiCall = (endpoint: string, duration: number, success = true) => {
    const apiCall = {
      endpoint,
      duration,
      success,
      timestamp: Date.now(),
    };
    updateMetrics('apiCallTimes', apiCall);
  };

  // Track user interaction
  const trackUserInteraction = (action: string, component: string, duration: number) => {
    const interaction = {
      action,
      component,
      duration,
      timestamp: Date.now(),
    };
    updateMetrics('userInteractions', interaction);
  };

  // Get performance summary
  const getPerformanceSummary = () => {
    const summary = {
      appStartupTime: metrics.appStartupTime,
      averageScreenLoadTime:
        Object.values(metrics.screenLoadTimes).reduce((a, b) => a + b, 0) /
        (Object.keys(metrics.screenLoadTimes).length || 1),
      averageApiCallTime:
        metrics.apiCallTimes.reduce((a: number, b: MetricItem) => a + b.duration, 0) /
        (metrics.apiCallTimes.length || 1),
      currentMemoryUsage: metrics.memoryUsage[metrics.memoryUsage.length - 1],
      totalInteractions: metrics.userInteractions.length,
      slowestScreen: Object.entries(metrics.screenLoadTimes).reduce<[string, number]>(
        (a, b) => (a[1] > b[1] ? a : b),
        ['', 0]
      )[0],
      slowestApiCall:
        metrics.apiCallTimes.length > 0
          ? metrics.apiCallTimes.reduce((a, b) => (a.duration > b.duration ? a : b)).endpoint
          : '',
    };
    return summary;
  };

  // Save metrics to storage
  const saveMetrics = async () => {
    try {
      await AsyncStorage.setItem('performance_metrics', JSON.stringify(metrics));
    } catch (error) {
      if (__DEV__) console.error('Failed to save performance metrics:', error);
    }
  };

  // Load metrics from storage
  const loadMetrics = async () => {
    try {
      const stored = await AsyncStorage.getItem('performance_metrics');
      if (stored) {
        setMetrics(JSON.parse(stored));
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to load performance metrics:', error);
    }
  };

  // Clear metrics
  const clearMetrics = () => {
    setMetrics({
      appStartupTime: 0,
      screenLoadTimes: {},
      apiCallTimes: [],
      memoryUsage: [],
      bundleSize: 0,
      userInteractions: [],
    });
  };

  // Auto-save metrics
  useEffect(() => {
    if (!__DEV__ || !isMonitoring) return;
    const saveInterval = setInterval(saveMetrics, 30000); // Save every 30 seconds
    return () => clearInterval(saveInterval);
  }, [metrics, isMonitoring]);

  const value = {
    metrics,
    isMonitoring,
    setIsMonitoring,
    trackScreenLoad,
    trackApiCall,
    trackUserInteraction,
    getPerformanceSummary,
    saveMetrics,
    loadMetrics,
    clearMetrics,
  };

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
}

// Hook to use performance monitoring
export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}

// Performance tracking HOC
export function withPerformanceTracking(WrappedComponent: any, componentName: string) {
  return function PerformanceTrackedComponent(props: any) {
    const { trackScreenLoad, trackUserInteraction } = usePerformance();
    const startTime = useRef(Date.now());

    useEffect(() => {
      const loadTime = Date.now() - startTime.current;
      trackScreenLoad(componentName, loadTime);
    }, []);

    const handleInteraction = (action: string, callback?: () => void) => {
      const interactionStart = Date.now();
      if (callback) callback();
      const interactionDuration = Date.now() - interactionStart;
      trackUserInteraction(action, componentName, interactionDuration);
    };

    return <WrappedComponent {...props} onInteraction={handleInteraction} />;
  };
}

// Performance monitoring utilities
export const PerformanceUtils = {
  // Measure function execution time
  measureFunction: (fn: any, name: string) => {
    return async (...args: any[]) => {
      const start = performance.now();
      try {
        const result = await fn(...args);
        const duration = performance.now() - start;
        if (__DEV__) console.log(`⏱️ ${name} executed in ${duration.toFixed(2)}ms`);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        if (__DEV__) console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
        throw error;
      }
    };
  },

  // Measure render time
  measureRender: (componentName: string) => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (__DEV__) console.log(`🎨 ${componentName} rendered in ${duration.toFixed(2)}ms`);
    };
  },

  // Check memory usage
  checkMemoryUsage: () => {
    if (Platform.OS === 'web' && (performance as any).memory) {
      const used = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
      const total = (performance as any).memory.totalJSHeapSize / 1024 / 1024;
      const limit = (performance as any).memory.jsHeapSizeLimit / 1024 / 1024;

      if (__DEV__)
        console.log(
          `💾 Memory Usage: ${used.toFixed(2)}MB / ${total.toFixed(2)}MB (limit: ${limit.toFixed(2)}MB)`
        );

      if (used > limit * 0.8) {
        if (__DEV__) console.warn('⚠️ High memory usage detected!');
      }
    }
  },

  // Get bundle size estimate
  getBundleSize: () => {
    if (Platform.OS === 'web') {
      const scripts = document.querySelectorAll('script[src]');
      let totalSize = 0;

      scripts.forEach((script: any) => {
        if (script.src && script.src.includes('bundle')) {
          // This is a rough estimate - in production you'd use actual bundle analysis
          totalSize += 50000; // 50KB per script as estimate
        }
      });

      return totalSize;
    }
    return 0;
  },

  // Performance score calculation
  calculatePerformanceScore: (metrics: Metrics) => {
    let score = 100;

    // App startup time (0-30 points)
    if (metrics.appStartupTime > 3000) score -= 30;
    else if (metrics.appStartupTime > 2000) score -= 20;
    else if (metrics.appStartupTime > 1000) score -= 10;

    // Screen load times (0-25 points)
    const screenLoadValues = Object.values(metrics.screenLoadTimes);
    const avgScreenLoad =
      screenLoadValues.reduce((a: number, b: number) => a + b, 0) / (screenLoadValues.length || 1);
    if (avgScreenLoad > 2000) score -= 25;
    else if (avgScreenLoad > 1500) score -= 15;
    else if (avgScreenLoad > 1000) score -= 5;

    // API call times (0-25 points)
    const avgApiTime =
      metrics.apiCallTimes.length > 0
        ? metrics.apiCallTimes.reduce((a: number, b: MetricItem) => a + b.duration, 0) /
          metrics.apiCallTimes.length
        : 0;
    if (avgApiTime > 2000) score -= 25;
    else if (avgApiTime > 1500) score -= 15;
    else if (avgApiTime > 1000) score -= 5;

    // Memory usage (0-20 points)
    const currentMemory = metrics.memoryUsage[metrics.memoryUsage.length - 1] as any;
    if (currentMemory && currentMemory.used > currentMemory.limit * 0.8) score -= 20;
    else if (currentMemory && currentMemory.used > currentMemory.limit * 0.6) score -= 10;

    return Math.max(0, score);
  },
};

export default PerformanceContext;

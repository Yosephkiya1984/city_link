import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius, Spacing, Shadow, Fonts } from '../../theme';
import { CButton, SectionTitle } from '../../components';
import { fmtETB, timeAgo, uid, fmtDateTime } from '../../utils';
import { t } from '../../utils/i18n';
import { usePerformance, PerformanceUtils } from '../../utils/debug/performanceMonitor';
import { cacheManager } from '../../utils/debug/cacheManager';
import { memoryManager } from '../../utils/debug/memoryManager';
import { useErrorReporting } from '../../utils/debug/errorReporting';
import { PerformanceProfiler } from '../../utils/debug/memoryManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PerformanceProfilerScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const showToast = useAppStore((s) => s.showToast);

  const { metrics, getPerformanceSummary, clearMetrics } = usePerformance();
  const { errors, errorStats, clearErrors } = useErrorReporting();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [animatedValues, setAnimatedValues] = useState<any>({});

  // Initialize animations
  useEffect(() => {
    const values = {};
    ['overview', 'memory', 'cache', 'errors', 'network'].forEach((tab: any) => {
      values[tab] = new Animated.Value(0);
    });
    setAnimatedValues(values);

    // Animate tab content
    (Object.values(values) as any[]).forEach((value, index) => {
      Animated.timing(value, {
        toValue: 1,
        duration: 800,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // Get performance score
  const performanceScore = PerformanceUtils.calculatePerformanceScore(metrics);
  const performanceGrade =
    performanceScore >= 90
      ? 'A'
      : performanceScore >= 80
        ? 'B'
        : performanceScore >= 70
          ? 'C'
          : 'D';

  // Get memory stats
  const memoryStats = memoryManager.getMemoryStats();
  const cacheStats = cacheManager.getStats();

  // Render performance score card
  const renderPerformanceScore = () => {
    const scoreColor =
      performanceScore >= 90
        ? C.green
        : performanceScore >= 80
          ? C.amber
          : performanceScore >= 70
            ? C.orange
            : C.red;

    return (
      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: Radius.xl,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: C.edge,
          ...Shadow.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black }}>
            Performance Score
          </Text>
          <TouchableOpacity
            onPress={() => setIsMonitoring(!isMonitoring)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: Radius.lg,
              backgroundColor: isMonitoring ? C.green + '20' : C.red + '20',
              borderWidth: 1,
              borderColor: isMonitoring ? C.green : C.red,
            }}
          >
            <Text
              style={{
                color: isMonitoring ? C.green : C.red,
                fontSize: 12,
                fontFamily: Fonts.bold,
              }}
            >
              {isMonitoring ? 'Monitoring' : 'Paused'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: scoreColor + '20',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: scoreColor, fontSize: 32, fontFamily: Fonts.black }}>
              {performanceGrade}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: scoreColor, fontSize: 24, fontFamily: Fonts.black }}>
              {performanceScore}%
            </Text>
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
              Overall performance rating
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Render overview tab
  const renderOverview = () => {
    const summary = getPerformanceSummary();

    return (
      <Animated.View style={{ opacity: animatedValues.overview }}>
        {renderPerformanceScore()}

        <SectionTitle title="Key Metrics" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Startup Time
            </Text>
            <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black }}>
              {summary.appStartupTime}ms
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Avg Screen Load
            </Text>
            <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black }}>
              {Math.round(summary.averageScreenLoadTime)}ms
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Avg API Time
            </Text>
            <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black }}>
              {Math.round(summary.averageApiCallTime)}ms
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Total Interactions
            </Text>
            <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black }}>
              {summary.totalInteractions}
            </Text>
          </View>
        </View>

        <SectionTitle title="Performance Issues" />
        {summary.slowestScreen && (
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: C.edge,
              ...Shadow.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: C.orange + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="warning" size={16} color={C.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black, marginBottom: 4 }}
                >
                  Slowest Screen
                </Text>
                <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
                  {summary.slowestScreen}
                </Text>
              </View>
            </View>
          </View>
        )}

        {summary.slowestApiCall && (
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: C.edge,
              ...Shadow.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: C.red + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="alert-circle" size={16} color={C.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black, marginBottom: 4 }}
                >
                  Slowest API Call
                </Text>
                <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
                  {summary.slowestApiCall}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  // Render memory tab
  const renderMemory = () => {
    const memoryPercentage = memoryStats.percentage * 100;
    const memoryColor = memoryPercentage > 85 ? C.red : memoryPercentage > 70 ? C.orange : C.green;

    return (
      <Animated.View style={{ opacity: animatedValues.memory }}>
        <SectionTitle title="Memory Usage" />
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: Radius.xl,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: C.edge,
            ...Shadow.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
              Memory Usage
            </Text>
            <Text style={{ color: memoryColor, fontSize: 16, fontFamily: Fonts.black }}>
              {memoryPercentage.toFixed(1)}%
            </Text>
          </View>

          <View style={{ height: 12, backgroundColor: C.edge, borderRadius: 6, marginBottom: 8 }}>
            <View
              style={{
                height: 12,
                width: `${Math.min(memoryPercentage, 100)}%`,
                backgroundColor: memoryColor,
                borderRadius: 6,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
              {(memoryStats.used / 1024 / 1024).toFixed(2)}MB used
            </Text>
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
              {(memoryStats.total / 1024 / 1024).toFixed(2)}MB total
            </Text>
          </View>
        </View>

        <SectionTitle title="Memory Statistics" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Registered Objects
            </Text>
            <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black }}>
              {memoryStats.registeredObjects}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Cleanup Count
            </Text>
            <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black }}>
              {memoryStats.cleanupCount}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Leaks Detected
            </Text>
            <Text
              style={{
                color: memoryStats.leaksDetected > 0 ? C.red : C.green,
                fontSize: 20,
                fontFamily: Fonts.black,
              }}
            >
              {memoryStats.leaksDetected}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Health Status
            </Text>
            <Text
              style={{
                color: memoryStats.isHealthy ? C.green : C.red,
                fontSize: 20,
                fontFamily: Fonts.black,
              }}
            >
              {memoryStats.isHealthy ? 'Good' : 'Warning'}
            </Text>
          </View>
        </View>

        <CButton
          title="Perform Cleanup"
          onPress={() => {
            memoryManager.performRoutineCleanup();
            showToast('Memory cleanup completed!', 'success');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          icon="trash-outline"
        />
      </Animated.View>
    );
  };

  // Render cache tab
  const renderCache = () => {
    const cacheHealth =
      cacheStats.hitRate > 70 ? 'good' : cacheStats.hitRate > 50 ? 'warning' : 'poor';
    const cacheColor =
      cacheHealth === 'good' ? C.green : cacheHealth === 'warning' ? C.orange : C.red;

    return (
      <Animated.View style={{ opacity: animatedValues.cache }}>
        <SectionTitle title="Cache Performance" />
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: Radius.xl,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: C.edge,
            ...Shadow.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
              Cache Hit Rate
            </Text>
            <Text style={{ color: cacheColor, fontSize: 16, fontFamily: Fonts.black }}>
              {cacheStats.hitRate.toFixed(1)}%
            </Text>
          </View>

          <View style={{ height: 12, backgroundColor: C.edge, borderRadius: 6, marginBottom: 8 }}>
            <View
              style={{
                height: 12,
                width: `${cacheStats.hitRate}%`,
                backgroundColor: cacheColor,
                borderRadius: 6,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
              {cacheStats.hits} hits
            </Text>
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
              {cacheStats.misses} misses
            </Text>
          </View>
        </View>

        <SectionTitle title="Cache Statistics" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Total Entries
            </Text>
            <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black }}>
              {cacheStats.entryCount}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Total Size
            </Text>
            <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black }}>
              {(cacheStats.totalSize / 1024 / 1024).toFixed(2)}MB
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Avg Entry Size
            </Text>
            <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black }}>
              {(cacheStats.averageEntrySize / 1024).toFixed(2)}KB
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              padding: 16,
              ...Shadow.md,
            }}
          >
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Last Cleanup
            </Text>
            <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black }}>
              {timeAgo(cacheStats.lastCleanup)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <CButton
            title="Clear Cache"
            variant="ghost"
            onPress={() => {
              cacheManager.clear();
              showToast('Cache cleared successfully!', 'success');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            icon="trash-outline"
            style={{ flex: 1 }}
          />
          <CButton
            title="Run Cleanup"
            variant="ghost"
            onPress={() => {
              cacheManager.cleanup();
              showToast('Cache cleanup completed!', 'success');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            icon="refresh-outline"
            style={{ flex: 1 }}
          />
        </View>
      </Animated.View>
    );
  };

  // Render errors tab
  const renderErrors = () => {
    const errorHealth =
      errorStats.totalErrors === 0
        ? 'good'
        : errorStats.criticalErrors > 0
          ? 'critical'
          : 'warning';
    const errorColor =
      errorHealth === 'good' ? C.green : errorHealth === 'critical' ? C.red : C.orange;

    return (
      <Animated.View style={{ opacity: animatedValues.errors }}>
        <SectionTitle title="Error Statistics" />
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: Radius.xl,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: C.edge,
            ...Shadow.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
              Error Health
            </Text>
            <Text
              style={{
                color: errorColor,
                fontSize: 16,
                fontFamily: Fonts.black,
                textTransform: 'capitalize',
              }}
            >
              {errorHealth}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: C.text, fontSize: 24, fontFamily: Fonts.black }}>
                {errorStats.totalErrors}
              </Text>
              <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
                Total Errors
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text
                style={{
                  color: errorStats.criticalErrors > 0 ? C.red : C.green,
                  fontSize: 24,
                  fontFamily: Fonts.black,
                }}
              >
                {errorStats.criticalErrors}
              </Text>
              <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>Critical</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: C.text, fontSize: 24, fontFamily: Fonts.black }}>
                {errorStats.networkErrors}
              </Text>
              <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>Network</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: C.text, fontSize: 24, fontFamily: Fonts.black }}>
                {errorStats.apiErrors}
              </Text>
              <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>API</Text>
            </View>
          </View>
        </View>

        <SectionTitle title="Recent Errors" />
        <ScrollView style={{ maxHeight: 300 }}>
          {errors.length === 0 ? (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: Radius.xl,
                padding: 20,
                alignItems: 'center',
                ...Shadow.md,
              }}
            >
              <Ionicons name="checkmark-circle" size={40} color={C.green} />
              <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black, marginTop: 8 }}>
                No errors detected
              </Text>
              <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginTop: 4 }}>
                Everything is running smoothly
              </Text>
            </View>
          ) : (
            errors
              .slice(-10)
              .reverse()
              .map((error, index) => (
                <View
                  key={error.id}
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: Radius.xl,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: C.edge,
                    ...Shadow.md,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor:
                          error.severity === 'critical' ? C.red + '20' : C.orange + '20',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name={error.severity === 'critical' ? 'warning' : 'alert-circle'}
                        size={12}
                        color={error.severity === 'critical' ? C.red : C.orange}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: C.text,
                          fontSize: 14,
                          fontFamily: Fonts.black,
                          marginBottom: 4,
                        }}
                      >
                        {error.type}
                      </Text>
                      <Text
                        style={{
                          color: C.sub,
                          fontSize: 12,
                          fontFamily: Fonts.medium,
                          marginBottom: 4,
                        }}
                      >
                        {error.message}
                      </Text>
                      <Text style={{ color: C.hint, fontSize: 10, fontFamily: Fonts.medium }}>
                        {timeAgo(error.timestamp)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
          )}
        </ScrollView>

        <CButton
          title="Clear Errors"
          variant="ghost"
          onPress={() => {
            clearErrors();
            showToast('Error history cleared!', 'success');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          icon="trash-outline"
          style={{ marginTop: 16 }}
        />
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar
        title="🔧 Performance Profiler"
        right={
          <TouchableOpacity
            onPress={() => {
              clearMetrics();
              showToast('Performance metrics cleared!', 'success');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: Radius.lg,
              backgroundColor: C.primaryL,
              borderWidth: 1,
              borderColor: C.edge2,
            }}
          >
            <Text style={{ color: C.primary, fontSize: FontSize.xs, fontWeight: '700' }}>
              Clear
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Tab Switcher */}
      <View
        style={{
          flexDirection: 'row',
          padding: 16,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.edge,
        }}
      >
        {['overview', 'memory', 'cache', 'errors'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: selectedTab === tab ? C.primary : 'transparent',
            }}
          >
            <Text
              style={{
                color: selectedTab === tab ? C.primary : C.sub,
                fontFamily: Fonts.black,
                textTransform: 'capitalize',
                fontSize: 12,
              }}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'memory' && renderMemory()}
        {selectedTab === 'cache' && renderCache()}
        {selectedTab === 'errors' && renderErrors()}
      </ScrollView>
    </View>
  );
}

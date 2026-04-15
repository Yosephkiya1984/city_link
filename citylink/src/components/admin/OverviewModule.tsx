import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Fonts, FontSize, Shadow } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchAdminLiveStats, subscribeToGlobalEvents } from '../../services/admin.service';
import * as Haptics from 'expo-haptics';

export interface LiveStats {
  identities: number;
  revenue: number;
  jobs: number;
  realEstate: number;
  parking: number;
  openDisputes: number;
}

export interface LiveEvent {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  color: string;
}

interface RealtimePayload {
  new?: {
    product_name?: string;
    full_name?: string;
    restaurant_name?: string;
    [key: string]: any;
  };
}

export default function OverviewModule() {
  const theme = useTheme();
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  const [stats, setStats] = useState<LiveStats>({
    identities: 0,
    revenue: 0,
    jobs: 0,
    realEstate: 0,
    parking: 0,
    openDisputes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<LiveEvent[]>([
    {
      id: '1',
      title: 'System Initialized',
      subtitle: 'Admin gateway online',
      time: 'Active',
      icon: 'shield-check',
      color: '#59de9b',
    },
  ]);

  const loadStats = async () => {
    try {
      const { data } = (await fetchAdminLiveStats()) as { data: any };
      if (data) {
        setStats({
          identities: data.identities ?? 0,
          revenue: data.revenue ?? 0,
          jobs: data.jobs ?? data.deliveries ?? 0,
          realEstate: data.realEstate ?? 0,
          parking: data.parking ?? 0,
          openDisputes: data.openDisputes ?? 0,
        });
      }
    } catch (err) {
      console.error('[OverviewModule] Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const sub = subscribeToGlobalEvents((event) => {
      loadStats();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const payload = event.payload as RealtimePayload;

      const newEvent = {
        id: Math.random().toString(),
        title:
          event.type === 'ORDER'
            ? 'Transaction Logged'
            : event.type === 'PROFILE'
              ? 'Identity Created'
              : event.type === 'DISPUTE'
                ? 'Conflict Reported'
                : 'System Registry',
        subtitle:
          payload.new?.product_name ||
          payload.new?.full_name ||
          payload.new?.restaurant_name ||
          'Ecosystem update',
        time: 'Just now',
        icon:
          event.type === 'ORDER'
            ? 'swap-horizontal'
            : event.type === 'PROFILE'
              ? 'account-plus'
              : 'alert-circle',
        color:
          event.type === 'ORDER'
            ? theme.primary
            : event.type === 'PROFILE'
              ? theme.secondary
              : theme.red,
      };

      setRecentEvents((prev) => [newEvent, ...prev].slice(0, 10));
    });

    return () => {
      if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe();
    };
  }, []);

  const displayStats = [
    {
      id: 'rev',
      label: 'Ecosystem Volume',
      value: `${stats.revenue.toLocaleString()} ETB`,
      icon: 'wallet-outline',
      color: '#59de9b',
    },
    {
      id: 'usr',
      label: 'Verified Identities',
      value: stats.identities.toLocaleString(),
      icon: 'people-outline',
      color: '#ffd887',
    },
    {
      id: 'jobs',
      label: 'Work Registry',
      value: stats.jobs.toLocaleString(),
      icon: 'briefcase-outline',
      color: '#5AC8FA',
    },
    {
      id: 'dsp',
      label: 'Resolved Conflicts',
      value: stats.openDisputes.toLocaleString(),
      icon: 'hammer-outline',
      color: '#ffb4aa',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: isMobile ? 16 : 24, paddingBottom: 100 }}
    >
      {/* Stats Grid */}
      <View style={[styles.statsGrid, isMobile && { flexWrap: 'wrap' }]}>
        {displayStats.map((stat) => (
          <View
            key={stat.id}
            style={[
              styles.statCard,
              { backgroundColor: theme.surface, borderColor: theme.rim },
              isMobile && { width: '47%', minWidth: 150 },
            ]}
          >
            <View style={styles.statHeader}>
              <View style={[styles.iconBox, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon as any} size={isMobile ? 18 : 20} color={stat.color} />
              </View>
              {loading && <ActivityIndicator size="small" color={theme.primary} />}
            </View>
            <Text
              style={[
                styles.statValue,
                {
                  color: theme.text,
                  fontFamily: Fonts.headline,
                  fontSize: isMobile ? 18 : 24,
                },
              ]}
            >
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: theme.sub, fontFamily: Fonts.body }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Main Content Area: Bento Grid Layout */}
      <View style={[styles.bentoGrid, isMobile && { flexDirection: 'column' }]}>
        {/* Left Column: System Health & Performance */}
        <View style={isMobile ? { width: '100%', marginBottom: 24 } : styles.bentoLeft}>
          <View
            style={[styles.bentoCard, { backgroundColor: theme.surface, borderColor: theme.rim }]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: Fonts.label }]}>
                Sub-System Analysis
              </Text>
              <View style={[styles.pill, { backgroundColor: theme.primary + '15' }]}>
                <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '700' }}>
                  DYNAMIC
                </Text>
              </View>
            </View>

            <View style={styles.healthStrip}>
              <HealthNode label="Market" metric={stats.revenue > 0 ? 'OK' : 'WAIT'} />
              <HealthNode label="Jobs" metric={stats.jobs} />
              <HealthNode label="Estate" metric={stats.realEstate} />
              <HealthNode label="Parking" metric={stats.parking} />
            </View>

            <View style={styles.chartContainer}>
              <Text
                style={{
                  color: theme.sub,
                  fontSize: 10,
                  marginBottom: 12,
                  fontFamily: Fonts.label,
                }}
              >
                DISTRIBUTED LOAD (24H)
              </Text>
              <View style={styles.barGrid}>
                {[40, 60, 35, 90, 75, 50, 85, 30, 65, 45, 78, 56, 40, 90].map((h, i) => (
                  <View
                    key={i}
                    style={[styles.bar, { height: h, backgroundColor: theme.primary }]}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Quick Stats - Bottom Left */}
          {!isMobile && (
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
              <View
                style={[
                  styles.miniCard,
                  { backgroundColor: theme.surface, borderColor: theme.rim },
                ]}
              >
                <Text style={{ color: theme.sub, fontSize: 10, fontWeight: '700' }}>
                  ACTIVE USERS
                </Text>
                <Text style={{ color: theme.text, fontSize: 18, fontFamily: Fonts.headline }}>
                  {stats.identities}
                </Text>
              </View>
              <View
                style={[
                  styles.miniCard,
                  { backgroundColor: theme.surface, borderColor: theme.rim },
                ]}
              >
                <Text style={{ color: theme.sub, fontSize: 10, fontWeight: '700' }}>HEALTH</Text>
                <Text style={{ color: theme.green, fontSize: 18, fontFamily: Fonts.headline }}>
                  OPTIMAL
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Right Column: Recent Admin Actions */}
        <View style={isMobile ? { width: '100%' } : styles.bentoRight}>
          <View
            style={[
              styles.bentoCard,
              { backgroundColor: theme.surface, borderColor: theme.rim, flex: 1 },
            ]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: theme.text, fontFamily: Fonts.label, marginBottom: 20 },
              ]}
            >
              Live Activity Stream
            </Text>

            {recentEvents.map((item) => (
              <OperationItem
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                time={item.time}
                icon={item.icon || 'circle-outline'}
                color={item.color || theme.primary}
              />
            ))}

            {recentEvents.length === 1 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: theme.hint, fontSize: 11, textAlign: 'center' }}>
                  Monitoring ecosystem for real-time events...
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function HealthNode({ label, metric }: { label: string; metric: string | number }) {
  const theme = useTheme();
  const labelColor = typeof metric === 'number' && metric > 0 ? theme.green : theme.primary;
  return (
    <View style={styles.healthNode}>
      <View style={[styles.nodeDot, { backgroundColor: labelColor }]} />
      <Text style={[styles.nodeLabel, { color: theme.textSoft }]}>{label}:</Text>
      <Text style={[styles.nodeMetric, { color: labelColor, fontFamily: Fonts.label }]}>
        {metric}
      </Text>
    </View>
  );
}

function OperationItem({
  title,
  subtitle,
  time,
  icon,
  color,
}: {
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  color: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.opItem}>
      <View style={[styles.opIcon, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.opTitle, { color: theme.text, fontFamily: Fonts.label }]}>
          {title}
        </Text>
        <Text style={[styles.opSub, { color: theme.sub }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text style={[styles.timeText, { color: theme.hint }]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  bentoLeft: {
    flex: 1.5,
  },
  bentoRight: {
    flex: 1,
  },
  bentoCard: {
    padding: 20,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chartContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  barGrid: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  bar: {
    width: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
  healthStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  healthNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nodeLabel: {
    fontSize: 10,
  },
  nodeMetric: {
    fontSize: 10,
    fontWeight: '700',
  },
  miniCard: {
    flex: 1,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 4,
  },
  opItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  opIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opTitle: {
    fontSize: 13,
  },
  opSub: {
    fontSize: 11,
    marginTop: 1,
  },
  timeText: {
    fontSize: 10,
  },
});

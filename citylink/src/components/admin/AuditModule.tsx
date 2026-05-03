import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Fonts, FontSize, Shadow } from '../../theme';
import { supaQuery } from '../../services/supabase';
import { fmtETB } from '../../utils';

export interface AuditLog {
  id: string;
  event: string;
  user: string;
  details: string;
  time: string;
  severity: 'low' | 'med' | 'high';
}

export default function AuditModule() {
  const theme = useTheme();
  const [auditMode, setAuditMode] = useState<'system' | 'fiscal'>('system');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    sensitive: 0,
    integrity: 'VERIFIED',
    nationalVat: 42890,
    cashRatio: '14%',
  });

  const fetchLogsData = async () => {
    // Simulated: In a real app, 'fiscal' mode would query the unified ledger
    const { data, error } = await supaQuery<any[]>((c) =>
      c.rpc('fetch_system_audit_logs', { p_limit: 20 })
    );

    if (error) {
      console.error('[AuditModule] Failed to fetch logs:', error);
      return {
        logs: [],
        stats: { sensitive: 0, integrity: 'ERROR', nationalVat: 0, cashRatio: '0%' },
      };
    }

    const combined = (data || []).map((l) => ({
      id: l.id,
      event: l.event_type,
      user: l.actor_id ? String(l.actor_id).slice(0, 8) : 'System',
      details: l.details ? JSON.stringify(l.details) : 'No details',
      time: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      severity: l.severity as 'low' | 'med' | 'high',
    }));

    return {
      logs: combined,
      stats: {
        sensitive: combined.filter((l) => l.severity === 'high').length,
        integrity: 'VERIFIED' as const,
        nationalVat: 42890.5,
        cashRatio: '14.2%',
      },
    };
  };

  const handleRefresh = async () => {
    setLoading(true);
    const data = await fetchLogsData();
    setLogs(data.logs);
    setStats((prev) => ({ ...prev, ...data.stats }));
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;
    fetchLogsData().then((data) => {
      if (!ignore) {
        setLogs(data.logs);
        setStats((prev) => ({ ...prev, ...data.stats }));
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text, fontFamily: Fonts.headline }]}>
            {auditMode === 'system' ? 'Security Audit Logs' : 'National Fiscal Ledger'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.sub }]}>
            {auditMode === 'system'
              ? 'Immutable event stream for administrative compliance'
              : 'Unified city-wide reconciliation of cash and digital flows'}
          </Text>
        </View>
        <View style={{ gap: 8, alignItems: 'flex-end' }}>
          <View style={[styles.statusTag, { backgroundColor: theme.green + '15' }]}>
            <View style={[styles.nodeDot, { backgroundColor: theme.green }]} />
            <Text style={{ color: theme.green, fontSize: 10, fontWeight: '800' }}>
              {loading ? 'SYNCING...' : 'LIVE FEED'}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              backgroundColor: theme.lift,
              borderRadius: 8,
              padding: 2,
            }}
          >
            <TouchableOpacity
              onPress={() => setAuditMode('system')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: auditMode === 'system' ? theme.rim : 'transparent',
              }}
            >
              <Text
                style={{
                  color: auditMode === 'system' ? theme.text : theme.sub,
                  fontSize: 10,
                  fontWeight: '800',
                }}
              >
                SYSTEM
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAuditMode('fiscal')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: auditMode === 'fiscal' ? theme.rim : 'transparent',
              }}
            >
              <Text
                style={{
                  color: auditMode === 'fiscal' ? theme.text : theme.sub,
                  fontSize: 10,
                  fontWeight: '800',
                }}
              >
                FISCAL
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.logTable, { backgroundColor: theme.surface, borderColor: theme.rim }]}>
        <View style={[styles.tableHeader, { borderBottomColor: theme.rim }]}>
          <Text style={[styles.th, { flex: 1.5, color: theme.sub }]}>
            {auditMode === 'system' ? 'EVENT / OPERATION' : 'MERCHANT / ENTITY'}
          </Text>
          <Text style={[styles.th, { flex: 1, color: theme.sub }]}>
            {auditMode === 'system' ? 'ACTOR' : 'TXN_REF'}
          </Text>
          <Text style={[styles.th, { flex: 1.5, color: theme.sub }]}>
            {auditMode === 'system' ? 'DETAILS' : 'FISCAL_SUMMARY'}
          </Text>
          <Text style={[styles.th, { width: 80, color: theme.sub, textAlign: 'right' }]}>TIME</Text>
        </View>

        {loading ? (
          <View style={{ padding: 40 }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          logs.map((log, index) => (
            <View
              key={log.id}
              style={[
                styles.logRow,
                {
                  borderBottomColor: theme.rim,
                  backgroundColor: index % 2 === 0 ? 'transparent' : theme.lift,
                },
              ]}
            >
              <View
                style={[
                  styles.cell,
                  { flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10 },
                ]}
              >
                <View
                  style={[
                    styles.severityDot,
                    {
                      backgroundColor:
                        log.severity === 'high'
                          ? theme.red
                          : log.severity === 'med'
                            ? theme.amber
                            : theme.primary,
                    },
                  ]}
                />
                <Text style={[styles.eventName, { color: theme.text, fontFamily: Fonts.label }]}>
                  {log.event}
                </Text>
              </View>
              <View style={[styles.cell, { flex: 1 }]}>
                <Text style={[styles.actorName, { color: theme.textSoft }]}>{log.user}</Text>
              </View>
              <View style={[styles.cell, { flex: 1.5 }]}>
                <Text style={[styles.detailsText, { color: theme.sub }]} numberOfLines={1}>
                  {log.details}
                </Text>
              </View>
              <View style={[styles.cell, { width: 80, alignItems: 'flex-end' }]}>
                <Text style={[styles.timeText, { color: theme.hint }]}>{log.time}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Security/Fiscal Summary Cards */}
      <View style={styles.summaryGrid}>
        <SummaryCard
          label={auditMode === 'system' ? 'Sensitive Events' : 'National VAT Yield'}
          value={auditMode === 'system' ? stats.sensitive.toString() : fmtETB(stats.nationalVat)}
          sub={auditMode === 'system' ? 'Escalated for review' : 'Projected Monthly Revenue'}
          icon={auditMode === 'system' ? 'shield-alert-outline' : 'bank-outline'}
          color={auditMode === 'system' ? theme.amber : theme.primary}
        />
        <SummaryCard
          label={auditMode === 'system' ? 'Node Integrity' : 'Cash-to-Digital Ratio'}
          value={auditMode === 'system' ? stats.integrity : stats.cashRatio}
          sub={auditMode === 'system' ? 'Shard clusters healthy' : 'Real-time market transition'}
          icon={auditMode === 'system' ? 'database-check-outline' : 'chart-donut'}
          color={theme.green}
        />
      </View>
    </ScrollView>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  sub: string;
  icon: string;
  color: string;
}

function SummaryCard({ label, value, sub, icon, color }: SummaryCardProps) {
  const theme = useTheme();
  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.rim }]}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      <View style={{ marginTop: 12 }}>
        <Text style={[styles.sumLabel, { color: theme.sub }]}>{label.toUpperCase()}</Text>
        <Text style={[styles.sumValue, { color: theme.text, fontFamily: Fonts.headline }]}>
          {value}
        </Text>
        <Text style={[styles.sumSub, { color: theme.hint }]}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 8,
  },
  nodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logTable: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 32,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  th: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  logRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  cell: {
    justifyContent: 'center',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventName: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  actorName: {
    fontSize: 13,
  },
  detailsText: {
    fontSize: 12,
  },
  timeText: {
    fontSize: 11,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  sumLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  sumValue: {
    fontSize: 20,
    marginTop: 2,
  },
  sumSub: {
    fontSize: 11,
    marginTop: 2,
  },
});

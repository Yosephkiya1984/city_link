import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Fonts, FontSize, Shadow } from '../../theme';
import { supaQuery } from '../../services/supabase';
import { fetchPendingWithdrawals, processWithdrawal } from '../../services/admin.service';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FinanceModule() {
  const theme = useTheme();
  const isMobile = SCREEN_WIDTH < 768;
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadFinanceData = async () => {
    setLoading(true);
    const [wRes, sRes] = await Promise.all([
      fetchPendingWithdrawals(),
      supaQuery<any>((c) => c.rpc('get_financial_stats')),
    ]);

    setWithdrawals(wRes.data || []);
    setStats(Array.isArray(sRes.data) ? sRes.data[0] : sRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    const confirm =
      Platform.OS === 'web'
        ? window.confirm(`Confirm ${status.toLowerCase()} for this withdrawal?`)
        : true;

    if (!confirm) return;

    setProcessingId(id);
    const res = await processWithdrawal(id, status, 'Processed via Admin Finance Hub');

    if (res.ok) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      loadFinanceData();
    } else {
      Alert.alert('Error', res.error || 'Failed to process withdrawal');
    }
    setProcessingId(null);
  };

  const renderWithdrawal = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.rim }]}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.primary + '15' }]}>
            <Text style={{ color: theme.primary, fontWeight: '800' }}>
              {item.profiles?.full_name?.[0]}
            </Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.userName, { color: theme.text, fontFamily: Fonts.label }]}>
              {item.profiles?.full_name}
            </Text>
            <Text style={[styles.userPhone, { color: theme.sub }]}>{item.profiles?.phone}</Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: theme.amber + '12' }]}>
          <Text style={{ color: theme.amber, fontSize: 9, fontWeight: '800' }}>PENDING</Text>
        </View>
      </View>

      <View style={[styles.bankBox, { backgroundColor: theme.lift }]}>
        <View style={styles.bankRow}>
          <Ionicons name="business-outline" size={14} color={theme.sub} />
          <Text style={[styles.bankText, { color: theme.textSoft }]}>{item.bank_name}</Text>
        </View>
        <View style={styles.bankRow}>
          <Ionicons name="card-outline" size={14} color={theme.sub} />
          <Text style={[styles.bankText, { color: theme.textSoft, fontFamily: Fonts.mono }]}>
            {item.account_number}
          </Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={[styles.amountLabel, { color: theme.sub }]}>REQUESTED AMOUNT</Text>
        <Text style={[styles.amountValue, { color: theme.primary, fontFamily: Fonts.headline }]}>
          {item.amount} ETB
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => handleAction(item.id, 'REJECTED')}
          disabled={!!processingId}
          style={[styles.actionBtn, { borderColor: theme.red }]}
        >
          <Text style={{ color: theme.red, fontFamily: Fonts.label, fontSize: 12 }}>REJECT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleAction(item.id, 'APPROVED')}
          disabled={!!processingId}
          style={[styles.actionBtn, { backgroundColor: theme.primary, borderWidth: 0 }]}
        >
          {processingId === item.id ? (
            <ActivityIndicator size="small" color={theme.ink} />
          ) : (
            <Text style={{ color: theme.ink, fontFamily: Fonts.label, fontSize: 12 }}>
              APPROVE & PAY
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text, fontFamily: Fonts.headline }]}>
          Finance Hub
        </Text>
        <Text style={[styles.subtitle, { color: theme.sub }]}>
          Authorize payouts and monitor city liquidity
        </Text>
      </View>

      {/* Stats Dashboard */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Treasury Balance"
          value={`${stats?.treasury_balance?.toLocaleString() || 0} ETB`}
          icon="wallet-outline"
          color={theme.green}
        />
        <StatCard
          label="Escrow Liability"
          value={`${stats?.escrow_liability?.toLocaleString() || 0} ETB`}
          icon="lock-closed-outline"
          color={theme.amber}
        />
        <StatCard
          label="Frozen Funds"
          value={`${stats?.frozen_total?.toLocaleString() || 0} ETB`}
          icon="snow-outline"
          color={theme.primary}
        />
        <StatCard
          label="Pending Payouts"
          value={`${stats?.pending_payouts?.toLocaleString() || 0} ETB`}
          icon="send-outline"
          color={theme.red}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.sub, fontFamily: Fonts.label }]}>
            PAYOUT QUEUE
          </Text>
          <TouchableOpacity onPress={loadFinanceData}>
            <Ionicons name="refresh" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={withdrawals}
            renderItem={renderWithdrawal}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color={theme.rim} />
                <Text style={{ color: theme.sub, marginTop: 12 }}>All payouts are up to date</Text>
              </View>
            )}
          />
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color }: any) {
  const theme = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.rim }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statLabel, { color: theme.sub }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color: theme.text, fontFamily: Fonts.label }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 32 },
  title: { fontSize: 24 },
  subtitle: { fontSize: 14, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 },
  statCard: {
    width: (SCREEN_WIDTH - 88) / (SCREEN_WIDTH > 1000 ? 4 : 2),
    padding: 20,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statLabel: { fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 18 },
  section: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 11, letterSpacing: 1.5 },
  card: { padding: 20, borderRadius: Radius.xl, borderWidth: 1, marginBottom: 16 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { fontSize: 15 },
  userPhone: { fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  bankBox: { padding: 16, borderRadius: Radius.lg, gap: 8, marginBottom: 16 },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bankText: { fontSize: 13 },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: { fontSize: 11, letterSpacing: 1 },
  amountValue: { fontSize: 20 },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', padding: 60 },
});

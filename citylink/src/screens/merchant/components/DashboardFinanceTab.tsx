import React, { useMemo, memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { FlashList } from '@shopify/flash-list';
import { Typography, GlassCard, GlassView, SectionTitle } from '../../../components';
import { fmtETB } from '../../../utils';
import { useTheme } from '../../../hooks/useTheme';
import { useWalletStore } from '../../../store/WalletStore';
import { WalletTransaction } from '../../../types/domain_types';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';
import { useRenderCount } from '../../../utils/debug/performanceMonitor';

export interface DashboardFinanceTabProps {
  walletTransactions: WalletTransaction[];
  wallet?: any;
  totalSales?: number;
  handleViewReceipt?: (refId: string) => void;
  handleWithdraw: () => void;
  withdrawing: boolean;
  t: (key: string) => string;
  styles?: any;
}

export const DashboardFinanceTab = memo(function DashboardFinanceTab({
  walletTransactions = [],
  totalSales = 0,
  handleViewReceipt,
  handleWithdraw,
  withdrawing,
  t,
}: DashboardFinanceTabProps) {
  useRenderCount('DashboardFinanceTab');
  const { balance, frozenBalance } = useWalletStore();
  const C = useTheme();

  return (
    <View style={{ padding: Spacing.lg }}>
      <GlassCard accentColor={C.green} glow style={{ marginBottom: 24 }}>
        <View style={{ padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontWeight: '800' }}>TOTAL BALANCE</Typography>
              <Typography variant="h1" style={{ fontSize: 36, marginTop: 4 }}>{fmtETB(balance)}</Typography>
            </View>
            <View style={[localStyles.walletIcon, { backgroundColor: C.green + '20' }]}>
              <Ionicons name="wallet-outline" size={32} color={C.green} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 24, gap: 16 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16 }}>
              <Typography variant="hint" color="sub">In Escrow</Typography>
              <Typography variant="h3">{fmtETB(frozenBalance)}</Typography>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16 }}>
              <Typography variant="hint" color="sub">Total Revenue</Typography>
              <Typography variant="h3" color="primary">{fmtETB(totalSales)}</Typography>
            </View>
          </View>

          <TouchableOpacity 
            style={[localStyles.withdrawBtn, { backgroundColor: C.primary }]}
            onPress={handleWithdraw}
            disabled={withdrawing || balance <= 0}
          >
            <Typography variant="label" style={{ color: D.ink, fontWeight: '800' }}>
              {withdrawing ? 'PROCESSING...' : 'WITHDRAW EARNINGS'}
            </Typography>
          </TouchableOpacity>
        </View>
      </GlassCard>

      <SectionTitle title="Payment History" rightLabel="View All" />
      
      <View style={{ height: 400 }}>
        <FlashList
          data={walletTransactions}
          estimatedItemSize={80}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={localStyles.txRow}
              onPress={() => handleViewReceipt?.(item.reference_id || '')}
            >
              <View style={[localStyles.txIcon, { backgroundColor: item.type?.toUpperCase() === 'CREDIT' ? C.green + '15' : C.red + '15' }]}>
                <Ionicons 
                  name={item.type?.toUpperCase() === 'CREDIT' ? 'arrow-down-outline' : 'arrow-up-outline'} 
                  size={18} 
                  color={item.type?.toUpperCase() === 'CREDIT' ? C.green : C.red} 
                />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Typography variant="title" style={{ fontSize: 15 }}>{item.description || 'Transaction'}</Typography>
                <Typography variant="hint" color="sub">{new Date(item.created_at).toLocaleDateString()}</Typography>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Typography variant="h3" style={{ color: item.type?.toUpperCase() === 'CREDIT' ? C.green : C.red }}>
                  {item.type?.toUpperCase() === 'CREDIT' ? '+' : '-'}{fmtETB(item.amount)}
                </Typography>
                <Typography variant="hint" style={{ color: item.status === 'COMPLETED' ? C.green : C.amber, fontSize: 10 }}>
                  {item.status}
                </Typography>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="receipt-outline" size={48} color={C.edge} />
              <Typography variant="body" color="sub" style={{ marginTop: 12 }}>No transactions yet</Typography>
            </View>
          }
        />
      </View>
    </View>
  );
});

const localStyles = StyleSheet.create({
  walletIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  withdrawBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

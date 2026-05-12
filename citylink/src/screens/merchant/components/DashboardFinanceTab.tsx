import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { FlashList } from '@shopify/flash-list';
import { Typography, GlassCard, GlassView, SectionTitle } from '../../../components';
import { fmtETB } from '../../../utils';
import { useTheme } from '../../../hooks/useTheme';
import { useWalletStore } from '../../../store/WalletStore';
import { Transaction } from '../../../types/domain_types';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';

const TransactionItem = React.memo(({ tx, index, C, handleViewReceipt }: any) => {
  const isCredit = tx.type === 'credit';
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: Math.min(index * 30, 300) }}
    >
      <TouchableOpacity onPress={() => tx.reference_id && handleViewReceipt?.(tx.reference_id)}>
        <GlassView variant="outline" style={localStyles.txCard}>
          <View style={[localStyles.statIconBox, { backgroundColor: (isCredit ? C.green : C.red) + '15' }]}>
            <Ionicons 
              name={isCredit ? 'arrow-down' : 'arrow-up'} 
              size={18} 
              color={isCredit ? C.green : C.red} 
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Typography variant="title">{tx.description || 'Transaction'}</Typography>
              {tx.status === 'pending' && (
                <View style={[localStyles.statusBadge, { backgroundColor: C.yellow + '20' }]}>
                  <Typography variant="hint" style={{ color: C.yellow, fontSize: 8, fontWeight: '700' }}>PENDING</Typography>
                </View>
              )}
            </View>
            <Typography variant="hint" color="sub">{new Date(tx.created_at).toLocaleDateString()}</Typography>
          </View>
          <Typography variant="h3" style={{ color: isCredit ? C.green : C.white }}>
            {isCredit ? '+' : '-'}{fmtETB(tx.amount)}
          </Typography>
        </GlassView>
      </TouchableOpacity>
    </MotiView>
  );
});

export function DashboardFinanceTab({
  walletTransactions = [],
  wallet: walletProp,
  totalSales: totalSalesProp,
  handleViewReceipt,
  handleWithdraw,
  withdrawing,
}: any) {
  const C = useTheme();
  const walletStore = useWalletStore();
  
  const wallet = walletProp || walletStore;
  const totalSales = totalSalesProp || 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 16, marginBottom: 24, paddingHorizontal: 16 }}>
        <GlassCard accentColor={C.green} glow>
          <View style={{ padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Typography variant="hint" color="sub" style={{ letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700' }}>
                  AVAILABLE BALANCE
                </Typography>
                <Typography variant="h1" style={{ marginTop: 8, fontSize: 36 }}>{fmtETB(wallet?.balance || 0)}</Typography>
              </View>
              <View style={[localStyles.iconCircle, { backgroundColor: C.green + '15' }]}>
                <Ionicons name="wallet" size={24} color={C.green} />
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity 
                style={[localStyles.payoutBtn, { backgroundColor: C.green, opacity: withdrawing ? 0.6 : 1 }]}
                onPress={handleWithdraw}
                disabled={withdrawing}
              >
                <Typography variant="title" style={{ color: '#00210F', fontSize: 14 }}>
                  {withdrawing ? 'Processing...' : 'Withdraw Funds'}
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <GlassCard style={{ flex: 1 }}>
            <View style={{ padding: 16 }}>
              <Typography variant="hint" color="sub" style={{ fontSize: 10, letterSpacing: 1 }}>ESCROW (PENDING)</Typography>
              <Typography variant="h3" style={{ marginTop: 4 }}>{fmtETB(wallet?.frozenBalance || wallet?.frozen_balance || 0)}</Typography>
            </View>
          </GlassCard>
          <GlassCard style={{ flex: 1 }}>
            <View style={{ padding: 16 }}>
              <Typography variant="hint" color="sub" style={{ fontSize: 10, letterSpacing: 1 }}>PERIOD REVENUE</Typography>
              <Typography variant="h3" style={{ marginTop: 4, color: C.primary }}>{fmtETB(totalSales || 0)}</Typography>
            </View>
          </GlassCard>
        </View>
      </View>

      <SectionTitle title="Ledger History" style={{ marginHorizontal: 16 }} />

      <FlashList
        data={walletTransactions}
        renderItem={({ item, index }) => (
          <TransactionItem 
            tx={item} 
            index={index} 
            C={C} 
            handleViewReceipt={handleViewReceipt} 
          />
        )}
        keyExtractor={(item) => item.id}
        estimatedItemSize={76}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
        ListEmptyComponent={
          <View style={localStyles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={C.border} />
            <Typography variant="title" color="sub">No transactions yet.</Typography>
          </View>
        }
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  payoutBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  payoutChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  txCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12 },
  statIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
});

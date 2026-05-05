import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { D, Radius, Fonts, Shadow } from './StitchTheme';
import { fmtETB } from '../../../utils';
import { Typography, Surface, SectionTitle } from '../../../components';
import { useWalletStore } from '../../../store/WalletStore';
import { Transaction } from '../../../types/domain_types';

export function DashboardFinanceTab({
  walletTransactions,
  withdrawing,
  handleWithdraw,
  handleViewReceipt,
  commissionTotal = 0,
}: any) {
  const balance = useWalletStore((s) => s.balance);
  const frozenBalance = useWalletStore((s) => s.frozenBalance);

  return (
    <View style={{ flex: 1 }}>
      <Surface variant="lift" style={localStyles.walletCard}>
        <View style={localStyles.walletHeader}>
          <Typography variant="hint" style={{ color: D.ink, opacity: 0.8 }}>TOTAL SETTLEMENT</Typography>
          <Ionicons name="card-outline" size={24} color={D.ink} />
        </View>
        <Typography variant="h1" style={{ color: D.ink, fontSize: 36, marginVertical: 8 }}>{fmtETB(balance)}</Typography>
        <View style={{ flex: 1 }} />
        <View style={localStyles.walletFooter}>
          <View>
            <Typography variant="hint" style={{ color: D.ink, opacity: 0.6 }}>PENDING CLEARANCE</Typography>
            <Typography variant="title" style={{ color: D.ink }}>{fmtETB(frozenBalance)}</Typography>
          </View>
          <TouchableOpacity 
            style={localStyles.withdrawBtn} 
            onPress={handleWithdraw}
            disabled={withdrawing}
          >
            {withdrawing ? (
              <ActivityIndicator color={D.primary} size="small" />
            ) : (
              <Typography variant="h3" color="primary">WITHDRAW</Typography>
            )}
          </TouchableOpacity>
        </View>
      </Surface>

      <View style={localStyles.statsRow}>
        <Surface variant="lift" style={localStyles.statItem}>
          <Typography variant="hint" color="sub">GROSS REVENUE</Typography>
          <Typography variant="h3" color="primary">+{fmtETB(balance + commissionTotal)}</Typography>
        </Surface>
        <Surface variant="lift" style={localStyles.statItem}>
          <Typography variant="hint" color="sub">BROKER COMMISSIONS</Typography>
          <Typography variant="h3" color="red">-{fmtETB(commissionTotal)}</Typography>
        </Surface>
      </View>

      <SectionTitle title="Ledger History" />

      <View style={{ paddingBottom: 100 }}>
        {walletTransactions.length === 0 ? (
          <View style={localStyles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={D.lift} />
            <Typography variant="title" color="sub">No transactions yet.</Typography>
          </View>
        ) : (
          walletTransactions.map((tx: Transaction, i: number) => (
            <MotiView
              key={tx.id}
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 50 }}
            >
              <TouchableOpacity 
                activeOpacity={tx.reference_id ? 0.7 : 1}
                onPress={() => tx.reference_id && handleViewReceipt?.(tx.reference_id)}
              >
                <Surface variant="lift" style={localStyles.txCard}>
                  <View style={[localStyles.txIcon, { backgroundColor: tx.type === 'debit' ? D.red + '15' : D.primary + '15' }]}>
                    <Ionicons 
                      name={tx.type === 'debit' ? 'arrow-up-outline' : 'arrow-down-outline'} 
                      size={20} 
                      color={tx.type === 'debit' ? D.red : D.primary} 
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Typography variant="title" numberOfLines={1}>{tx.description}</Typography>
                    <Typography variant="hint" color="sub">{new Date(tx.created_at).toLocaleDateString()} • {tx.category}</Typography>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Typography variant="h3" color={tx.type === 'credit' ? "primary" : "white"}>
                      {tx.type === 'debit' ? '-' : '+'}{fmtETB(tx.amount)}
                    </Typography>
                    {tx.reference_id && (
                      <Ionicons name="receipt-outline" size={14} color={D.primary} style={{ marginTop: 4 }} />
                    )}
                  </View>
                </Surface>
              </TouchableOpacity>
            </MotiView>
          ))
        )}
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  walletCard: { backgroundColor: D.primary, padding: 24, borderRadius: Radius.xl, ...Shadow.primary },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)', paddingTop: 16 },
  withdrawBtn: { backgroundColor: D.ink, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.md },
  statsRow: { flexDirection: 'row', gap: 12, marginVertical: 20 },
  statItem: { flex: 1, padding: 16, borderRadius: Radius.lg },
  txCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: Radius.lg, marginBottom: 10 },
  txIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyState: { padding: 60, alignItems: 'center' },
});

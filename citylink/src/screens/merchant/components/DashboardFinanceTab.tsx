import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWalletStore } from '../../../store/WalletStore';
import { DarkColors as T } from '../../../theme';

import { Transaction } from '../../../types/domain_types';

export interface FinanceTabProps {
  walletTransactions: Transaction[];
  withdrawing: boolean;
  handleWithdraw: () => void;
  styles: any;
}

export function DashboardFinanceTab({
  walletTransactions,
  withdrawing,
  handleWithdraw,
  styles,
}: FinanceTabProps) {
  const balance = useWalletStore((s) => s.balance);

  return (
    <View style={styles.tabContent}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.pageTitle}>Finance</Text>
          <Text style={styles.pageSubtitle}>Available balance</Text>
        </View>
      </View>

      <View style={styles.financeHeroMobile}>
        <Text style={styles.fhLabel}>TOTAL EARNINGS</Text>
        <Text style={styles.fhAmountMobile}>{(balance || 0).toLocaleString()} ETB</Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <View style={styles.fhTrend}>
            <Ionicons name="trending-up" size={14} color={T.primaryD} />
            <Text style={styles.fhTrendTxt}>+Syncing...</Text>
          </View>
          <TouchableOpacity
            style={[styles.fhWithdrawBtn, withdrawing && { opacity: 0.7 }]}
            onPress={handleWithdraw}
            disabled={withdrawing}
          >
            <Text style={styles.fhWithdrawTxt}>{withdrawing ? '...' : 'Withdraw'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.cardTitle, { marginTop: 24, marginBottom: 16 }]}>Ledger History</Text>

      <View style={styles.txListMobile}>
        {walletTransactions.map((tx: Transaction) => (
          <View key={tx.id} style={styles.txItemMobile}>
            <View style={styles.txIconBoxMobile}>
              <Ionicons
                name={tx.type === 'debit' ? 'arrow-down-outline' : 'arrow-up-outline'}
                size={16}
                color={tx.type === 'debit' ? T.tertiary : T.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tableName}>{tx.description}</Text>
              <Text style={styles.txDateTxt}>
                {new Date(tx.created_at).toLocaleDateString()} • {tx.category}
              </Text>
            </View>
            <Text style={[styles.tablePrice, { color: tx.type === 'credit' ? T.primary : T.onSurface }]}>
              {tx.type === 'debit' ? '-' : '+'}{Number(tx.amount).toLocaleString()} ETB
            </Text>
          </View>
        ))}
        {walletTransactions.length === 0 && (
          <Text style={{ color: T.onVariant, textAlign: 'center', padding: 20 }}>
            No transaction history
          </Text>
        )}
      </View>
    </View>
  );
}

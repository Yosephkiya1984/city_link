import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWalletStore } from '../../../store/WalletStore';
import { DarkColors as T, Fonts } from '../../../theme';
import { fmtETB } from '../../../utils';

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
        <Text style={[styles.fhLabel, { fontFamily: Fonts.bold }]}>TOTAL EARNINGS</Text>
        <Text style={[styles.fhAmountMobile, { fontFamily: Fonts.black }]}>{fmtETB(balance)}</Text>
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
            <Text style={[styles.fhTrendTxt, { fontFamily: Fonts.bold }]}>+Syncing...</Text>
          </View>
          <TouchableOpacity
            style={[styles.fhWithdrawBtn, withdrawing && { opacity: 0.7 }]}
            onPress={handleWithdraw}
            disabled={withdrawing}
          >
            <Text style={[styles.fhWithdrawTxt, { fontFamily: Fonts.black }]}>{withdrawing ? '...' : 'Withdraw'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.cardTitle, { marginTop: 24, marginBottom: 16, fontFamily: Fonts.black }]}>Ledger History</Text>

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
              <Text style={[styles.tableName, { fontFamily: Fonts.bold }]}>{tx.description}</Text>
              <Text style={[styles.txDateTxt, { fontFamily: Fonts.regular }]}>
                {new Date(tx.created_at).toLocaleDateString()} • {tx.category}
              </Text>
            </View>
            <Text
              style={[styles.tablePrice, { fontFamily: Fonts.black, color: tx.type === 'credit' ? T.primary : T.onSurface }]}
            >
              {tx.type === 'debit' ? '-' : '+'}
              {fmtETB(tx.amount)}
            </Text>
          </View>
        ))}
        {walletTransactions.length === 0 && (
          <Text style={{ color: T.onVariant, textAlign: 'center', padding: 20, fontFamily: Fonts.regular }}>
            No transaction history
          </Text>
        )}
      </View>
    </View>
  );
}

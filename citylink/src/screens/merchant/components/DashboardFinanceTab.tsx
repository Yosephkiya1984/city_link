import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWalletStore } from '../../../store/WalletStore';
import { D, Radius, Fonts } from './StitchTheme';
import { fmtETB } from '../../../utils';
import { t } from '../../../utils/i18n';

import { Transaction } from '../../../types/domain_types';

export interface FinanceTabProps {
  walletTransactions: Transaction[];
  withdrawing: boolean;
  handleWithdraw: () => void;
  styles: any;
  t: any;
}

export function DashboardFinanceTab({
  walletTransactions,
  withdrawing,
  handleWithdraw,
  styles,
  t,
}: FinanceTabProps) {
  const balance = useWalletStore((s) => s.balance);
  const frozenBalance = useWalletStore((s) => s.frozenBalance);

  return (
    <View style={styles.tabContent}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.pageTitle}>{t('finance_tab')}</Text>
          <Text style={styles.pageSubtitle}>{t('available_balance_label')}</Text>
        </View>
      </View>

      <View style={styles.financeHeroMobile}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View>
            <Text style={[styles.fhLabel, { fontFamily: Fonts.bold }]}>
              {t('available').toUpperCase()}
            </Text>
            <Text style={[styles.fhAmountMobile, { fontFamily: Fonts.black }]}>
              {fmtETB(balance)}
            </Text>
          </View>
          {frozenBalance > 0 && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.fhLabel, { fontFamily: Fonts.bold, color: D.sub }]}>
                {t('pending').toUpperCase()}
              </Text>
              <Text style={{ fontSize: 18, color: D.sub, fontFamily: Fonts.bold }}>
                {fmtETB(frozenBalance)}
              </Text>
            </View>
          )}
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <View style={styles.fhTrend}>
            <Ionicons name="trending-up" size={14} color={D.primary} />
            <Text style={[styles.fhTrendTxt, { fontFamily: Fonts.bold }]}>+{t('syncing')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.fhWithdrawBtn, withdrawing && { opacity: 0.7 }]}
            onPress={handleWithdraw}
            disabled={withdrawing}
          >
            <Text style={[styles.fhWithdrawTxt, { fontFamily: Fonts.black }]}>
              {withdrawing ? '...' : t('withdraw')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text
        style={[styles.cardTitle, { marginTop: 24, marginBottom: 16, fontFamily: Fonts.black }]}
      >
        {t('ledger_history')}
      </Text>

      <View style={styles.txListMobile}>
        {walletTransactions.map((tx: Transaction) => (
          <View key={tx.id} style={styles.txItemMobile}>
            <View style={styles.txIconBoxMobile}>
              <Ionicons
                name={tx.type === 'debit' ? 'arrow-down-outline' : 'arrow-up-outline'}
                size={16}
                color={tx.type === 'debit' ? D.red : D.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tableName, { fontFamily: Fonts.bold }]}>{tx.description}</Text>
              <Text style={[styles.txDateTxt, { fontFamily: Fonts.regular }]}>
                {new Date(tx.created_at).toLocaleDateString()} • {tx.category}
              </Text>
            </View>
            <Text
              style={[
                styles.tablePrice,
                { fontFamily: Fonts.black, color: tx.type === 'credit' ? D.primary : D.text },
              ]}
            >
              {tx.type === 'debit' ? '-' : '+'}
              {fmtETB(tx.amount)}
            </Text>
          </View>
        ))}
        {walletTransactions.length === 0 && (
          <Text
            style={{
              color: D.sub,
              textAlign: 'center',
              padding: 20,
              fontFamily: Fonts.regular,
            }}
          >
            {t('no_transaction_history')}
          </Text>
        )}
      </View>
    </View>
  );
}

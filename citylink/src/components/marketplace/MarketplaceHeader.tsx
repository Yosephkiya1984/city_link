import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { T } from './constants';
import { fmtETB } from '../../utils';

interface HeaderProps {
  balance: number;
  name?: string;
}

const MarketplaceHeader = memo(({ balance, name }: HeaderProps) => {
  const navigation = useNavigation();
  const firstName = name?.split(' ')[0] || 'Shopper';

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerGreeting}>Hello, {firstName} 👋</Text>
        <Text style={styles.headerTitle}>
          CityLink <Text style={{ color: T.primary }}>Market</Text>
        </Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => (navigation as any).navigate('MyOrders')}
          accessibilityLabel="View my orders"
          accessibilityRole="button"
        >
          <Ionicons name="receipt-outline" size={20} color={T.textSub} />
        </TouchableOpacity>
        <View style={styles.balancePill} accessibilityLabel={`Your balance is ${balance} ETB`}>
          <Ionicons name="wallet-outline" size={13} color={T.primary} />
          <Text style={styles.balanceText}>{fmtETB(balance, 0)} ETB</Text>
        </View>
      </View>
    </View>
  );
});

export default MarketplaceHeader;

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: T.glass,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 28) + 12,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerGreeting: {
    fontSize: 11,
    color: T.textSub,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.primaryDim,
    borderWidth: 1,
    borderColor: T.primary + '40',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  balanceText: { fontSize: 13, fontWeight: '700', color: T.primary },
});

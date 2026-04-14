import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation';
import * as Haptics from 'expo-haptics';

// â”€â”€ Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import {
  FeaturedCard,
  CreditScoreRing,
  TransactionItem,
  useTheme,
  TopBar,
  OfflineBanner,
  WalletHero,
  ServiceTile,
} from '../../components';

// â”€â”€ State & Theme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { useAppStore } from '../../store/AppStore';
import { Fonts, Spacing, Radius } from '../../theme';
import { greeting, t } from '../../utils';

// â”€â”€ Domain Services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import * as WalletService from '../../services/wallet.service';

/**
 * Service Configuration â€” local to Home for easier modification.
 */
const SERVICES = [
  { id: 'Marketplace', icon: 'storefront', label: 'Marketplace', color: '#59de9b' },
  { id: 'Food', icon: 'restaurant', label: 'Food Delivery', color: '#f4b700' },
  { id: 'Ekub', icon: 'people', label: 'Ekub Savings', color: '#8b5cf6' },
  { id: 'Delala', icon: 'home', label: 'Delala/Broker', color: '#f4b700' },
  { id: 'Parking', icon: 'car', label: 'Smart Parking', color: '#ffd887' },
  { id: 'AI', icon: 'sparkles', label: 'AI Assistant', color: '#8b5cf6' },
  { id: 'SendMoney', icon: 'send', label: 'Send ETB', color: '#59de9b' },
  { id: 'FaydaKYC', icon: 'finger-print', label: 'Fayda ID', color: '#06b6d4' },
];

/**
 * CulturalTexture â€” aesthetic overlay.
 */
const CulturalTexture = () => (
  <View style={styles.textureOverlay} pointerEvents="none">
    <View style={styles.texturePattern} />
  </View>
);

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const C = useTheme();

  // â”€â”€ Global State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const currentUser = useAppStore((s) => s.currentUser);
  const balance = useAppStore((s) => s.balance);
  const setBalance = useAppStore((s) => s.setBalance);
  const transactions = useAppStore((s) => s.transactions);
  const setTransactions = useAppStore((s) => s.setTransactions);
  const showToast = useAppStore((s) => s.showToast);

  // â”€â”€ UI State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // â”€â”€ Data Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const walletData = await WalletService.fetchWalletData(currentUser?.id);
        if (walletData) {
          setBalance(walletData.balance);
          setTransactions(walletData.transactions || []);
        }
      } catch (error) {
        console.error('Home sync error:', error);
        showToast('Could not sync latest data', 'error');
      } finally {
        setRefreshing(false);
        setLoading(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      }
    },
    [currentUser?.id]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleServicePress = (serviceId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate(serviceId as any);
  };

  const handleQuickAction = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (id === 'history') (navigation as any).navigate('Wallet');
    else if (id === 'orders') (navigation as any).navigate('MyOrders');
    else (navigation as any).navigate('Wallet', { action: id });
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: C.ink, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.ink }]}>
      <StatusBar barStyle="light-content" />
      <TopBar title="CityLink" showProfile />
      <OfflineBanner />

      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor={C.primary}
          />
        }
      >
        <WalletHero
          balance={balance}
          name={currentUser?.full_name?.split(' ')[0] || 'Member'}
          greetingKey={greeting()}
          onQuickAction={handleQuickAction}
          animValue={fadeAnim}
        />

        <View style={styles.statsRow}>
          <CreditScoreRing animValue={fadeAnim} />
          <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: Radius.xl, padding: 16, justifyContent: 'center' }}>
            <Text style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.bold }}>CITY STATUS</Text>
            <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.medium, marginTop: 4 }}>System Online</Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionLabel, { color: C.sub }]}>CITIZEN HUB</Text>
          <View style={styles.servicesGrid}>
            {SERVICES.map((s, i) => (
              <ServiceTile
                key={s.id}
                service={s}
                index={i}
                onPress={() => handleServicePress(s.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <FeaturedCard
            title="CityLink Food"
            description="Organic produce delivered in under 30 mins."
            imageSource="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600"
            icon="restaurant"
            onPress={() => (navigation as any).navigate('Food')}
          />
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.sectionLabel, { color: C.sub }]}>RECENT ACTIVITY</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Wallet')}>
              <Text style={{ color: C.primary, fontSize: 12, fontFamily: Fonts.bold }}>
                VIEW ALL
              </Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Text style={{ color: C.hint, fontFamily: Fonts.medium }}>No recent activity</Text>
            </View>
          ) : (
            transactions
              .slice(0, 3)
              .map((tx, i) => <TransactionItem key={tx.id || i} tx={tx} index={i} />)
          )}
        </View>

        <CulturalTexture />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  sectionContainer: { paddingHorizontal: 16, marginBottom: 24 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Fonts.black,
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyActivity: { padding: 30, alignItems: 'center' },
  textureOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
  },
  texturePattern: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
});

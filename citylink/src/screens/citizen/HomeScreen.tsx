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
import { Ionicons } from '@expo/vector-icons';
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
import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { Fonts, Spacing, Radius } from '../../theme';
import { greeting, t } from '../../utils';

// â”€â”€ Domain Services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import * as WalletService from '../../services/wallet.service';

/**
 * Service Configuration â€” local to Home for easier modification.
 */
const SERVICES = [
  { id: 'Marketplace', icon: 'storefront', label: 'Marketplace', color: '#00A86B' }, // Modern Green
  { id: 'Food', icon: 'restaurant', label: 'Food', color: '#F5B800' }, // Ethiopian Gold
  { id: 'Ekub', icon: 'people', label: 'Ekub', color: '#00A86B' },
  { id: 'Delala', icon: 'home', label: 'Delala', color: '#F5B800' },
  { id: 'Parking', icon: 'car', label: 'Parking', color: '#FFD887' },
  { id: 'AI', icon: 'sparkles', label: 'Assistant', color: '#8b5cf6' },
  { id: 'SendMoney', icon: 'send', label: 'Send ETB', color: '#00A86B' },
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
  const currentUser = useAuthStore((s) => s.currentUser);
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const transactions = useWalletStore((s) => s.transactions);
  const setTransactions = useWalletStore((s) => s.setTransactions);
  const showToast = useSystemStore((s) => s.showToast);

  // â”€â”€ UI State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // â”€â”€ Data Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!currentUser?.id) return;
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor={C.primary}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: C.text }]}>{greeting()}</Text>
            <Text style={[styles.subGreeting, { color: C.sub }]}>
              {currentUser?.full_name || t('welcome_sub')}
            </Text>
          </View>
          <TouchableOpacity 
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.edge2 }}
            onPress={() => (navigation as any).navigate('Profile')}
          >
            <Ionicons name="person-outline" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <WalletHero balance={balance} onAction={(type: string) => (navigation as any).navigate(type)} />

        {/* Services Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Explore Services</Text>
        </View>
        <View style={styles.servicesGrid}>
          {SERVICES.map((item) => (
            <ServiceTile
              key={item.id}
              service={item}
              onPress={() => (navigation as any).navigate(item.id)}
            />
          ))}
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
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Recent Activity</Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Text style={{ color: C.hint, fontFamily: Fonts.label }}>No recent activity</Text>
            </View>
          ) : (
            transactions
              .slice(0, 3)
              .map((tx: any, i: number) => <TransactionItem key={tx.id || i} tx={tx} index={i} />)
          )}
        </View>

        <CulturalTexture />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  greeting: {
    fontSize: 28,
    fontFamily: Fonts.headline,
    letterSpacing: -0.8,
  },
  subGreeting: {
    fontSize: 14,
    fontFamily: Fonts.label,
    marginTop: 2,
    opacity: 0.6,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Fonts.headline,
    letterSpacing: -0.5,
  },
  sectionContainer: { marginBottom: 24 },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 32,
    opacity: 0.5,
  },
  textureOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
  },
  texturePattern: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
});

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

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
import { Fonts, Spacing, Radius, DarkColors as T } from '../../theme';
import { greeting, t } from '../../utils';

// â”€â”€ Domain Services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import * as WalletService from '../../services/wallet.service';

/**
 * Service Configuration â€” local to Home for easier modification.
 */
const SERVICES = [
  { id: 'Marketplace', icon: 'storefront', label: 'Marketplace', color: '#00A86B' },
  { id: 'Food', icon: 'restaurant', label: 'Addis Gourmet', color: '#F5B800' },
  { id: 'Ekub', icon: 'people', label: 'Ekub Pool', color: '#3B82F6' },
  { id: 'Parking', icon: 'car', label: 'Smart Park', color: '#06b6d4' },
  { id: 'Delala', icon: 'home', label: 'Property', color: '#8b5cf6' },
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
  const navigation = useNavigation<any>();
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

  // â”€â”€ Data Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!currentUser?.id) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        // Sync Profile (Name, KYC, etc.)
        const { fetchProfile } = await import('../../services/auth.service');
        const profileRes = await fetchProfile(currentUser.id);
        if (profileRes.data) {
          await useAuthStore.getState().setCurrentUser(profileRes.data);
        }

        // Sync Wallet Balance
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

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: C.ink }]}
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
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.rim,
            }}
            onPress={() => (navigation as any).navigate('Profile')}
          >
            <Ionicons name="person-outline" size={22} color={C.primary} />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <WalletHero
          balance={balance}
          name={currentUser?.full_name?.split(' ')[0] || 'User'}
          greetingKey={greeting()}
          onQuickAction={handleQuickAction}
        />

        {/* Financial Identity Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Financial Identity</Text>
          </View>
          <CreditScoreRing score={742} />
        </View>

        {/* Services Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Public Services</Text>
          <TouchableOpacity>
             <Text style={{ color: C.primary, fontFamily: Fonts.bold, fontSize: 12 }}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.servicesGrid}>
          {SERVICES.map((item, index) => (
            <MotiView
              key={item.id}
              from={{ opacity: 0, scale: 0.9, translateY: 10 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{
                type: 'timing',
                duration: 400,
                delay: index * 60,
              }}
              style={{ width: '48%' }}
            >
              <TouchableOpacity
                onPress={() => handleServicePress(item.id)}
                style={{
                  width: '100%',
                  height: 80,
                  backgroundColor: C.surface,
                  borderRadius: Radius.card,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: C.edge,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: item.color + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View>
                  <Text style={{ color: C.text, fontSize: 13, fontFamily: Fonts.bold }}>{item.label}</Text>
                  <Text style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.medium }}>Available</Text>
                </View>
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>

        {/* Featured Food Section */}

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
      </ScrollView>
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
  transitCard: {
    padding: 20,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
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

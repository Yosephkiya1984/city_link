import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, RefreshControl, ActivityIndicator, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

// ── Components ─────────────────────────────────────────────────────────────
import {
  FeaturedCard,
  CreditScoreRing,
  TransactionItem,
  useTheme,
  TopBar,
  OfflineBanner,
  WalletHero,
  Screen,
  Typography,
  Surface,
  SectionTitle,
  Spacer,
} from '../../components';

// ── State & Theme ────────────────────────────────────────────────────────────
import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { Fonts, Spacing, Radius } from '../../theme';
import { greeting, useT } from '../../utils/i18n';

// ── Domain Services ──────────────────────────────────────────────────────────
import * as WalletService from '../../services/wallet.service';

const CulturalTexture = () => (
  <View style={styles.textureOverlay} pointerEvents="none">
    <View style={styles.texturePattern} />
  </View>
);

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const t = useT();

  const SERVICES = [
    { id: 'Marketplace', icon: 'storefront', label: t('marketplace'), color: '#00A86B' },
    { id: 'Food', icon: 'restaurant', label: t('food'), color: '#F5B800' },
    { id: 'Ekub', icon: 'people', label: t('ekub'), color: '#3B82F6' },
    { id: 'Parking', icon: 'car', label: t('parking'), color: '#06b6d4' },
    { id: 'Delala', icon: 'home', label: t('delala'), color: '#8b5cf6' },
    { id: 'FaydaKYC', icon: 'finger-print', label: 'Fayda ID', color: '#06b6d4' },
  ];

  // ── Global State ────────────────────────────────────────────────────────────
  const currentUser = useAuthStore((s) => s.currentUser);
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const transactions = useWalletStore((s) => s.transactions);
  const setTransactions = useWalletStore((s) => s.setTransactions);
  const showToast = useSystemStore((s) => s.showToast);

  // ── UI State ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!currentUser?.id) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const { fetchProfile } = await import('../../services/auth.service');
        const profileRes = await fetchProfile(currentUser.id);
        if (profileRes.data) {
          await useAuthStore.getState().setCurrentUser(profileRes.data);
        }

        const walletData = await WalletService.fetchWalletData(currentUser?.id);
        if (walletData) {
          setBalance(walletData.balance);
          setTransactions(walletData.transactions || []);
        }
      } catch (error) {
        console.error('Home sync error:', error);
        showToast(t('sync_error'), 'error');
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
      <Screen style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </Screen>
    );
  }

  return (
    <Screen safeArea={false}>
      <TopBar title="CityLink" showProfile />
      <OfflineBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor={theme.primary}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Typography variant="h1" style={styles.greeting}>
              {t(`greeting_${greeting()}_name`, {
                name: currentUser?.full_name?.split(' ')[0] || '',
              })}
            </Typography>
            <Typography variant="body" color={theme.sub}>
              {t('welcome_sub')}
            </Typography>
          </View>
          <Surface
            variant="outline"
            radius="full"
            padding={10}
            onPress={() => (navigation as any).navigate('Profile')}
          >
            <Ionicons name="person-outline" size={22} color={theme.primary} />
          </Surface>
        </View>

        <Spacer size={Spacing.md} />

        {/* Hero Section */}
        <WalletHero
          balance={balance}
          name={currentUser?.full_name?.split(' ')[0] || 'User'}
          greetingKey={greeting()}
          onQuickAction={handleQuickAction}
        />

        <Spacer size={Spacing.xl} />

        {/* Financial Identity Section */}
        <View style={styles.sectionContainer}>
          <SectionTitle title={t('financial_identity')} />
          <CreditScoreRing score={742} />
        </View>

        {/* Services Grid */}
        <SectionTitle
          title={t('public_services')}
          rightLabel={t('see_all')}
          onRightPress={() => {}}
        />
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
              style={styles.serviceItem}
            >
              <Surface
                onPress={() => handleServicePress(item.id)}
                padding={Spacing.md}
                gap={Spacing.sm}
                style={styles.serviceSurface}
              >
                <View style={[styles.serviceIconContainer, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View>
                  <Typography variant="title" style={{ fontSize: 13 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="hint">{t('available')}</Typography>
                </View>
              </Surface>
            </MotiView>
          ))}
        </View>

        {/* Featured Food Section */}
        <View style={styles.sectionContainer}>
          <FeaturedCard
            title={t('food_hero_title')}
            description={t('food_hero_desc')}
            imageSource="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600"
            icon="restaurant"
            onPress={() => (navigation as any).navigate('Food')}
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionContainer}>
          <SectionTitle title={t('recent_activity')} />
          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Typography variant="body" style={{ color: theme.sub, fontFamily: Fonts.label }}>
                {t('no_activity')}
              </Typography>
            </View>
          ) : (
            transactions
              .slice(0, 3)
              .map((tx: any, i: number) => <TransactionItem key={tx.id || i} tx={tx} index={i} />)
          )}
        </View>

        <CulturalTexture />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 80, // Space for TopBar
    paddingBottom: 100, // Space for BottomTabs
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  greeting: {
    letterSpacing: -1,
    marginBottom: 2,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  serviceItem: {
    width: '48%',
  },
  serviceSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginBottom: Spacing.xl,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
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

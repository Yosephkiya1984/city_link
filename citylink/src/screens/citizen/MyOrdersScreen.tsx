/**
 * MyOrdersScreen — Citizen order tracking and history.
 *
 * Decomposed from a 928-line monolith into:
 *  - useMyOrders hook (business logic, real-time, state)
 *  - MyOrdersScreen.styles.ts (static styles)
 *  - components/OrderCard (complex order UI)
 */
import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import TopBar from '../../components/TopBar';
import { useSystemStore } from '../../store/SystemStore';
import { Colors, DarkColors, Fonts } from '../../theme';
import { fmtETB } from '../../utils';
import { t } from '../../utils/i18n';

import { useMyOrders } from '../../hooks/useMyOrders';
import { myOrdersStyles as styles } from './MyOrdersScreen.styles';
import { OrderCard } from './components/OrderCard';

function useTheme() {
  const isDark = useSystemStore((s) => s.isDark);
  return isDark ? DarkColors : Colors;
}

export default function MyOrdersScreen() {
  const navigation = useNavigation();
  const C = useTheme();

  const {
    loading,
    refreshing,
    tab,
    setTab,
    activeOrders,
    historyOrders,
    displayedOrders,
    promptConfig,
    setPromptConfig,
    promptInput,
    setPromptInput,
    submitting,
    handleRefresh,
    handleCancelOrder,
    submitDispute,
    handleRejectDelivery,
  } = useMyOrders();

  const tabAnim = useRef(new Animated.Value(tab === 'active' ? 0 : 1)).current;

  const switchTab = (newTab: 'active' | 'history') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(tabAnim, {
      toValue: newTab === 'active' ? 0 : 1,
      useNativeDriver: false, // Layout animation
    }).start();
    setTab(newTab);
  };

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('orders') || 'My Orders'} />

      {/* Summary Row */}
      <View style={[styles.summaryRow, { backgroundColor: C.surface, borderBottomColor: C.edge }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: C.text }]}>{activeOrders.length}</Text>
          <Text style={[styles.summaryLabel, { color: C.sub }]}>{t('active')}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: C.edge }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: C.text }]}>{historyOrders.length}</Text>
          <Text style={[styles.summaryLabel, { color: C.sub }]}>{t('completed')}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: C.edge }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: C.primary }]}>
            ETB{' '}
            {fmtETB(
              historyOrders.reduce((s, o) => s + Number(o.total || 0), 0),
              0
            )}
          </Text>
          <Text style={[styles.summaryLabel, { color: C.sub }]}>{t('total_spent')}</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View
        style={[styles.tabContainer, { backgroundColor: C.surface, borderBottomColor: C.edge }]}
      >
        <View style={[styles.segmentedControl, { backgroundColor: C.lift }]}>
          <Animated.View
            style={[styles.tabIndicator, { left: tabIndicatorLeft, backgroundColor: C.surface }]}
          />
          {(['active', 'history'] as const).map((tabKey) => {
            const isActive = tab === tabKey;
            return (
              <TouchableOpacity
                key={tabKey}
                onPress={() => switchTab(tabKey)}
                style={styles.segment}
              >
                <Text style={[styles.segmentText, { color: isActive ? C.text : C.sub }]}>
                  {tabKey === 'active'
                    ? `${t('active_up')} (${activeOrders.length})`
                    : `${t('history_up')} (${historyOrders.length})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {displayedOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={64}
                color={C.edge}
                style={{ marginBottom: 16 }}
              />
              <Text style={[styles.emptyStateTitle, { color: C.text }]}>
                {tab === 'active' ? t('no_active_orders') : t('no_order_history')}
              </Text>
              <Text style={[styles.emptyStateSub, { color: C.sub }]}>
                {tab === 'active' ? t('browse_marketplace_msg') : t('completed_orders_will_appear')}
              </Text>
            </View>
          ) : (
            displayedOrders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                C={C}
                onDispute={(order: any) => {
                  setPromptInput('');
                  setPromptConfig({ type: 'dispute', order });
                }}
                onCancel={handleCancelOrder}
                onReject={handleRejectDelivery}
                navigation={navigation}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Action Modal — Dispute */}
      <Modal visible={!!promptConfig} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontFamily: Fonts.black, fontSize: 18, color: C.text }}>
                ⚠️ {t('raise_dispute')}
              </Text>
              <TouchableOpacity onPress={() => setPromptConfig(null)} disabled={submitting}>
                <Ionicons name="close" size={22} color={C.sub} />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 14,
                color: C.sub,
                marginBottom: 20,
                lineHeight: 20,
              }}
            >
              {t('dispute_desc')}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.lift, color: C.text }]}
              placeholder={t('dispute_placeholder')}
              placeholderTextColor={C.sub}
              value={promptInput}
              onChangeText={setPromptInput}
              maxLength={200}
              autoFocus
              multiline
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPromptConfig(null)}
                disabled={submitting}
              >
                <Text style={{ color: C.sub, fontFamily: Fonts.bold }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: '#E8312A' },
                  submitting && { opacity: 0.6 },
                ]}
                onPress={submitDispute}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontFamily: Fonts.bold }}>
                    {t('submit_dispute')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

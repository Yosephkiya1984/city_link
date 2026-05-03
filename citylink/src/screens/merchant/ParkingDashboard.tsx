import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';

import { useParkingData } from './hooks/useParkingData';
import { useParkingActions } from './hooks/useParkingActions';
import { useAuthStore } from '../../store/AuthStore';
import { D, Radius, Fonts } from './components/StitchTheme';
import { fmtETB } from '../../utils';
import { styles } from './components/ParkingDashboardStyles';
import { useT } from '../../utils/i18n';

const { width } = Dimensions.get('window');

export default function ParkingDashboard() {
  const t = useT();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState<'live' | 'sessions' | 'lots' | 'finance'>('live');

  const data = useParkingData();
  const actions = useParkingActions(data);

  const { sessions, lots, loading, refreshing, loadData } = data;
  const { onUpdateSession: handleEndSession, onWithdraw: handleWithdraw } = actions;

  const activeSessions = useMemo(() => sessions.filter((s) => s.status === 'active'), [sessions]);
  const occupiedCount = activeSessions.length;
  const totalSpots = lots.reduce((acc, l) => acc + (l.total_spots || 0), 0);
  const dailyRev = sessions
    .filter(
      (s) =>
        s.status === 'completed' &&
        new Date(s.end_time).toDateString() === new Date().toDateString()
    )
    .reduce((acc, s) => acc + (s.total_amount || 0), 0);

  const renderLive = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={D.gold} />
      }
    >
      <View style={styles.bentoContainer}>
        <View style={styles.bentoRow}>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.bentoCard}
          >
            <Text style={styles.bentoLabel}>{t('currently_occupied')}</Text>
            <Text style={styles.bentoValue}>
              {occupiedCount} / {totalSpots || '--'}
            </Text>
          </MotiView>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 100 }}
            style={styles.bentoCard}
          >
            <Text style={styles.bentoLabel}>{t('today_revenue')}</Text>
            <Text style={[styles.bentoValue, { color: D.primary }]}>{fmtETB(dailyRev)}</Text>
          </MotiView>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontFamily: Fonts.black, color: D.white }}>
          {t('spot_status')}
        </Text>
      </View>

      <View style={styles.spotGrid}>
        {Array.from({ length: totalSpots || 12 }).map((_, i) => {
          const isOccupied = i < occupiedCount;
          return (
            <MotiView
              key={i}
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 30 }}
              style={[styles.spotCard, isOccupied && styles.spotOccupied]}
            >
              <Text style={styles.spotLabel}>P-{i + 1}</Text>
              <Ionicons
                name={isOccupied ? 'car-sport' : 'checkmark-circle'}
                size={20}
                color={isOccupied ? D.gold : D.lift}
              />
              <Text style={[styles.spotStatus, { color: isOccupied ? D.gold : D.sub }]}>
                {isOccupied ? t('occupied') : t('available')}
              </Text>
            </MotiView>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderSessions = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {sessions.map((s, i) => (
        <MotiView
          key={s.id}
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: i * 50 }}
          style={styles.sessionCard}
        >
          <View style={styles.vehicleIcon}>
            <Ionicons name="car-outline" size={24} color={s.status === 'active' ? D.gold : D.sub} />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.plateNumber}>{s.plate_number || 'UNKNOWN'}</Text>
            <Text style={styles.duration}>
              {new Date(s.start_time).toLocaleTimeString()} -{' '}
              {s.status === 'active' ? t('now') : new Date(s.end_time).toLocaleTimeString()}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amount}>{fmtETB(s.total_amount || 0)}</Text>
            <Text
              style={{
                fontSize: 10,
                color: s.status === 'active' ? D.gold : D.sub,
                fontFamily: Fonts.bold,
              }}
            >
              {s.status.toUpperCase()}
            </Text>
          </View>
        </MotiView>
      ))}
    </ScrollView>
  );

  const renderFinance = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.financeHero}>
        <Text style={styles.financeTitle}>{t('total_withdrawable')}</Text>
        <Text style={styles.financeValue}>{fmtETB(dailyRev * 42.5)}</Text>
        <TouchableOpacity style={styles.withdrawAction} onPress={handleWithdraw}>
          <Text style={{ fontSize: 16, fontFamily: Fonts.black, color: D.ink }}>
            {t('withdraw_earnings')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.brandTitle}>{currentUser?.business_name || 'Parking Lot'}</Text>
            <Text style={styles.brandTag}>{t('secure_parking_management')}</Text>
          </View>
          <Ionicons name="map-outline" size={28} color={D.gold} />
        </View>
      </View>

      <View style={styles.tabContainer}>
        {(['live', 'sessions', 'lots', 'finance'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              setActiveTab(tab);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {t(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <AnimatePresence exitBeforeEnter>
        <View style={{ flex: 1 }}>
          {activeTab === 'live' && renderLive()}
          {activeTab === 'sessions' && renderSessions()}
          {activeTab === 'finance' && renderFinance()}
        </View>
      </AnimatePresence>
    </View>
  );
}

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';

import { useEkubData } from './hooks/useEkubData';
import { useEkubActions } from './hooks/useEkubActions';
import { useAuthStore } from '../../store/AuthStore';
import { D, Radius, Fonts } from './components/StitchTheme';
import { fmtETB } from '../../utils';
import { styles } from './components/EkubDashboardStyles';
import { useT } from '../../utils/i18n';

const { width } = Dimensions.get('window');

export default function EkubDashboard() {
  const t = useT();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState<'circles' | 'apps' | 'draws' | 'ledger'>('circles');

  const data = useEkubData();
  const actions = useEkubActions(data);

  const { circles, pendingApps, activeDraws, loading, refreshing, loadData } = data;
  const { onApproveApp, onRunDraw } = actions;

  const totalPool = useMemo(
    () => circles.reduce((acc, c) => acc + c.contribution_amount * c.max_participants, 0),
    [circles]
  );
  const activeMembers = useMemo(
    () => circles.reduce((acc, c) => acc + (c.current_participants || 0), 0),
    [circles]
  );

  const renderCircles = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={D.violet} />
      }
    >
      <View style={styles.bentoContainer}>
        <View style={styles.bentoRow}>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.bentoCard}
          >
            <Text style={styles.bentoLabel}>{t('total_pool_value')}</Text>
            <Text style={styles.bentoValue}>{fmtETB(totalPool)}</Text>
          </MotiView>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 100 }}
            style={styles.bentoCard}
          >
            <Text style={styles.bentoLabel}>{t('active_members')}</Text>
            <Text style={[styles.bentoValue, { color: D.violet }]}>{activeMembers}</Text>
          </MotiView>
        </View>
      </View>

      {circles.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="people-outline" size={64} color={D.lift} />
          <Text style={{ color: D.sub, marginTop: 16, fontFamily: Fonts.bold }}>
            {t('no_circles_created')}
          </Text>
        </View>
      ) : (
        circles.map((c, i) => (
          <MotiView
            key={c.id}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200 + i * 100 }}
            style={styles.circleCard}
          >
            <View style={styles.circleTop}>
              <View>
                <Text style={styles.circleTitle}>{c.name}</Text>
                <Text style={styles.circleType}>{c.cycle_period || 'Weekly'}</Text>
              </View>
              <Ionicons name="shield-checkmark" size={24} color={D.violet} />
            </View>

            <View style={styles.circleProgress}>
              <View
                style={[
                  styles.circleProgressFill,
                  { width: `${(c.current_participants / c.max_participants) * 100}%` },
                ]}
              />
            </View>

            <View style={styles.circleStats}>
              <View style={styles.circleStatItem}>
                <Text style={styles.circleStatLabel}>{t('contribution')}</Text>
                <Text style={styles.circleStatValue}>{fmtETB(c.contribution_amount)}</Text>
              </View>
              <View style={styles.circleStatItem}>
                <Text style={styles.circleStatLabel}>{t('members')}</Text>
                <Text style={styles.circleStatValue}>
                  {c.current_participants} / {c.max_participants}
                </Text>
              </View>
              <View style={[styles.circleStatItem, { alignItems: 'flex-end' }]}>
                <Text style={styles.circleStatLabel}>{t('next_draw')}</Text>
                <Text style={[styles.circleStatValue, { color: D.gold }]}>FRI, 10:00</Text>
              </View>
            </View>
          </MotiView>
        ))
      )}
    </ScrollView>
  );

  const renderApps = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {pendingApps.length === 0 ? (
        <View style={{ padding: 60, alignItems: 'center' }}>
          <Ionicons name="mail-outline" size={48} color={D.lift} />
          <Text style={{ color: D.sub, marginTop: 16, fontFamily: Fonts.bold }}>
            {t('no_pending_applications')}
          </Text>
        </View>
      ) : (
        pendingApps.map((app, i) => (
          <MotiView
            key={app.id}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: i * 50 }}
            style={styles.appCard}
          >
            <View style={styles.appAvatar}>
              <Ionicons name="person" size={20} color={D.sub} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.appName}>{app.user_name || 'Anonymous'}</Text>
              <Text style={styles.appDetails}>
                {app.ekub_name} • {fmtETB(app.amount)}
              </Text>
            </View>
            <View style={styles.appActions}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => onApproveApp(app.ekub_id, app.user_id, 'ACTIVE')}
              >
                <Ionicons name="checkmark" size={20} color={D.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => onApproveApp(app.ekub_id, app.user_id, 'REJECTED')}
              >
                <Ionicons name="close" size={20} color={D.red} />
              </TouchableOpacity>
            </View>
          </MotiView>
        ))
      )}
    </ScrollView>
  );

  const renderDraws = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 20 }}>
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={styles.drawHero}
      >
        <Ionicons name="sparkles" size={48} color={D.violet} style={{ marginBottom: 16 }} />
        <Text style={styles.drawTitle}>{t('next_lucky_draw')}</Text>
        <Text style={styles.drawTimer}>04:22:15</Text>
        <TouchableOpacity style={styles.drawBtn} onPress={() => onRunDraw(circles[0])}>
          <Text style={styles.drawBtnText}>{t('trigger_early_draw')}</Text>
        </TouchableOpacity>
      </MotiView>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.brandTitle}>Ekub Admin</Text>
            <Text style={styles.brandTag}>{t('community_wealth_management')}</Text>
          </View>
          <TouchableOpacity style={{ padding: 8 }}>
            <Ionicons name="add-circle" size={32} color={D.violet} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {(['circles', 'apps', 'draws', 'ledger'] as const).map((tab) => (
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
          {activeTab === 'circles' && renderCircles()}
          {activeTab === 'apps' && renderApps()}
          {activeTab === 'draws' && renderDraws()}
        </View>
      </AnimatePresence>
    </View>
  );
}

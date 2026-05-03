import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D, Radius, Fonts, Spacing } from './StitchTheme';
import { GlassView } from '../../../components/GlassView';
import { Typography, Surface, SectionTitle } from '../../../components';
import { fmtETB } from '../../../utils';
import { t } from '../../../utils/i18n';

const { width } = Dimensions.get('window');

// We use any types temporarily until Epic 2 (Strict Mode) covers UI components.
export function DashboardOverviewTab({
  orders = [],
  inventory = [],
  tables = [],
  reservations = [],
  salesHistory = { curve: [], raw: [], labels: [] },
  showToast,
  styles,
  t,
}: any) {
  const revenueStatuses = ['PAID', 'SHIPPED', 'COMPLETED'];
  const totalRev = orders
    .filter((o: any) => revenueStatuses.includes(o.status))
    .reduce((acc: any, o: any) => acc + (Number(o.total) || 0), 0);

  const activeOrd = orders.filter((o: any) =>
    ['PAID', 'SHIPPED', 'DISPATCHING', 'AGENT_ASSIGNED', 'IN_TRANSIT', 'AWAITING_PIN'].includes(
      o.status
    )
  ).length;
  const lowStockCount = inventory.filter((p: any) => p.stock <= 5).length;
  const activeTables = tables.filter((t: any) => t.status !== 'free').length;
  const pendingReservations = reservations.filter((r: any) => r.status === 'PENDING').length;

  const salesCurve = salesHistory.curve || [];

  return (
    <View style={styles.tabContent}>
      <View style={styles.headerTitleRow}>
        <View>
          <Typography variant="h1">{t('dashboard')}</Typography>
          <Typography variant="body" color="sub">
            {t('sales_analytics_overview')}
          </Typography>
        </View>
        <TouchableOpacity
          style={styles.iconButtonOutlined}
          onPress={() => showToast(t('report_downloaded'), 'success')}
        >
          <Ionicons name="download-outline" size={20} color={D.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <Surface variant="lift" style={[styles.premiumStatCard, { backgroundColor: D.primary + '08' }]}>
          <View style={[styles.statIconBox, { backgroundColor: D.primary + '15' }]}>
            <Ionicons name="restaurant" size={18} color={D.primary} />
          </View>
          <View style={{ marginTop: Spacing.sm }}>
            <Typography variant="h1" color="primary">
              {activeTables} / {tables.length}
            </Typography>
            <Typography variant="hint" color="sub" style={{ letterSpacing: 1 }}>
              ACTIVE TABLES
            </Typography>
          </View>
          <Surface variant="flat" style={styles.payoutChip}>
            <Typography variant="hint" color="primary" style={{ fontSize: 10 }}>
              {tables.length - activeTables} Free
            </Typography>
          </Surface>
        </Surface>

        <Surface variant="lift" style={[styles.premiumStatCard, { backgroundColor: D.secondary + '08' }]}>
          <View style={[styles.statIconBox, { backgroundColor: D.secondary + '15' }]}>
            <Ionicons name="calendar" size={18} color={D.secondary} />
          </View>
          <View style={{ marginTop: Spacing.sm }}>
            <Typography variant="h1" style={{ color: D.secondary }}>
              {pendingReservations}
            </Typography>
            <Typography variant="hint" color="sub" style={{ letterSpacing: 1 }}>
              NEW RESERVATIONS
            </Typography>
          </View>
          <Surface
            variant="flat"
            style={[styles.payoutChip, { backgroundColor: D.secondary + '10' }]}
          >
            <Typography variant="hint" style={{ color: D.secondary, fontSize: 10 }}>
              {reservations.length} Total
            </Typography>
          </Surface>
        </Surface>
      </View>

      <Surface variant="outline" style={styles.miniStatsRow}>
        <View style={styles.miniStat}>
          <Typography variant="h2">{orders.length}</Typography>
          <Typography variant="hint" color="sub" style={{ letterSpacing: 1 }}>
            {t('orders_up')}
          </Typography>
        </View>
        <View style={styles.miniStat}>
          <Typography variant="h2">{activeOrd}</Typography>
          <Typography variant="hint" color="sub" style={{ letterSpacing: 1 }}>
            {t('active_up')}
          </Typography>
        </View>
        <View style={styles.miniStat}>
          <Typography variant="h2" color="red">
            {lowStockCount}
          </Typography>
          <Typography variant="hint" color="sub" style={{ letterSpacing: 1 }}>
            {t('low_stock_up')}
          </Typography>
        </View>
      </Surface>

      <Surface variant="flat" style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Typography variant="h3">{t('sales_trend')}</Typography>
          <Typography variant="hint" color="sub">
            {t('daily_volume_7d')}
          </Typography>
        </View>
        <View style={styles.chartGraphArea}>
          <View style={styles.chartBars}>
            {salesCurve.map((val: any, i: any) => {
              const dateStr = salesHistory.labels[i] || '';
              const dayLabel = dateStr
                ? new Date(dateStr).toLocaleDateString([], { weekday: 'short' })
                : '';
              return (
                <View key={i} style={styles.chartCol}>
                  <View
                    style={[
                      styles.chartBarLine,
                      {
                        height: `${Math.max(val * 100, 8)}%`,
                        backgroundColor: val > 0.5 ? D.primary : D.primary + '50',
                        borderRadius: Radius.sm,
                      },
                    ]}
                  />
                  <Typography
                    variant="hint"
                    style={{
                      color: D.sub,
                      fontSize: 8,
                      marginTop: 8,
                      textTransform: 'uppercase',
                      position: 'absolute',
                      bottom: -20,
                    }}
                  >
                    {dayLabel}
                  </Typography>
                </View>
              );
            })}
          </View>
        </View>
      </Surface>

      <Surface variant="flat" style={styles.topSellingContainer}>
        <Typography variant="h3" style={{ marginBottom: Spacing.md }}>
          {t('top_products')}
        </Typography>
        <View style={styles.topSellingList}>
          {inventory.slice(0, 3).map((item: any, i: any) => (
            <View key={i} style={styles.topSellingItem}>
              <Image source={{ uri: item.image_url }} style={styles.tsImage} />
              <View style={{ flex: 1 }}>
                <Typography variant="title">{item.name}</Typography>
                <Typography variant="hint" color="sub">
                  {item.stock} {t('in_stock')} • {item.category}
                </Typography>
              </View>
              <Typography variant="title" color="primary">
                {fmtETB(item.price)}
              </Typography>
            </View>
          ))}
          {inventory.length === 0 && (
            <Typography variant="body" color="sub" style={{ textAlign: 'center' }}>
              {t('no_products_listed')}
            </Typography>
          )}
        </View>
      </Surface>
    </View>
  );
}

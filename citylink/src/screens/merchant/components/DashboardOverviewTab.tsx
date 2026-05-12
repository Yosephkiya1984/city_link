import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';
import { Typography, Surface, SectionTitle } from '../../../components';
import { fmtETB } from '../../../utils';

const { width } = Dimensions.get('window');

export function DashboardOverviewTab({
  orders = [],
  inventory = [],
  salesHistory = { curve: [], raw: [], labels: [] },
  showToast,
  styles,
  t,
}: any) {
  const { totalRev, totalCommission, netRevenue, activeOrd, completedOrd, lowStockCount } = React.useMemo(() => {
    const revenueStatuses = ['PAID', 'SHIPPED', 'COMPLETED'];
    const activeStatuses = ['PAID', 'SHIPPED', 'DISPATCHING', 'AGENT_ASSIGNED', 'IN_TRANSIT', 'AWAITING_PIN'];
    
    const rev = orders
      .filter((o: any) => revenueStatuses.includes(o.status))
      .reduce((acc: any, o: any) => acc + (Number(o.total || o.total_amount) || 0), 0);

    const comm = orders
      .filter((o: any) => revenueStatuses.includes(o.status))
      .reduce((acc: any, o: any) => acc + (Number(o.commission_amount) || 0), 0);

    const active = orders.filter((o: any) => activeStatuses.includes(o.status)).length;
    const completed = orders.filter((o: any) => o.status === 'COMPLETED').length;
    const lowStock = inventory.filter((p: any) => (p.stock || p.quantity) <= 5).length;

    return {
      totalRev: rev,
      totalCommission: comm,
      netRevenue: rev - comm,
      activeOrd: active,
      completedOrd: completed,
      lowStockCount: lowStock
    };
  }, [orders, inventory]);

  const salesCurve = React.useMemo(() => 
    salesHistory?.curve?.length ? salesHistory.curve : [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 1.0],
    [salesHistory]
  );
  
  const labels = React.useMemo(() => 
    salesHistory?.labels?.length ? salesHistory.labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    [salesHistory]
  );

  const topSelling = React.useMemo(() => inventory.slice(0, 3), [inventory]);

  return (
    <View style={styles.tabContent}>
      <MotiView 
        from={{ opacity: 0, translateY: 10 }} 
        animate={{ opacity: 1, translateY: 0 }}
        style={styles.headerTitleRow}
      >
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
      </MotiView>

      <View style={styles.statsGrid}>
        <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100 }}>
          <Surface variant="lift" style={[styles.premiumStatCard, { backgroundColor: D.blue + '08' }]}>
            <View style={[styles.statIconBox, { backgroundColor: D.blue + '15' }]}>
              <Ionicons name="cart" size={18} color={D.blue} />
            </View>
            <View style={{ marginTop: Spacing.sm }}>
              <Typography variant="h1" style={{ color: D.blue }}>
                {activeOrd}
              </Typography>
              <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontSize: 9 }}>
                ACTIVE ORDERS
              </Typography>
            </View>
            <View style={[styles.payoutChip, { backgroundColor: D.blue + '20' }]}>
              <Typography variant="hint" style={{ color: D.blue, fontSize: 10 }}>
                {completedOrd} Completed
              </Typography>
            </View>
          </Surface>
        </MotiView>

        <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 200 }}>
          <Surface variant="lift" style={[styles.premiumStatCard, { backgroundColor: D.primary + '08' }]}>
            <View style={[styles.statIconBox, { backgroundColor: D.primary + '15' }]}>
              <Ionicons name="wallet" size={18} color={D.primary} />
            </View>
            <View style={{ marginTop: Spacing.sm }}>
              <Typography variant="h1" color="primary">
                {fmtETB(totalRev)}
              </Typography>
              <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontSize: 9 }}>
                TOTAL REVENUE
              </Typography>
            </View>
            <View style={[styles.payoutChip, { backgroundColor: D.primary + '20' }]}>
              <Typography variant="hint" color="primary" style={{ fontSize: 10 }}>
                Net: {fmtETB(netRevenue)}
              </Typography>
            </View>
          </Surface>
        </MotiView>
      </View>

      <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 300 }}>
        <Surface variant="outline" style={styles.miniStatsRow}>
          <View style={styles.miniStat}>
            <Typography variant="h2">{inventory.length}</Typography>
            <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontSize: 8 }}>
              TOTAL PRODUCTS
            </Typography>
          </View>
          <View style={styles.miniStat}>
            <Typography variant="h2" color="red">
              {lowStockCount}
            </Typography>
            <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontSize: 8 }}>
              LOW STOCK
            </Typography>
          </View>
          <View style={styles.miniStat}>
            <Typography variant="h2" color="gold">{orders.length}</Typography>
            <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontSize: 8 }}>
              LIFETIME SALES
            </Typography>
          </View>
        </Surface>
      </MotiView>

      <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 400 }}>
        <Surface variant="flat" style={[styles.chartContainer, { padding: 20 }]}>
          <View style={styles.chartHeader}>
            <View>
              <Typography variant="h3">{t('sales_trend')}</Typography>
              <Typography variant="hint" color="sub">
                Daily Volume (Last 7 Days)
              </Typography>
            </View>
          </View>
          
          <View style={[styles.chartGraphArea, { height: 160, marginTop: 24 }]}>
            <View style={styles.chartBars}>
              {salesCurve.map((val: any, i: any) => {
                const dateStr = labels[i] || '';
                const dayLabel = dateStr.length > 3 ? new Date(dateStr).toLocaleDateString([], { weekday: 'short' }) : dateStr;
                
                return (
                  <View key={i} style={styles.chartCol}>
                    <MotiView
                      from={{ height: 0, opacity: 0 }}
                      animate={{ height: `${Math.max(val * 100, 10)}%`, opacity: 1 }}
                      transition={{ type: 'timing', duration: 1000, delay: i * 100 + 500 }}
                      style={[
                        styles.chartBarLine,
                        {
                          backgroundColor: val > 0.7 ? D.blue : D.blue + '40',
                          borderRadius: Radius.sm,
                          width: 12,
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
      </MotiView>

      <SectionTitle title="Top Selling Products" />
      <View style={{ gap: 12 }}>
        {topSelling.map((item: any, i: any) => (
          <MotiView key={item.id || i} from={{ opacity: 0, translateX: -10 }} animate={{ opacity: 1, translateX: 0 }} transition={{ delay: i * 100 + 800 }}>
            <Surface variant="lift" style={styles.topSellingItem}>
              {item.image_url && <Image source={{ uri: item.image_url }} style={styles.tsImage} />}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Typography variant="title">{item.name}</Typography>
                <Typography variant="hint" color="sub">
                  {item.stock || item.quantity} in stock • {item.category}
                </Typography>
              </View>
              <Typography variant="h3" color="primary">
                {fmtETB(item.price)}
              </Typography>
            </Surface>
          </MotiView>
        ))}
      </View>
    </View>
  );
}

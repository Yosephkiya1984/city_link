import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { D, Radius, Fonts, Spacing, Shadow } from './StitchTheme';
import { Typography, Surface, SectionTitle } from '../../../components';
import { fmtETB } from '../../../utils';

const { width } = Dimensions.get('window');

export function HospitalityOverviewTab({
  orders = [],
  inventory = [],
  tables = [],
  reservations = [],
  restaurant,
  bannerImage,
  bannerUploading,
  onPickBanner,
  onUploadBanner,
  salesHistory = { curve: [], raw: [], labels: [] },
  showToast,
  styles,
  t,
}: any) {
  const revenueStatuses = ['PAID', 'SHIPPED', 'COMPLETED', 'PLACED']; // PLACED is often already paid in mobile money
  const totalRev = orders
    .filter((o: any) => revenueStatuses.includes(o.status?.toUpperCase()))
    .reduce((acc: any, o: any) => acc + (Number(o.total || o.total_amount) || 0), 0);

  const activeOrd = orders.filter((o: any) =>
    ['PAID', 'PLACED', 'PENDING', 'SHIPPED', 'DISPATCHING', 'AGENT_ASSIGNED', 'IN_TRANSIT', 'AWAITING_PIN', 'PREPARING', 'READY'].includes(
      o.status?.toUpperCase()
    )
  ).length;
  const lowStockCount = inventory.filter((p: any) => (p.stock || p.quantity) <= 5).length;
  const activeTables = tables.filter((t: any) => t.status !== 'free').length;
  const pendingReservations = reservations.filter((r: any) => r.status === 'PENDING').length;

  const salesCurve = salesHistory?.curve?.length ? salesHistory.curve : [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 1.0]; 
  const labels = salesHistory?.labels?.length ? salesHistory.labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <View style={{ padding: Spacing.lg }}>
      {/* Restaurant Banner & Branding */}
      <Surface variant="flat" style={styles.bannerContainer}>
        {bannerImage || restaurant?.banner_url ? (
          <Image 
            source={{ uri: bannerImage?.uri || restaurant?.banner_url }} 
            style={styles.bannerImage} 
          />
        ) : (
          <View style={[styles.bannerImage, { backgroundColor: D.lift, alignItems: 'center', justifyContent: 'center' }]}>
             <Ionicons name="image-outline" size={48} color={D.edge} />
          </View>
        )}
        <View style={styles.bannerOverlay}>
          <TouchableOpacity 
            style={[styles.bannerUploadBtn, bannerImage && { backgroundColor: D.primary }]} 
            onPress={bannerImage ? onUploadBanner : onPickBanner}
            disabled={bannerUploading}
          >
             {bannerUploading ? (
               <ActivityIndicator color={D.ink} size="small" />
             ) : (
               <>
                 <Ionicons name={bannerImage ? "cloud-upload" : "camera"} size={16} color={D.ink} />
                 <Typography variant="hint" style={{ color: D.ink, marginLeft: 4, fontWeight: '800' }}>
                   {bannerImage ? "CONFIRM" : "CHANGE BANNER"}
                 </Typography>
               </>
             )}
          </TouchableOpacity>
        </View>
      </Surface>

      <MotiView 
        from={{ opacity: 0, translateY: 10 }} 
        animate={{ opacity: 1, translateY: 0 }}
        style={styles.headerTitleRow}
      >
        <View>
          <Typography variant="h1">Hospitality Hub</Typography>
          <Typography variant="body" color="sub">
            Live Service Performance
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
        <Surface variant="lift" style={[styles.premiumStatCard, { backgroundColor: D.primary + '08', flex: 1 }]}>
          <View style={[styles.statIconBox, { backgroundColor: D.primary + '15' }]}>
            <Ionicons name="restaurant" size={18} color={D.primary} />
          </View>
          <View style={{ marginTop: Spacing.sm }}>
            <Typography variant="h2" color="primary">
              {activeTables} <Typography variant="hint" color="sub">/ {tables.length}</Typography>
            </Typography>
            <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontSize: 10, fontWeight: '800' }}>
              ACTIVE TABLES
            </Typography>
          </View>
          <View style={[styles.payoutChip, { backgroundColor: D.primary + '15', marginTop: Spacing.sm }]}>
            <Typography variant="hint" color="primary" style={{ fontSize: 10, fontWeight: '700' }}>
              {tables.length - activeTables} Free
            </Typography>
          </View>
        </Surface>

        <Surface variant="lift" style={[styles.premiumStatCard, { backgroundColor: D.secondary + '08', flex: 1 }]}>
          <View style={[styles.statIconBox, { backgroundColor: D.secondary + '15' }]}>
            <Ionicons name="calendar" size={18} color={D.secondary} />
          </View>
          <View style={{ marginTop: Spacing.sm }}>
            <Typography variant="h2" style={{ color: D.secondary }}>
              {pendingReservations}
            </Typography>
            <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontSize: 10, fontWeight: '800' }}>
              RESERVATIONS
            </Typography>
          </View>
          <View style={[styles.payoutChip, { backgroundColor: D.secondary + '15', marginTop: Spacing.sm }]}>
            <Typography variant="hint" style={{ color: D.secondary, fontSize: 10, fontWeight: '700' }}>
              {reservations.length} Total
            </Typography>
          </View>
        </Surface>
      </View>

      <Surface variant="outline" style={styles.miniStatsRow}>
        <View style={styles.miniStat}>
          <Typography variant="h2">{orders.length}</Typography>
          <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontSize: 8 }}>
            TOTAL ORDERS
          </Typography>
        </View>
        <View style={styles.miniStat}>
          <Typography variant="h2" color="primary">{activeOrd}</Typography>
          <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontSize: 8 }}>
            IN PROGRESS
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
      </Surface>

      <Surface variant="flat" style={[styles.chartContainer, { padding: 20 }]}>
        <View style={styles.chartHeader}>
          <View>
            <Typography variant="h3">Revenue Trend</Typography>
            <Typography variant="hint" color="sub">
              Daily Volume (Last 7 Days)
            </Typography>
          </View>
          <View style={[styles.payoutChip, { backgroundColor: D.primary + '20', height: 32, paddingHorizontal: 12 }]}>
            <Typography variant="h3" color="primary">ETB {fmtETB(totalRev)}</Typography>
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
                    transition={{ type: 'timing', duration: 1000, delay: i * 100 }}
                    style={[
                      styles.chartBarLine,
                      {
                        backgroundColor: val > 0.7 ? D.primary : D.primary + '40',
                        borderRadius: Radius.s,
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

      <SectionTitle title="Top Selling Dishes" rightLabel="View Menu" />
      <View style={{ gap: 12 }}>
        {inventory.slice(0, 3).map((item: any, i: any) => (
          <Surface key={item.id || i} variant="lift" style={styles.topSellingItem}>
            <Image source={{ uri: item.image_url }} style={styles.tsImage} />
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
        ))}
        {inventory.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="fast-food-outline" size={40} color={D.lift} />
            <Typography variant="body" color="sub">No inventory data available</Typography>
          </View>
        )}
      </View>
    </View>
  );
}

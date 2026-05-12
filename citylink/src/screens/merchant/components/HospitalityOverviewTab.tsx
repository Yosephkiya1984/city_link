import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Typography, SectionTitle, GlassCard, GlassView } from '../../../components';
import { fmtETB } from '../../../utils';
import { useTheme } from '../../../hooks/useTheme';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';

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
  const C = useTheme();
  const D = C; // Map theme to D for legacy compatibility
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
      <View style={styles.bannerContainer}>
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
      </View>

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
        <GlassCard 
          accentColor={C.primary} 
          glow 
          style={{ flex: 1 }}
        >
          <View style={{ padding: 16 }}>
            <View style={[styles.statIconBox, { backgroundColor: C.primary + '15' }]}>
              <Ionicons name="restaurant" size={18} color={C.primary} />
            </View>
            <View style={{ marginTop: Spacing.sm }}>
              <Typography variant="h2" color="primary">
                {activeTables} <Typography variant="hint" color="sub">/ {tables.length}</Typography>
              </Typography>
              <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontSize: 10, fontWeight: '800' }}>
                ACTIVE TABLES
              </Typography>
            </View>
            <View style={[styles.payoutChip, { backgroundColor: C.primary + '15', marginTop: Spacing.sm }]}>
              <Typography variant="hint" color="primary" style={{ fontSize: 10, fontWeight: '700' }}>
                {tables.length - activeTables} Free
              </Typography>
            </View>
          </View>
        </GlassCard>

        <GlassCard 
          accentColor={C.secondary} 
          glow 
          style={{ flex: 1 }}
        >
          <View style={{ padding: 16 }}>
            <View style={[styles.statIconBox, { backgroundColor: C.secondary + '15' }]}>
              <Ionicons name="calendar" size={18} color={C.secondary} />
            </View>
            <View style={{ marginTop: Spacing.sm }}>
              <Typography variant="h2" style={{ color: C.secondary }}>
                {pendingReservations}
              </Typography>
              <Typography variant="hint" color="sub" style={{ letterSpacing: 1, fontSize: 10, fontWeight: '800' }}>
                RESERVATIONS
              </Typography>
            </View>
            <View style={[styles.payoutChip, { backgroundColor: C.secondary + '15', marginTop: Spacing.sm }]}>
              <Typography variant="hint" style={{ color: C.secondary, fontSize: 10, fontWeight: '700' }}>
                {reservations.length} Total
              </Typography>
            </View>
          </View>
        </GlassCard>
      </View>

      <GlassView variant="outline" style={[styles.miniStatsRow, { overflow: 'hidden' }]}>
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
      </GlassView>

      <GlassCard variant="flat" style={{ marginBottom: 24, padding: 20 }}>
        <View style={styles.chartHeader}>
          <View>
            <Typography variant="h3">Revenue Trend</Typography>
            <Typography variant="hint" color="sub">
              Daily Volume (Last 7 Days)
            </Typography>
          </View>
          <View style={[styles.payoutChip, { backgroundColor: C.primary + '20', height: 32, paddingHorizontal: 12 }]}>
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
                        backgroundColor: val > 0.7 ? C.primary : C.primary + '40',
                        borderRadius: Radius.sm,
                        width: 12,
                      },
                    ]}
                  />
                  <Typography
                    variant="hint"
                    style={{
                      color: C.sub,
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
      </GlassCard>

      <SectionTitle title="Top Performance" rightLabel="All Items" />
      <View style={{ gap: 16 }}>
        {inventory.slice(0, 3).map((item: any, i: any) => (
          <MotiView
            key={item.id || i}
            from={{ opacity: 0, translateX: -10 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: i * 100 }}
          >
            <GlassView variant="outline" style={localStyles.topSellingCard}>
              <Image source={{ uri: item.image_url || item.image }} style={localStyles.tsImage} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Typography variant="title" style={{ fontSize: 16 }}>{item.name}</Typography>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                  <View style={[localStyles.miniBadge, { backgroundColor: C.primary + '15' }]}>
                    <Typography variant="hint" style={{ color: C.primary, fontSize: 9, fontWeight: '800' }}>
                      {item.category?.toUpperCase() || 'GENERAL'}
                    </Typography>
                  </View>
                  <Typography variant="hint" color="sub">
                    {item.stock || item.quantity} left
                  </Typography>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Typography variant="h3" color="primary">{fmtETB(item.price)}</Typography>
                <Typography variant="hint" color="sub" style={{ fontSize: 9 }}>TOP TIER</Typography>
              </View>
            </GlassView>
          </MotiView>
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

const localStyles = StyleSheet.create({
  topSellingCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20 },
  tsImage: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)' },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});

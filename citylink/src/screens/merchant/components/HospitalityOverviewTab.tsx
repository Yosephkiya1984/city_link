import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Typography, SectionTitle, GlassCard, GlassView } from '../../../components';
import { fmtETB } from '../../../utils';
import { useTheme } from '../../../hooks/useTheme';
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';
import { useRenderCount } from '../../../utils/debug/performanceMonitor';

const { width } = Dimensions.get('window');

export const HospitalityOverviewTab = memo(function HospitalityOverviewTab({
  orders = [],
  inventory = [],
  tables = [],
  reservations = [],
  restaurant,
  bannerImage,
  bannerUploading,
  onPickBanner,
  onUploadBanner,
  onInitializeTables,
  salesHistory = { curve: [], raw: [], labels: [] },
  showToast,
  styles,
  t,
}: any) {
  useRenderCount('HospitalityOverviewTab');
  const C = useTheme();
  const D_theme = C; // Renamed to avoid confusion with D from HospitalityTheme
  const revenueStatuses = ['PAID', 'SHIPPED', 'COMPLETED', 'PLACED'];
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
      {/* Restaurant Banner & Branding Gallery */}
      <View style={styles.bannerContainer}>
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          style={styles.bannerImage}
        >
          {((bannerImage && bannerImage.length > 0) || (restaurant?.gallery_json && restaurant.gallery_json.length > 0) || restaurant?.banner_url) ? (
            <>
              {/* If we have local pickings, show them first */}
              {bannerImage?.map((asset: any, idx: number) => (
                <Image 
                  key={`local-${idx}`}
                  source={{ uri: asset.uri }} 
                  style={{ width: width - 32, height: '100%' }} 
                />
              ))}
              {/* Then show saved gallery */}
              {restaurant?.gallery_json?.map((url: string, idx: number) => (
                <Image 
                  key={`saved-${idx}`}
                  source={{ uri: url }} 
                  style={{ width: width - 32, height: '100%' }} 
                />
              ))}
              {/* Fallback to legacy banner_url if gallery is empty */}
              {(!restaurant?.gallery_json || restaurant.gallery_json.length === 0) && restaurant?.banner_url && !bannerImage && (
                <Image 
                  source={{ uri: restaurant.banner_url }} 
                  style={{ width: width - 32, height: '100%' }} 
                />
              )}
            </>
          ) : (
            <View style={{ width: width - 32, height: '100%', backgroundColor: D.lift, alignItems: 'center', justifyContent: 'center' }}>
               <Ionicons name="image-outline" size={48} color={D.edge} />
            </View>
          )}
        </ScrollView>

        {((bannerImage?.length || 0) + (restaurant?.gallery_json?.length || 0) > 1) && (
          <>
            <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                {(bannerImage?.length || 0) + (restaurant?.gallery_json?.length || 0)} PHOTOS • SWIPE
              </Text>
            </View>
            <View style={localStyles.paginationDots}>
              {Array.from({ length: (bannerImage?.length || 0) + (restaurant?.gallery_json?.length || 0) }).map((_, i) => (
                <View key={i} style={[localStyles.dot, i === 0 && { backgroundColor: '#FFF', width: 12 }]} />
              ))}
            </View>
          </>
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
                   {bannerImage ? `UPLOAD ${bannerImage.length}` : "UPDATE GALLERY"}
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
            
            {tables.length === 0 ? (
              <TouchableOpacity 
                onPress={() => onInitializeTables(10)} 
                style={[styles.payoutChip, { backgroundColor: C.primary, marginTop: Spacing.sm, paddingHorizontal: 8 }]}
              >
                <Typography variant="hint" style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>
                  GENERATE TABLES
                </Typography>
              </TouchableOpacity>
            ) : (
              <View style={[styles.payoutChip, { backgroundColor: C.primary + '15', marginTop: Spacing.sm }]}>
                <Typography variant="hint" color="primary" style={{ fontSize: 10, fontWeight: '700' }}>
                  {tables.length - activeTables} Free
                </Typography>
              </View>
            )}
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
});

const localStyles = StyleSheet.create({
  topSellingCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20 },
  tsImage: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)' },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  paginationDots: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  }
});

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors as T } from '../../../theme';

const { width } = Dimensions.get('window');

// We use any types temporarily until Epic 2 (Strict Mode) covers UI components.
export function DashboardOverviewTab({ orders, inventory, salesHistory, showToast, styles }: any) {
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

  const salesCurve = salesHistory.curve || [];

  return (
    <View style={styles.tabContent}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.pageSubtitle}>Sales analytics overview</Text>
        </View>
        <TouchableOpacity
          style={styles.iconButtonOutlined}
          onPress={() => showToast('Report downloaded to device', 'success')}
        >
          <Ionicons name="download-outline" size={20} color={T.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: T.primary + '20' }]}>
            <Ionicons name="wallet-outline" size={16} color={T.primary} />
          </View>
          <Text style={styles.statValue}>ETB {totalRev.toLocaleString()}</Text>
          <Text style={styles.statLabel}>REVENUE</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: T.secondary + '20' }]}>
            <Ionicons name="cube-outline" size={16} color={T.secondary} />
          </View>
          <Text style={styles.statValue}>{orders.length}</Text>
          <Text style={styles.statLabel}>TOTAL ORDERS</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: T.tertiary + '20' }]}>
            <Ionicons name="hourglass-outline" size={16} color={T.tertiary} />
          </View>
          <Text style={styles.statValue}>{activeOrd}</Text>
          <Text style={styles.statLabel}>ACTIVE</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#06b6d4' + '20' }]}>
            <Ionicons name="alert-circle-outline" size={16} color="#06b6d4" />
          </View>
          <Text style={styles.statValue}>{lowStockCount}</Text>
          <Text style={styles.statLabel}>LOW STOCK</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.cardTitle}>Sales Trend</Text>
          <Text style={styles.pageSubtitle}>Daily volume for last 7 days</Text>
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
                        backgroundColor: val > 0.5 ? T.primary : T.primary + '80',
                        borderRadius: 4,
                      },
                    ]}
                  />
                  <Text style={styles.chartDayLabel}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.topSellingContainer}>
        <Text style={styles.cardTitle}>Top Products</Text>
        <View style={styles.topSellingList}>
          {inventory.slice(0, 3).map((item: any, i: any) => (
            <View key={i} style={styles.topSellingItem}>
              <Image source={{ uri: item.image_url }} style={styles.tsImage} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tsName}>{item.name}</Text>
                <Text style={styles.tsSales}>
                  {item.stock} in stock • {item.category}
                </Text>
              </View>
              <Text style={styles.tsPrice}>ETB {Number(item.price).toLocaleString()}</Text>
            </View>
          ))}
          {inventory.length === 0 && (
            <Text style={{ color: T.onVariant, textAlign: 'center' }}>No products listed</Text>
          )}
        </View>
      </View>
    </View>
  );
}

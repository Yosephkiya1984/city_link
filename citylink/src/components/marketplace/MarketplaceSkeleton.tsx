import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SW } from './constants';
import { SkeletonLoader } from '../index';
import { Spacing, Radius } from '../../theme';

const ProductSkeleton = () => (
  <View style={styles.productCard}>
    <SkeletonLoader lines={1} height={160} style={{ marginBottom: Spacing.md }} />
    <SkeletonLoader lines={1} height={12} style={{ width: '40%', marginBottom: Spacing.xs }} />
    <SkeletonLoader lines={1} height={16} style={{ width: '80%', marginBottom: Spacing.md }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <SkeletonLoader lines={1} height={20} style={{ width: '50%' }} />
      <SkeletonLoader lines={1} height={32} style={{ width: 32, borderRadius: 16 }} />
    </View>
  </View>
);

const MarketplaceSkeleton = () => (
  <View style={styles.grid}>
    {[1, 2, 3, 4, 5, 6].map((k) => (
      <ProductSkeleton key={k} />
    ))}
  </View>
);

export default MarketplaceSkeleton;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  productCard: {
    width: (SW - 52) / 2,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 0,
    marginBottom: Spacing.md,
  },
});

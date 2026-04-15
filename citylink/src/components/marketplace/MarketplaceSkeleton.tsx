import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { T, SW } from './constants';

const Shimmer = ({ style }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return <Animated.View style={[{ backgroundColor: T.surfaceHigh, opacity }, style]} />;
};

const ProductSkeleton = () => (
  <View style={styles.productCard}>
    <Shimmer style={{ height: 140, borderRadius: 10, marginBottom: 12 }} />
    <Shimmer style={{ height: 10, borderRadius: 5, width: '50%', marginBottom: 8 }} />
    <Shimmer style={{ height: 14, borderRadius: 5, width: '80%', marginBottom: 8 }} />
    <Shimmer style={{ height: 14, borderRadius: 5, width: '40%' }} />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  productCard: {
    width: (SW - 52) / 2,
    backgroundColor: T.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
    padding: 0,
    marginBottom: 4,
  },
});

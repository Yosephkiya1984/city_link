import React, { useRef, memo } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { T, SW } from './constants';
import { fmtETB } from '../../utils';

interface FeaturedCardProps {
  item: any;
  onPress: (item: any) => void;
}

const FeaturedCard = memo(({ item, onPress }: FeaturedCardProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  const img = item.image_url || item.images_json?.[0] || null;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.featuredCard, { transform: [{ scale }] }]}>
        {img ? (
          <Image source={{ uri: img }} style={styles.featuredImg} />
        ) : (
          <View style={styles.imgPlaceholder}>
            <Ionicons name="cube-outline" size={40} color={T.textMuted} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(12,14,18,0.95)']}
          style={styles.featuredGradient}
        />
        <View style={styles.featuredOverlay}>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>✦ FEATURED</Text>
          </View>
          <Text style={styles.featuredName} numberOfLines={2}>
            {item.name || item.title}
          </Text>
          <Text style={styles.featuredPrice}>ETB {fmtETB(item.price, 0)}</Text>
        </View>
        {item.stock > 0 && item.stock <= 5 && (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockText}>Only {item.stock} left</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

export default FeaturedCard;

const styles = StyleSheet.create({
  featuredCard: {
    width: SW * 0.78,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
  },
  featuredImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  imgPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: T.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  featuredBadge: {
    backgroundColor: T.primary + '20',
    borderWidth: 1,
    borderColor: T.primary + '60',
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  featuredBadgeText: { fontSize: 9, fontWeight: '800', color: T.primary, letterSpacing: 1 },
  featuredName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4, lineHeight: 22 },
  featuredPrice: { fontSize: 15, fontWeight: '700', color: T.primary },
  lowStockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: T.secondaryDim,
    borderWidth: 1,
    borderColor: T.secondary + '60',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lowStockText: { fontSize: 9, fontWeight: '800', color: T.secondary },
});

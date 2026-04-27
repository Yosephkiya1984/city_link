import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';
import { T, SW } from './constants';
import { fmtETB } from '../../utils';
import { Fonts, Radius, DarkColors as C } from '../../theme';

interface FeaturedCardProps {
  item: any;
  onPress: (item: any) => void;
}

const FeaturedCard = memo(({ item, onPress }: FeaturedCardProps) => {
  const img = item.image_url || item.images_json?.[0] || null;

  return (
    <MotiPressable
      onPress={() => onPress(item)}
      animate={({ pressed }) => {
        'worklet';
        return {
          scale: pressed ? 0.97 : 1,
        };
      }}
    >
      <View style={styles.featuredCard}>
        {img ? (
          <Image source={{ uri: img }} style={styles.featuredImg} />
        ) : (
          <View style={styles.imgPlaceholder}>
            <Ionicons name="cube-outline" size={40} color="rgba(255,255,255,0.1)" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.95)']}
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
      </View>
    </MotiPressable>
  );
});

export default FeaturedCard;

const styles = StyleSheet.create({
  featuredCard: {
    width: SW * 0.78,
    height: 240,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.edge,
    backgroundColor: C.surface,
  },
  featuredImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  imgPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: C.lift,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  featuredBadge: {
    backgroundColor: C.primary + '22',
    borderWidth: 1,
    borderColor: C.primary + '60',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  featuredBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: C.primary, letterSpacing: 1 },
  featuredName: { fontSize: 20, fontFamily: Fonts.bold, color: '#fff', marginBottom: 6, lineHeight: 26 },
  featuredPrice: { fontSize: 16, fontFamily: Fonts.headline, color: C.primary },
  lowStockBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lowStockText: { fontSize: 10, fontFamily: Fonts.bold, color: '#f59e0b' },
});

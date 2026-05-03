import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';
import { BlurView } from 'expo-blur';
import { T, SW } from './constants';
import { fmtETB, t } from '../../utils';
import { Fonts, Radius, DarkColors as C } from '../../theme';
import { useSystemStore } from '../../store/SystemStore';

interface FeaturedCardProps {
  item: any;
  onPress: (item: any) => void;
}

const FeaturedCard = memo(({ item, onPress }: FeaturedCardProps) => {
  const lang = useSystemStore((s) => s.lang);
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
      style={styles.pressable}
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
          <BlurView intensity={40} tint="dark" style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>✦ {t('featured_up')}</Text>
          </BlurView>
          <Text style={styles.featuredName} numberOfLines={2}>
            {item.name || item.title}
          </Text>
          <Text style={styles.featuredPrice}>ETB {fmtETB(item.price, 0)}</Text>
        </View>
        {item.stock > 0 && item.stock <= 5 && (
          <BlurView intensity={50} tint="dark" style={styles.lowStockBadge}>
            <Text style={styles.lowStockText}>{t('only_stock_left', { count: item.stock })}</Text>
          </BlurView>
        )}
      </View>
    </MotiPressable>
  );
});

export default FeaturedCard;

const styles = StyleSheet.create({
  pressable: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  featuredCard: {
    width: SW * 0.78,
    height: 250,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  featuredGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '80%' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24 },
  featuredBadge: {
    backgroundColor: C.primary + '22',
    borderWidth: 1,
    borderColor: C.primary + '60',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  featuredBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: C.primary, letterSpacing: 1.5 },
  featuredName: {
    fontSize: 22,
    fontFamily: Fonts.headline,
    color: '#fff',
    marginBottom: 8,
    lineHeight: 28,
  },
  featuredPrice: { fontSize: 18, fontFamily: Fonts.black, color: C.primary },
  lowStockBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  lowStockText: { fontSize: 10, fontFamily: Fonts.bold, color: '#f59e0b' },
});

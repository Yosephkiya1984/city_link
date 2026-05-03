import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';
import { BlurView } from 'expo-blur';
import { T, SW } from './constants';
import { fmtETB, t } from '../../utils';
import { Fonts, Radius, Spacing, Shadow, DarkColors as C } from '../../theme';
import { Surface, Typography } from '../../components';
import DEFAULT_ICON from '../../../assets/icon.png';
import { useSystemStore } from '../../store/SystemStore';

interface ProductCardProps {
  item: any;
  onPress: (item: any) => void;
}

const ProductCard = memo(({ item, onPress }: ProductCardProps) => {
  const lang = useSystemStore((s) => s.lang);
  const img = item.image_url || item.images_json?.[0] || null;
  const soldOut = (item.stock || 0) <= 0;
  const lowStock = !soldOut && (item.stock || 0) <= 5;

  const handlePress = () => {
    if (!soldOut) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(item);
    }
  };

  return (
    <MotiPressable
      onPress={handlePress}
      animate={({ pressed }) => {
        'worklet';
        return {
          scale: pressed ? 0.97 : 1,
        };
      }}
      style={styles.pressable}
    >
      <Surface variant="card" padding={0} style={[styles.productCard, soldOut && { opacity: 0.6 }]}>
        <View style={styles.productImgWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.productImg} defaultSource={DEFAULT_ICON} />
          ) : (
            <View
              style={[
                styles.productImg,
                { backgroundColor: C.lift, alignItems: 'center', justifyContent: 'center' },
              ]}
            >
              <Ionicons name="cube-outline" size={32} color={C.edge2} />
            </View>
          )}

          {soldOut && (
            <Surface variant="lift" style={[styles.stockBadge, { borderColor: '#ef444440' }]}>
              <Typography variant="label" style={{ color: '#ef4444', fontSize: 9 }}>
                {t('sold_out_up')}
              </Typography>
            </Surface>
          )}
          {lowStock && (
            <Surface variant="lift" style={[styles.stockBadge, { borderColor: '#f59e0b40' }]}>
              <Typography variant="label" style={{ color: '#f59e0b', fontSize: 9 }}>
                {t('only_stock_left', { count: item.stock })}
              </Typography>
            </Surface>
          )}
        </View>

        <View style={styles.productBody}>
          <Typography variant="label" color="sub" style={{ marginBottom: 4 }}>
            {(item.category || t('general')).toUpperCase()}
          </Typography>
          <Typography variant="h3" numberOfLines={2} style={{ height: 44, marginBottom: 12 }}>
            {item.name || item.title}
          </Typography>
          <View style={styles.productFooter}>
            <Typography variant="h3" color="primary">
              ETB {fmtETB(item.price, 0)}
            </Typography>
            <Surface
              variant="flat"
              style={[
                styles.buyQuickBtn,
                { backgroundColor: soldOut ? C.edge2 : C.primary + '15' },
              ]}
            >
              <Ionicons
                name={soldOut ? 'close' : 'cart'}
                size={16}
                color={soldOut ? C.sub : C.primary}
              />
            </Surface>
          </View>
        </View>
      </Surface>
    </MotiPressable>
  );
});

export default ProductCard;

const styles = StyleSheet.create({
  pressable: {
    width: (SW - 52) / 2,
    marginBottom: Spacing.md,
  },
  productCard: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  productImgWrap: { height: 160, position: 'relative' },
  productImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  stockBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productBody: { padding: Spacing.md },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buyQuickBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

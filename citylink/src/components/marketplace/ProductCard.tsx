import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';
import { T, SW } from './constants';
import { fmtETB } from '../../utils';
import { Fonts, Radius, DarkColors as C } from '../../theme';
import DEFAULT_ICON from '../../../assets/icon.png';

interface ProductCardProps {
  item: any;
  onPress: (item: any) => void;
}

const ProductCard = memo(({ item, onPress }: ProductCardProps) => {
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
          scale: pressed ? 0.96 : 1,
        };
      }}
      style={styles.pressable}
    >
      <View style={styles.productCard}>
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
              <Ionicons name="cube-outline" size={32} color="rgba(255,255,255,0.1)" />
            </View>
          )}
          {soldOut && (
            <View
              style={[styles.stockLabel, { backgroundColor: '#ef444422', borderColor: '#ef444440' }]}
            >
              <Text style={[styles.stockLabelText, { color: '#ef4444' }]}>SOLD OUT</Text>
            </View>
          )}
          {lowStock && (
            <View
              style={[styles.stockLabel, { backgroundColor: '#f59e0b22', borderColor: '#f59e0b40' }]}
            >
              <Text style={[styles.stockLabelText, { color: '#f59e0b' }]}>LOW STOCK</Text>
            </View>
          )}
        </View>

        <View style={styles.productBody}>
          <Text style={styles.productCat}>{(item.category || 'GENERAL').toUpperCase()}</Text>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name || item.title}
          </Text>
          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>ETB {fmtETB(item.price, 0)}</Text>
            <View style={[styles.buyQuickBtn, { borderColor: C.primary + '40' }, soldOut && { opacity: 0.4 }]}>
              <Ionicons name="flash" size={16} color={soldOut ? 'rgba(255,255,255,0.2)' : C.primary} />
            </View>
          </View>
        </View>
      </View>
    </MotiPressable>
  );
});

export default ProductCard;

const styles = StyleSheet.create({
  pressable: {
    width: (SW - 52) / 2,
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: C.surface,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.edge,
  },
  productImgWrap: { height: 160, position: 'relative' },
  productImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  stockLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stockLabelText: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  productBody: { padding: 14 },
  productCat: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Fonts.bold,
    letterSpacing: 1,
    marginBottom: 6,
  },
  productName: { fontSize: 15, fontFamily: Fonts.bold, color: '#FFF', lineHeight: 20, marginBottom: 12 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 16, fontFamily: Fonts.headline, color: C.primary },
  buyQuickBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

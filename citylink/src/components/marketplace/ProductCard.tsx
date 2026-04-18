import React, { useRef, memo } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { T, SW } from './constants';
import { fmtETB } from '../../utils';

interface ProductCardProps {
  item: any;
  onPress: (item: any) => void;
}

const ProductCard = memo(({ item, onPress }: ProductCardProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  const img = item.image_url || item.images_json?.[0] || null;
  const soldOut = (item.stock || 0) <= 0;
  const lowStock = !soldOut && (item.stock || 0) <= 5;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  const handlePress = () => {
    if (!soldOut) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(item);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.name || item.title}. Price: ${fmtETB(item.price, 0)} ETB.`}
      accessibilityHint="Navigates to product details"
    >
      <Animated.View style={[styles.productCard, { transform: [{ scale }] }]}>
        <View style={styles.productImgWrap}>
          {img ? (
            <Image
              source={{ uri: img }}
              style={styles.productImg}
              defaultSource={require('../../../assets/icon.png')}
            />
          ) : (
            <View
              style={[
                styles.productImg,
                { backgroundColor: T.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
              ]}
            >
              <Ionicons name="cube-outline" size={32} color={T.textMuted} />
            </View>
          )}
          {soldOut && (
            <View
              style={[styles.stockLabel, { backgroundColor: T.redDim, borderColor: '#ef444440' }]}
            >
              <Text style={[styles.stockLabelText, { color: T.red }]}>SOLD OUT</Text>
            </View>
          )}
          {lowStock && (
            <View
              style={[
                styles.stockLabel,
                { backgroundColor: T.secondaryDim, borderColor: '#f59e0b40' },
              ]}
            >
              <Text style={[styles.stockLabelText, { color: T.secondary }]}>LOW STOCK</Text>
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
            <View style={[styles.buyQuickBtn, soldOut && { opacity: 0.4 }]}>
              <Ionicons name="flash" size={16} color={soldOut ? T.textSub : T.primary} />
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

export default ProductCard;

const styles = StyleSheet.create({
  productCard: {
    width: (SW - 52) / 2,
    backgroundColor: T.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 4,
  },
  productImgWrap: { height: 145, position: 'relative' },
  productImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  stockLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  stockLabelText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  productBody: { padding: 12 },
  productCat: {
    fontSize: 9,
    color: T.textSub,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  productName: { fontSize: 13, fontWeight: '700', color: T.text, lineHeight: 17, marginBottom: 10 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 15, fontWeight: '800', color: T.primary },
  buyQuickBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: T.primaryDim,
    borderWidth: 1,
    borderColor: T.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Fonts, Radius, Shadow, FontSize } from '../../theme';
import { fmtDateTime, fmtETB, t } from '../../utils';
import { Transaction } from '../../types/domain_types';

interface TransactionItemProps {
  tx: Transaction;
  index: number;
  onPress?: () => void;
}

const TX_ICONS = {
  topup: 'arrow-up',
  send: 'send',
  parking: 'car',
  food: 'restaurant',
  rail: 'subway',
  bus: 'bus',
  ekub: 'people',
  job: 'briefcase',
  booking: 'calendar',
  marketplace_escrow: 'lock-closed',
  default: 'cash',
};

export function TransactionItem({ tx, index, onPress }: TransactionItemProps) {
  const C = useTheme();
  const [animValue] = useState(new Animated.Value(0));
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(animValue, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
    }, index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 200,
      friction: 4,
    }).start();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {
      /* ignore */
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const isCredit = tx.type === 'credit';
  const iconColor = isCredit ? C.green : C.red;
  const iconBgColor = isCredit ? C.green + '20' : C.red + '20';

  return (
    <Animated.View
      style={{
        transform: [
          { translateX: animValue.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
          { scale: scaleAnim },
        ],
        opacity: animValue,
        marginBottom: 12,
      }}
    >
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={0.8}
        style={{
          backgroundColor: C.surface,
          borderRadius: Radius.xl,
          padding: 16,
          borderWidth: 1.5,
          borderColor: C.edge2,
          ...Shadow.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: iconBgColor,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: iconColor + '40',
            }}
          >
            <Ionicons
              name={(TX_ICONS as Record<string, any>)[tx.category] || TX_ICONS.default}
              size={24}
              color={iconColor}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: C.text,
                fontSize: FontSize.md,
                fontFamily: Fonts.bold,
                marginBottom: 2,
              }}
            >
              {tx.description || t(`${tx.category}_label`)}
            </Text>
            <Text style={{ color: C.sub, fontSize: FontSize.sm, fontFamily: Fonts.medium }}>
              {fmtDateTime(tx.created_at)}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text
              style={{
                color: iconColor,
                fontSize: FontSize.lg,
                fontFamily: Fonts.black,
              }}
            >
              {isCredit ? '+' : '-'}
              {fmtETB(tx.amount, 0)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  backgroundColor: iconColor + '15',
                  borderRadius: Radius.full,
                  borderWidth: 1,
                  borderColor: iconColor + '30',
                }}
              >
                <Text
                  style={{
                    color: iconColor,
                    fontSize: FontSize.xs,
                    fontFamily: Fonts.bold,
                    textTransform: 'uppercase',
                  }}
                >
                  {tx.category}
                </Text>
              </View>
              {onPress && <Ionicons name="receipt-outline" size={14} color={C.hint} />}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

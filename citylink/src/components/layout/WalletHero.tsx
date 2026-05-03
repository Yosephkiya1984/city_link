import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Fonts, Spacing, Radius } from '../../theme';
import { fmtETB, t } from '../../utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { MotiView } from 'moti';

/**
 * SparklineChart — small visual indicator for wallet activity.
 */
import {
  Canvas,
  Path as SkiaPath,
  Skia,
  LinearGradient as SkiaGradient,
  vec,
} from '@shopify/react-native-skia';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';

export const SparklineChart = ({ data = [35, 10, 25, 5, 20] }: any) => {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(1, {
      duration: 1500,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, []);

  const path = React.useMemo(() => {
    const p = Skia.Path.Make();
    data.forEach((value: number, index: number) => {
      const x = (index / (data.length - 1)) * 96;
      const y = 40 - (value / 100) * 40;
      if (index === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    });
    return p;
  }, [data]);

  return (
    <View style={{ width: 96, height: 40 }}>
      <Canvas style={{ flex: 1 }}>
        <SkiaPath
          path={path}
          style="stroke"
          strokeWidth={2.5}
          strokeCap="round"
          strokeJoin="round"
          start={0}
          end={progress}
        >
          <SkiaGradient start={vec(0, 0)} end={vec(96, 0)} colors={['#59de9b', '#06b6d4']} />
        </SkiaPath>
      </Canvas>
    </View>
  );
};

export function WalletHero({ balance, name, greetingKey, onQuickAction }: any) {
  const C = useTheme() as any;
  const [showBalance, setShowBalance] = useState(true);

  const toggleBalance = () => {
    setShowBalance(!showBalance);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const quickActions = [
    { id: 'topup', icon: 'add-circle-outline', label: 'Top Up', color: '#59de9b' },
    { id: 'send', icon: 'paper-plane-outline', label: 'Send', color: '#06b6d4' },
    { id: 'history', icon: 'analytics-outline', label: 'History', color: '#f4b700' },
    { id: 'orders', icon: 'receipt-outline', label: 'Orders', color: '#ffd887' },
  ];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600, delay: 100 }}
      style={{
        paddingHorizontal: 16,
        marginBottom: 20,
      }}
    >
      <LinearGradient
        colors={C.liquidGrad || ['#22C97A', '#059669']}
        style={{ borderRadius: Radius.card, padding: 1, overflow: 'hidden' }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 20,
            }}
          >
            <View>
              <Text
                style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: Fonts.bold }}
              >
                {t(greetingKey)}, {name}
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 10,
                  fontFamily: Fonts.black,
                  marginTop: 4,
                  letterSpacing: 1.2,
                }}
              >
                LIQUIDITY POOL ACTIVE
              </Text>
            </View>
            <TouchableOpacity onPress={toggleBalance} style={{ padding: 8 }}>
              <Ionicons
                name={showBalance ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="rgba(255,255,255,0.4)"
              />
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: 24,
            }}
          >
            <View>
              <Text
                style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: Fonts.medium }}
              >
                Available Balance
              </Text>
              <Text style={{ color: '#fff', fontSize: 34, fontFamily: Fonts.black, marginTop: 4 }}>
                {showBalance ? `${fmtETB(balance, 2)}` : '••••••'}
              </Text>
            </View>
            <SparklineChart data={[40, 20, 60, 30, 80]} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={{ flex: 1, alignItems: 'center' }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onQuickAction?.(action.id);
                }}
              >
                <MotiView
                  from={{ scale: 1 }}
                  animate={{ scale: 1 }}
                  // @ts-ignore
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: action.color + '30',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name={action.icon as any} size={22} color={action.color} />
                </MotiView>
                <Text
                  style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LinearGradient>
    </MotiView>
  );
}

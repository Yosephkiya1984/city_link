import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Svg, Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { Fonts, Spacing } from '../../theme';
import { fmtETB, t } from '../../utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * SparklineChart — small visual indicator for wallet activity.
 */
export const SparklineChart = ({ data = [35, 10, 25, 5, 20] }: any) => {
  const points = data
    .map((value: any, index: number) => {
      const x = (index / (data.length - 1)) * 100;
      const y = value;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={{ width: 96, height: 40, opacity: 0.8 }}>
      <Svg width={96} height={40} viewBox="0 0 100 40">
        <Path
          d={`M ${points}`}
          fill="none"
          stroke="#59de9b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

export function WalletHero({ balance, name, greetingKey, onQuickAction, animValue }: any) {
  const C = useTheme();
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
    <Animated.View
      style={{
        opacity: animValue,
        transform: [
          { translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
        ],
        paddingHorizontal: 16,
        marginBottom: 20,
      }}
    >
      <LinearGradient
        colors={['#101319', '#050608']}
        style={{ borderRadius: 24, padding: 1, overflow: 'hidden' }}
      >
        <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 24 }}>
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
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: Fonts.bold }}
              >
                {t(greetingKey)}, {name}
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: 10,
                  fontFamily: Fonts.black,
                  marginTop: 4,
                }}
              >
                ACTIVE LEDGER
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
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: Fonts.medium }}
              >
                Available Balance
              </Text>
              <Text style={{ color: '#fff', fontSize: 32, fontFamily: Fonts.black, marginTop: 4 }}>
                {showBalance ? `${fmtETB(balance, 2)}` : '••••••'}
              </Text>
            </View>
            <SparklineChart />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={{ flex: 1, alignItems: 'center' }}
                onPress={() => onQuickAction?.(action.id)}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: action.color + '30',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name={action.icon as any} size={22} color={action.color} />
                </View>
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
    </Animated.View>
  );
}

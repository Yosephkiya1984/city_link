import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { FontSize, Fonts } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

export function LoadingRow({ text = 'Loading…', size = 'medium' }) {
  const C = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, []);

  const sizeConfig = {
    small: { indicator: 24, text: FontSize.sm, padding: 20 },
    medium: { indicator: 32, text: FontSize.md, padding: 40 },
    large: { indicator: 48, text: FontSize.lg, padding: 60 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  return (
    <View
      style={{
        padding: config.padding,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <Animated.View
        style={{
          transform: [
            {
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        }}
      >
        <Animated.View
          style={{
            width: config.indicator,
            height: config.indicator,
            borderRadius: config.indicator / 2,
            borderWidth: 3,
            borderTopColor: C.primary,
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.0] }),
          }}
        />
      </Animated.View>

      <Animated.Text
        style={{
          color: C.sub,
          fontFamily: Fonts.medium,
          fontSize: config.text,
          opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.0] }),
        }}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

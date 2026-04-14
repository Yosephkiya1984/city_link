import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { CButton } from '../ui/CButton';
import { Fonts } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

export function ErrorState({ icon = '⚠️', title, subtitle, action, onAction, style }: any) {
  const C = useTheme();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          padding: 40,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: shakeAnim }],
        },
        style,
      ]}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: C.red + '20',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: C.red + '40',
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 40 }}>{icon}</Text>
      </View>

      <Text
        style={{
          color: C.text,
          fontSize: 18,
          fontFamily: Fonts.black,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: C.sub,
          fontSize: 14,
          fontFamily: Fonts.medium,
          textAlign: 'center',
          lineHeight: 20,
          marginBottom: 24,
        }}
      >
        {subtitle}
      </Text>

      {action && onAction && (
        <CButton
          title={action}
          onPress={onAction}
          style={{ width: 'auto', paddingHorizontal: 32 }}
          variant="secondary"
        />
      )}
    </Animated.View>
  );
}

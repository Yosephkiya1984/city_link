import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, FontSize, Fonts, Shadow } from '../../theme';
import { useAppStore } from '../../store/AppStore';
import { useTheme } from '../../hooks/useTheme';

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <View style={{ position: 'absolute', top: 60, left: 16, right: 16, zIndex: 9999, gap: 10 }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </View>
  );
}

function ToastItem({ toast }) {
  const C = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const colorMap = { success: C.green, error: C.red, warning: C.amber, info: C.primary };
  const color = colorMap[toast.type] || C.primary;

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
        ],
        backgroundColor: C.surface,
        borderRadius: Radius.lg,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: color,
        ...Shadow.lg,
      }}
    >
      <Ionicons name="notifications" size={20} color={color} style={{ marginRight: 12 }} />
      <Text style={{ color: C.text, fontFamily: Fonts.medium, fontSize: FontSize.md, flex: 1 }}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

import { useRef } from 'react';
import { Animated } from 'react-native';

export function usePressAnim(toScale = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: toScale,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  return { scale, onPressIn, onPressOut };
}

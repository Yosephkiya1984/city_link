import React, { useCallback } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useTheme } from '../../hooks/useTheme';
import { Fonts, Radius } from '../../theme';

export function ServiceTile({ service, onPress, index }: any) {
  const C = useTheme();
  const [pressed, setPressed] = React.useState(false);

  const handlePressIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPressed(true);
  }, []);

  const handlePressOut = useCallback(() => {
    setPressed(false);
  }, []);

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8, translateY: 20 }}
      animate={{ 
        opacity: 1, 
        scale: pressed ? 0.94 : 1, 
        translateY: 0 
      }}
      transition={{
        type: 'spring',
        delay: index * 40,
        damping: 15,
      }}
      style={{
        width: '33.33%',
        aspectRatio: 1,
        padding: 6,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={{
          flex: 1,
          backgroundColor: C.surface,
          borderRadius: Radius.card,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
          borderWidth: 1,
          borderColor: pressed ? C.primary : C.edge2,
          // Subtle shadow for premium feel
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <MotiView
          animate={{ scale: pressed ? 1.1 : 1 }}
          transition={{ type: 'spring', damping: 10 }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: service.color + (pressed ? '30' : '15'),
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          <Ionicons name={service.icon} size={22} color={service.color} />
        </MotiView>
        <Text
          style={{
            color: pressed ? C.primary : C.text,
            fontSize: 10,
            fontFamily: Fonts.black,
            textAlign: 'center',
          }}
        >
          {service.id.toUpperCase()}
        </Text>
      </TouchableOpacity>
    </MotiView>
  );
}

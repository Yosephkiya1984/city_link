import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, FontSize, Radius } from '../../theme';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  subtitle?: string;
  color?: string;
}

export function EmptyState({
  icon = 'folder-open-outline',
  title = 'Nothing here yet',
  subtitle = '',
  color = '#8E8E93',
}: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
      <View style={{
        width: 72, height: 72, borderRadius: Radius['2xl'],
        backgroundColor: `${color}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <Ionicons name={icon as any} size={32} color={color} />
      </View>
      <Text style={{ fontFamily: Fonts.bold, fontSize: FontSize.lg, color, textAlign: 'center', marginBottom: 6 }}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={{ fontFamily: Fonts.regular, fontSize: FontSize.sm, color: `${color}99`, textAlign: 'center' }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export default EmptyState;

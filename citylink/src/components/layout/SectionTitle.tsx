import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, FontSize, Fonts } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface SectionTitleProps {
  title: any;
  subtitle?: any;
  action?: any;
  onAction?: any;
  icon?: any;
  rightLabel?: any;
  onRightPress?: any;
  style?: any;
}

export function SectionTitle({
  title,
  subtitle,
  action,
  onAction,
  icon,
  rightLabel,
  onRightPress,
  style,
}: SectionTitleProps) {
  const C = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Spacing.lg,
          marginTop: Spacing.xl,
          marginBottom: Spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon && <Ionicons name={icon} size={16} color={C.primary} />}
          <Text
            style={{
              fontSize: FontSize.sm,
              fontFamily: Fonts.black,
              color: C.text,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
            }}
          >
            {title}
          </Text>
        </View>
        {subtitle && (
          <Text
            style={{
              fontSize: FontSize.xs,
              color: C.sub,
              fontFamily: Fonts.regular,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {(action || rightLabel) && (
        <TouchableOpacity onPress={onAction || onRightPress}>
          <Text style={{ fontSize: FontSize.sm, color: C.primary, fontFamily: Fonts.bold }}>
            {action || rightLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

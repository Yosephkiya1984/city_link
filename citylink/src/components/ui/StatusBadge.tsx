import React from 'react';
import { View, Text } from 'react-native';
import { Radius, FontSize, Fonts } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

export function StatusBadge({ status, variant = 'default', size = 'sm', style }) {
  const C = useTheme();

  const statusConfig = {
    active: { color: C.green, bg: C.green + '20', label: 'Active' },
    inactive: { color: C.sub, bg: C.edge2, label: 'Inactive' },
    pending: { color: C.amber, bg: C.amber + '20', label: 'Pending' },
    verified: { color: C.primary, bg: C.primary + '20', label: 'Verified' },
    premium: { color: C.purple || '#8B5CF6', bg: (C.purple || '#8B5CF6') + '20', label: 'Premium' },
    default: { color: C.sub, bg: C.edge2, label: String(status || '---') },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.default;
  const sizeConfig = {
    sm: { padding: 4, fontSize: FontSize.xs, borderRadius: Radius.sm },
    md: { padding: 6, fontSize: FontSize.sm, borderRadius: Radius.md },
    lg: { padding: 8, fontSize: FontSize.md, borderRadius: Radius.lg },
  };

  const currentSize = sizeConfig[size] || sizeConfig.sm;

  return (
    <View
      style={[
        {
          backgroundColor: config.bg,
          paddingHorizontal: currentSize.padding + 4,
          paddingVertical: currentSize.padding,
          borderRadius: currentSize.borderRadius,
          borderWidth: 1,
          borderColor: config.color + '40',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: config.color,
          fontSize: currentSize.fontSize,
          fontFamily: Fonts.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}

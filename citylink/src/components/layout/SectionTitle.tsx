import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, FontSize, Fonts } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface SectionTitleProps {
  title: any;
  action?: any;
  onAction?: any;
  icon?: any;
}

export function SectionTitle({ title, action, onAction, icon }: SectionTitleProps) {
  const C = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.xl,
        marginBottom: Spacing.md,
      }}
    >
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
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ fontSize: FontSize.sm, color: C.primary, fontFamily: Fonts.bold }}>
            {action}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

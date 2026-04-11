import React from 'react';
import { ScrollView, TouchableOpacity, Text, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Radius, Shadow } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface ChipBarProps {
  chips: any[];
  selected: any;
  onSelect: (val: any) => void;
  style?: ViewStyle;
}

export function ChipBar({ chips, selected, onSelect, style }: ChipBarProps) {
  const C = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[{ paddingHorizontal: 16, gap: 8, marginBottom: 16 }, style]}
    >
      {chips.map((chip) => {
        const isSel = selected?.value === chip.value || selected === chip;
        const label = chip.label || chip;
        const val = chip.value || chip;

        return (
          <TouchableOpacity
            key={val}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (_) {}
              onSelect(val);
            }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: Radius.full,
              backgroundColor: isSel ? C.primary : C.surface,
              borderWidth: 1.5,
              borderColor: isSel ? C.primary : C.edge2,
              ...Shadow.sm,
            }}
          >
            <Text
              style={{
                color: isSel ? C.white : C.text,
                fontWeight: isSel ? 'bold' : '500',
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Shadow, FontSize, Fonts, Spacing } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface CSelectOption {
  value: string;
  label: string;
}

interface CSelectProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: CSelectOption[];
  style?: any;
}

export function CSelect({ label, value, onValueChange, options, style }: CSelectProps) {
  const C = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={[{ marginBottom: Spacing.lg }, style]}>
      {label && <Text style={{ fontSize: FontSize.xs, fontFamily: Fonts.bold, color: C.sub, marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: 1.2 }}>{label}</Text>}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.edge2, borderRadius: Radius.lg,
          paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          ...Shadow.sm,
        }}>
        <Text style={{ color: selected ? C.text : C.hint, fontSize: FontSize.lg, fontFamily: Fonts.medium }}>
          {selected ? selected.label : 'Select…'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={C.primary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: C.ink, borderTopLeftRadius: 32, borderTopRightRadius: 32,
          padding: 24, maxHeight: 500, ...Shadow.lg }}>
          <View style={{ width: 40, height: 5, backgroundColor: C.edge2, borderRadius: 3,
            alignSelf: 'center', marginBottom: 24 }} />
          <Text style={{ color: C.text, fontSize: FontSize.xl, fontFamily: Fonts.black, marginBottom: 24,
            textTransform: 'uppercase', letterSpacing: 1 }}>
            {label || 'Choose Option'}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <TouchableOpacity key={opt.value}
                onPress={() => { onValueChange(opt.value); setOpen(false); }}
                style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.glass2,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: opt.value === value ? C.primary : C.text, fontSize: FontSize.lg,
                  fontFamily: opt.value === value ? Fonts.bold : Fonts.regular }}>
                  {opt.label}
                </Text>
                {opt.value === value && <Ionicons name="checkmark-circle" size={24} color={C.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

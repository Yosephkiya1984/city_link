import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Shadow, Fonts } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

export function SearchBar({ value, onChangeText, placeholder = 'Search…', style }) {
  const C = useTheme();
  return (
    <View style={[{ paddingHorizontal: 16, marginBottom: 12 }, style]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: C.surface,
          borderRadius: Radius.lg,
          borderWidth: 1.5,
          borderColor: C.edge2,
          paddingHorizontal: 12,
          height: 48,
          ...Shadow.sm,
        }}
      >
        <Ionicons name="search" size={20} color={C.hint} style={{ marginRight: 8 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.hint}
          style={{ flex: 1, color: C.text, fontSize: 15, fontFamily: Fonts.medium }}
        />
        {value?.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Ionicons name="close-circle" size={18} color={C.hint} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

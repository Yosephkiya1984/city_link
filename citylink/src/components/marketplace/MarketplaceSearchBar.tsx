import React, { memo } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from './constants';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onSubmit?: () => void;
}

const MarketplaceSearchBar = memo(({ value, onChangeText, onClear, onSubmit }: SearchBarProps) => (
  <View style={styles.searchWrap}>
    <Ionicons name="search" size={18} color={T.textSub} style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder="Search products..."
      placeholderTextColor={T.textSub}
      value={value}
      onChangeText={onChangeText}
      returnKeyType="search"
      onSubmitEditing={onSubmit}
    />
    {value.length > 0 && (
      <TouchableOpacity 
        onPress={onClear} 
        style={styles.clearBtn}
        accessibilityLabel="Clear search text"
        accessibilityRole="button"
      >
        <Ionicons name="close-circle" size={18} color={T.textSub} />
      </TouchableOpacity>
    )}
  </View>
));

export default MarketplaceSearchBar;

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: T.text, fontWeight: '500' },
  clearBtn: { padding: 4 },
});

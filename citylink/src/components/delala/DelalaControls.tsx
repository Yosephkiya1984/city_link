import React, { memo } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './constants';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const DelalaSearchBar = memo(({ value, onChangeText }: SearchBarProps) => (
  <View style={styles.searchContainer}>
    <Ionicons name="search" size={20} color={COLORS.outline} style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      value={value}
      onChangeText={onChangeText}
      placeholder="Search properties in Addis Ababa..."
      placeholderTextColor={COLORS.outline}
    />
  </View>
));

interface CategoryFilterProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export const DelalaCategoryFilter = memo(({ categories, selected, onSelect }: CategoryFilterProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.categoryFilter}
    contentContainerStyle={styles.categoryFilterContent}
  >
    {categories.map((category) => (
      <TouchableOpacity
        key={category}
        onPress={() => onSelect(category)}
        style={[styles.categoryChip, selected === category && styles.activeCategoryChip]}
      >
        <Text
          style={[
            styles.categoryChipText,
            selected === category && styles.activeCategoryChipText,
          ]}
        >
          {category}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
));

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS['outline-variant'],
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS['on-surface'],
  },
  categoryFilter: {
    marginBottom: 16,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS['surface-container-low'],
    borderWidth: 1,
    borderColor: COLORS['outline-variant'],
  },
  activeCategoryChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS['on-surface-variant'],
  },
  activeCategoryChipText: {
    color: COLORS['on-primary'],
  },
});

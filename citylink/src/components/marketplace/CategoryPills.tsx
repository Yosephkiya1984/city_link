import React, { memo } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { T, CATEGORIES } from './constants';

interface CategoryPillsProps {
  selected: string;
  onSelect: (catId: string) => void;
}

const CategoryPills = memo(({ selected, onSelect }: CategoryPillsProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.pillRow}
    contentContainerStyle={{ paddingRight: 20, gap: 8 }}
  >
    {CATEGORIES.map((cat: any) => {
      const active = selected === cat.id;
      return (
        <TouchableOpacity
          key={cat.id}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(cat.id);
          }}
          style={[
            styles.pill,
            active && { backgroundColor: cat.color + '22', borderColor: cat.color + '60' },
          ]}
        >
          <Ionicons name={cat.icon as any} size={13} color={active ? cat.color : T.textSub} />
          <Text style={[styles.pillText, active && { color: cat.color, fontWeight: '700' }]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
));

export default CategoryPills;

const styles = StyleSheet.create({
  pillRow: { paddingLeft: 20, marginBottom: 24, marginTop: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  pillText: { fontSize: 12, color: T.textSub, fontWeight: '600' },
});

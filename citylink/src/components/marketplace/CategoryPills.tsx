import React, { memo } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView, MotiText } from 'moti';
import { MotiPressable } from 'moti/interactions';
import { T, CATEGORIES } from './constants';
import { Fonts, Radius } from '../../theme';

interface CategoryPillsProps {
  selected: string;
  onSelect: (catId: string) => void;
}

const CategoryPills = memo(({ selected, onSelect }: CategoryPillsProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.pillRow}
    contentContainerStyle={{ paddingRight: 20, gap: 10 }}
  >
    {CATEGORIES.map((cat: any) => {
      const active = selected === cat.id;
      return (
        <MotiPressable
          key={cat.id}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(cat.id);
          }}
          animate={({ hovered, pressed }) => {
            'worklet';
            return {
              scale: pressed ? 0.95 : hovered ? 1.05 : 1,
            };
          }}
        >
          <MotiView
            animate={{
              backgroundColor: active ? cat.color + '22' : T.surface,
              borderColor: active ? cat.color + '60' : T.border,
            }}
            transition={{ type: 'timing', duration: 250 }}
            style={styles.pill}
          >
            <Ionicons name={cat.icon as any} size={14} color={active ? cat.color : T.textSub} />
            <MotiText
              animate={{
                color: active ? cat.color : T.textSub,
                fontWeight: active ? '700' : '600',
              }}
              style={styles.pillText}
            >
              {cat.name}
            </MotiText>
          </MotiView>
        </MotiPressable>
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1.2,
  },
  pillText: { fontSize: 13, fontFamily: Fonts.bold },
});

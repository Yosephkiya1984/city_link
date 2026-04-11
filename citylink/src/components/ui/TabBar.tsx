import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Fonts, FontSize, Radius } from '../../theme';

interface TabBarProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  color?: string;
  bgColor?: string;
  textColor?: string;
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  color = '#59de9b',
  bgColor = '#1d2025',
  textColor = '#8E8E93',
}: TabBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => onTabChange(tab)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: Radius.xl,
            backgroundColor: activeTab === tab ? `${color}20` : bgColor,
            borderWidth: 1.5,
            borderColor: activeTab === tab ? `${color}50` : 'transparent',
          }}
        >
          <Text style={{
            fontFamily: activeTab === tab ? Fonts.bold : Fonts.medium,
            fontSize: FontSize.sm,
            color: activeTab === tab ? color : textColor,
          }}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default TabBar;

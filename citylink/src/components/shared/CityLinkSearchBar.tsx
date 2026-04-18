import React, { memo } from 'react';
import { View, TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CityLinkSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  iconColor?: string;
  placeholderTextColor?: string;
}

const CityLinkSearchBar = memo(
  ({
    value,
    onChangeText,
    placeholder = 'Search...',
    containerStyle,
    inputStyle,
    iconColor = '#869489',
    placeholderTextColor = '#869489',
  }: CityLinkSearchBarProps) => {
    return (
      <View style={[styles.container, containerStyle]}>
        <Ionicons name="search" size={20} color={iconColor} style={styles.icon} />
        <TextInput
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          autoCapitalize="none"
        />
      </View>
    );
  }
);

export default CityLinkSearchBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1d2025',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#3d4a41',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#e1e2ea',
    padding: 0, // Reset default padding
  },
});

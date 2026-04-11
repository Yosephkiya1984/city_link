import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Fonts } from '../../theme';

export function LiveTransit({ animValue }) {
  const C = useTheme();

  return (
    <Animated.View style={[styles.statsCard, { 
      backgroundColor: C.surface,
      borderColor: C.edge2,
      opacity: animValue, 
      transform: [{ scale: animValue }] 
    }]}>
      <View style={styles.transitHeader}>
        <Text style={[styles.transitTitle, { color: C.sub }]}>TRANSIT TRACKER</Text>
        <View style={[styles.liveIndicator, { backgroundColor: C.red + '20' }]}>
          <Text style={[styles.liveText, { color: C.red }]}>LIVE</Text>
        </View>
      </View>
      <View style={styles.transitContent}>
        <Text style={[styles.transitLineName, { color: C.text }]}>E-W LRT Line</Text>
        <Text style={[styles.transitNext, { color: '#06b6d4' }]}>Coming in 4m</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  transitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transitTitle: {
    fontSize: 10,
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
  liveIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  transitContent: {
    flex: 1,
    justifyContent: 'center',
  },
  transitLineName: {
    fontSize: 16,
    fontFamily: Fonts.black,
  },
  transitNext: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    marginTop: 2,
  },
});

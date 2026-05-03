import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors as T, Fonts } from '../../theme';

interface AgentStatsRowProps {
  stats: {
    todayDeliveries: number;
    todayEarnings: number;
    rating: number;
  };
}

export function AgentStatsRow({ stats }: AgentStatsRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.statCard}>
        <Ionicons name="bicycle" size={18} color={T.primary} />
        <View>
          <Text style={styles.statValue}>{stats.todayDeliveries}</Text>
          <Text style={styles.statLabel}>DELIVERIES</Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <Ionicons name="wallet" size={18} color={T.green} />
        <View>
          <Text style={styles.statValue}>ETB {stats.todayEarnings}</Text>
          <Text style={styles.statLabel}>EARNINGS</Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <Ionicons name="star" size={18} color={T.yellow} />
        <View>
          <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>RATING</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: T.edge,
  },
  statValue: {
    color: T.text,
    fontSize: 14,
    fontFamily: Fonts.black,
  },
  statLabel: {
    color: T.textSoft,
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { D, Radius, Fonts, Spacing, Shadow } from './StitchTheme';
import { Typography, Surface } from '../../../components';

const { width } = Dimensions.get('window');
const GRID_SIZE = 8;
const CELL_SIZE = (width - 40) / GRID_SIZE;

interface Spot {
  id: string;
  number: string;
  status: 'available' | 'occupied' | 'reserved' | 'vip';
  x: number;
  y: number;
}

interface VisualLotMapProps {
  spots: Spot[];
  onSpotPress: (spot: Spot) => void;
  editMode: boolean;
}

export function VisualLotMap({ spots, onSpotPress, editMode }: VisualLotMapProps) {
  return (
    <Surface variant="lift" style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h3">Lot Navigation</Typography>
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: D.primary }]} />
          <Typography variant="hint">Free</Typography>
          <View style={[styles.dot, { backgroundColor: D.gold, marginLeft: 8 }]} />
          <Typography variant="hint">Full</Typography>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {/* Background Grid Lines */}
          <View style={styles.gridOverlay}>
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
              <View key={i} style={styles.gridCell} />
            ))}
          </View>

          {/* Spots */}
          {spots.map((spot) => (
            <TouchableOpacity
              key={spot.id}
              onPress={() => onSpotPress(spot)}
              style={[
                styles.spot,
                {
                  left: spot.x * CELL_SIZE,
                  top: spot.y * CELL_SIZE,
                  backgroundColor: spot.status === 'occupied' ? D.gold : D.primary + '20',
                  borderColor: spot.status === 'occupied' ? D.gold : D.primary,
                },
              ]}
            >
              <MotiView
                from={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                style={styles.spotInner}
              >
                <Ionicons 
                  name={spot.status === 'occupied' ? 'car-sport' : 'cube-outline'} 
                  size={16} 
                  color={spot.status === 'occupied' ? D.ink : D.primary} 
                />
                <Text style={[styles.spotNum, { color: spot.status === 'occupied' ? D.ink : D.primary }]}>
                  {spot.number}
                </Text>
              </MotiView>
              
              {spot.status === 'vip' && (
                <View style={styles.vipBadge}>
                  <Ionicons name="star" size={8} color={D.ink} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Typography variant="hint" color="sub">Drag to view entire lot. Tap spot to manage session.</Typography>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: Radius['2xl'], overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  legend: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  gridContainer: {
    width: CELL_SIZE * GRID_SIZE,
    height: CELL_SIZE * GRID_SIZE,
    position: 'relative',
    backgroundColor: D.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: D.edge,
  },
  gridOverlay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 0.5,
    borderColor: D.lift + '30',
  },
  spot: {
    position: 'absolute',
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    margin: 2,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.primary,
  },
  spotInner: { alignItems: 'center', justifyContent: 'center' },
  spotNum: { fontSize: 10, fontFamily: Fonts.black, marginTop: 2 },
  vipBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: D.gold, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  footer: { marginTop: 12, alignItems: 'center' },
});

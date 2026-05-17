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
import { Radius, Spacing, Fonts, Shadow, D } from '../../../components/hospitality/HospitalityTheme';
import { Typography, GlassCard, GlassView } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';

const GRID_SIZE = 8;
const CELL_SIZE = 40;

interface VisualLotMapProps {
  spots: any[];
  currentLotName?: string;
  onSpotPress: (spot: any) => void;
  editMode?: boolean;
}

export function VisualLotMap({ spots = [], currentLotName, onSpotPress, editMode }: VisualLotMapProps) {
  const C = useTheme();
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 40);
  const cellSize = containerWidth / GRID_SIZE;
  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h3">{currentLotName || 'Lot Grid'}</Typography>
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: C.primary }]} />
          <Typography variant="hint" style={{ marginRight: 8, marginLeft: 4 }}>Free</Typography>
          <View style={[styles.dot, { backgroundColor: C.gold }]} />
          <Typography variant="hint" style={{ marginLeft: 4 }}>Full</Typography>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <GlassView 
          style={[styles.gridContainer, { width: containerWidth, height: containerWidth, backgroundColor: C.surface, borderColor: C.edge }]}
          onLayout={(e) => {
            const { width } = e.nativeEvent.layout;
            if (width > 0) setContainerWidth(width);
          }}
        >
          {/* Background Grid Lines */}
          <View style={styles.gridOverlay}>
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
              <View key={i} style={[styles.gridCell, { width: cellSize, height: cellSize, borderColor: C.lift + '30' }]} />
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
                  left: spot.x * cellSize,
                  top: spot.y * cellSize,
                  width: cellSize - 4,
                  height: cellSize - 4,
                  backgroundColor: spot.status === 'occupied' ? C.gold : C.primary + '20',
                  borderColor: spot.status === 'occupied' ? C.gold : C.primary,
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
                  color={spot.status === 'occupied' ? '#000' : C.primary} 
                />
                <Text style={[styles.spotNum, { color: spot.status === 'occupied' ? '#000' : C.primary }]}>
                  {spot.number}
                </Text>
              </MotiView>
              
              {spot.status === 'vip' && (
                <View style={[styles.vipBadge, { backgroundColor: C.gold }]}>
                  <Ionicons name="star" size={8} color="#000" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </GlassView>
      </ScrollView>

      <View style={styles.footer}>
        <Typography variant="hint" color="sub">Drag to view entire lot. Tap spot to manage session.</Typography>
      </View>
    </GlassCard>
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
    borderRadius: Radius.lg,
    borderWidth: 1,
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
  vipBadge: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  footer: { marginTop: 12, alignItems: 'center' },
});

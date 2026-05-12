import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Fonts } from '../../../theme';

const { width } = Dimensions.get('window');
const DIAL_SIZE = width * 0.65;
const RADIUS = (DIAL_SIZE - 40) / 2;
const CENTER = DIAL_SIZE / 2;

interface Props {
  value: number;
  onValueChange: (val: number) => void;
  maxHours?: number;
}

export const ParkingDurationDial: React.FC<Props> = ({ 
  value, 
  onValueChange, 
  maxHours = 12 
}) => {
  const [internalValue, setInternalValue] = useState(value);

  const calculateValue = useCallback((x: number, y: number) => {
    'worklet';
    const dx = x - CENTER;
    const dy = y - CENTER;
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;

    const newValue = Math.max(1, Math.round((angle / (2 * Math.PI)) * maxHours));
    return newValue;
  }, [maxHours]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        // Adjust if we are moving the whole pan instead of just local
        const val = calculateValue(locationX, locationY);
        if (val !== internalValue) {
          setInternalValue(val);
          onValueChange(val);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderRelease: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
    })
  ).current;

  // SVG Path for arc
  const angle = (internalValue / maxHours) * 2 * Math.PI;
  const endX = CENTER + RADIUS * Math.sin(angle);
  const endY = CENTER - RADIUS * Math.cos(angle);
  const largeArcFlag = angle > Math.PI ? 1 : 0;

  const d = `
    M ${CENTER} ${CENTER - RADIUS}
    A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${endX} ${endY}
  `;

  return (
    <View style={styles.container}>
      <View style={styles.dialWrapper} {...panResponder.panHandlers}>
        <Svg width={DIAL_SIZE} height={DIAL_SIZE}>
          {/* Background Track */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="12"
            fill="none"
          />
          {/* Progress Arc */}
          <Path
            d={d}
            stroke="#D4AF37"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
          />
          {/* Knob */}
          <G x={endX} y={endY}>
            <Circle r="16" fill="#D4AF37" />
            <Circle r="6" fill="#0B0D11" />
          </G>
        </Svg>
        
        <View style={styles.centerContent} pointerEvents="none">
          <Text style={styles.valueText}>{internalValue}</Text>
          <Text style={styles.unitText}>{internalValue === 1 ? 'HOUR' : 'HOURS'}</Text>
        </View>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Estimated Stay</Text>
        <Text style={styles.infoValue}>Auto-extends after {internalValue}h</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  dialWrapper: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 64,
    color: '#FFF',
    fontFamily: Fonts.headline,
    fontWeight: '800',
  },
  unitText: {
    fontSize: 14,
    color: '#D4AF37',
    fontFamily: Fonts.body,
    letterSpacing: 2,
    marginTop: -8,
  },
  infoRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: Fonts.body,
  },
  infoValue: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: Fonts.body,
    marginTop: 4,
  },
});

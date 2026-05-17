import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useNavigation } from '@react-navigation/native';
import { useWalletStore } from '../../store/WalletStore';
import { useTheme } from '../../hooks/useTheme';
import { Fonts, Radius, Spacing } from '../../theme';
import { fmtETB } from '../../utils';
import { LinearGradient } from 'expo-linear-gradient';

export const ParkingActiveBanner = () => {
  const activeParking = useWalletStore((s) => s.activeParking);
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeParking) {
      interval = setInterval(() => {
        const secs = Math.floor((Date.now() - new Date(activeParking.start_time).getTime()) / 1000);
        setElapsed(secs);
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeParking]);

  if (!activeParking) return null;

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getCurrentFare = () => {
    const rate = Number(activeParking.rate_per_hour) || 15;
    const hours = Math.min(elapsed / 3600, 12); // 12h safety cap
    return Math.ceil(hours * rate * 10) / 10;
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: -20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 15 }}
      style={styles.container}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Parking')}
      >
        <LinearGradient
          colors={['#2D7EF0', '#1B2030']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.left}>
              <View style={styles.iconContainer}>
                <Ionicons name="car" size={20} color="#FFF" />
              </View>
              <View>
                <Text style={styles.title}>Active Parking Session</Text>
                <Text style={styles.subtitle}>
                  {(activeParking as any).lot_name || 'Parking Zone'} · {(activeParking as any).spot_number}
                </Text>
              </View>
            </View>
            <View style={styles.right}>
              <Text style={styles.timer}>{formatTime(elapsed)}</Text>
              <Text style={styles.fare}>{fmtETB(getCurrentFare())}</Text>
            </View>
          </View>
          
          <View style={styles.pinContainer}>
            <View style={styles.pinBadge}>
              <Ionicons name="key" size={12} color="#D4AF37" />
              <Text style={styles.pinLabel}>EXIT PIN:</Text>
              <Text style={styles.pinValue}>{(activeParking as any).pin || '---'}</Text>
            </View>
            <Text style={styles.tapPrompt}>Tap to manage session</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradient: {
    padding: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  right: {
    alignItems: 'flex-end',
  },
  timer: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: Fonts.black,
  },
  fare: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
  },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  pinLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontFamily: Fonts.bold,
  },
  pinValue: {
    color: '#D4AF37',
    fontSize: 14,
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
  tapPrompt: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: Fonts.medium,
  },
});

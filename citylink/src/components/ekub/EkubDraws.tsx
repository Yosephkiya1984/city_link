import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './constants';
import { Fonts, Shadow } from '../../theme';

interface LiveDrawBannerProps {
  onEnterDraw: () => void;
}

export const LiveDrawBanner = memo(({ onEnterDraw }: LiveDrawBannerProps) => (
  <View style={styles.liveDrawBanner}>
    <LinearGradient
      colors={[COLORS['surface-container-high'], COLORS['surface-container-low']]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.ekubGradient}
    />
    <Ionicons name="sparkles" size={80} color="rgba(89, 222, 155, 0.05)" style={styles.campaignIcon} />
    
    <View style={styles.bannerContent}>
      <View style={styles.bannerHeader}>
        <View style={styles.bannerTitle}>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>Live Draw</Text>
          </View>
          <Text style={styles.bannerTitleText}>Weekend Win</Text>
        </View>
        <View style={styles.bannerStatus}>
          <Text style={styles.statusText}>Prize Pot</Text>
          <Text style={styles.statusValue}>ETB 25,000</Text>
        </View>
      </View>

      <View style={styles.participants}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.participant}>
            <Ionicons name="person" size={20} color={COLORS.outline} />
          </View>
        ))}
        <View style={styles.participantsPlus}>
          <Text style={styles.participantsPlusText}>+12</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.enterDrawButton} onPress={onEnterDraw}>
        <View style={styles.enterDrawTouchable}>
          <Text style={styles.enterDrawText}>Enter Free Draw</Text>
        </View>
      </TouchableOpacity>
    </View>
  </View>
));

const styles = StyleSheet.create({
  liveDrawBanner: { position: 'relative', overflow: 'hidden', backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, marginBottom: 32, ...Shadow.xl, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  ekubGradient: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  campaignIcon: { position: 'absolute', top: 16, right: 16 },
  bannerContent: { position: 'relative', zIndex: 10, flexDirection: 'column', gap: 16 },
  bannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bannerTitle: { flex: 1, gap: 4 },
  liveBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.primary, borderRadius: 8 },
  liveBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS['on-primary'], fontFamily: Fonts.label, textTransform: 'uppercase' },
  bannerTitleText: { fontSize: 24, fontWeight: '700', color: COLORS['on-surface'], fontFamily: Fonts.headline },
  bannerStatus: { alignItems: 'flex-end', gap: 4 },
  statusText: { fontSize: 12, color: COLORS.outline, fontFamily: Fonts.body },
  statusValue: { fontSize: 16, fontWeight: '700', color: COLORS.secondary, fontFamily: Fonts.headline },
  participants: { flexDirection: 'row', alignItems: 'center', gap: -12 },
  participant: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: COLORS.surface, backgroundColor: COLORS['surface-container-high'], alignItems: 'center', justifyContent: 'center' },
  participantsPlus: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS['surface-container-highest'], borderWidth: 2, borderColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  participantsPlusText: { fontSize: 10, fontWeight: '700', fontFamily: Fonts.headline, color: COLORS['on-surface'] },
  enterDrawButton: { alignSelf: 'flex-start' },
  enterDrawTouchable: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  enterDrawText: { fontSize: 14, fontWeight: '700', color: COLORS['on-primary'], fontFamily: Fonts.label },
});

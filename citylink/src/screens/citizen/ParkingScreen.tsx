/**
 * ParkingScreen — Citizen parking module.
 *
 * Decomposed from a 1,022-line monolith into:
 *  - useParking hook (business logic, state, data fetching)
 *  - ParkingScreen.styles.ts (500+ lines of StyleSheet)
 *  - This file (pure render, ~230 lines)
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, Image, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';
import { Fonts } from '../../theme';
import { fmtETB, t } from '../../utils';
import {
  useParking,
  formatElapsed,
  ParkingSpotLocal,
  ParkingLotLocal,
} from '../../hooks/useParking';
import { parkingStyles as styles } from './ParkingScreen.styles';
import { FlashList } from '../../components/common/SafeFlashList';
import { SuccessOverlay } from '../../components/layout/SuccessOverlay';
import { ProcessingOverlay } from '../../components/layout/ProcessingOverlay';
import { useTheme } from '../../hooks/useTheme';
import { ParkingDurationDial } from './components/ParkingDurationDial';

const ADDIS_NOIR = {
  gold: '#D4AF37',
  cyan: '#00F5FF',
};

export default function ParkingScreen() {
  const {
    lots,
    selectedLot,
    selectedSpot,
    confirmModal,
    setConfirmModal,
    qrModal,
    setQrModal,
    elapsed,
    loading,
    balance,
    activeParking,
    handleStartParking,
    handleEndParking,
    handleLotPress,
    handleSpotPress,
    getCurrentFare,
    citizenLocation,
    estimatedDuration,
    setEstimatedDuration,
    plateNumber,
    setPlateNumber,
  } = useParking();

  const C = useTheme();
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState({ title: '', sub: '' });

  const onParkingStart = async () => {
    const success = await handleStartParking();
    if (success) {
      setSuccessMsg({
        title: t('parking_reserved'),
        sub: t('parking_reserved_desc', { spot: selectedSpot?.number, lot: selectedLot?.name }),
      });
      setShowSuccess(true);
    }
  };

  const onParkingEnd = async () => {
    const success = await handleEndParking();
    if (success) {
      setSuccessMsg({
        title: t('session_ended'),
        sub: t('session_ended_desc'),
      });
      setShowSuccess(true);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 🏙️ Addis Hotspot Map Header */}
      <View style={styles.mapHeader}>
        <LinearGradient colors={['rgba(11,13,17,0.8)', 'transparent']} style={styles.mapGradient} />
        <View style={styles.mapMeta}>
          <View style={styles.hotspotBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.hotspotText}>{t('live_hotspot', { district: 'BOLE' })}</Text>
          </View>
          <Text style={styles.mapTitle}>{t('smart_park_addis')}</Text>
        </View>
        <View style={styles.headerWallet}>
          <Text style={styles.walletLabel}>{t('balance_up')}</Text>
          <Text style={styles.walletValue}>{fmtETB(balance)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 🏎️ Active Session "Cockpit" */}
        {activeParking && (
          <View style={styles.cockpitCard}>
            <LinearGradient colors={['#2D7EF0', '#1B2030']} style={styles.cockpitGradient}>
              <View style={styles.cockpitHeader}>
                <View style={styles.cockpitBrand}>
                  <Ionicons name="car-sport" size={24} color="#FFF" />
                  <View>
                    <Text style={styles.cockpitTitle}>{t('currently_parked') || 'Parked'}</Text>
                    <Text style={styles.cockpitSub}>
                      {(activeParking as any).lot_name || 'Zone Access Active'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.cockpitQrBtn} onPress={() => setQrModal(true)}>
                  <Ionicons name="key-outline" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.cockpitMain}>
                <View style={styles.timerBlock}>
                  <Text style={styles.timerVal}>{formatElapsed(elapsed)}</Text>
                  <Text style={styles.timerLabel}>{t('duration')}</Text>
                </View>
                <View style={styles.fareBlock}>
                  <Text style={styles.fareVal}>{fmtETB(getCurrentFare())}</Text>
                  <Text style={styles.fareLabel}>{t('total_fare')}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.cockpitEndBtn} onPress={() => setQrModal(true)}>
                <Text style={styles.cockpitEndText}>
                  Provide Passkey to Valet to Exit
                </Text>
                <Ionicons name="key" size={16} color="#0B0D11" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* 🅿️ Available Hotspots */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('nearest_facilities')}</Text>
          <View style={styles.filterChip}>
            <Text style={styles.filterText}>{t('all_districts')}</Text>
            <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.4)" />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <FlashList
            data={lots}
            estimatedItemSize={120}
            renderItem={({ item: lot }: any) => (
              <LotCard
                lot={lot}
                citizenLocation={citizenLocation}
                onLotPress={handleLotPress}
                activeParking={activeParking}
              />
            )}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={confirmModal} transparent animationType="slide">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setConfirmModal(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)' }]} />
        </Pressable>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <ScrollView 
            keyboardShouldPersistTaps="handled" 
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <TouchableOpacity onPress={() => setConfirmModal(false)} style={{ padding: 4 }}>
                  <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{t('confirm_booking') || 'Confirm Zone Access'}</Text>
                <View style={{ width: 24 }} />
              </View>

              {selectedLot && (
                <>
                  <Text style={styles.modalSubtitle}>
                    {selectedLot.name} · <Text style={{ color: ADDIS_NOIR.gold }}>Zone Access</Text>
                  </Text>
                  
                  <View style={{ marginVertical: 10 }}>
                    <ParkingDurationDial 
                      value={estimatedDuration} 
                      onValueChange={setEstimatedDuration}
                    />
                  </View>

                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ color: '#bccabe', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Vehicle Plate Number
                    </Text>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                      <TextInput
                        style={{ color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' }}
                        placeholder="e.g. AA 2 A12345"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={plateNumber}
                        onChangeText={setPlateNumber}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>

                  <View style={styles.modalInfo}>
                    <Row label={t('hourly_rate') || 'Hourly Rate'} value={`${selectedLot.rate_per_hour} ETB`} />
                    <Row label="Initial Escrow" value={`${selectedLot.rate_per_hour * estimatedDuration} ETB`} />
                    <Row label={t('current_balance')} value={`${fmtETB(balance)} ETB`} />
                  </View>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={onParkingStart}
                    disabled={loading}
                  >
                    <Text style={styles.modalButtonText}>
                      {loading ? t('reserving') : `🅿️ Lock Escrow & Enter Zone`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.cancelButton, { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginTop: 8, paddingTop: 16 }]} 
                    onPress={() => setConfirmModal(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: '#FF5A4C' }]}>{t('cancel_request') || 'Cancel & Go Back'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <SuccessOverlay
        visible={showSuccess}
        title={successMsg.title}
        subtitle={successMsg.sub}
        onClose={() => setShowSuccess(false)}
      />

      <ProcessingOverlay visible={loading} message={t('securing_transfer')} />

      {/* 📱 Pass-Key Modal */}
      <Modal visible={qrModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setQrModal(false)} />
        <View style={styles.qrModalContent}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>{t('facility_access_code') || 'Valet Pass-Key'}</Text>
            <Text style={[styles.qrCode, { fontSize: 48, letterSpacing: 8, color: ADDIS_NOIR.gold }]}>
              {(activeParking as any)?.pin || '123456'}
            </Text>
            <View style={{ marginTop: 15, padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center', textTransform: 'uppercase' }}>Vehicle Plate</Text>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
                {(activeParking as any)?.plate || 'AA-UNKNOWN'}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 20, padding: 15, backgroundColor: 'rgba(212, 175, 55, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="information-circle" size={18} color={ADDIS_NOIR.gold} />
              <Text style={{ color: ADDIS_NOIR.gold, fontWeight: '700', marginLeft: 8, fontSize: 13 }}>Valet Handshake Guide</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18 }}>
              1. The valet already sees your <Text style={{ color: '#FFF', fontWeight: '700' }}>Plate {(activeParking as any)?.plate}</Text> on their dashboard.{"\n"}
              2. Show them this <Text style={{ color: '#FFF', fontWeight: '700' }}>6-digit PIN</Text> only when you are ready to exit.{"\n"}
              3. They will verify it to finalize your payment automatically.
            </Text>
          </View>
          <TouchableOpacity style={[styles.cancelButton, { marginTop: 20 }]} onPress={() => setQrModal(false)}>
            <Text style={styles.cancelButtonText}>{t('close_portal')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────────────

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function LotCard({
  lot,
  citizenLocation,
  onLotPress,
  activeParking,
}: {
  lot: ParkingLotLocal;
  citizenLocation: { lat: number, lng: number } | null;
  onLotPress: (lot: ParkingLotLocal) => void;
  activeParking: any;
}) {
  const available = lot.spots.filter((s) => s.status === 'available').length;
  const pct = Math.round((available / Math.max(lot.total_spots, 1)) * 100);
  const isFull = available === 0;
  const isSurge = pct < 15 && !isFull;
  const progressColor = pct > 50 ? '#59de9b' : pct > 20 ? '#ffd887' : '#ff5a4c';

  let distanceStr = '';
  if (citizenLocation && lot.merchant_lat && lot.merchant_lng) {
    const distKm = haversineDist(citizenLocation.lat, citizenLocation.lng, lot.merchant_lat, lot.merchant_lng);
    distanceStr = distKm < 1 ? `${Math.round(distKm * 1000)}m away` : `${distKm.toFixed(1)}km away`;
  }

  return (
    <TouchableOpacity 
      onPress={() => !isFull && onLotPress(lot)} 
      style={[styles.lotCard, (isFull || !!activeParking) && { opacity: 0.55 }]} 
      activeOpacity={0.8}
      disabled={!!activeParking}
    >
      <View style={styles.lotHeader}>
        <View style={styles.lotInfo}>
          <View style={styles.lotDetails}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={styles.lotName}>{lot.name}</Text>
              {isSurge && (
                <View style={{ backgroundColor: '#FF6B2B20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, color: '#FF6B2B', fontWeight: '800' }}>🔥 HIGH DEMAND</Text>
                </View>
              )}
              {isFull && (
                <View style={{ backgroundColor: '#ff5a4c20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, color: '#ff5a4c', fontWeight: '800' }}>FULL</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.lotLocation}>📍 {lot.subcity}</Text>
              {distanceStr ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: 'rgba(212, 175, 55, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                  <Ionicons name="person" size={10} color="#D4AF37" />
                  <Text style={{ fontSize: 10, color: '#D4AF37', marginLeft: 4, fontWeight: '700' }}>Attendant {distanceStr}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.lotPricing}>
            <Text style={[styles.priceAmount, lot.is_surge && { color: ADDIS_NOIR.gold }]}>
              {lot.current_rate || lot.rate_per_hour} <Text style={{ fontSize: 10 }}>ETB/Hr</Text>
            </Text>
            {lot.is_surge && (
              <View style={localStyles.surgeBadge}>
                <Ionicons name="flash" size={8} color={ADDIS_NOIR.gold} />
                <Text style={localStyles.surgeText}>HIGH DEMAND</Text>
              </View>
            )}
            <Text style={styles.priceLabel}>{t('hourlyRate')}</Text>
          </View>
        </View>
        <View style={styles.availabilityBar}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${pct}%`, backgroundColor: progressColor }]}
              />
            </View>
            <Text style={[styles.availabilityText, { color: progressColor }]}>
              {isFull ? 'ZONE FULL' : `${available} SPOTS FREE`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: `${color}33`, borderColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: '#bccabe', fontSize: 14, fontFamily: Fonts.body }}>{label}</Text>
      <Text
        style={{ color: '#e1e2ea', fontWeight: '700', fontSize: 14, fontFamily: Fonts.headline }}
      >
        {value}
      </Text>
    </View>
  );
}
const localStyles = StyleSheet.create({
  surgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  surgeText: {
    color: ADDIS_NOIR.gold,
    fontSize: 8,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
});

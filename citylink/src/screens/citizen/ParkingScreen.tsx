/**
 * ParkingScreen — Citizen parking module.
 *
 * Decomposed from a 1,022-line monolith into:
 *  - useParking hook (business logic, state, data fetching)
 *  - ParkingScreen.styles.ts (500+ lines of StyleSheet)
 *  - This file (pure render, ~230 lines)
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, Image } from 'react-native';
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
                    <Text style={styles.cockpitTitle}>{t('currently_parked')}</Text>
                    <Text style={styles.cockpitSub}>
                      {activeParking.spot_number} · {(activeParking as any).lot_name}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.cockpitQrBtn} onPress={() => setQrModal(true)}>
                  <Ionicons name="qr-code" size={20} color="#FFF" />
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

              <TouchableOpacity style={styles.cockpitEndBtn} onPress={onParkingEnd}>
                <Text style={styles.cockpitEndText}>{t('end_session_pay')}</Text>
                <Ionicons name="chevron-forward" size={16} color="#0B0D11" />
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
                isExpanded={selectedLot?.id === lot.id}
                selectedSpot={selectedSpot}
                onLotPress={handleLotPress}
                onSpotPress={handleSpotPress}
              />
            )}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 🧾 Confirm Modal */}
      <Modal visible={confirmModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmModal(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('confirm_booking')}</Text>
          {selectedLot && selectedSpot && (
            <>
              <Text style={styles.modalSubtitle}>
                {selectedLot.name} · Spot{' '}
                <Text style={{ color: ADDIS_NOIR.gold }}>{selectedSpot.number}</Text>
              </Text>
              <View style={styles.modalInfo}>
                <Row label={t('hourly_rate')} value={`${selectedLot.rate_per_hour} ETB`} />
                <Row label={t('current_balance')} value={`${fmtETB(balance)} ETB`} />
              </View>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={onParkingStart}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? t('reserving') : `🅿️ ${t('start_parking')}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmModal(false)}>
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      <SuccessOverlay
        visible={showSuccess}
        title={successMsg.title}
        subtitle={successMsg.sub}
        onClose={() => setShowSuccess(false)}
      />

      <ProcessingOverlay visible={loading} message={t('securing_transfer')} />

      {/* 📱 QR Modal */}
      <Modal visible={qrModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setQrModal(false)} />
        <View style={styles.qrModalContent}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>{t('facility_access_code')}</Text>
            <Text style={styles.qrCode}>
              {(activeParking as any)?.qr_token?.toUpperCase() || 'REF-8291'}
            </Text>
          </View>
          <Text style={styles.qrDescription}>{t('qr_desc')}</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setQrModal(false)}>
            <Text style={styles.cancelButtonText}>{t('close_portal')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────────────

function LotCard({
  lot,
  isExpanded,
  selectedSpot,
  onLotPress,
  onSpotPress,
}: {
  lot: ParkingLotLocal;
  isExpanded: boolean;
  selectedSpot: ParkingSpotLocal | null;
  onLotPress: (lot: ParkingLotLocal) => void;
  onSpotPress: (spot: ParkingSpotLocal) => void;
}) {
  const available = lot.spots.filter((s) => s.status === 'available').length;
  const pct = Math.round((available / lot.total_spots) * 100);
  const progressColor = pct > 50 ? '#59de9b' : pct > 20 ? '#ffd887' : '#ff5a4c';

  return (
    <TouchableOpacity onPress={() => onLotPress(lot)} style={styles.lotCard} activeOpacity={0.8}>
      <View style={styles.lotHeader}>
        <View style={styles.lotInfo}>
          <View style={styles.lotDetails}>
            <Text style={styles.lotName}>{lot.name}</Text>
            <Text style={styles.lotLocation}>📍 {lot.subcity}</Text>
          </View>
          <View style={styles.lotPricing}>
            <Text style={styles.priceAmount}>{lot.rate_per_hour} ETB</Text>
            <Text style={styles.priceLabel}>{t('per_hour')}</Text>
          </View>
        </View>
        <View style={styles.availabilityBar}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${pct}%`, backgroundColor: progressColor }]}
            />
          </View>
          <Text style={styles.availabilityText}>
            {available}/{lot.total_spots} {t('free')}
          </Text>
        </View>
      </View>

      {isExpanded && (
        <View style={styles.spotSelection}>
          <Text style={styles.spotSelectionTitle}>{t('select_spot')}</Text>
          <View style={styles.spotGrid}>
            {lot.spots.slice(0, 40).map((spot) => {
              const isSelected = selectedSpot?.id === spot.id;
              const spotStyle =
                spot.status === 'occupied'
                  ? styles.spotOccupied
                  : isSelected
                    ? styles.spotSelected
                    : styles.spotAvailable;
              const textStyle =
                spot.status === 'occupied'
                  ? styles.spotTextOccupied
                  : isSelected
                    ? styles.spotTextSelected
                    : styles.spotTextAvailable;
              return (
                <TouchableOpacity
                  key={spot.id}
                  disabled={spot.status === 'occupied'}
                  onPress={() => onSpotPress(spot)}
                  style={[styles.spotButton, spotStyle]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.spotText, textStyle]}>{spot.number}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.spotLegend}>
            <LegendDot color="#59de9b" label={t('available')} />
            <LegendDot color="#59de9b" label={t('selected')} />
            <LegendDot color="#ff5a4c" label={t('occupied')} />
          </View>
        </View>
      )}
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

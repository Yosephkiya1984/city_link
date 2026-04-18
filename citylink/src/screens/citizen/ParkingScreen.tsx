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
import { Fonts } from '../../theme';
import { fmtETB } from '../../utils';
import {
  useParking,
  formatElapsed,
  ParkingSpotLocal,
  ParkingLotLocal,
} from '../../hooks/useParking';
import { parkingStyles as styles } from './ParkingScreen.styles';

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

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.profileImage}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_QR_FniUXCslWzPE1iOtR204CdDlO3hTqRa4b8DugkIRWNCrNOs3qQ-2uu-n0OS8vUwwTIKxFkp9vv1xFV61KwyMYNzOkFxPl9DH8uJyOLZEqYOh_9rE2vsnrQWd5jM5XJhjdStneTudMk5VDZU4wOjaf3DzP2fAuf7bXY0aEAugCn599yqM5AhdPtmbdJMUMPJ9D295G8g0QJXRCw_x9IGG33hCRGcQ0phNKIbUIQyaczNnRBoyGlQfj2dUNbcW6keam_ayug0Bh',
              }}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          <Text style={styles.brandName}>ETHIO-SUPER</Text>
        </View>
        <View style={styles.walletBadge}>
          <Ionicons name="wallet" size={16} color="#ffd887" />
          <Text style={styles.walletAmount}>ETB {fmtETB(balance)}</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.contentArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Session Banner */}
          {activeParking && (
            <View style={styles.activeSessionBanner}>
              <View style={styles.sessionIcon}>
                <Ionicons name="car" size={80} color="#59de9b" />
              </View>
              <View style={styles.sessionHeader}>
                <View>
                  <View style={styles.sessionStatus}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Active Session</Text>
                  </View>
                  <Text style={styles.sessionTitle}>Spot {activeParking.spot_number}</Text>
                  <Text style={styles.sessionSubtitle}>
                    {(activeParking as any).lot_name as string}
                  </Text>
                </View>
                <View style={styles.sessionTimer}>
                  <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
                  <Text style={styles.rateText}>
                    {(activeParking as any).rate_per_hour as number} ETB/hr
                  </Text>
                </View>
              </View>
              <View style={styles.sessionActions}>
                <TouchableOpacity style={styles.qrButton} onPress={() => setQrModal(true)}>
                  <Text style={styles.qrButtonText}>📱 Show QR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.endButton} onPress={handleEndParking}>
                  <Text style={styles.endButtonText}>End • {fmtETB(getCurrentFare())} ETB</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Parking Lots */}
          <View style={styles.parkingSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Parking Lots</Text>
              <Text style={styles.refreshTime}>Refresh 2:40 PM</Text>
            </View>
            <View style={styles.lotsList}>
              {lots.map((lot) => (
                <LotCard
                  key={lot.id}
                  lot={lot}
                  isExpanded={selectedLot?.id === lot.id}
                  selectedSpot={selectedSpot}
                  onLotPress={handleLotPress}
                  onSpotPress={handleSpotPress}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Confirm Modal */}
      <Modal visible={confirmModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmModal(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirm Parking</Text>
          {selectedLot && selectedSpot && (
            <>
              <Text style={styles.modalSubtitle}>
                {selectedLot.name} — Spot{' '}
                <Text style={{ color: '#e1e2ea', fontWeight: '700' }}>{selectedSpot.number}</Text>
              </Text>
              <View style={styles.modalInfo}>
                <Row label="Rate" value={`${selectedLot.rate_per_hour} ETB/hr`} />
                <Row label="Your Balance" value={`${fmtETB(balance)} ETB`} />
              </View>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleStartParking}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Starting…' : '🅿️ Start Parking'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* QR Modal */}
      <Modal visible={qrModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setQrModal(false)} />
        <View style={styles.qrModalContent}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Parking QR Code</Text>
            <Text style={styles.qrCode}>{(activeParking as any)?.qr_token as string}</Text>
          </View>
          <Text style={styles.qrDescription}>Show this to the parking attendant</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setQrModal(false)}>
            <Text style={styles.cancelButtonText}>Close</Text>
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
            <Text style={styles.priceLabel}>per hour</Text>
          </View>
        </View>
        <View style={styles.availabilityBar}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${pct}%`, backgroundColor: progressColor }]}
            />
          </View>
          <Text style={styles.availabilityText}>
            {available}/{lot.total_spots} free
          </Text>
        </View>
      </View>

      {isExpanded && (
        <View style={styles.spotSelection}>
          <Text style={styles.spotSelectionTitle}>Select a spot</Text>
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
            <LegendDot color="#59de9b" label="Available" />
            <LegendDot color="#59de9b" label="Selected" />
            <LegendDot color="#ff5a4c" label="Occupied" />
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

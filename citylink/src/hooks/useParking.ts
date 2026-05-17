import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AuthState, useAuthStore } from '../store/AuthStore';
import { WalletState, useWalletStore } from '../store/WalletStore';
import { SystemState, useSystemStore } from '../store/SystemStore';
import { uid, fmtETB, genQrToken } from '../utils';
import {
  fetchParkingLots,
  startParkingSession,
  endParkingSession,
} from '../services/parking.service';
import { getCurrentLocation } from '../services/delivery.service';
import { useRealtimePostgres } from './useRealtimePostgres';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ParkingSpotLocal {
  id: string;
  number: string;
  status: 'available' | 'occupied';
}

export interface ParkingLotLocal {
  id: string;
  name: string;
  subcity: string;
  total_spots: number;
  rate_per_hour: number;
  spots: ParkingSpotLocal[];
  merchant_lat?: number;
  merchant_lng?: number;
  is_surge?: boolean;
  current_rate?: number;
}

// ── DB Mapping ────────────────────────────────────────────────────────────────

// ── DB Mapping ────────────────────────────────────────────────────────────────
function mapLotsFromDb(rows: any[]): ParkingLotLocal[] {
  return rows.map((lot: any) => {
    let raw = (lot.parking_spots as any[]) || [];
    
    // ── Zone-Based Fallback ──────────────────────────────────────────────────
    // If no explicit spots are defined, we synthesize virtual spots based on 
    // capacity (total_spots) and current occupancy (occupied_count).
    if (raw.length === 0 && lot.total_spots > 0) {
      const occupied = Number(lot.occupied_count || 0);
      const total = Number(lot.total_spots);
      
      // Create 'total' virtual spots, marking 'occupied' of them as busy
      raw = Array.from({ length: total }, (_, i) => ({
        id: `virtual-${lot.id}-${i}`,
        spot_number: `${i + 1}`,
        status: i < occupied ? 'occupied' : 'available'
      }));
    }

    const spots: ParkingSpotLocal[] = raw.map((s: any, i: number) => ({
      id: (s.id as string) || `${lot.id}-s-${i}`,
      number: String(s.spot_number ?? s.label ?? s.number ?? i + 1),
      status: (/occupied|held|reserved|busy/i.test(String(s.status || ''))
        ? 'occupied'
        : 'available') as 'available' | 'occupied',
    }));

    const total = (lot.total_spots as number) || spots.length || 1;
    const m = Array.isArray(lot.merchant) ? lot.merchant[0] : lot.merchant;
    
    return {
      id: lot.id as string,
      name: lot.name as string,
      subcity: (lot.subcity as string) || 'Addis Ababa',
      total_spots: total,
      rate_per_hour: Number(lot.rate_per_hour ?? 15),
      spots: spots,
      merchant_lat: m?.latitude,
      merchant_lng: m?.longitude,
      is_surge: !!lot.is_surge,
      current_rate: lot.current_rate ? Number(lot.current_rate) : undefined,
    };
  });
}

// ── Formatting ────────────────────────────────────────────────────────────────
export function formatElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useParking() {
  const currentUser = useAuthStore((s: AuthState) => s.currentUser);
  const activeParking = useWalletStore((s: WalletState) => s.activeParking);
  const setActiveParking = useWalletStore((s: WalletState) => s.setActiveParking);
  const balance = useWalletStore((s: WalletState) => s.balance);
  const setBalance = useWalletStore((s: WalletState) => s.setBalance);
  const addTransaction = useWalletStore((s: WalletState) => s.addTransaction);
  const showToast = useSystemStore((s: SystemState) => s.showToast);

  const [lots, setLots] = useState<ParkingLotLocal[]>([]);
  const [selectedLot, setSelectedLot] = useState<ParkingLotLocal | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotLocal | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [citizenLocation, setCitizenLocation] = useState<{lat: number, lng: number} | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(2); // Default 2 hours
  const [plateNumber, setPlateNumber] = useState<string>((currentUser as any)?.vehicle_plate || (currentUser as any)?.plate || '');

  // ── Fetch Citizen Location ────────────────────────────────────────────────
  useEffect(() => {
    getCurrentLocation().then(loc => {
      if (loc) setCitizenLocation(loc);
    });
  }, []);

  // ── On-Mount: Always sync session state from server ─────────────────────
  // Fixes multi-device: phone 2 reads stale local cache. syncWithServer()
  // immediately corrects it to the true DB state.
  useEffect(() => {
    if (!currentUser?.id) return;
    useWalletStore.getState().syncWithServer();
  }, [currentUser?.id]);

  // ── AppState listener: re-sync on foreground ──────────────────────────────
  // Fixes: user switches phones or backgrounds the app while session is
  // running. On foreground we always re-check actual server state.
  useEffect(() => {
    if (!currentUser?.id) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        useWalletStore.getState().syncWithServer();
      }
    });
    return () => sub.remove();
  }, [currentUser?.id]);

  // ── Elapsed Timer + 30s Polling Fallback ─────────────────────────────────
  // 1-second interval drives the visible clock.
  // Every 30s while a session is active we also re-sync from the server as
  // a safety net for missed realtime events (network blip, app backgrounded).
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let syncInterval: NodeJS.Timeout;

    if (activeParking) {
      interval = setInterval(() => {
        const secs = Math.floor((Date.now() - new Date(activeParking.start_time).getTime()) / 1000);
        setElapsed(secs);
      }, 1000);

      // Safety net polling — corrects state even if realtime missed the event
      syncInterval = setInterval(() => {
        useWalletStore.getState().syncWithServer();
      }, 30_000);
    } else {
      setElapsed(0);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [activeParking]);

  // ── Fetch Lots ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await fetchParkingLots();
      if (!cancelled && data?.length) setLots(mapLotsFromDb(data as any[]));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshLots = useCallback(async () => {
    const { data } = await fetchParkingLots();
    if (data?.length) setLots(mapLotsFromDb(data as any[]));
  }, []);

  // ── Realtime: Valet-driven session finalization ─────────────────────────
  //
  //  When the valet calls finalize_parking_session_legal the DB updates
  //  parking_sessions.status → 'completed'.  We listen here and:
  //    1. Immediately stop + reset the elapsed timer
  //    2. Clear activeParking in the store (stops the timer UI)
  //    3. Show a meaningful settlement toast (refund or extra charge)
  //    4. Sync wallet balance from the server
  //
  const parkUserId = currentUser?.id;
  useRealtimePostgres({
    channelName: parkUserId ? `cl-rt-parking-${parkUserId}` : 'cl-rt-parking',
    table: 'parking_sessions',
    // Server-side filter: only rows belonging to this citizen
    filter: parkUserId ? `user_id=eq.${parkUserId}` : undefined,
    enabled: !!parkUserId,
    onPayload: async (payload: any) => {
      const newRow = payload?.new;

      // Only act on UPDATE events where status flipped to completed/settled
      if (!newRow) return;

      const isFinalized =
        newRow.status === 'completed' ||
        newRow.status === 'COMPLETED' ||
        newRow.status === 'SETTLED';

      if (!isFinalized) {
        // Still active — just refresh the lot map
        refreshLots();
        return;
      }

      const storeState   = useWalletStore.getState();
      const currentActive = storeState.activeParking;

      // Guard: only react if this is OUR current session
      if (!currentActive || currentActive.id !== newRow.id) {
        refreshLots();
        await storeState.syncWithServer();
        return;
      }

      // ── Stop timer immediately ────────────────────────────────────────────
      setElapsed(0);
      setActiveParking(null);          // clears the local store + persisted cache

      // ── Build a meaningful settlement message ─────────────────────────────
      const holdAmt   = Number(currentActive.hold_amount ?? newRow.hold_amount ?? 0);
      const actualCost = Number(newRow.calculated_cost ?? 0);
      const diff       = holdAmt - actualCost;

      let msg: string;
      if (diff > 0.01) {
        // Understayed — refund issued
        msg = `Session closed ✅  Charged: ${actualCost.toFixed(2)} ETB  |  Refunded: ${diff.toFixed(2)} ETB`;
      } else if (diff < -0.01) {
        // Overstayed — extra charge applied
        msg = `Session closed ✅  Extra charge: ${Math.abs(diff).toFixed(2)} ETB  |  Total: ${actualCost.toFixed(2)} ETB`;
      } else {
        msg = `Session closed ✅  Total: ${actualCost.toFixed(2)} ETB`;
      }

      showToast(msg, 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // ── Sync authoritative balance from server ────────────────────────────
      await storeState.syncWithServer();

      // Refresh lot availability map
      refreshLots();
    },
  });

  // ── Fare Calculation ────────────────────────────────────────────────────
  function getCurrentFare(): number {
    if (!activeParking) return 0;
    const rate = Number((activeParking as any).rate_per_hour) || 15;
    // 🛡️ Safety Cap: Max 12 hours fare for stale sessions to prevent runaway balance drain
    const hours = Math.min(elapsed / 3600, 12); 
    const fare = Math.ceil(hours * rate * 10) / 10;
    return isNaN(fare) ? 0 : fare;
  }

  // ── Start Parking ──────────────────────────────────────────────────────
  async function handleStartParking() {
    if (!selectedLot) return;
    if (selectedLot.spots && selectedLot.spots.length > 0 && !selectedSpot) return;
    
    if (activeParking) {
      showToast('You already have an active session. End it before starting a new one.', 'error');
      return false;
    }

    const minBalance = selectedLot.rate_per_hour || 15;
    if (balance < minBalance) {
      showToast(`Minimum balance required: ${minBalance} ETB`, 'error');
      return;
    }
    if (!plateNumber || plateNumber.trim().length < 3) {
      showToast('A valid vehicle plate number is required.', 'error');
      return;
    }
    setLoading(true);
    const { data, error } = await startParkingSession(
      currentUser?.id || '',
      selectedLot.id,
      selectedSpot?.id || 'ZONE',
      plateNumber,
      estimatedDuration
    );

    if (error || !data?.ok) {
      showToast(data?.error || 'Could not start parking session', 'error');
      setLoading(false);
      return false;
    }

    const holdAmount = selectedLot.rate_per_hour * estimatedDuration;
    const session = {
      id: data.session_id,
      user_id: currentUser?.id || '',
      lot_id: selectedLot.id,
      lot_name: selectedLot.name,
      spot_number: selectedSpot?.number ?? 'ZONE',
      start_time: new Date().toISOString(),
      rate_per_hour: selectedLot.rate_per_hour,
      hold_amount: holdAmount,
      qr_token: genQrToken('PRK'),
      status: 'active',
      merchant_id: selectedLot.id,
      created_at: new Date().toISOString(),
      pin: data.pin,
    };

    setActiveParking(session);
    setBalance(balance - (selectedLot.rate_per_hour * estimatedDuration));
    setLots((prev: ParkingLotLocal[]) =>
      prev.map((l: ParkingLotLocal) =>
        l.id === selectedLot.id
          ? {
              ...l,
              spots: l.spots.map((s: ParkingSpotLocal) =>
                s.id === selectedSpot.id ? { ...s, status: 'occupied' as const } : s
              ),
            }
          : l
      )
    );
    setSelectedLot(null);
    setSelectedSpot(null);
    setConfirmModal(false);
    showToast(`Parking started at spot ${session.spot_number} 🅿️`, 'success');
    setLoading(false);
    return true;
  }

  // ── End Parking ─────────────────────────────────────────────────────────
  async function handleEndParking() {
    if (!activeParking) return;
    const fare = getCurrentFare();
    if (balance < fare) {
      showToast('Insufficient balance to pay fare', 'error');
      return;
    }
    setLoading(true);

    try {
      const res = await endParkingSession(activeParking.id, currentUser?.id || '', fare);

      if (res.error) {
        showToast(
          typeof res.error === 'string'
            ? res.error
            : ((res.error as any)?.message as string) || 'Could not finalize parking session',
          'error'
        );
        setLoading(false);
        return false;
      }

      const finalBalance = res.data?.new_balance ?? balance - fare;
      setBalance(finalBalance);

      setLots((prev: ParkingLotLocal[]) =>
        prev.map((l: ParkingLotLocal) =>
          l.id === activeParking.lot_id
            ? {
                ...l,
                spots: l.spots.map((s: ParkingSpotLocal) =>
                s.number === (activeParking as any).spot_number
                    ? { ...s, status: 'available' as const }
                    : s
                ),
              }
            : l
        )
      );

      showToast(`Parking ended. Fare: ${fmtETB(fare)} ETB`, 'success');
      setActiveParking(null);
      setElapsed(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (e) {
      console.error('🔧 handleEndParking crash:', e);
      showToast('Connection error finalizing session', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }

  // ── Interaction Handlers ────────────────────────────────────────────────
  const handleLotPress = (lot: ParkingLotLocal) => {
    if (activeParking) {
      showToast('You already have an active parking session.', 'error');
      return;
    }
    if (lot.spots && lot.spots.length > 0 && lot.spots.filter(s => s.status === 'available').length === 0) {
      showToast('This zone is currently full.', 'error');
      return;
    }
    // Auto-assign to a generic 'Zone' spot
    const availableSpot = lot.spots && lot.spots.length > 0 
      ? lot.spots.find(s => s.status === 'available') || lot.spots[0]
      : null;
      
    setSelectedLot(lot);
    setSelectedSpot(availableSpot);
    setEstimatedDuration(2); // Reset to 2 hours default
    setConfirmModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSpotPress = (spot: ParkingSpotLocal) => {
    if (spot.status === 'occupied') return;
    setSelectedSpot(spot);
    setConfirmModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return {
    // State
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
    isStale: activeParking && elapsed > 12 * 3600, // 12h threshold
    currentUser,
    citizenLocation,
    // Actions
    handleStartParking,
    handleEndParking,
    handleLotPress,
    handleSpotPress,
    getCurrentFare,
    estimatedDuration,
    setEstimatedDuration,
    plateNumber,
    setPlateNumber,
  };
}

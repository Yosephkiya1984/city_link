import { useState, useEffect, useCallback } from 'react';
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
}

// ── Demo Data ─────────────────────────────────────────────────────────────────
export function generateSpots(count: number, lotId: string): ParkingSpotLocal[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${lotId}-spot-${i + 1}`,
    number: `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
    status: (Math.random() < 0.35 ? 'occupied' : 'available') as 'available' | 'occupied',
  }));
}

const DEMO_LOTS: ParkingLotLocal[] = [
  {
    id: 'lot-1',
    name: 'Bole Road Car Park',
    subcity: 'Bole',
    total_spots: 80,
    rate_per_hour: 15,
    spots: generateSpots(80, 'lot-1'),
  },
  {
    id: 'lot-2',
    name: 'Piassa Multi-Storey',
    subcity: 'Arada',
    total_spots: 120,
    rate_per_hour: 12,
    spots: generateSpots(120, 'lot-2'),
  },
  {
    id: 'lot-3',
    name: 'Mexico Square Parking',
    subcity: 'Kirkos',
    total_spots: 60,
    rate_per_hour: 10,
    spots: generateSpots(60, 'lot-3'),
  },
];

// ── DB Mapping ────────────────────────────────────────────────────────────────
function mapLotsFromDb(rows: any[]): ParkingLotLocal[] {
  return rows.map((lot: any) => {
    const raw = (lot.parking_spots as any[]) || [];
    const spots: ParkingSpotLocal[] = raw.map((s: any, i: number) => ({
      id: (s.id as string) || `${lot.id}-s-${i}`,
      number: String(s.spot_number ?? s.label ?? s.number ?? i + 1),
      status: (/occupied|held|reserved|busy/i.test(String(s.status || ''))
        ? 'occupied'
        : 'available') as 'available' | 'occupied',
    }));
    const total = (lot.total_spots as number) || spots.length || 1;
    return {
      id: lot.id as string,
      name: lot.name as string,
      subcity: (lot.subcity as string) || 'Addis Ababa',
      total_spots: total,
      rate_per_hour: Number(lot.rate_per_hour ?? 15),
      spots: spots.length ? spots : generateSpots(Math.min(total, 80), lot.id as string),
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

  const [lots, setLots] = useState<ParkingLotLocal[]>(DEMO_LOTS);
  const [selectedLot, setSelectedLot] = useState<ParkingLotLocal | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotLocal | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Elapsed Timer ───────────────────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeParking) {
      interval = setInterval(() => {
        const secs = Math.floor((Date.now() - new Date(activeParking.start_time).getTime()) / 1000);
        setElapsed(secs);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
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

  // ── Realtime ────────────────────────────────────────────────────────────
  const parkUserId = currentUser?.id;
  useRealtimePostgres({
    channelName: parkUserId ? `cl-rt-parking-${parkUserId}` : 'cl-rt-parking',
    table: 'parking_sessions',
    filter: undefined,
    enabled: !!parkUserId,
    onPayload: refreshLots,
  });

  // ── Fare Calculation ────────────────────────────────────────────────────
  function getCurrentFare(): number {
    if (!activeParking) return 0;
    const hours = elapsed / 3600;
    return Math.ceil(hours * (((activeParking as any).rate_per_hour as number) ?? 15) * 10) / 10;
  }

  // ── Start Parking ──────────────────────────────────────────────────────
  async function handleStartParking() {
    if (!selectedSpot || !selectedLot) return;
    if (balance < 10) {
      showToast('Insufficient balance. Top up first.', 'error');
      return;
    }
    setLoading(true);
    const sessionId = uid();
    const session = {
      id: sessionId,
      user_id: currentUser?.id || '',
      lot_id: selectedLot.id,
      lot_name: selectedLot.name,
      spot_id: selectedSpot.id,
      spot_number: selectedSpot.number,
      start_time: new Date().toISOString(),
      rate_per_hour: selectedLot.rate_per_hour,
      qr_token: genQrToken('PRK'),
      status: 'active',
      merchant_id: selectedLot.id,
      created_at: new Date().toISOString(),
    };

    const { error } = await startParkingSession(session);
    if (error) {
      showToast('Could not start parking session', 'error');
      setLoading(false);
      return;
    }

    setActiveParking(session);
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
      const res = await endParkingSession(
        activeParking.id,
        currentUser?.id || '',
        ((activeParking as any).lot_name as string) || '',
        activeParking.spot_number || '',
        fare
      );

      if (res.error) {
        showToast(
          typeof res.error === 'string'
            ? res.error
            : ((res.error as any)?.message as string) || 'Could not finalize parking session',
          'error'
        );
        setLoading(false);
        return;
      }

      const finalBalance = res.data?.new_balance ?? balance - fare;
      setBalance(finalBalance);

      setLots((prev: ParkingLotLocal[]) =>
        prev.map((l: ParkingLotLocal) =>
          l.id === activeParking.lot_id
            ? {
                ...l,
                spots: l.spots.map((s: ParkingSpotLocal) =>
                  s.id === (activeParking as any).spot_id
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
    } catch (e) {
      console.error('🔧 handleEndParking crash:', e);
      showToast('Connection error finalizing session', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Interaction Handlers ────────────────────────────────────────────────
  const handleLotPress = (lot: ParkingLotLocal) => {
    setSelectedLot(selectedLot?.id === lot.id ? null : lot);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    currentUser,
    // Actions
    handleStartParking,
    handleEndParking,
    handleLotPress,
    handleSpotPress,
    getCurrentFare,
  };
}

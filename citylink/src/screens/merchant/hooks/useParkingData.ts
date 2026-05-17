import { useState, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { fetchParkingSessions, fetchParkingLots, fetchMerchantStaff } from '../../../services/parking.service';
import { supaQuery, subscribeToTable, unsubscribe } from '../../../services/supabase';
import { ParkingSession, ParkingLot, StaffProfile, User } from '../../../types/domain_types';

export function useParkingData() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [merchant, setMerchant] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Resolved merchant ID (set after loadData resolves the valet's merchant) ──
  const [effectiveMerchantId, setEffectiveMerchantId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const uiMode = useAuthStore.getState().uiMode;
      let merchantId = currentUser.id;

      if (uiMode === 'valet') {
        try {
          const { HospitalityService } = await import('../../../services/hospitality.service');
          const staffProfile = await HospitalityService.getMerchantStaffProfile(currentUser.id);
          if (staffProfile?.merchant_id) {
            merchantId = staffProfile.merchant_id;
          }
        } catch (e: any) {
          console.warn('[useParkingData] Could not resolve valet merchant_id:', e.message);
        }
      }

      // Persist resolved ID so the realtime subscription can use it
      setEffectiveMerchantId(merchantId);

      const [sessionsRes, lotsRes, staffRes, merchantRes] = await Promise.all([
        fetchParkingSessions(merchantId),
        fetchParkingLots(merchantId),
        fetchMerchantStaff(merchantId),
        supaQuery<User>((c) => c.from('profiles').select('*').eq('id', merchantId).single()),
      ]);

      if (sessionsRes.data) {
        setSessions(
          (sessionsRes.data as ParkingSession[]).sort(
            (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
          )
        );
      }
      if (lotsRes.data) {
        setLots(lotsRes.data as ParkingLot[]);
        setSelectedLot((prev) => prev ?? (lotsRes.data as ParkingLot[])[0] ?? null);
      }
      if (staffRes.data) setStaff(staffRes.data as StaffProfile[]);
      if (merchantRes.data) setMerchant(merchantRes.data as User);
    } catch (error) {
      showToast('Failed to load parking data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id, showToast]);

  // ── Initial load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── AppState: re-sync when valet brings app to foreground ─────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') loadData();
    });
    return () => sub.remove();
  }, [currentUser?.id, loadData]);

  // ── Realtime: watch parking_sessions for this merchant ────────────────────────
  // Subscribes AFTER effectiveMerchantId is known (set at end of loadData).
  // Triggers loadData() on any INSERT/UPDATE/DELETE so valets see new bookings
  // without manual refresh.
  useEffect(() => {
    if (!effectiveMerchantId) return;

    const channelName = `cl-valet-sessions-${effectiveMerchantId}`;
    const filter = `merchant_id=eq.${effectiveMerchantId}`;

    const channel = subscribeToTable(
      channelName,
      'parking_sessions',
      filter,
      (_payload: any) => {
        // Any change (new booking, status update, finalization) → re-fetch list
        loadData();
      }
    );

    return () => {
      unsubscribe(channel);
    };
  }, [effectiveMerchantId, loadData]);

  return {
    sessions,
    lots,
    staff,
    merchant,
    selectedLot,
    setSelectedLot,
    loading,
    refreshing,
    loadData,
    setRefreshing,
  };
}

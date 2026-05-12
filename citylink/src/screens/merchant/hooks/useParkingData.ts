import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { fetchParkingSessions, fetchParkingLots, fetchMerchantStaff } from '../../../services/parking.service';
import { supaQuery } from '../../../services/supabase';

export function useParkingData() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [sessions, setSessions] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const uiMode = useAuthStore.getState().uiMode;
      let effectiveMerchantId = currentUser.id;

      if (uiMode === 'valet') {
        try {
          // getMerchantStaffProfile is a STATIC class method — must import the class, not destructure
          const { HospitalityService } = await import('../../../services/hospitality.service');
          const staffProfile = await HospitalityService.getMerchantStaffProfile(currentUser.id);
          if (staffProfile?.merchant_id) {
            effectiveMerchantId = staffProfile.merchant_id;
          }
        } catch (e: any) {
          console.warn('[useParkingData] Could not resolve valet merchant_id:', e.message);
          // Non-fatal: continue loading with currentUser.id as fallback
        }
      }

      const [sessionsRes, lotsRes, staffRes, merchantRes] = await Promise.all([
        fetchParkingSessions(effectiveMerchantId),
        fetchParkingLots(effectiveMerchantId),
        fetchMerchantStaff(effectiveMerchantId),
        supaQuery<any>((c) => c.from('merchants').select('*').eq('id', effectiveMerchantId).single())
      ]);

      if (sessionsRes.data) {
        setSessions(
          (sessionsRes.data as any[]).sort(
            (a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
          )
        );
      }
      if (lotsRes.data) {
        setLots(lotsRes.data);
        setSelectedLot(lotsRes.data[0] || null);
      }
      if (staffRes.data) {
        setStaff(staffRes.data);
      }
      if (merchantRes.data) {
        setMerchant(merchantRes.data);
      }
    } catch (error) {
      showToast('Failed to load parking data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

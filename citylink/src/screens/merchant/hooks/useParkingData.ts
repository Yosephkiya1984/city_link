import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { fetchParkingSessions, fetchParkingLots } from '../../../services/parking.service';

export function useParkingData() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [sessions, setSessions] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [sessionsRes, lotsRes] = await Promise.all([
        fetchParkingSessions(currentUser.id),
        fetchParkingLots(currentUser.id),
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
    selectedLot,
    setSelectedLot,
    loading,
    refreshing,
    loadData,
    setRefreshing,
  };
}

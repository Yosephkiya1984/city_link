import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import {
  fetchEkubs,
  fetchPendingApplications,
  fetchActiveDraws,
} from '../../../services/ekub.service';

export function useEkubData() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [circles, setCircles] = useState<any[]>([]);
  const [pendingApps, setPendingApps] = useState<any[]>([]);
  const [activeDraws, setActiveDraws] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [circleRes, appRes, drawRes] = await Promise.all([
        fetchEkubs(),
        fetchPendingApplications(currentUser.id),
        fetchActiveDraws(currentUser.id),
      ]);

      if (circleRes.data) {
        const myCircles = circleRes.data.filter((c: any) => c.organiser_id === currentUser.id);
        setCircles(myCircles);
      }
      if (appRes.data) setPendingApps(appRes.data);
      if (drawRes.data) setActiveDraws(drawRes.data);
    } catch (e) {
      showToast('Failed to load Ekub data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    circles,
    pendingApps,
    activeDraws,
    loading,
    refreshing,
    loadData,
    setRefreshing,
  };
}

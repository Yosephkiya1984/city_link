import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { useWalletStore } from '../../../store/WalletStore';
import { useNavigation } from '@react-navigation/native';
import {
  updateSessionStatus,
  finalizeParkingSessionLegal,
} from '../../../services/parking.service';

export function useParkingActions(data: any) {
  const { loadData } = data;
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);
  const resetAuth = useAuthStore((s) => s.reset);
  const resetWallet = useWalletStore((s) => s.reset);
  const resetSystem = useSystemStore((s) => s.reset);

  const [actionLoading, setActionLoading] = useState(false);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const onUpdateSession = async (sessionId: string, newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      if (!currentUser?.id) return;
      const result = await updateSessionStatus(sessionId, currentUser.id, newStatus);
      if (!result.error) {
        showToast(`Session ${newStatus.toLowerCase()}`, 'success');
        loadData();
        setShowSessionDetail(false);
      } else {
        showToast(result.error || 'Failed to update session', 'error');
      }
    } catch (error) {
      showToast('Failed to update session', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onFinalizeSession = async (
    sessionId: string,
    method: 'WALLET' | 'CASH' | 'BANK_TRANSFER',
    amount: number
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActionLoading(true);

    try {
      const result = await finalizeParkingSessionLegal(
        sessionId,
        method,
        amount,
        currentUser?.id || ''
      );

      if (!result.error) {
        showToast(`Session settled via ${method}`, 'success');
        loadData();
        setShowSessionDetail(false);
      } else {
        showToast(result.error || 'Finalization failed', 'error');
      }
    } catch (error) {
      showToast('Legal finalization failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Logged out successfully', 'success');
    resetAuth();
    resetWallet();
    resetSystem();
  };

  const onWithdraw = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast('Withdrawal feature coming soon', 'info');
  };

  return {
    actionLoading,
    onUpdateSession,
    onFinalizeSession,
    onLogout,
    onWithdraw,
    showSessionDetail,
    setShowSessionDetail,
    selectedSession,
    setSelectedSession,
  };
}

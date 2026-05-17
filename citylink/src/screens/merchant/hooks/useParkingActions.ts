import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { useWalletStore } from '../../../store/WalletStore';
import { useNavigation } from '@react-navigation/native';
import {
  updateSessionStatus,
  finalizeParkingSessionLegal,
  startParkingSessionMerchant,
  addStaffByPhone,
  revokeStaffAccess,
  createParkingLot,
} from '../../../services/parking.service';
import { ParkingSession } from '../../../types/domain_types';

export interface ParkingActionsProps {
  loadData: () => Promise<void>;
}

export function useParkingActions({ loadData }: ParkingActionsProps) {
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);
  const resetAuth = useAuthStore((s) => s.reset);
  const resetWallet = useWalletStore((s) => s.reset);
  const resetSystem = useSystemStore((s) => s.reset);

  const [actionLoading, setActionLoading] = useState(false);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ParkingSession | null>(null);

  const getEffectiveMerchantId = async () => {
    if (!currentUser?.id) return null;
    const uiMode = useAuthStore.getState().uiMode;
    if (uiMode === 'valet') {
      try {
        // getMerchantStaffProfile is a STATIC class method — must import the class
        const { HospitalityService } = await import('../../../services/hospitality.service');
        const staffProfile = await HospitalityService.getMerchantStaffProfile(currentUser.id);
        return staffProfile?.merchant_id || currentUser.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        console.warn('[useParkingActions] Could not resolve valet merchant_id:', msg);
        return currentUser.id;
      }
    }
    return currentUser.id;
  };

  const onUpdateSession = async (sessionId: string, newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      const merchantId = await getEffectiveMerchantId();
      if (!merchantId) return;
      
      const result = await updateSessionStatus(sessionId, merchantId, newStatus);
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
    amount: number,
    pin?: string
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActionLoading(true);

    try {
      const result = await finalizeParkingSessionLegal(
        sessionId,
        method,
        amount,
        currentUser?.id || '',
        pin
      );

      if (!result.error && result.data?.ok) {
        showToast(`Session settled! Cost: ${result.data.actual_cost} ETB`, 'success');
        loadData();
        setShowSessionDetail(false);
        return true;
      } else {
        showToast(result.error || result.data?.error || 'Finalization failed', 'error');
        return false;
      }
    } catch (error) {
      showToast('Legal finalization failed', 'error');
      return false;
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

  const onStartManualSession = async (plate: string, lotId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      const result = await startParkingSessionMerchant(lotId, plate);
      if (!result.error && result.data?.ok) {
        showToast('Manual session started', 'success');
        loadData();
        return true;
      } else {
        showToast(result.error || 'Failed to start session', 'error');
        return false;
      }
    } catch (error) {
      showToast('Action failed', 'error');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const onAddStaff = async (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);
    try {
      if (!currentUser?.id) return;
      const result = await addStaffByPhone(currentUser.id, phone);
      if (!result.error && result.data?.ok) {
        showToast('Staff added successfully', 'success');
        loadData();
        return true;
      } else {
        showToast(result.error || result.data?.error || 'Failed to add staff', 'error');
        return false;
      }
    } catch (error) {
      showToast('Action failed', 'error');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const onUpdateStaffStatus = async (staffId: string, isOnline: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { updateStaffStatus } = await import('../../../services/parking.service');
      const result = await updateStaffStatus(staffId, isOnline);
      if (!result.error) {
        showToast(isOnline ? 'You are now Online' : 'You are now Offline', 'info');
        loadData();
      } else {
        showToast(result.error || 'Failed to update status', 'error');
      }
    } catch (error) {
      showToast('Status update failed', 'error');
    }
  };

  const onRevokeStaff = async (staffId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActionLoading(true);
    try {
      const result = await revokeStaffAccess(staffId);
      if (!result.error) {
        showToast('Staff access revoked', 'success');
        loadData();
        return true;
      } else {
        showToast(result.error || 'Failed to revoke access', 'error');
        return false;
      }
    } catch (error) {
      showToast('Action failed', 'error');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    actionLoading,
    onUpdateSession,
    onFinalizeSession,
    onLogout,
    onWithdraw,
    onStartManualSession,
    onAddStaff,
    onUpdateStaffStatus,
    onRevokeStaff,
    onAddLot: async (
      name: string,
      capacity: number,
      rate: number,
      overnightRate: number,
      lotType: string,
      is247: boolean,
      opening: string,
      closing: string,
      coords?: { lat: number; lng: number }
    ) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setActionLoading(true);
      try {
        const merchantId = await getEffectiveMerchantId();
        if (!merchantId) throw new Error('No merchant ID found');
        await createParkingLot({
          merchant_id: merchantId,
          name,
          total_spots: capacity,
          rate_per_hour: rate,
          overnight_rate: overnightRate,
          lot_type: lotType as any,
          is_24_7: is247,
          opening_hour: opening,
          closing_hour: closing,
          latitude: coords?.lat,
          longitude: coords?.lng,
          location: 'Addis Ababa',
        });
        showToast('Parking lot created successfully!', 'success');
        loadData();
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to create parking lot';
        showToast(msg, 'error');
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    showSessionDetail,
    setShowSessionDetail,
    selectedSession,
    setSelectedSession,
  };
}

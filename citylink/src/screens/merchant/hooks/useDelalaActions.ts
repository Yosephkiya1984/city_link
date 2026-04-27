import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../../store/AuthStore';
import { useSystemStore } from '../../../store/SystemStore';
import { useWalletStore } from '../../../store/WalletStore';
import { useNavigation } from '@react-navigation/native';
import { uid } from '../../../utils';
import { updateListingStatus, createListing } from '../../../services/services.service';

export function useDelalaActions(data: any) {
  const { loadData } = data;
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);
  const resetAuth = useAuthStore((s) => s.reset);
  const resetWallet = useWalletStore((s) => s.reset);
  const resetSystem = useSystemStore((s) => s.reset);

  const [actionLoading, setActionLoading] = useState(false);
  const [showAddListing, setShowAddListing] = useState(false);
  const [showListingDetail, setShowListingDetail] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);

  const onUpdateListing = async (listingId: string, newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      const result = await updateListingStatus(listingId, newStatus);
      if (!result.error) {
        showToast(`Listing ${newStatus.toLowerCase()}`, 'success');
        loadData();
        setShowListingDetail(false);
      } else {
        showToast(result.error || 'Failed to update listing', 'error');
      }
    } catch (error) {
      showToast('Failed to update listing', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onCreateListing = async (formData: any) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);

    try {
      const listingData = {
        id: uid(),
        poster_id: currentUser.id,
        ...formData,
        created_at: new Date().toISOString(),
      };

      const result = await createListing(listingData as any);
      if (!result.error) {
        showToast('Property listed successfully!', 'success');
        loadData();
        setShowAddListing(false);
      } else {
        showToast(result.error || 'Failed to add listing', 'error');
      }
    } catch (error) {
      showToast('Failed to add listing', 'error');
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
    (navigation as any).replace('Auth');
  };

  return {
    actionLoading,
    onUpdateListing,
    onCreateListing,
    onLogout,
    showAddListing,
    setShowAddListing,
    showListingDetail,
    setShowListingDetail,
    selectedListing,
    setSelectedListing,
  };
}

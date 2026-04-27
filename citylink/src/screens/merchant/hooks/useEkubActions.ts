import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSystemStore } from '../../../store/SystemStore';
import {
  handleEkubApplication,
  performEkubDraw,
  releaseEkubPot,
} from '../../../services/ekub.service';

export function useEkubActions(data: any) {
  const { loadData } = data;
  const showToast = useSystemStore((s) => s.showToast);
  const [actionLoading, setActionLoading] = useState(false);

  const onApproveApp = async (ekubId: string, userId: string, status: 'ACTIVE' | 'REJECTED') => {
    setActionLoading(true);
    const res = await handleEkubApplication(ekubId, userId, status);
    if (!res.error) {
      showToast(status === 'ACTIVE' ? 'Member approved! 🤝' : 'Application rejected', 'success');
      loadData();
    }
    setActionLoading(false);
  };

  const onRunDraw = async (circle: any) => {
    Alert.alert(
      'Run Round Draw?',
      `This will automatically select a winner for Round ${circle.current_round} via a secure server-side draw.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Draw',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const res = await performEkubDraw(circle.id, circle.current_round, circle.pot_balance);
            if (!res.error) {
              showToast('Draw completed! Winner notified. 🏆', 'success');
              loadData();
            } else {
              showToast(res.error || 'Draw failed', 'error');
            }
          },
        },
      ]
    );
  };

  const onReleasePayout = async (drawId: string) => {
    setActionLoading(true);
    const res = await releaseEkubPot(drawId);
    if (!res.error) {
      showToast('Pot released to winner wallet! 💸', 'success');
      loadData();
    }
    setActionLoading(false);
  };

  return {
    actionLoading,
    onApproveApp,
    onRunDraw,
    onReleasePayout,
  };
}

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { useWalletStore } from '../store/WalletStore';
import { useSystemStore } from '../store/SystemStore';
import {
  fetchEkubs,
  fetchMyEkubs,
  submitEkubApplication,
  contributeToEkub,
  signWinnerConsent,
  submitVouch,
  fetchPendingVouches,
  fetchWinnerDraw,
} from '../services/ekub.service';
import * as Haptics from 'expo-haptics';
import { fmtETB } from '../utils';

export function useEkub() {
  const [activeTab, setActiveTab] = useState<'browse' | 'mine' | 'vouch'>('browse');
  const [loading, setLoading] = useState(true);
  const [ekubs, setEkubs] = useState<any[]>([]);
  const [myEkubs, setMyEkubs] = useState<any[]>([]);
  const [pendingVouches, setPendingVouches] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const currentUser = useAuthStore((s) => s.currentUser);
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const showToast = useSystemStore((s) => s.showToast);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState({ title: '', sub: '' });
  const [submitting, setSubmitting] = useState(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState(0);
  const drawMembers = useMemo(
    () => ['Abebe K.', 'Sara M.', 'Yonas T.', 'Hanna G.', 'Dawit L.', 'Marta B.', 'Kifle S.'],
    []
  );

  const loadDataRequest = useCallback(async () => {
    const [allRes, myRes, vouchRes] = await Promise.all([
      fetchEkubs(),
      fetchMyEkubs(currentUser?.id || ''),
      fetchPendingVouches(currentUser?.id || ''),
    ]);
    return {
      ekubs: allRes.data || [],
      myEkubs: myRes.data || [],
      vouches: vouchRes.data || [],
    };
  }, [currentUser?.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await loadDataRequest();
    setEkubs(data.ekubs);
    setMyEkubs(data.myEkubs);
    setPendingVouches(data.vouches);
    setLoading(false);
  }, [loadDataRequest]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    loadDataRequest().then((data) => {
      if (!ignore) {
        setEkubs(data.ekubs);
        setMyEkubs(data.myEkubs);
        setPendingVouches(data.vouches);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadDataRequest]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const startDraw = () => {
    setWinnerIndex(Math.floor(Math.random() * drawMembers.length));
    setIsDrawing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onDrawFinished = () => {
    setSuccessMsg({
      title: 'Winner Announced! 🎉',
      sub: `${drawMembers[winnerIndex]} has won this round's draw.`,
    });
    setShowSuccess(true);
    setIsDrawing(false);
  };

  const handleJoin = useCallback(
    async (circle: any) => {
      if (currentUser?.kyc_status !== 'VERIFIED') {
        showToast('Electronic Ekub requires verified KYC', 'error');
        return;
      }
      setSubmitting(true);
      const res = await submitEkubApplication(
        circle.id,
        currentUser.id,
        'Joining for circle growth'
      );
      setSubmitting(false);
      if (!res.error) {
        setSuccessMsg({
          title: 'Application Sent',
          sub: `You have applied to join ${circle.name}. Awaiting committee approval.`,
        });
        setShowSuccess(true);
        loadData();
      }
    },
    [currentUser?.id, currentUser?.kyc_status, showToast, loadData]
  );

  const handleContribute = useCallback(
    async (circle: any) => {
      if (!currentUser?.id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSubmitting(true);
      const res = await contributeToEkub(currentUser.id, circle.id, circle.current_round || 1);
      setSubmitting(false);
      if (res.data?.ok) {
        setSuccessMsg({
          title: 'Contribution Successful',
          sub: `${fmtETB(circle.contribution_amount || 0)} has been deducted from your wallet.`,
        });
        setShowSuccess(true);
        if (res.data.new_balance !== undefined) setBalance(res.data.new_balance);
        loadData();
      } else {
        showToast(res.data?.error || 'Contribution failed', 'error');
      }
    },
    [currentUser?.id, setBalance, showToast, loadData]
  );

  const handleVouch = useCallback(
    async (draw: any, approved: boolean) => {
      if (!currentUser?.id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const res = await submitVouch(
        draw.id,
        draw.ekub_id,
        currentUser.id,
        currentUser.full_name || 'Voucher',
        approved,
        approved ? 'Regular vouch' : 'Dispute raised'
      );
      if (!res.error) {
        showToast(
          approved ? 'Vouch submitted ⭐' : 'Dispute raised 🚨',
          approved ? 'success' : 'warning'
        );
        loadData();
      }
    },
    [currentUser?.id, currentUser?.full_name, showToast, loadData]
  );

  const handleSignConsent = useCallback(
    async (circle: any) => {
      if (!currentUser?.id) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const { data: draw } = await fetchWinnerDraw(currentUser.id, circle.id);
      if (draw) {
        const res = await signWinnerConsent(draw.id);
        if (!res.error) {
          showToast('Consent signed!', 'success');
          loadData();
        }
      }
    },
    [currentUser?.id, showToast, loadData]
  );

  const listData = useMemo(() => {
    if (activeTab === 'browse') return ekubs;
    if (activeTab === 'mine') return myEkubs;
    return pendingVouches;
  }, [activeTab, ekubs, myEkubs, pendingVouches]);

  return {
    activeTab,
    setActiveTab,
    loading,
    ekubs,
    myEkubs,
    pendingVouches,
    refreshing,
    onRefresh,
    currentUser,
    balance,
    showSuccess,
    setShowSuccess,
    successMsg,
    submitting,
    isDrawing,
    winnerIndex,
    drawMembers,
    startDraw,
    onDrawFinished,
    handleJoin,
    handleContribute,
    handleVouch,
    handleSignConsent,
    listData,
  };
}

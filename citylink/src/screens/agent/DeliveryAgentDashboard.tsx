/**
 * DeliveryAgentDashboard â€” Full-featured agent interface
 * GPS dispatch, earnings, active job tracking, and history.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  FlatList,
  Animated,
  RefreshControl,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { t } from '../../utils/i18n';

// Modular Components
import { DispatchCard } from '../../components/agent/DispatchCard';
import { ActiveJobCard } from '../../components/agent/ActiveJobCard';
import { NumericKeypad } from '../../components/agent/NumericKeypad';
import { JobRejectionModal } from '../../components/agent/JobRejectionModal';
import { ProofOfDeliveryModal } from '../../components/agent/ProofOfDeliveryModal';
import { AgentWorkIDModal } from '../../components/agent/AgentWorkIDModal';
import { AgentStatsRow } from '../../components/agent/AgentStatsRow';
import { AgentOnlineToggle } from '../../components/agent/AgentOnlineToggle';
import {
  fetchAgentProfile,
  setAgentOnlineStatus,
  getCurrentLocation,
  updateAgentLocation,
  fetchPendingDispatches,
  fetchActiveJobs,
  fetchAgentHistory,
  acceptDeliveryJob,
  declineDeliveryJob,
  markOrderPickedUp,
  markOrderDeliveredByAgent,
  confirmDeliveryWithPin,
  subscribeToAgentDispatches,
  uploadDeliveryProof,
  recordTelemetry,
  UnifiedOrder,
  OrderType,
} from '../../services/delivery.service';
import { marketplaceService } from '../../services/marketplace.service';
import { subscribeToTable, unsubscribe } from '../../services/supabase';
import { signOut } from '../../services/auth.service';
import { fetchWalletData } from '../../services/wallet.service';

const { width } = Dimensions.get('window');

const ADDIS_NOIR = {
  bg: '#0B0D11',
  surface: '#131720',
  lift: '#1B2030',
  rim: '#242B3D',
  gold: '#D4AF37',
  cyan: '#00F5FF',
  emerald: '#10B981',
  crimson: '#EF4444',
  glass: 'rgba(255, 255, 255, 0.05)',
  edge: 'rgba(255, 255, 255, 0.08)',
  text: '#E2E8F0',
  textSub: '#8B949E',
  border: '#242B3D',
  green: '#10B981',
  greenDim: 'rgba(16, 185, 129, 0.12)',
  red: '#EF4444',
  redDim: 'rgba(239, 68, 68, 0.12)',
  surfaceHigh: '#1B2030',
  primary: '#22C97A',
  primaryDim: 'rgba(34, 201, 122, 0.12)',
  yellow: '#F0A830',
  yellowDim: 'rgba(240, 168, 48, 0.12)',
  amber: '#F0A830',
  blue: '#3D8EF0',
  blueDim: 'rgba(61, 142, 240, 0.12)',
};
const T = ADDIS_NOIR;

function fmtETB(n: number) {
  return (n || 0).toLocaleString('en-ET');
}
function fmtTime(iso: string) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string) {
  if (!iso) return '---';
  return new Date(iso).toLocaleDateString('en-ET', { month: 'short', day: 'numeric' });
}

// ── Extracted Components Used Below ───────────────────────────────────────────

// â”€â”€ Main Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function DeliveryAgentDashboard() {
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);
  const { balance, setBalance } = useWalletStore();

  const [tab, setTab] = useState('home'); // home | history
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<UnifiedOrder[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);

  const [rejectionJob, setRejectionJob] = useState<any>(null);
  const [rejectionType, setRejectionType] = useState<string>('NOT_REACHABLE');
  const [rejectionComment, setRejectionComment] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);

  const [pinPromptJob, setPinPromptJob] = useState<UnifiedOrder | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [submittingPin, setSubmittingPin] = useState(false);

  const [pickupPinJob, setPickupPinJob] = useState<UnifiedOrder | null>(null);
  const [pickupPinInput, setPickupPinInput] = useState('');
  const [submittingPickupPin, setSubmittingPickupPin] = useState(false);

  const [showWorkID, setShowWorkID] = useState(false);

  // Proof of Delivery (POD) State
  const [showCamera, setShowCamera] = useState(false);
  const [arrivedJob, setArrivedJob] = useState<any>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  const locationInterval = useRef<any>(null);
  const dispatchSub = useRef<any>(null);
  const jobsSub = useRef<any>(null);
  const activeJobsRef = useRef<UnifiedOrder[]>([]);

  useEffect(() => {
    activeJobsRef.current = activeJobs;
  }, [activeJobs]);

  // Extracted NumericKeypad is now imported

  // â”€â”€ Load Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadDashboard = useCallback(async () => {
    if (!currentUser?.id) return;
    const [profile, jobs, hist] = await Promise.all([
      fetchAgentProfile(currentUser.id),
      fetchActiveJobs(currentUser.id),
      fetchAgentHistory(currentUser.id),
    ]);

    if (profile.data) {
      setAgentProfile(profile.data);
      setIsOnline(profile.data.is_online || false);
    }
    setActiveJobs(jobs);
    setHistory(hist);

    // 🛡️ Wallet Refresh
    const wallet = await fetchWalletData(currentUser.id);
    if (wallet) {
      setBalance(wallet.balance);
    }

    // Compute today's earnings from history using actual agent_fee
    const today = new Date().toDateString();
    const todayTotal = hist
      .filter((h: any) => new Date(h.delivered_at).toDateString() === today)
      .reduce((sum: number, h: any) => sum + (Number(h.agent_fee) || 0), 0);
    setTodayEarnings(todayTotal);

    const pending = await fetchPendingDispatches(currentUser.id);
    setDispatches(pending);
  }, [currentUser?.id]);

  useEffect(() => {
    setLoading(true);
    loadDashboard().finally(() => setLoading(false));

    if (!currentUser || !currentUser.id) return;

    // Realtime subscription for dispatches
    dispatchSub.current = subscribeToAgentDispatches(currentUser.id, () => loadDashboard());

    // Unified subscription for ALL active jobs (agent-wide)
    jobsSub.current = subscribeToTable(
      `agent-jobs-${currentUser.id}`,
      'marketplace_orders',
      `agent_id=eq.${currentUser.id}`,
      (payload) => {
        // Refresh whenever any order assigned to this agent changes
        loadDashboard();
      }
    );

    return () => {
      unsubscribe(dispatchSub.current);
      unsubscribe(jobsSub.current);
      // Removed locationInterval cleanup here, handled in dedicated effect
    };
  }, [loadDashboard, currentUser?.id]);

  // â”€â”€ Location Tracking Watcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!currentUser?.id || !isOnline) {
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
        locationInterval.current = null;
      }
      return;
    }

    // Agent is online. Start tracking if not already started.
    if (!locationInterval.current) {
      locationInterval.current = setInterval(async () => {
        let l = await getCurrentLocation();
        if (!l) {
          // GPS Fallback to keep heartbeat alive
          l = { lat: 9.0192, lng: 38.7619 };
        }
        updateAgentLocation(currentUser.id, l.lat, l.lng);
        if (activeJobsRef.current.length > 0) {
          const active = activeJobsRef.current[0];
          recordTelemetry(currentUser.id, active.id, l.lat, l.lng, active.order_type);
        }
      }, 15000);

      // Immediate ping on mount/resume
      getCurrentLocation().then((l) => {
        const loc = l || { lat: 9.0192, lng: 38.7619 };
        updateAgentLocation(currentUser.id, loc.lat, loc.lng);
      });
    }

    return () => {
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
        locationInterval.current = null;
      }
    };
  }, [isOnline, currentUser?.id]);

  // â”€â”€ Online Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleToggleOnline = async (val: boolean) => {
    if (!currentUser?.id) return;

    if (agentProfile?.agent_status !== 'APPROVED') {
      showToast(t('verification_required_msg'), 'error');
      return;
    }

    setTogglingOnline(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      let lat = 9.0192,
        lng = 38.7619;
      if (val) {
        const loc = await getCurrentLocation();
        if (loc) {
          lat = loc.lat;
          lng = loc.lng;
        } else {
          showToast(t('system_unavailable'), 'info');
        }
        // Interval is now handled by the Location Tracking Watcher useEffect
      }

      await setAgentOnlineStatus(currentUser.id, val, lat, lng);
      setIsOnline(val);
      showToast(val ? t('go_online_msg') : t('logged_out_msg'), val ? 'success' : 'info');
    } catch (e) {
      showToast(t('status_update_failed'), 'error');
    } finally {
      setTogglingOnline(false);
    }
  };

  const logout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signOut();
      await useAuthStore.getState().reset();
      await useWalletStore.getState().reset();
      useSystemStore.getState().reset();
      showToast(t('logged_out_msg'), 'success');
    } catch (e) {
      Alert.alert(t('error_label'), t('logout_failed_err'));
    }
  };

  // —— Accept Dispatch —————————————————————————————————————————————————————
  const handleAccept = async (dispatch: any) => {
    if (!currentUser?.id) return;

    // Quick local check if we know they are blocked
    if (agentProfile?.blocked_until && new Date(agentProfile.blocked_until) > new Date()) {
      showToast(t('account_restricted_title'), 'error');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { ok, error } = await acceptDeliveryJob(
      dispatch.order_id,
      currentUser.id,
      dispatch.order_type || 'MARKETPLACE'
    );
    if (!ok) {
      if (error?.includes('blocked')) {
        // Refresh profile to get the block info
        loadDashboard();
      }
      showToast(error || t('job_already_taken_err'), 'error');
      return;
    }

    showToast(t('confirm_handover_msg'), 'success');

    // Clear local dispatches immediately so they don't see the card anymore
    setDispatches((prev) => prev.filter((d) => d.order_id !== dispatch.order_id));

    // Refresh to pull the active job
    await loadDashboard();
  };

  // —— Decline Dispatch ————————————————————————————————————————————————————————
  const handleDecline = async (dispatch: any) => {
    if (!currentUser?.id) return;
    const res = await declineDeliveryJob(dispatch.order_id, currentUser.id);
    setDispatches((prev) => prev.filter((d) => d.order_id !== dispatch.order_id));

    if (res.error) {
      showToast(`Decline failed: ${res.error}`, 'error');
    } else {
      showToast(t('reject'), 'info');
    }
  };

  // —— Picked Up (Dual Confirmation) ———————————————————————————————————————————
  const handleEnterPickupPin = (job: any) => {
    setPickupPinInput('');
    setPickupPinJob(job);
  };

  const handleConfirmPickupPin = async () => {
    if (!pickupPinJob || !currentUser?.id) return;
    if (pickupPinInput.trim().length < 6) {
      showToast(t('enter_pickup_pin_msg'), 'error');
      return;
    }
    setSubmittingPickupPin(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const res = await markOrderPickedUp(
        pickupPinJob.id,
        currentUser.id,
        pickupPinJob.order_type || 'MARKETPLACE',
        pickupPinInput.trim()
      );
      if (res.ok) {
        showToast(t('confirm_handover_msg'), 'success');
      } else {
        throw new Error(res.error || 'Handover failed');
      }
      setPickupPinJob(null);
      setPickupPinInput('');
      loadDashboard();
    } catch (e: any) {
      showToast(e.message || t('pickup_failed_err'), 'error');
    } finally {
      setSubmittingPickupPin(false);
    }
  };

  // —— Arrived —————————————————————————————————————————————————————————————————
  const handleArrived = async (job: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        showToast(t('verification_required_msg'), 'error');
        return;
      }
    }

    setArrivedJob(job);
    setShowCamera(true);
    // Note: markOrderDeliveredByAgent will be called AFTER photo is taken
  };

  const handleTakePODPhoto = async () => {
    if (!cameraRef.current || capturing || !arrivedJob || !currentUser?.id) return;
    setCapturing(true);
    try {
      const photo = await (cameraRef.current as any).takePictureAsync({
        base64: true,
        quality: 0.5,
      });
      showToast(t('submitting_label'), 'info');

      const { ok, error } = await uploadDeliveryProof(arrivedJob.id, currentUser.id, photo.base64);
      if (!ok) throw new Error(error);

      const markRes = await markOrderDeliveredByAgent(
        arrivedJob.id,
        currentUser.id,
        arrivedJob.order_type
      );
      if (!markRes.data?.ok)
        throw new Error(markRes.data?.error || 'Failed to update delivery status');

      setShowCamera(false);

      // 🛡️ FIX: Auto-open the PIN modal after proof upload for smoother UX
      const jobToPin = arrivedJob;
      setArrivedJob(null);

      showToast(t('proof_uploaded_msg'), 'success');
      setPinInput('');
      setPinPromptJob(jobToPin); // Automatically trigger the PIN entry keypad

      loadDashboard();
    } catch (e: any) {
      showToast(e.message || t('proof_upload_failed_err'), 'error');
    } finally {
      setCapturing(false);
    }
  };

  // —— Enter PIN ————————————————————————————————————————————————————————————————
  const handleEnterPin = (job: any) => {
    setPinInput('');
    setPinPromptJob(job);
  };

  const handleConfirmWithPin = async () => {
    if (!currentUser?.id || !pinPromptJob) return;
    const requiredLen = 6;
    if (pinInput.trim().length < requiredLen) {
      showToast(t('pin_length_err', { len: requiredLen }), 'error');
      return;
    }
    setSubmittingPin(true);
    const res = await confirmDeliveryWithPin(
      (pinPromptJob as any).id,
      pinInput.trim(),
      currentUser.id,
      (pinPromptJob as any).order_type
    );
    setSubmittingPin(false);

    if (!res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(
        res.error === 'invalid_pin' ? 'Invalid Delivery PIN' : `Failed: ${res.error}`,
        'error'
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(t('delivered_msg', { amount: res.agent_share || '...' }), 'success');
    setPinPromptJob(null);
    setPinInput('');
    loadDashboard();
  };

  const handleRejectOrder = async () => {
    if (!rejectionJob || !currentUser?.id) return;
    setSubmittingRejection(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await marketplaceService.rejectDelivery(
        rejectionJob.id,
        rejectionJob.buyer_id,
        rejectionType,
        rejectionComment
      );
      showToast(t('delivery_failed_msg'), 'info');
      setRejectionJob(null);
      setRejectionComment('');
      loadDashboard();
    } catch (e: any) {
      showToast(e.message || t('rejection_failed_err'), 'error');
    } finally {
      setSubmittingRejection(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  // â”€â”€ Pending approval screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (agentProfile && agentProfile.agent_status === 'PENDING') {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Ionicons name="hourglass-outline" size={64} color={T.yellow} />
        <Text style={[s.headerTitle, { textAlign: 'center', marginTop: 20, fontSize: 22 }]}>
          {t('application_under_review_title')}
        </Text>
        <Text style={[s.textSub, { textAlign: 'center', marginTop: 12, lineHeight: 22 }]}>
          {t('application_under_review_desc')}
        </Text>
        <TouchableOpacity style={[s.actionBtn, { marginTop: 32 }]} onPress={logout}>
          <Text style={s.actionBtnText}>{t('sign_out')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* â”€â”€ Header â”€â”€ */}
      <LinearGradient colors={['#0a0e14', '#111827']} style={s.navHeader}>
        <View>
          <Text style={s.greeting}>{t('citylink_delivery_title')}</Text>
          <Text style={s.headerTitle}>{currentUser?.full_name || t('role_agent')}</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            style={s.switchBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              useAuthStore.getState().setUiMode('citizen');
            }}
          >
            <Ionicons name="repeat-outline" size={20} color={T.primary} />
            <Text style={{ color: T.primary, fontSize: 10, fontWeight: '800', marginTop: 2 }}>
              {t('switch_btn')}
            </Text>
          </TouchableOpacity>
          <View style={s.ratingBadge}>
            <Ionicons name="star" size={12} color={T.yellow} />
            <Text style={s.ratingText}>{(agentProfile?.rating || 5).toFixed(1)}</Text>
          </View>
          <TouchableOpacity
            style={s.signOutBtn}
            onPress={() => {
              Alert.alert(t('sign_out'), 'Are you sure?', [
                { text: t('cancel'), style: 'cancel' },
                {
                  text: t('sign_out'),
                  onPress: logout,
                },
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={T.textSub} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* â”€â”€ Tabs â”€â”€ */}
      <View style={s.tabBar}>
        {[
          ['home', 'home', t('dashboard_tab')],
          ['history', 'time', t('history_tab')],
        ].map(([key, icon, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.tab, tab === key && s.tabActive]}
            onPress={() => setTab(key)}
          >
            <Ionicons
              name={(tab === key ? icon : `${icon}-outline`) as any}
              size={18}
              color={tab === key ? T.primary : T.textSub}
            />
            <Text style={[s.tabLabel, tab === key && { color: T.primary }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />
        }
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'home' && (
          <>
            {/* Penalty Block Banner */}
            {agentProfile?.blocked_until && new Date(agentProfile.blocked_until) > new Date() && (
              <View style={[s.penaltyBanner, { marginBottom: 16 }]}>
                <View style={s.penaltyHeader}>
                  <Ionicons name="warning" size={20} color={T.red} />
                  <Text style={s.penaltyTitle}>{t('account_restricted_title')}</Text>
                </View>
                <Text style={s.penaltyReason}>
                  {agentProfile.last_block_reason || t('account_restricted_desc')}
                </Text>
                <View style={s.penaltyTimer}>
                  <Ionicons name="time-outline" size={14} color={T.red} />
                  <Text style={s.penaltyTimerText}>
                    {t('restriction_lifts_msg', {
                      time: new Date(agentProfile.blocked_until).toLocaleTimeString(),
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* ══ Top Navigation Bar ══ */}
            <View style={s.topBar}>
              <View>
                <Text
                  style={{ color: T.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}
                >
                  {t('agent_console_label')}
                </Text>
                <View style={s.agentName}>
                  <Text style={s.headerTitle}>{currentUser?.full_name?.split(' ')[0]}</Text>
                  {isOnline && <View style={s.pulseDot} />}
                </View>
              </View>
              <View style={s.headerRight}>
                <TouchableOpacity style={s.switchBtn} onPress={() => setShowWorkID(true)}>
                  <Ionicons name="id-card-outline" size={20} color={T.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={s.signOutBtn} onPress={logout}>
                  <Ionicons name="log-out-outline" size={20} color={T.red} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ══ Compliance Banner ══ */}
            <View style={s.complianceBanner}>
              <View style={s.complianceIconBox}>
                <Ionicons name="shield-checkmark" size={20} color={T.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.complianceTitle}>{t('regulatory_compliance_title')}</Text>
                <Text style={s.complianceSub}>{t('regulatory_compliance_desc')}</Text>
              </View>
            </View>

            {/* ══ Online Toggle ══ */}
            <AgentOnlineToggle
              isOnline={isOnline}
              onToggle={() => handleToggleOnline(!isOnline)}
              loading={togglingOnline}
            />

            {/* ══ Stats Row ══ */}
            <AgentStatsRow
              stats={{
                todayDeliveries: history?.length || 0,
                todayEarnings: Math.floor(
                  (history?.reduce((acc, h) => acc + (h.total || 0), 0) || 0) * 0.12
                ),
                rating: agentProfile?.rating || 4.8,
              }}
            />

            {agentProfile?.agent_status !== 'APPROVED' ? (
              <View style={[s.lockdownCard, { marginTop: 10 }]}>
                <LinearGradient colors={['#242B3D', '#131720']} style={s.lockdownGradient}>
                  <View style={s.lockdownIconBox}>
                    <Ionicons name="lock-closed" size={32} color={T.gold} />
                  </View>
                  <Text style={s.lockdownTitle}>{t('application_under_review_title')}</Text>
                  <Text style={s.lockdownText}>{t('account_vetting_msg')}</Text>

                  <View style={s.lockdownStepRow}>
                    <Ionicons name="checkmark-circle" size={18} color={T.green} />
                    <Text style={s.lockdownStepText}>{t('fayda_verified_label')}</Text>
                  </View>
                  <View style={s.lockdownStepRow}>
                    <Ionicons name="time" size={18} color={T.yellow} />
                    <Text style={s.lockdownStepText}>{t('license_verification_pending')}</Text>
                  </View>

                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: T.gold, marginTop: 20 }]}
                    onPress={() => setShowWorkID(true)}
                  >
                    <Ionicons name="card-outline" size={18} color={T.bg} />
                    <Text style={[s.actionBtnText, { color: T.bg }]}>
                      {t('view_pending_permit_btn')}
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ) : (
              <>
                {/* Pending Dispatch */}
                {dispatches?.map((d) => (
                  <DispatchCard
                    key={d.order_id}
                    dispatch={d}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                  />
                ))}

                {/* Active Jobs */}
                {activeJobs.length > 0 && (
                  <View style={{ gap: 16 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: -8,
                      }}
                    >
                      <Text style={{ color: T.text, fontSize: 13, fontWeight: '800' }}>
                        {t('active_assignments_label', { count: activeJobs.length })}
                      </Text>
                      <Ionicons name="list-outline" size={16} color={T.textSub} />
                    </View>
                    {activeJobs?.map((job) => (
                      <ActiveJobCard
                        key={job.id}
                        job={job}
                        onPickedUp={handleEnterPickupPin}
                        onArrived={handleArrived}
                        onEnterPin={handleEnterPin}
                        onReject={setRejectionJob}
                      />
                    ))}
                  </View>
                )}

                {/* Empty state */}
                {activeJobs.length === 0 && dispatches.length === 0 && (
                  <View style={s.emptyState}>
                    <Ionicons name="bicycle-outline" size={52} color={T.textSub} />
                    <Text style={s.emptyTitle}>
                      {isOnline ? t('waiting_orders_msg') : t('go_online_msg')}
                    </Text>
                    <Text style={s.emptyBody}>
                      {isOnline ? t('nearby_orders_alert') : t('match_orders_radius_msg')}
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {tab === 'history' &&
          (history?.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="time-outline" size={52} color={T.textSub} />
              <Text style={s.emptyTitle}>{t('no_deliveries_yet')}</Text>
              <Text style={s.emptyBody}>{t('history_empty_desc')}</Text>
            </View>
          ) : (
            history?.map((h, i) => (
              <View key={h.id || i} style={s.historyCard}>
                <View style={s.historyLeft}>
                  <Ionicons name="checkmark-circle" size={24} color={T.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.historyProduct}>{h.product_name}</Text>
                  <Text style={s.historySub}>From {h.merchant?.business_name || 'Merchant'}</Text>
                  <Text style={s.historyDate}>{fmtDate(h.delivered_at)}</Text>
                </View>
                <View>
                  <Text style={s.historyEarning}>
                    +ETB {fmtETB(Math.floor((h.total || 0) * 0.12))}
                  </Text>
                </View>
              </View>
            ))
          ))}

        <View style={{ padding: 20, marginTop: 20 }}>
          <TouchableOpacity
            style={[
              s.actionBtn,
              {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                borderWidth: 1,
                marginBottom: 20,
              },
            ]}
            onPress={() => {
              Alert.alert(t('sign_out'), 'Are you sure you want to log out?', [
                { text: t('cancel'), style: 'cancel' },
                { text: t('sign_out'), onPress: logout, style: 'destructive' },
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={T.red} />
            <Text style={[s.actionBtnText, { color: T.red }]}>{t('sign_out')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ══ Pickup PIN Entry Modal ══ */}
      <Modal visible={!!pickupPinJob} animationType="fade" transparent statusBarTranslucent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Confirm Pickup</Text>
              <TouchableOpacity
                onPress={() => setPickupPinJob(null)}
                disabled={submittingPickupPin}
              >
                <Ionicons name="close" size={24} color={T.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalInstruction}>
              Ask{' '}
              <Text style={{ color: T.primary, fontWeight: '700' }}>
                {pickupPinJob?.merchant?.business_name || 'the merchant'}
              </Text>{' '}
              for the 6-digit Pickup PIN for{' '}
              <Text style={{ color: T.text, fontWeight: '700' }}>
                {pickupPinJob?.display_name || 'this package'}
              </Text>
              .
            </Text>

            <NumericKeypad
              value={pickupPinInput}
              setValue={setPickupPinInput}
              maxLength={6}
              onConfirm={() => handleConfirmPickupPin()}
              confirmLoading={submittingPickupPin}
            />
          </View>
        </View>
      </Modal>

      {/* ══ PIN Entry Modal ══ */}
      <Modal visible={!!pinPromptJob} animationType="fade" transparent statusBarTranslucent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Confirm Delivery</Text>
              <TouchableOpacity onPress={() => setPinPromptJob(null)} disabled={submittingPin}>
                <Ionicons name="close" size={24} color={T.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalInstruction}>
              Ask the buyer for the Delivery PIN for{' '}
              <Text style={{ color: T.green, fontWeight: '700' }}>
                {pinPromptJob?.display_name || 'this package'}
              </Text>{' '}
              to complete this order and receive your earnings.
            </Text>

            <NumericKeypad
              value={pinInput}
              setValue={setPinInput}
              maxLength={6}
              onConfirm={() => handleConfirmWithPin()}
              confirmLoading={submittingPin}
            />
          </View>
        </View>
      </Modal>

      <JobRejectionModal
        visible={!!rejectionJob}
        onClose={() => setRejectionJob(null)}
        onConfirm={handleRejectOrder}
        loading={submittingRejection}
        rejectionType={rejectionType}
        setRejectionType={setRejectionType}
        rejectionComment={rejectionComment}
        setRejectionComment={setRejectionComment}
      />

      <AgentWorkIDModal
        visible={showWorkID}
        onClose={() => setShowWorkID(false)}
        agentProfile={agentProfile}
        currentUser={currentUser}
      />

      {/* ══ POD Camera Modal ══ */}
      <ProofOfDeliveryModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleTakePODPhoto}
        capturing={capturing}
        cameraRef={cameraRef}
      />
    </View>
  );
}

const _s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  textSub: { color: T.textSub, fontSize: 14 },
  navHeader: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { color: T.primary, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: T.text, fontSize: 22, fontWeight: '900' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: T.border,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.yellowDim,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: { color: T.yellow, fontSize: 13, fontWeight: '800' },
  signOutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surface,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderColor: T.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  tabActive: { borderBottomWidth: 2, borderColor: T.primary },
  tabLabel: { color: T.textSub, fontSize: 13, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: T.border,
  },
  statValue: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
  statLabel: { color: T.textSub, fontSize: 10, textAlign: 'center' },

  onlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    gap: 12,
  },
  onlineCardActive: { borderColor: `${T.green}40`, backgroundColor: T.greenDim },
  onlineTitle: { color: T.text, fontSize: 15, fontWeight: '800' },
  // Extracted Component Styles removed

  actionBtn: {
    backgroundColor: T.primary,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  actionBtnText: { color: '#0a0e14', fontWeight: '900', fontSize: 14 },

  emptyState: { alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { color: T.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyBody: { color: T.textSub, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  historyLeft: { width: 40, alignItems: 'center' },
  historyProduct: { color: T.text, fontSize: 14, fontWeight: '700' },
  historySub: { color: T.textSub, fontSize: 12 },
  historyDate: { color: T.textSub, fontSize: 11, marginTop: 2 },
  historyEarning: { color: T.green, fontSize: 14, fontWeight: '900' },

  // Penalty Banner
  penaltyBanner: {
    backgroundColor: T.redDim,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: T.red,
    gap: 8,
  },
  penaltyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  penaltyTitle: { color: T.red, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  penaltyReason: { color: T.text, fontSize: 14, fontWeight: '600' },
  penaltyTimer: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.8 },
  penaltyTimerText: { color: T.red, fontSize: 12, fontWeight: '700' },

  // Modal classes

  // Modal Shared Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalSheet: {
    backgroundColor: T.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: T.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: T.text,
  },
  modalInstruction: {
    fontSize: 14,
    color: T.textSub,
    marginBottom: 20,
    lineHeight: 20,
  },

  // Compliance & Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: T.surface,
  },
  agentName: {
    color: T.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onlineInfo: { alignItems: 'flex-end' },
  onlineText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.primary, marginTop: 4 },

  complianceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    margin: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 12,
  },
  complianceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  complianceTitle: { color: T.red, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  complianceSub: { color: T.textSub, fontSize: 11, marginTop: 2 },

  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.edge,
    gap: 8,
  },
  actionPillText: { color: T.text, fontSize: 11, fontWeight: '800' },

  // Work ID Modal
  workIdScroll: { padding: 20 },
  workIdCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  workIdGradient: { padding: 24 },
  workIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  workIdSeal: { alignItems: 'center' },
  workIdSealText: {
    color: T.gold,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 1,
  },
  workIdChip: {
    width: 40,
    height: 30,
    borderRadius: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },

  workIdPhotoContainer: { alignItems: 'center', marginBottom: 20 },
  workIdPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: T.gold,
    backgroundColor: T.surface,
  },
  workIdVerifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    backgroundColor: T.primary,
    borderRadius: 12,
    padding: 2,
  },

  workIdInfo: { alignItems: 'center', gap: 4 },
  workIdName: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  workIdRole: { color: T.gold, fontSize: 12, fontWeight: '800', letterSpacing: 2 },

  workIdDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  workIdDetailItem: { alignItems: 'center' },
  workIdDetailLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  workIdDetailValue: { color: '#fff', fontSize: 13, fontWeight: '800' },

  workIdQrContainer: { alignItems: 'center', marginTop: 24 },
  workIdQr: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workIdQrText: { color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 12, textAlign: 'center' },

  // Lockdown Styles
  lockdownCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: T.rim },
  lockdownGradient: { padding: 32, alignItems: 'center' },
  lockdownIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockdownTitle: {
    color: T.gold,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  lockdownText: {
    color: T.textSub,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  lockdownStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 12,
  },
  lockdownStepText: { color: T.text, fontSize: 13, fontWeight: '600' },
}) as any;

// Dynamic style helper (cannot live inside StyleSheet.create)
const s = {
  ..._s,
  onlineDot: (on: boolean) => ({
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: on ? T.green : T.textSub,
  }),
} as any;

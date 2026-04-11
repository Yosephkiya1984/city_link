/**
 * DeliveryAgentDashboard â€” Full-featured agent interface
 * GPS dispatch, earnings, active job tracking, and history.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, ActivityIndicator, FlatList, Animated,
  RefreshControl, Alert, Dimensions, Modal, TextInput, Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/AppStore';
import {
  fetchAgentProfile, setAgentOnlineStatus, getCurrentLocation, updateAgentLocation,
  fetchPendingDispatches, fetchActiveJobs, fetchAgentHistory,
  acceptDeliveryJob, declineDeliveryJob, markOrderPickedUp,
  markOrderDeliveredByAgent, confirmDeliveryWithPin, subscribeToAgentDispatches,
  uploadDeliveryProof, recordTelemetry,
} from '../../services/delivery.service';
import { subscribeToTable, unsubscribe } from '../../services/supabase';
import { signOut } from '../../services/auth.service';

const { width } = Dimensions.get('window');

const T = {
  bg: '#0a0e14',
  surface: '#131920',
  surfaceHigh: '#1c2330',
  border: 'rgba(99,179,237,0.12)',
  primary: '#63b3ed',
  primaryDim: 'rgba(99,179,237,0.1)',
  green: '#68d391',
  greenDim: 'rgba(104,211,145,0.1)',
  yellow: '#f6e05e',
  yellowDim: 'rgba(246,224,94,0.1)',
  red: '#fc8181',
  redDim: 'rgba(252,129,129,0.1)',
  text: '#e2e8f0',
  textSub: '#8b949e',
  card: '#161d27',
};

function fmtETB(n) { return (n || 0).toLocaleString('en-ET'); }
function fmtTime(iso) {
  if (!iso) return 'â€”';
  return new Date(iso).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
  if (!iso) return 'â€”';
  return new Date(iso).toLocaleDateString('en-ET', { month: 'short', day: 'numeric' });
}

// â”€â”€ Countdown timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useCountdown(expiresAt) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setSecs(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return secs;
}

// â”€â”€ Dispatch Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DispatchCard({ dispatch, onAccept, onDecline }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const secs = useCountdown(dispatch.expires_at);
  const order = dispatch.order;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const mins = Math.floor(secs / 60);
  const sec = secs % 60;
  const urgent = secs < 60;

  return (
    <Animated.View style={[s.dispatchCard, { transform: [{ scale: pulse }] }]}>
      <LinearGradient colors={['#1a2510', '#1f3a15']} style={s.dispatchGradient}>
        {/* Header */}
        <View style={s.dispatchHeader}>
          <View style={s.dispatchBadge}>
            <Ionicons name="flash" size={14} color={T.yellow} />
            <Text style={s.dispatchBadgeText}>NEW DELIVERY JOB</Text>
          </View>
          <View style={[s.timerBox, urgent && { backgroundColor: T.redDim }]}>
            <Ionicons name="timer-outline" size={14} color={urgent ? T.red : T.yellow} />
            <Text style={[s.timerText, urgent && { color: T.red }]}>
              {mins}:{sec.toString().padStart(2, '0')}
            </Text>
          </View>
        </View>

        {/* Pickup */}
        <View style={s.addressRow}>
          <View style={[s.dot, { backgroundColor: T.green }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.addressLabel}>PICKUP FROM</Text>
            <Text style={s.addressText}>
              {order?.merchant?.business_name || order?.merchant?.full_name || 'Merchant'}
            </Text>
            <Text style={s.addressSub}>{order?.merchant?.subcity}, {order?.merchant?.woreda}</Text>
          </View>
        </View>

        {/* Dropoff */}
        <View style={s.addressRow}>
          <View style={[s.dot, { backgroundColor: T.red }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.addressLabel}>DELIVER TO</Text>
            <Text style={s.addressText}>{order?.shipping_address || 'See delivery instructions'}</Text>
          </View>
        </View>

        {/* Earnings */}
        <View style={s.earningsRow}>
          <View>
            <Text style={s.earningsLabel}>ORDER VALUE</Text>
            <Text style={s.earningsValue}>ETB {fmtETB(order?.total)}</Text>
          </View>
          <View style={s.earningsDivider} />
          <View>
            <Text style={s.earningsLabel}>YOUR EARNINGS</Text>
            <Text style={[s.earningsValue, { color: T.green }]}>
              ETB {fmtETB(Math.floor((order?.total || 0) * 0.12))}
            </Text>
          </View>
          <View style={s.earningsDivider} />
          <View>
            <Text style={s.earningsLabel}>PRODUCT</Text>
            <Text style={s.earningsValue} numberOfLines={1}>{order?.product_name || 'â€”'}</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={s.dispatchBtns}>
          <TouchableOpacity style={s.declineBtn} onPress={() => onDecline(dispatch)}>
            <Ionicons name="close" size={20} color={T.red} />
            <Text style={s.declineBtnText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.acceptBtn} onPress={() => onAccept(dispatch)}>
            <Ionicons name="checkmark" size={20} color="#0a0e14" />
            <Text style={s.acceptBtnText}>Accept Job</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// â”€â”€ Active Job Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ActiveJobCard({ job, onPickedUp, onArrived, onEnterPin }) {
  const statusConfig = {
    AGENT_ASSIGNED: { label: 'Head to Pickup', icon: 'navigate-outline', color: T.primary, next: 'pickup' },
    SHIPPED:        { label: 'Head to Dropoff', icon: 'car-outline', color: '#f59e0b', next: 'arrived' },
    IN_TRANSIT:     { label: 'Head to Dropoff', icon: 'car-outline', color: '#f59e0b', next: 'arrived' },
    AWAITING_PIN:   { label: 'Get Delivery PIN from Buyer', icon: 'keypad-outline', color: T.green, next: 'enter_pin' },
  };
  const cfg = statusConfig[job.status] || {};

  return (
    <View style={s.activeJobCard}>
      {/* Mini Navigation Map */}
      <View style={s.miniMapContainer}>
        <MapView
          style={s.miniMap}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: job.merchant?.lat || 9.0333,
            longitude: job.merchant?.lng || 38.7500,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={{ latitude: job.merchant?.lat || 9.0333, longitude: job.merchant?.lng || 38.7500 }}>
             <Ionicons name="location" size={24} color={T.primary} />
          </Marker>
        </MapView>
      </View>

      <LinearGradient colors={['#0d1b2a', '#0a1929']} style={s.activeJobGradient}>
        <View style={s.activeJobHeader}>
          <View style={[s.statusPill, { backgroundColor: `${cfg.color}20` }]}>
            <Ionicons name={cfg.icon || 'cube-outline'} size={14} color={cfg.color} />
            <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={s.activeJobTime}>{fmtTime(job.created_at)}</Text>
        </View>

        <Text style={s.activeJobProduct}>{job.product_name}</Text>
        <Text style={s.activeJobEarning}>
          Your pay: <Text style={{ color: T.green }}>ETB {fmtETB(Math.floor((job.total || 0) * 0.12))}</Text>
        </Text>

        <View style={s.addressRow}>
          <View style={[s.dot, { backgroundColor: T.green }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.addressLabel}>PICKUP</Text>
            <Text style={s.addressText}>{job.merchant?.business_name || 'Merchant'}</Text>
          </View>
        </View>
        <View style={s.addressRow}>
          <View style={[s.dot, { backgroundColor: T.red }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.addressLabel}>DELIVER TO</Text>
            <Text style={s.addressText}>{job.shipping_address}</Text>
          </View>
        </View>

        {cfg.next === 'pickup' && (
          <View>
            <TouchableOpacity 
              style={[s.actionBtn, job.agent_confirmed_pickup && { backgroundColor: T.surfaceHigh }]} 
              onPress={() => onPickedUp(job)}
              disabled={job.agent_confirmed_pickup}
            >
              <Ionicons name={job.agent_confirmed_pickup ? "time-outline" : "bag-check-outline"} size={18} color={job.agent_confirmed_pickup ? T.textSub : "#0a0e14"} />
              <Text style={[s.actionBtnText, job.agent_confirmed_pickup && { color: T.textSub }]}>
                {job.agent_confirmed_pickup ? "Waiting for Merchant..." : "I've Picked Up the Package"}
              </Text>
            </TouchableOpacity>
            
            {job.merchant_confirmed_pickup && !job.agent_confirmed_pickup && (
              <Text style={{ color: T.primary, textAlign: 'center', marginTop: 10, fontSize: 12, fontWeight: '800' }}>
                MERCHANT HAS CONFIRMED HANDOVER
              </Text>
            )}
          </View>
        )}
        {cfg.next === 'arrived' && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.yellow }]} onPress={() => onArrived(job)}>
            <Ionicons name="location-outline" size={18} color="#0a0e14" />
            <Text style={s.actionBtnText}>I Have Arrived</Text>
          </TouchableOpacity>
        )}
        {cfg.next === 'enter_pin' && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.green }]} onPress={() => onEnterPin(job)}>
            <Ionicons name="keypad-outline" size={18} color="#0a0e14" />
            <Text style={s.actionBtnText}>Enter Delivery PIN</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
}

// â”€â”€ Main Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function DeliveryAgentDashboard() {
  const navigation = useNavigation();
  const currentUser = useAppStore(s => s.currentUser);
  const showToast = useAppStore(s => s.showToast);
  const balance = useAppStore(s => s.balance);

  const [tab, setTab] = useState('home'); // home | history
  const [agentProfile, setAgentProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [dispatches, setDispatches] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);

  const [pinPromptJob, setPinPromptJob] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [submittingPin, setSubmittingPin] = useState(false);

  // Proof of Delivery (POD) State
  const [showCamera, setShowCamera] = useState(false);
  const [arrivedJob, setArrivedJob] = useState(null); // Which job we are currently taking POD for
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef(null);

  const locationInterval = useRef(null);
  const dispatchSub = useRef(null);
  const jobsSub = useRef(null);
  const activeJobsRef = useRef([]);

  useEffect(() => { activeJobsRef.current = activeJobs; }, [activeJobs]);

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

    // Compute today's earnings from history
    const today = new Date().toDateString();
    const todayTotal = hist
      .filter(h => new Date(h.delivered_at).toDateString() === today)
      .reduce((sum, h) => sum + Math.floor((h.total || 0) * 0.12), 0);
    setTodayEarnings(todayTotal);

    if (jobs.length === 0) {
      const pending = await fetchPendingDispatches(currentUser.id);
      setDispatches(pending);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    setLoading(true);
    loadDashboard().finally(() => setLoading(false));

    // Realtime subscription for dispatches
    dispatchSub.current = subscribeToAgentDispatches(currentUser.id, () => loadDashboard());

    // Unified subscription for ALL active jobs (agent-wide)
    jobsSub.current = subscribeToTable(`agent-jobs-${currentUser.id}`, 'marketplace_orders', `agent_id=eq.${currentUser.id}`, (payload) => {
      // Refresh whenever any order assigned to this agent changes
      loadDashboard();
    });

    return () => {
      unsubscribe(dispatchSub.current);
      unsubscribe(jobsSub.current);
      if (locationInterval.current) clearInterval(locationInterval.current);
    };
  }, [loadDashboard, currentUser?.id]);



  // â”€â”€ Online Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleToggleOnline = async (val) => {
    setTogglingOnline(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      let lat = null, lng = null;
      if (val) {
        const loc = await getCurrentLocation();
        if (!loc) {
          showToast('Could not get your location. Check GPS settings.', 'error');
          setTogglingOnline(false);
          return;
        }
        lat = loc.lat; lng = loc.lng;

        // Start background GPS pings
        locationInterval.current = setInterval(async () => {
          const l = await getCurrentLocation();
          if (l) {
            updateAgentLocation(currentUser.id, l.lat, l.lng);
            // If there's at least one active job, record a breadcrumb for the first one
            if (activeJobsRef.current.length > 0) {
              recordTelemetry(currentUser.id, activeJobsRef.current[0].id, l.lat, l.lng);
            }
          }
        }, 15000); // Higher frequency for World-Class tracking
      } else {
        if (locationInterval.current) { clearInterval(locationInterval.current); locationInterval.current = null; }
      }

      await setAgentOnlineStatus(currentUser.id, val, lat, lng);
      setIsOnline(val);
      showToast(val ? 'ðŸŸ¢ You are now ONLINE â€” orders will come to you!' : 'ðŸ”´ You are now OFFLINE', val ? 'success' : 'info');
    } catch (e) {
      showToast('Failed to update status', 'error');
    } finally {
      setTogglingOnline(false);
    }
  };

  // â”€â”€ Accept Dispatch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAccept = async (dispatch) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { ok, error } = await acceptDeliveryJob(dispatch.order_id, currentUser.id);
    if (!ok) {
      showToast(error || 'Job already taken by another agent', 'error');
      return;
    }
    
    showToast('Job accepted! Head to the merchant for pickup.', 'success');
    
    // Clear local dispatches immediately so they don't see the card anymore
    setDispatches(prev => prev.filter(d => d.order_id !== dispatch.order_id));
    
    // Refresh to pull the active job
    await loadDashboard();
  };

  // â”€â”€ Decline Dispatch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDecline = async (dispatch) => {
    await declineDeliveryJob(dispatch.order_id, currentUser.id);
    setDispatches(prev => prev.filter(d => d.order_id !== dispatch.order_id));
    showToast('Job declined', 'info');
  };

  // â”€â”€ Picked Up (Dual Confirmation) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handlePickedUp = async (job) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    try {
      const { ok, status, error, pin } = await markOrderPickedUp(job.id, currentUser.id);
      if (!ok) throw new Error(error);

      if (status === 'SHIPPED') {
        showToast('Package picked up! Delivery officially started.', 'success');
      } else {
        showToast('You confirmed pickup! Waiting for merchant handover...', 'info');
      }
      loadDashboard();
    } catch (e) {
      showToast(e.message || 'Pickup confirmation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // â”€â”€ Arrived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleArrived = async (job) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        showToast('Camera permission required for Proof of Delivery', 'error');
        return;
      }
    }
    
    setArrivedJob(job);
    setShowCamera(true);
    // Note: markOrderDeliveredByAgent will be called AFTER photo is taken
  };

  const handleTakePODPhoto = async () => {
    if (!cameraRef.current || capturing || !arrivedJob) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      showToast('Uploading proof...', 'info');
      
      const { ok, error } = await uploadDeliveryProof(arrivedJob.id, photo.base64);
      if (!ok) throw new Error(error);
      
      await markOrderDeliveredByAgent(arrivedJob.id, currentUser.id);
      setShowCamera(false);
      setArrivedJob(null);
      showToast('Proof uploaded! Ask buyer for PIN.', 'success');
      loadDashboard();
    } catch (e) {
      showToast('Failed to upload proof. Try again.', 'error');
    } finally {
      setCapturing(false);
    }
  };

  // â”€â”€ Enter PIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleEnterPin = (job) => {
    setPinInput('');
    setPinPromptJob(job);
  };

  const handleConfirmWithPin = async () => {
    if (!pinPromptJob) return;
    if (pinInput.trim().length < 4) {
      showToast('Please enter a 4-digit PIN', 'error');
      return;
    }
    setSubmittingPin(true);
    const res = await confirmDeliveryWithPin(pinPromptJob.id, pinInput.trim(), currentUser.id);
    setSubmittingPin(false);
    
    if (!res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(res.error === 'invalid_pin' ? 'Invalid Delivery PIN' : `Failed: ${res.error}`, 'error');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`âœ… Delivered! ETB ${res.agent_share || '...'} credited to your wallet`, 'success');
    setPinPromptJob(null);
    setPinInput('');
    loadDashboard();
  };

  const onRefresh = async () => { setRefreshing(true); await loadDashboard(); setRefreshing(false); };

  // â”€â”€ Pending approval screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (agentProfile && agentProfile.agent_status === 'PENDING') {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Ionicons name="hourglass-outline" size={64} color={T.yellow} />
        <Text style={[s.headerTitle, { textAlign: 'center', marginTop: 20, fontSize: 22 }]}>Application Under Review</Text>
        <Text style={[s.textSub, { textAlign: 'center', marginTop: 12, lineHeight: 22 }]}>
          Our team is reviewing your application. You'll be notified within 24 hours once approved!
        </Text>
        <TouchableOpacity style={[s.actionBtn, { marginTop: 32 }]} onPress={async () => { 
          await signOut();
          const { saveSession, useAppStore } = require('../../store/AppStore');
          await saveSession(null);
          useAppStore.getState().reset();
        }}>
          <Text style={s.actionBtnText}>Sign Out</Text>
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
          <Text style={s.greeting}>CityLink Delivery</Text>
          <Text style={s.headerTitle}>{currentUser?.full_name || 'Agent'}</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.switchBtn} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const { useAppStore } = require('../../store/AppStore');
            const currentUser = useAppStore.getState().currentUser;
            useAppStore.getState().setCurrentUser({ ...currentUser, role: 'citizen' });
          }}>
            <Ionicons name="repeat-outline" size={20} color={T.primary} />
            <Text style={{ color: T.primary, fontSize: 10, fontWeight: '800', marginTop: 2 }}>SWITCH</Text>
          </TouchableOpacity>
          <View style={s.ratingBadge}>
            <Ionicons name="star" size={12} color={T.yellow} />
            <Text style={s.ratingText}>{(agentProfile?.rating || 5).toFixed(1)}</Text>
          </View>
          <TouchableOpacity style={s.signOutBtn} onPress={() => {
            Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', onPress: async () => {
                await signOut();
                const { saveSession, useAppStore } = require('../../store/AppStore');
                await saveSession(null);
                useAppStore.getState().reset();
              } },
            ]);
          }}>
            <Ionicons name="log-out-outline" size={20} color={T.textSub} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* â”€â”€ Tabs â”€â”€ */}
      <View style={s.tabBar}>
        {[['home', 'home', 'Dashboard'], ['history', 'time', 'History']].map(([key, icon, label]) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && s.tabActive]} onPress={() => setTab(key)}>
            <Ionicons name={tab === key ? icon : `${icon}-outline`} size={18} color={tab === key ? T.primary : T.textSub} />
            <Text style={[s.tabLabel, tab === key && { color: T.primary }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'home' && (
          <>
            {/* Stats Row */}
            <View style={s.statsRow}>
              {[
                { label: 'Today\'s Earnings', value: `ETB ${fmtETB(todayEarnings)}`, icon: 'cash-outline', color: T.green },
                { label: 'Total Deliveries', value: agentProfile?.total_deliveries || 0, icon: 'cube-outline', color: T.primary },
                { label: 'Wallet Balance', value: `ETB ${fmtETB(balance)}`, icon: 'wallet-outline', color: T.yellow },
              ].map((st, i) => (
                <View key={i} style={s.statCard}>
                  <Ionicons name={st.icon} size={20} color={st.color} />
                  <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
              ))}
            </View>

            {/* Online Toggle */}
            <View style={[s.onlineCard, isOnline && s.onlineCardActive]}>
              <View style={s.onlineDot(isOnline)} />
              <View style={{ flex: 1 }}>
                <Text style={s.onlineTitle}>{isOnline ? 'ðŸŸ¢ You are ONLINE' : 'ðŸ”´ You are OFFLINE'}</Text>
                <Text style={s.onlineSub}>
                  {isOnline ? 'You are visible to orders within 5km' : 'Toggle on to start receiving delivery jobs'}
                </Text>
              </View>
              {togglingOnline ? (
                <ActivityIndicator size="small" color={T.primary} />
              ) : (
                <Switch
                  value={isOnline}
                  onValueChange={handleToggleOnline}
                  trackColor={{ false: T.surfaceHigh, true: T.green + '55' }}
                  thumbColor={isOnline ? T.green : T.textSub}
                />
              )}
            </View>

            {/* Pending Dispatch */}
            {dispatches.map(d => (
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -8 }}>
                  <Text style={{ color: T.text, fontSize: 13, fontWeight: '800' }}>ACTIVE ASSIGNMENTS ({activeJobs.length})</Text>
                  <Ionicons name="list-outline" size={16} color={T.textSub} />
                </View>
                {activeJobs.map(job => (
                  <ActiveJobCard
                    key={job.id}
                    job={job}
                    onPickedUp={handlePickedUp}
                    onArrived={handleArrived}
                    onEnterPin={handleEnterPin}
                  />
                ))}
              </View>
            )}

            {/* Empty state */}
            {activeJobs.length === 0 && dispatches.length === 0 && (
              <View style={s.emptyState}>
                <Ionicons name="bicycle-outline" size={52} color={T.textSub} />
                <Text style={s.emptyTitle}>{isOnline ? 'Waiting for orders...' : 'Go online to receive jobs'}</Text>
                <Text style={s.emptyBody}>
                  {isOnline
                    ? 'When a nearby merchant ships an order, you\'ll be alerted here.'
                    : 'Toggle the switch above and CityLink will match you to orders within 5km.'}
                </Text>
              </View>
            )}
          </>
        )}

        {tab === 'history' && (
          history.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="time-outline" size={52} color={T.textSub} />
              <Text style={s.emptyTitle}>No deliveries yet</Text>
              <Text style={s.emptyBody}>Your completed delivery history will appear here.</Text>
            </View>
          ) : (
            history.map((h, i) => (
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
                  <Text style={s.historyEarning}>+ETB {fmtETB(Math.floor((h.total || 0) * 0.12))}</Text>
                </View>
              </View>
            ))
          )
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* â•â• PIN Entry Modal â•â• */}
      <Modal visible={!!pinPromptJob} animationType="fade" transparent statusBarTranslucent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: T.text }}>Confirm Delivery</Text>
              <TouchableOpacity onPress={() => setPinPromptJob(null)} disabled={submittingPin}>
                <Ionicons name="close" size={22} color={T.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: T.textSub, marginBottom: 20, lineHeight: 20 }}>
              Ask the buyer for their 4-digit Delivery PIN to complete this order and receive your earnings.
            </Text>

            <TextInput
              style={s.modalInput}
              placeholder="Enter 4-digit PIN"
              placeholderTextColor={T.textSub}
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setPinPromptJob(null)} disabled={submittingPin}>
                <Text style={{ color: T.textSub, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.submitBtn, submittingPin && { opacity: 0.6 }]} onPress={handleConfirmWithPin} disabled={submittingPin}>
                {submittingPin ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={{ color: '#000', fontWeight: '800' }}>Confirm Delivery</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* â•â• POD Camera Modal â•â• */}
      <Modal visible={showCamera} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView style={{ flex: 1 }} ref={cameraRef}>
            <View style={s.cameraOverlay}>
              <Text style={s.cameraInstruction}>Capture Package at Doorstep</Text>
              <View style={s.cameraGrid} />
              
              <View style={s.cameraBottom}>
                <TouchableOpacity style={s.cameraClose} onPress={() => setShowCamera(false)}>
                  <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={s.shutterBtn} onPress={handleTakePODPhoto} disabled={capturing}>
                  {capturing ? <ActivityIndicator color="#000" /> : <View style={s.shutterInner} />}
                </TouchableOpacity>
                <View style={{ width: 44 }} />
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
}

const _s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  textSub: { color: T.textSub, fontSize: 14 },
  navHeader: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: T.primary, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: T.text, fontSize: 22, fontWeight: '900' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: T.border },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.yellowDim, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  ratingText: { color: T.yellow, fontSize: 13, fontWeight: '800' },
  signOutBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface },

  tabBar: { flexDirection: 'row', backgroundColor: T.surface, borderBottomWidth: 1, borderColor: T.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderColor: T.primary },
  tabLabel: { color: T.textSub, fontSize: 13, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: T.surface, borderRadius: 14, padding: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: T.border },
  statValue: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
  statLabel: { color: T.textSub, fontSize: 10, textAlign: 'center' },

  onlineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border, gap: 12 },
  onlineCardActive: { borderColor: `${T.green}40`, backgroundColor: T.greenDim },
  onlineTitle: { color: T.text, fontSize: 15, fontWeight: '800' },
  onlineSub: { color: T.textSub, fontSize: 12, marginTop: 2 },

  dispatchCard: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: `${T.green}40` },
  dispatchGradient: { padding: 18 },
  dispatchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dispatchBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.yellowDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  dispatchBadgeText: { color: T.yellow, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.yellowDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  timerText: { color: T.yellow, fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  addressLabel: { color: T.textSub, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  addressText: { color: T.text, fontSize: 14, fontWeight: '700' },
  addressSub: { color: T.textSub, fontSize: 12 },

  earningsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 12, marginBottom: 14 },
  earningsDivider: { width: 1, height: 30, backgroundColor: T.border, marginHorizontal: 10 },
  earningsLabel: { color: T.textSub, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  earningsValue: { color: T.text, fontSize: 13, fontWeight: '800', marginTop: 2 },

  dispatchBtns: { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: T.red, padding: 12 },
  declineBtnText: { color: T.red, fontWeight: '800', fontSize: 14 },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.green, borderRadius: 12, padding: 12 },
  acceptBtnText: { color: '#0a0e14', fontWeight: '900', fontSize: 14 },

  activeJobCard: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: T.primaryDim },
  activeJobGradient: { padding: 18, gap: 10 },
  activeJobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  activeJobTime: { color: T.textSub, fontSize: 12 },
  activeJobProduct: { color: T.text, fontSize: 17, fontWeight: '800' },
  activeJobEarning: { color: T.textSub, fontSize: 13 },

  actionBtn: { backgroundColor: T.primary, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  actionBtnText: { color: '#0a0e14', fontWeight: '900', fontSize: 14 },

  emptyState: { alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { color: T.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyBody: { color: T.textSub, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: T.border },
  historyLeft: { width: 40, alignItems: 'center' },
  historyProduct: { color: T.text, fontSize: 14, fontWeight: '700' },
  historySub: { color: T.textSub, fontSize: 12 },
  historyDate: { color: T.textSub, fontSize: 11, marginTop: 2 },
  historyEarning: { color: T.green, fontSize: 14, fontWeight: '900' },

  // Modal classes
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 },
  modalSheet: { backgroundColor: T.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: T.border },
  modalInput: { backgroundColor: T.bg, borderRadius: 12, padding: 16, fontSize: 18, fontWeight: '800', color: T.text, marginBottom: 20, textAlign: 'center', letterSpacing: 4 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  submitBtn: { backgroundColor: T.green, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, minWidth: 140, alignItems: 'center' },

  // World-Class Additions
  miniMapContainer: { height: 120, width: '100%', overflow: 'hidden' },
  miniMap: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 40, alignItems: 'center' },
  cameraInstruction: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginTop: 40, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10 },
  cameraGrid: { width: '80%', height: '50%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed' },
  cameraBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
  cameraClose: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  shutterBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 5 },
  shutterInner: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: '#000' },
}) as any;

// Dynamic style helper (cannot live inside StyleSheet.create)
const s = {
  ..._s,
  onlineDot: (on: boolean) => ({ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? T.green : T.textSub }),
} as any;

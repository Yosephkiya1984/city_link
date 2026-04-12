import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
  Animated as RNAnimated,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Fonts, FontSize, Radius, Shadow } from '../../theme';
import { subscribeToOrderStatus, calculateETA } from '../../services/delivery.service';
import { unsubscribe } from '../../services/supabase';

const { width: SW, height: SH } = Dimensions.get('window');

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ADDIS_LAT = 9.0333;
const ADDIS_LNG = 38.75;

export default function TrackOrderScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params || {};
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;

  const [order, setOrder] = useState(route.params?.order || null);
  const [loading, setLoading] = useState(!route.params?.order);
  const [eta, setEta] = useState(null);
  const [agentLocation, setAgentLocation] = useState(null);

  const mapRef = useRef(null);
  const markerAnim = useRef(new RNAnimated.Value(0)).current; // For smooth marker movement if needed

  // â”€â”€ Data Subscription â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!orderId) return;

    const sub = subscribeToOrderStatus(orderId, (payload) => {
      const newOrder = payload.new;
      setOrder((prev) => ({ ...prev, ...newOrder }));

      // Update agent location if available
      if (newOrder.agent_id) {
        // In a real app, we'd fetch the agent's lat/lng from the delivery_agents table
        // For this demo/implementation, we assume agent coords are synced
      }
    });

    return () => unsubscribe(sub);
  }, [orderId]);

  // Periodically fetch agent location (Simulated or Real)
  useEffect(() => {
    let interval;
    if (order?.agent_id && (order.status === 'IN_TRANSIT' || order.status === 'AGENT_ASSIGNED')) {
      const fetchLoc = async () => {
        const { supabase } = require('../../services/supabase');
        const { data } = await supabase
          .from('delivery_agents')
          .select('current_lat, current_lng')
          .eq('id', order.agent_id)
          .single();

        if (data?.current_lat && data?.current_lng) {
          const newLoc = { latitude: data.current_lat, longitude: data.current_lng };
          setAgentLocation(newLoc);

          // Calculate ETA
          if (order.shipping_address_coords) {
            // Mock target if not in order
          } else {
            // Assume some target near Addis center for demo
            const target = { latitude: ADDIS_LAT + 0.01, longitude: ADDIS_LNG + 0.01 };
            setEta(
              calculateETA(newLoc.latitude, newLoc.longitude, target.latitude, target.longitude)
            );
          }
        }
      };

      fetchLoc();
      interval = setInterval(fetchLoc, 15000); // Every 15s
    }
    return () => clearInterval(interval);
  }, [order?.agent_id, order?.status]);

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getStatusLabel = (status) => {
    switch (status) {
      case 'PAID':
        return 'Ready for Dispatch';
      case 'DISPATCHING':
        return 'Finding Agent';
      case 'AGENT_ASSIGNED':
        return 'Agent en Route';
      case 'SHIPPED':
        return 'Picked Up';
      case 'IN_TRANSIT':
        return 'On the Way';
      case 'AWAITING_PIN':
        return 'Arrived';
      case 'COMPLETED':
        return 'Delivered';
      default:
        return status?.replace('_', ' ');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PAID':
        return 'time-outline';
      case 'AGENT_ASSIGNED':
        return 'bicycle-outline';
      case 'IN_TRANSIT':
        return 'navigate-outline';
      case 'AWAITING_PIN':
        return 'checkmark-circle-outline';
      default:
        return 'cube-outline';
    }
  };

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading && !order) {
    return (
      <View style={[styles.container, { backgroundColor: C.ink, justifyContent: 'center' }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* â”€â”€ Header â”€â”€ */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Track Order</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* â”€â”€ Map View â”€â”€ */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={isDark ? mapStyleDark : []}
        initialRegion={{
          latitude: agentLocation?.latitude || ADDIS_LAT,
          longitude: agentLocation?.longitude || ADDIS_LNG,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {agentLocation && (
          <Marker coordinate={agentLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.agentMarker}>
              <View style={[styles.agentMarkerInner, { backgroundColor: C.primary }]}>
                <Ionicons name="bicycle" size={18} color={isDark ? '#000' : '#fff'} />
              </View>
              <View style={[styles.pulse, { borderColor: C.primary }]} />
            </View>
          </Marker>
        )}

        {/* Destination Marker (Mock) */}
        <Marker coordinate={{ latitude: ADDIS_LAT + 0.01, longitude: ADDIS_LNG + 0.01 }}>
          <View style={styles.destMarker}>
            <Ionicons name="location" size={30} color={C.red} />
          </View>
        </Marker>
      </MapView>

      {/* â”€â”€ Status Overlay â”€â”€ */}
      <View style={styles.overlay}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 100}
          tint={isDark ? 'dark' : 'light'}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: C.primaryL }]}>
              <Ionicons name={getStatusIcon(order?.status)} size={24} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusMain, { color: C.text }]}>
                {getStatusLabel(order?.status)}
              </Text>
              <Text style={[styles.statusSub, { color: C.sub }]}>
                Order #{order?.id?.slice(0, 8)}
              </Text>
            </View>
            {eta && (
              <View style={styles.etaWrap}>
                <Text style={[styles.etaVal, { color: C.primary }]}>{eta} min</Text>
                <Text style={[styles.etaLab, { color: C.sub }]}>ETA</Text>
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: C.edge }]} />

          {/* Delivery Agent Info */}
          {order?.agent_id ? (
            <View style={styles.agentRow}>
              <View style={[styles.avatar, { backgroundColor: C.lift }]}>
                <Ionicons name="person" size={20} color={C.sub} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.agentName, { color: C.text }]}>Verified CityLink Agent</Text>
                <Text style={[styles.agentSub, { color: C.sub }]}>
                  ID: {order.agent_id.slice(0, 6)}
                </Text>
              </View>
              <TouchableOpacity style={[styles.contactBtn, { backgroundColor: C.primary }]}>
                <Ionicons name="call" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.waitingRow}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={[styles.waitingText, { color: C.sub }]}>
                Allocating nearest delivery agent...
              </Text>
            </View>
          )}

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: C.primary },
                {
                  width:
                    order?.status === 'COMPLETED'
                      ? '100%'
                      : order?.status === 'AWAITING_PIN'
                        ? '90%'
                        : order?.status === 'IN_TRANSIT'
                          ? '65%'
                          : order?.status === 'AGENT_ASSIGNED'
                            ? '35%'
                            : '10%',
                },
              ]}
            />
          </View>

          {/* Proof of Delivery (POD) Image Preview */}
          {order?.delivery_proof_url && (
            <View style={styles.podContainer}>
              <View style={styles.podHeader}>
                <Ionicons name="camera-outline" size={14} color={C.sub} />
                <Text style={[styles.podLabel, { color: C.sub }]}>Proof of Delivery</Text>
              </View>
              <Image
                source={{ uri: order.delivery_proof_url }}
                style={styles.podImage}
                resizeMode="cover"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.closeBtn, { borderTopColor: C.edge }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.closeBtnText, { color: C.primary }]}>Minimize Tracking</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
}

const mapStyleDark = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  map: { flex: 1 },
  agentMarker: { alignItems: 'center', justifyContent: 'center' },
  agentMarkerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...Shadow.md,
  },
  pulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    opacity: 0.3,
  },
  destMarker: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  card: {
    borderRadius: Radius['2xl'],
    padding: 20,
    overflow: 'hidden',
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMain: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  statusSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  etaWrap: { alignItems: 'flex-end' },
  etaVal: { fontSize: 22, fontWeight: '900' },
  etaLab: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  divider: { height: 1, marginVertical: 18 },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentName: { fontSize: 15, fontWeight: '800' },
  agentSub: { fontSize: 12, fontWeight: '600' },
  contactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waitingText: { fontSize: 13, fontWeight: '600' },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    marginTop: 20,
    marginBottom: 10,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  closeBtn: { paddingTop: 15, marginTop: 10, borderTopWidth: 1, alignItems: 'center' },
  closeBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  // POD Styles
  podContainer: {
    marginTop: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  podHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  podLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  podImage: { width: '100%', height: 120 },
});

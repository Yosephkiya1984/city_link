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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

type TrackOrderRouteProp = RouteProp<{ params: { orderId: string; order?: any } }, 'params'>;
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useSystemStore } from '../../store/SystemStore';
import { Colors, DarkColors, Fonts, FontSize, Radius, Shadow } from '../../theme';
import { subscribeToOrderStatus, calculateETA } from '../../services/delivery.service';
import { unsubscribe } from '../../services/supabase';

const { width: SW, height: SH } = Dimensions.get('window');

// -- Constants -----------------------------------------------------------------------------
const ADDIS_LAT = 9.0333;
const ADDIS_LNG = 38.75;

export default function TrackOrderScreen() {
  const navigation = useNavigation();
  const route = useRoute<TrackOrderRouteProp>();
  const { orderId } = route.params || {};
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;

  const [order, setOrder] = useState<any>(route.params?.order || null);
  const [loading, setLoading] = useState(!route.params?.order);
  const [eta, setEta] = useState<any>(null);
  const [agentLocation, setAgentLocation] = useState<any>(null);

  const mapRef = useRef(null);
  const markerAnim = useRef(new RNAnimated.Value(0)).current; 

  // -- Data Subscription -------------------------------------------------------------------
  useEffect(() => {
    if (!orderId) return;

    const sub = subscribeToOrderStatus(orderId, (payload: any) => {
      const newOrder = payload.new;
      setOrder((prev: any) => ({ ...prev, ...newOrder }));
    });

    return () => unsubscribe(sub);
  }, [orderId]);

  // Periodically fetch agent location
  useEffect(() => {
    let interval: NodeJS.Timeout;
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

          const destLat = order?.destination_lat || (ADDIS_LAT + 0.01);
          const destLng = order?.destination_lng || (ADDIS_LNG + 0.01);
          setEta(
            calculateETA(newLoc.latitude, newLoc.longitude, destLat, destLng)
          );
        }
      };

      fetchLoc();
      interval = setInterval(fetchLoc, 15000);
    }
    return () => clearInterval(interval);
  }, [order?.agent_id, order?.status]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return 'Ready for Dispatch';
      case 'DISPATCHING': return 'Finding Agent';
      case 'AGENT_ASSIGNED': return 'Agent en Route';
      case 'SHIPPED': return 'Picked Up';
      case 'IN_TRANSIT': return 'On the Way';
      case 'AWAITING_PIN': return 'Arrived';
      case 'COMPLETED': return 'Delivered';
      default: return status ? status.toLowerCase().split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : 'Unknown Status';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return 'time-outline';
      case 'AGENT_ASSIGNED': return 'bicycle-outline';
      case 'IN_TRANSIT': return 'navigate-outline';
      case 'AWAITING_PIN': return 'checkmark-circle-outline';
      default: return 'cube-outline';
    }
  };

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

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Track Order</Text>
        <View style={{ width: 44 }} />
      </View>

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

        <Marker 
          coordinate={{ 
            latitude: order?.destination_lat || (ADDIS_LAT + 0.01), 
            longitude: order?.destination_lng || (ADDIS_LNG + 0.01) 
          }}
        >
          <View style={styles.destMarker}>
            <Ionicons name="location" size={30} color={C.red} />
          </View>
        </Marker>
      </MapView>

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

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: C.primary },
                {
                  width:
                    order?.status === 'COMPLETED' ? '100%' :
                    order?.status === 'AWAITING_PIN' ? '90%' :
                    order?.status === 'IN_TRANSIT' ? '65%' :
                    order?.status === 'AGENT_ASSIGNED' ? '35%' : '10%',
                },
              ]}
            />
          </View>

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
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
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

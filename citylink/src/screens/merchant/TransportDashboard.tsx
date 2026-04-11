import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView } from 'expo-camera';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, Card, SectionTitle, CInput } from '../../components';
import { fmtETB, uid, fmtDateTime } from '../../utils';
import { t } from '../../utils/i18n';

import { useRealtimePostgres } from '../../hooks/useRealtimePostgres';
import {
  fetchTransportRoutes,
  fetchTransportTickets,
  updateTicketStatus,
  createRoute,
} from '../../services/transit.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Transport color scheme
const TRANSPORT_COLORS = {
  primary: '#06B6D4',
  primaryL: 'rgba(6,182,212,0.1)',
  primaryB: 'rgba(6,182,212,0.28)',
  status: {
    VALID: '#00A86B', // Green
    USED: '#8A9AB8', // Grey
    CANCELLED: '#E8312A', // Red
  } as Record<string, string>,
};

export default function TransportDashboard() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const balance = useAppStore((s) => s.balance);
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const reset = useAppStore((s) => s.reset);

  const [activeTab, setActiveTab] = useState('routes');
  const [routes, setRoutes] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [newRoute, setNewRoute] = useState({
    from: '',
    to: '',
    departure_time: '',
    price: '',
    available_seats: 50,
    status: 'active',
  });

  // KPI calculations
  const activeRoutes = routes.filter((r: any) => r.status === 'active').length;
  const totalSeats = routes.reduce((sum: number, r: any) => sum + (r.available_seats || 0), 0);
  const soldSeats = tickets.filter((t: any) => t.status === 'VALID').length;
  const availableSeats = totalSeats - soldSeats;
  const loadFactor = totalSeats > 0 ? ((soldSeats / totalSeats) * 100).toFixed(1) : '0';

  const todayRevenue = tickets
    .filter(
      (t: any) =>
        t.status === 'VALID' && new Date(t.created_at).toDateString() === new Date().toDateString()
    )
    .reduce((sum: number, t: any) => sum + (t.price || 0), 0);

  const loadData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [routesRes, ticketsRes] = await Promise.all([
        fetchTransportRoutes(currentUser.id),
        fetchTransportTickets(currentUser.id),
      ]);

      if (routesRes.data) setRoutes(routesRes.data);
      if (ticketsRes.data) {
        const sortedTickets = ticketsRes.data.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setTickets(sortedTickets);
      }
    } catch (error) {
      showToast('Failed to load data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  // Real-time ticket updates
  useRealtimePostgres({
    channelName: `transport-tickets-${currentUser?.id}`,
    table: 'bus_tickets',
    filter: `operator_id=eq.${currentUser?.id}`,
    enabled: !!currentUser?.id,
    onPayload: (payload: any) => {
      if (payload.eventType === 'INSERT') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('🚌 New ticket sold!', 'success');
        loadData();
      } else {
        loadData();
      }
    },
  });

  const updateTicket = async (ticketId: string, newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const result = await updateTicketStatus(ticketId, newStatus);
      if (!result.error) {
        showToast(`Ticket ${newStatus.toLowerCase()}`, 'success');
        loadData();
      } else {
        showToast(result.error || 'Failed to update ticket', 'error');
      }
    } catch (error) {
      showToast('Failed to update ticket', 'error');
    }
    setLoading(false);
  };

  const addRoute = async () => {
    if (!newRoute.from || !newRoute.to || !newRoute.departure_time || !newRoute.price) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const routeData = {
        id: uid(),
        operator_id: currentUser.id,
        from: newRoute.from,
        to: newRoute.to,
        departure_time: newRoute.departure_time,
        price: parseFloat(newRoute.price),
        available_seats: Number(newRoute.available_seats),
        status: newRoute.status,
        created_at: new Date().toISOString(),
      };

      const result = await createRoute(routeData);
      if (!result.error) {
        setRoutes([routeData, ...routes]);
        setNewRoute({
          from: '',
          to: '',
          departure_time: '',
          price: '',
          available_seats: 50,
          status: 'active',
        });
        setShowAddRoute(false);
        showToast('Route added successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to add route', 'error');
      }
    } catch (error) {
      showToast('Failed to add route', 'error');
    }
    setLoading(false);
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    try {
      const ticketData = JSON.parse(data);
      const ticket = tickets.find((t: any) => t.id === ticketData.ticketId);

      if (ticket) {
        if (ticket.status === 'VALID') {
          setScanResult({ success: true, ticket });
          updateTicket(ticket.id, 'USED');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (ticket.status === 'USED') {
          setScanResult({ success: false, message: 'Ticket already used' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          setScanResult({ success: false, message: 'Invalid ticket' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        setScanResult({ success: false, message: 'Ticket not found' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      setTimeout(() => {
        setScanResult(null);
      }, 3000);
    } catch (error) {
      setScanResult({ success: false, message: 'Invalid QR code' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const logout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Logged out successfully', 'success');
    reset();

    // Use navigation.replace instead of reset to avoid the error
    try {
      (navigation as any).replace('Auth');
    } catch (error) {
      console.log('Navigation reset error, trying alternative method');
      (navigation as any).navigate('Auth');
    }
  };

  const getLoadFactorColor = (factor: number | string) => {
    const f = Number(factor);
    if (f >= 90) return '#E8312A';
    if (f >= 60) return '#F5B800';
    return '#00A86B';
  };

  const RouteCard = ({ route }: { route: any }) => {
    const routeTickets = tickets.filter((t: any) => t.route_id === route.id);
    const soldSeats = routeTickets.filter((t: any) => t.status === 'VALID').length;
    const loadFactor =
      route.available_seats > 0 ? ((soldSeats / route.available_seats) * 100).toFixed(1) : 0;
    const isFull = soldSeats >= route.available_seats;

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedRoute(route);
          // Could show route details modal
        }}
      >
        <Card
          style={{
            marginBottom: 12,
            padding: 16,
            opacity: isFull ? 0.6 : 1,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ color: C.text, fontSize: 15, fontFamily: Fonts.black }}>
                  {route.from} â†’ {route.to}
                </Text>
                {isFull && (
                  <View
                    style={{
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: 'rgba(232,49,42,0.1)',
                    }}
                  >
                    <Text
                      style={{
                        color: '#E8312A',
                        fontSize: 8,
                        fontFamily: Fonts.bold,
                      }}
                    >
                      FULL
                    </Text>
                  </View>
                )}
              </View>

              <Text style={{ color: C.sub, fontSize: 11, marginBottom: 4 }}>
                Departure:{' '}
                {new Date(route.departure_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>

              <Text
                style={{
                  color: TRANSPORT_COLORS.primary,
                  fontSize: 16,
                  fontFamily: Fonts.black,
                  marginBottom: 8,
                }}
              >
                {fmtETB(route.price || 0)}
              </Text>

              {/* Load factor bar */}
              <View style={{ marginBottom: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 2,
                  }}
                >
                  <Text style={{ color: C.sub, fontSize: 10 }}>Load Factor</Text>
                  <Text
                    style={{
                      color: getLoadFactorColor(loadFactor),
                      fontSize: 10,
                      fontFamily: Fonts.bold,
                    }}
                  >
                    {loadFactor}%
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: C.surface,
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: getLoadFactorColor(loadFactor),
                      width: `${Math.min(100, Number(loadFactor))}%`,
                    }}
                  />
                </View>
              </View>

              <Text style={{ color: C.sub, fontSize: 11 }}>
                {soldSeats}/{route.available_seats} seats sold
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const TicketCard = ({ ticket }: { ticket: any }) => {
    const route = routes.find((r: any) => r.id === ticket.route_id);

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedTicket(ticket);
          setShowTicketDetail(true);
        }}
      >
        <Card style={{ marginBottom: 8, padding: 12 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black, marginBottom: 4 }}
              >
                {route ? `${route.from} â†’ ${route.to}` : 'Unknown Route'}
              </Text>
              <Text style={{ color: C.sub, fontSize: 11, marginBottom: 2 }}>
                Passenger: {ticket.passenger_name || 'Unknown'}
              </Text>
              <Text style={{ color: C.sub, fontSize: 11 }}>
                Booked: {new Date(ticket.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{ color: TRANSPORT_COLORS.primary, fontSize: 14, fontFamily: Fonts.bold }}
              >
                {fmtETB(ticket.price || 0)}
              </Text>
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  backgroundColor:
                    ticket.status === 'VALID'
                      ? 'rgba(0,168,107,0.1)'
                      : ticket.status === 'USED'
                        ? 'rgba(138,154,184,0.1)'
                        : 'rgba(232,49,42,0.1)',
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    color:
                      ticket.status === 'VALID'
                        ? '#00A86B'
                        : ticket.status === 'USED'
                          ? '#8A9AB8'
                          : '#E8312A',
                    fontSize: 9,
                    fontFamily: Fonts.bold,
                    textTransform: 'uppercase',
                  }}
                >
                  {ticket.status}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar
        title={`🚌 Transport Â· ${activeRoutes} routes`}
        right={
          <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
            <Ionicons name="log-out-outline" size={24} color={C.text} />
          </TouchableOpacity>
        }
      />

      {/* Additional Logout Button for visibility */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.edge2,
        }}
      >
        <TouchableOpacity
          onPress={logout}
          style={{
            backgroundColor: '#E8312A',
            borderRadius: Radius.xl,
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            alignSelf: 'flex-end',
          }}
        >
          <Ionicons name="log-out" size={16} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontFamily: Fonts.bold }}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue Stats */}
        <View style={{ padding: 16 }}>
          <LinearGradient
            colors={[TRANSPORT_COLORS.primaryL, 'transparent']}
            style={{ borderRadius: Radius['3xl'], padding: 24, ...Shadow.md }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: C.text, fontSize: 13, fontFamily: Fonts.bold, opacity: 0.8 }}>
                  Load Factor
                </Text>
                <Text
                  style={{
                    color: TRANSPORT_COLORS.primary,
                    fontSize: 32,
                    fontFamily: Fonts.black,
                    marginTop: 4,
                  }}
                >
                  {loadFactor}%
                </Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: TRANSPORT_COLORS.primaryL,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="bus" size={24} color={TRANSPORT_COLORS.primary} />
              </View>
            </View>

            <View
              style={{ height: 1, backgroundColor: 'rgba(6,182,212,0.2)', marginVertical: 20 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#00A86B', fontSize: 16, fontFamily: Fonts.black }}>
                  {availableSeats}
                </Text>
                <Text
                  style={{ color: 'rgba(0,168,107,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  SEATS FREE
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{ color: TRANSPORT_COLORS.primary, fontSize: 16, fontFamily: Fonts.black }}
                >
                  {soldSeats}
                </Text>
                <Text
                  style={{ color: 'rgba(6,182,212,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  TICKETS SOLD
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{ color: TRANSPORT_COLORS.primary, fontSize: 16, fontFamily: Fonts.black }}
                >
                  {fmtETB(todayRevenue, 0)}
                </Text>
                <Text
                  style={{ color: 'rgba(6,182,212,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  REVENUE
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Tab Navigation */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 }}>
          {['routes', 'tickets', 'scanner', 'stats'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: Radius.xl,
                backgroundColor: activeTab === tab ? TRANSPORT_COLORS.primaryL : C.surface,
                borderWidth: 1.5,
                borderColor: activeTab === tab ? TRANSPORT_COLORS.primaryB : C.edge2,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? TRANSPORT_COLORS.primary : C.sub,
                  fontSize: 11,
                  fontFamily: Fonts.black,
                  textTransform: 'uppercase',
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'routes' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Active Routes" />
            <CButton
              title="Add Route"
              onPress={() => setShowAddRoute(true)}
              style={{ marginBottom: 16 }}
            />

            {loading && routes.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                Loading routes...
              </Text>
            ) : routes.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>No routes yet</Text>
            ) : (
              routes.map((route) => <RouteCard key={route.id} route={route} />)
            )}
          </View>
        )}

        {activeTab === 'tickets' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Recent Tickets" />
            {loading && tickets.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                Loading tickets...
              </Text>
            ) : tickets.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>No tickets yet</Text>
            ) : (
              tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
            )}
          </View>
        )}

        {activeTab === 'scanner' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Boarding Scanner" />
            <View
              style={{
                height: SCREEN_WIDTH - 32,
                borderRadius: Radius.xl,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: TRANSPORT_COLORS.primaryB,
                marginBottom: 16,
              }}
            >
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              />

              {/* Scan overlay */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 200,
                    height: 200,
                    borderWidth: 2,
                    borderColor: 'rgba(6,182,212,0.5)',
                    borderRadius: 12,
                  }}
                />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: Fonts.black,
                    marginTop: 20,
                    textAlign: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                >
                  Scan boarding QR code
                </Text>
              </View>
            </View>

            {scanResult && (
              <View
                style={{
                  backgroundColor: scanResult.success
                    ? 'rgba(0,168,107,0.1)'
                    : 'rgba(232,49,42,0.1)',
                  borderRadius: Radius.xl,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: scanResult.success ? 'rgba(0,168,107,0.28)' : 'rgba(232,49,42,0.28)',
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name={scanResult.success ? 'checkmark-circle' : 'close-circle'}
                  size={48}
                  color={scanResult.success ? '#00A86B' : '#E8312A'}
                />
                <Text
                  style={{
                    color: scanResult.success ? '#00A86B' : '#E8312A',
                    fontSize: 16,
                    fontFamily: Fonts.black,
                    marginTop: 8,
                    textAlign: 'center',
                  }}
                >
                  {scanResult.success ? 'Boarding Validated' : scanResult.message}
                </Text>
                {scanResult.success && scanResult.ticket && (
                  <Text
                    style={{
                      color: C.sub,
                      fontSize: 12,
                      marginTop: 4,
                      textAlign: 'center',
                    }}
                  >
                    {scanResult.ticket.passenger_name} - {scanResult.ticket.route_id}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'stats' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Analytics" />
            <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
              Analytics dashboard coming soon
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Route Modal */}
      <Modal visible={showAddRoute} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: C.ink }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: C.edge2,
            }}
          >
            <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
              Add New Route
            </Text>
            <TouchableOpacity onPress={() => setShowAddRoute(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
                >
                  From *
                </Text>
                <CInput
                  placeholder="Origin city"
                  value={newRoute.from}
                  onChangeText={(text) => setNewRoute({ ...newRoute, from: text })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
                >
                  To *
                </Text>
                <CInput
                  placeholder="Destination city"
                  value={newRoute.to}
                  onChangeText={(text) => setNewRoute({ ...newRoute, to: text })}
                />
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Departure Time *
              </Text>
              <CInput
                placeholder="06:00"
                value={newRoute.departure_time}
                onChangeText={(text) => setNewRoute({ ...newRoute, departure_time: text })}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
                >
                  Price (ETB) *
                </Text>
                <CInput
                  placeholder="0.00"
                  value={newRoute.price}
                  onChangeText={(text) => setNewRoute({ ...newRoute, price: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
                >
                  Available Seats *
                </Text>
                <CInput
                  placeholder="50"
                  value={newRoute.available_seats.toString()}
                  onChangeText={(text) =>
                    setNewRoute({ ...newRoute, available_seats: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            <CButton
              title="Add Route"
              onPress={addRoute}
              loading={loading}
              style={{ marginTop: 20 }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal visible={showTicketDetail} animationType="slide" presentationStyle="pageSheet">
        {selectedTicket && (
          <View style={{ flex: 1, backgroundColor: C.ink }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.edge2,
              }}
            >
              <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
                Ticket Details
              </Text>
              <TouchableOpacity onPress={() => setShowTicketDetail(false)} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Card style={{ padding: 16, marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>
                    Ticket {selectedTicket.id.slice(-8)}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor:
                        selectedTicket.status === 'VALID'
                          ? 'rgba(0,168,107,0.1)'
                          : selectedTicket.status === 'USED'
                            ? 'rgba(138,154,184,0.1)'
                            : 'rgba(232,49,42,0.1)',
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedTicket.status === 'VALID'
                            ? '#00A86B'
                            : selectedTicket.status === 'USED'
                              ? '#8A9AB8'
                              : '#E8312A',
                        fontSize: 10,
                        fontFamily: Fonts.bold,
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedTicket.status}
                    </Text>
                  </View>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 4 }}
                  >
                    {selectedTicket.passenger_name || 'Passenger'}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12, marginBottom: 2 }}>
                    Route: {routes.find((r) => r.id === selectedTicket.route_id)?.from || 'Unknown'}{' '}
                    â†’ {routes.find((r) => r.id === selectedTicket.route_id)?.to || 'Unknown'}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12 }}>
                    Booked: {new Date(selectedTicket.created_at).toLocaleString()}
                  </Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      color: TRANSPORT_COLORS.primary,
                      fontSize: 18,
                      fontFamily: Fonts.black,
                    }}
                  >
                    {fmtETB(selectedTicket.price || 0)}
                  </Text>
                </View>
              </Card>

              {selectedTicket.status === 'VALID' && (
                <CButton
                  title="Mark as Used"
                  onPress={() => updateTicket(selectedTicket.id, 'USED')}
                />
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

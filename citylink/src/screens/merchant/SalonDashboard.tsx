import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, Card, SectionTitle, CInput } from '../../components';
import { fmtETB, uid, fmtDateTime } from '../../utils';
import { t } from '../../utils/i18n';

import { useRealtimePostgres } from '../../hooks/useRealtimePostgres';
import {
  fetchSalonBookings,
  fetchSalonServices,
  updateBookingStatus,
  createService,
} from '../../services/services.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Salon color scheme
const SALON_COLORS = {
  primary: '#EC4899',
  primaryL: 'rgba(236,72,153,0.1)',
  primaryB: 'rgba(236,72,153,0.28)',
  status: {
    PENDING: '#F5B800', // Amber
    CONFIRMED: '#00A86B', // Green
    IN_PROGRESS: '#2D7EF0', // Blue
    COMPLETED: '#00A86B', // Green
    CANCELLED: '#E8312A', // Red
  },
};

export default function SalonDashboard() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const balance = useAppStore((s) => s.balance);
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const reset = useAppStore((s) => s.reset);

  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration_minutes: 30,
    description: '',
    available: true,
  });

  // KPI calculations
  const todayBookings = bookings.filter(
    (b) => new Date(b.appointment_time).toDateString() === new Date().toDateString()
  ).length;

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING').length;
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED').length;

  const todayRevenue = bookings
    .filter(
      (b) =>
        b.status === 'COMPLETED' &&
        new Date(b.appointment_time).toDateString() === new Date().toDateString()
    )
    .reduce((sum, b) => sum + (b.price || 0), 0);

  const loadData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [bookingsRes, servicesRes] = await Promise.all([
        fetchSalonBookings(currentUser.id),
        fetchSalonServices(currentUser.id),
      ]);

      if (bookingsRes.data) {
        const sortedBookings = bookingsRes.data.sort(
          (a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()
        );
        setBookings(sortedBookings);
      }
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      showToast('Failed to load data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  // Real-time booking updates
  useRealtimePostgres({
    channelName: `salon-bookings-${currentUser?.id}`,
    table: 'service_bookings',
    filter: `salon_id=eq.${currentUser?.id}`,
    enabled: !!currentUser?.id,
    onPayload: (payload) => {
      if (payload.eventType === 'INSERT') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('💈 New booking request!', 'info');
        loadData();
      } else {
        loadData();
      }
    },
  });

  const updateBooking = async (bookingId, newStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const result = await updateBookingStatus(bookingId, newStatus);
      if (!result.error) {
        showToast(`Booking ${newStatus.toLowerCase().replace('_', ' ')}`, 'success');
        loadData();
      } else {
        showToast(result.error || 'Failed to update booking', 'error');
      }
    } catch (error) {
      showToast('Failed to update booking', 'error');
    }
    setLoading(false);
  };

  const addService = async () => {
    if (!newService.name || !newService.price) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const serviceData = {
        id: uid(),
        salon_id: currentUser.id,
        name: newService.name,
        price: parseFloat(newService.price),
        duration_minutes: newService.duration_minutes,
        description: newService.description,
        available: newService.available,
        created_at: new Date().toISOString(),
      };

      const result = await createService(serviceData);
      if (!result.error) {
        setServices([serviceData, ...services]);
        setNewService({
          name: '',
          price: '',
          duration_minutes: 30,
          description: '',
          available: true,
        });
        setShowAddService(false);
        showToast('Service added successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to add service', 'error');
      }
    } catch (error) {
      showToast('Failed to add service', 'error');
    }
    setLoading(false);
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

  const getStatusColor = (status) => SALON_COLORS.status[status] || C.sub;
  const getStatusBg = (status) => {
    const color = SALON_COLORS.status[status];
    return color ? `${color}20` : C.surface;
  };

  const BookingCard = ({ booking }) => {
    const appointmentTime = new Date(booking.appointment_time);
    const isToday = appointmentTime.toDateString() === new Date().toDateString();

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedBooking(booking);
          setShowBookingDetail(true);
        }}
      >
        <Card
          style={{
            marginBottom: 12,
            padding: 16,
            borderLeftWidth: 3,
            borderLeftColor: getStatusColor(booking.status),
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
                  {booking.client_name || 'Client'}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    backgroundColor: getStatusBg(booking.status),
                  }}
                >
                  <Text
                    style={{
                      color: getStatusColor(booking.status),
                      fontSize: 9,
                      fontFamily: Fonts.bold,
                      textTransform: 'uppercase',
                    }}
                  >
                    {booking.status.replace('_', ' ')}
                  </Text>
                </View>
                {isToday && (
                  <View
                    style={{
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: SALON_COLORS.primaryL,
                    }}
                  >
                    <Text
                      style={{
                        color: SALON_COLORS.primary,
                        fontSize: 8,
                        fontFamily: Fonts.bold,
                      }}
                    >
                      TODAY
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 4 }}
              >
                {booking.service_name}
              </Text>

              <Text style={{ color: C.sub, fontSize: 11, marginBottom: 4 }}>
                {appointmentTime.toLocaleDateString()} at{' '}
                {appointmentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>

              <Text style={{ color: C.sub, fontSize: 11, marginBottom: 8 }}>
                Duration: {booking.duration_minutes || 30} minutes
              </Text>

              <Text style={{ color: SALON_COLORS.primary, fontSize: 16, fontFamily: Fonts.black }}>
                {fmtETB(booking.price || 0)}
              </Text>

              {booking.deposit_amount > 0 && (
                <Text style={{ color: '#00A86B', fontSize: 11, marginTop: 2 }}>
                  Deposit: {fmtETB(booking.deposit_amount)}
                </Text>
              )}
            </View>
          </View>

          {booking.status === 'PENDING' && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <CButton
                title="Confirm"
                onPress={() => updateBooking(booking.id, 'CONFIRMED')}
                style={{ flex: 1 }}
                size="sm"
              />
              <CButton
                title="Decline"
                onPress={() => updateBooking(booking.id, 'CANCELLED')}
                style={{ flex: 1, backgroundColor: '#E8312A' }}
                size="sm"
              />
            </View>
          )}

          {booking.status === 'CONFIRMED' && (
            <CButton
              title="Start Service"
              onPress={() => updateBooking(booking.id, 'IN_PROGRESS')}
              style={{ marginTop: 12 }}
              size="sm"
            />
          )}

          {booking.status === 'IN_PROGRESS' && (
            <CButton
              title="Mark Completed"
              onPress={() => updateBooking(booking.id, 'COMPLETED')}
              style={{ marginTop: 12 }}
              size="sm"
            />
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar
        title="💈 Salon Dashboard"
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
            colors={[SALON_COLORS.primaryL, 'transparent']}
            style={{ borderRadius: Radius['3xl'], padding: 24, ...Shadow.md }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: C.text, fontSize: 13, fontFamily: Fonts.bold, opacity: 0.8 }}>
                  Today's Bookings
                </Text>
                <Text
                  style={{
                    color: SALON_COLORS.primary,
                    fontSize: 32,
                    fontFamily: Fonts.black,
                    marginTop: 4,
                  }}
                >
                  {todayBookings}
                </Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: SALON_COLORS.primaryL,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="calendar" size={24} color={SALON_COLORS.primary} />
              </View>
            </View>

            <View
              style={{ height: 1, backgroundColor: 'rgba(236,72,153,0.2)', marginVertical: 20 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#F5B800', fontSize: 16, fontFamily: Fonts.black }}>
                  {pendingBookings}
                </Text>
                <Text
                  style={{ color: 'rgba(245,184,0,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  PENDING
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#00A86B', fontSize: 16, fontFamily: Fonts.black }}>
                  {confirmedBookings}
                </Text>
                <Text
                  style={{ color: 'rgba(0,168,107,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  CONFIRMED
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{ color: SALON_COLORS.primary, fontSize: 16, fontFamily: Fonts.black }}
                >
                  {fmtETB(todayRevenue, 0)}
                </Text>
                <Text
                  style={{ color: 'rgba(236,72,153,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  REVENUE
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Tab Navigation */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 }}>
          {['bookings', 'services', 'calendar', 'stats'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: Radius.xl,
                backgroundColor: activeTab === tab ? SALON_COLORS.primaryL : C.surface,
                borderWidth: 1.5,
                borderColor: activeTab === tab ? SALON_COLORS.primaryB : C.edge2,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? SALON_COLORS.primary : C.sub,
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
        {activeTab === 'bookings' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Appointment Queue" />
            {loading && bookings.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                Loading bookings...
              </Text>
            ) : bookings.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                No bookings yet
              </Text>
            ) : (
              bookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)
            )}
          </View>
        )}

        {activeTab === 'services' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Service Catalogue" />
            <CButton
              title="Add Service"
              onPress={() => setShowAddService(true)}
              style={{ marginBottom: 16 }}
            />

            {loading && services.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                Loading services...
              </Text>
            ) : services.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                No services yet
              </Text>
            ) : (
              services.map((service) => (
                <Card key={service.id} style={{ marginBottom: 8, padding: 12 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black }}>
                        {service.name}
                      </Text>
                      <Text style={{ color: C.sub, fontSize: 11 }}>
                        {service.duration_minutes || 30} min
                      </Text>
                      <Text
                        style={{
                          color: SALON_COLORS.primary,
                          fontSize: 12,
                          fontFamily: Fonts.bold,
                        }}
                      >
                        {fmtETB(service.price || 0)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        const newAvailable = !service.available;
                        // Update service availability
                        setServices(
                          services.map((s) =>
                            s.id === service.id ? { ...s, available: newAvailable } : s
                          )
                        );
                        showToast(`Service ${newAvailable ? 'available' : 'unavailable'}`, 'info');
                      }}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: service.available ? SALON_COLORS.primaryL : C.surface,
                        borderWidth: 1,
                        borderColor: service.available ? SALON_COLORS.primaryB : C.edge2,
                      }}
                    >
                      <Text
                        style={{
                          color: service.available ? SALON_COLORS.primary : C.sub,
                          fontSize: 10,
                          fontFamily: Fonts.bold,
                        }}
                      >
                        {service.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'calendar' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Calendar View" />
            <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
              Calendar view coming soon
            </Text>
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

      {/* Add Service Modal */}
      <Modal visible={showAddService} animationType="slide" presentationStyle="pageSheet">
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
              Add New Service
            </Text>
            <TouchableOpacity onPress={() => setShowAddService(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Service Name *
              </Text>
              <CInput
                placeholder="Enter service name"
                value={newService.name}
                onChangeText={(text) => setNewService({ ...newService, name: text })}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Price (ETB) *
              </Text>
              <CInput
                placeholder="0.00"
                value={newService.price}
                onChangeText={(text) => setNewService({ ...newService, price: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Duration (minutes)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[15, 30, 45, 60, 90, 120].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    onPress={() => setNewService({ ...newService, duration_minutes: duration })}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor:
                        newService.duration_minutes === duration
                          ? SALON_COLORS.primaryL
                          : C.surface,
                      borderWidth: 1,
                      borderColor:
                        newService.duration_minutes === duration ? SALON_COLORS.primaryB : C.edge2,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color:
                          newService.duration_minutes === duration ? SALON_COLORS.primary : C.sub,
                        fontSize: 10,
                        fontFamily: Fonts.bold,
                      }}
                    >
                      {duration}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Description
              </Text>
              <CInput
                placeholder="Service description (optional)"
                value={newService.description}
                onChangeText={(text) => setNewService({ ...newService, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <CButton
              title="Add Service"
              onPress={addService}
              loading={loading}
              style={{ marginTop: 20 }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Booking Detail Modal */}
      <Modal visible={showBookingDetail} animationType="slide" presentationStyle="pageSheet">
        {selectedBooking && (
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
                Booking Details
              </Text>
              <TouchableOpacity onPress={() => setShowBookingDetail(false)} style={{ padding: 8 }}>
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
                    {selectedBooking.client_name || 'Client'}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: getStatusBg(selectedBooking.status),
                    }}
                  >
                    <Text
                      style={{
                        color: getStatusColor(selectedBooking.status),
                        fontSize: 10,
                        fontFamily: Fonts.bold,
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedBooking.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 4 }}
                  >
                    {selectedBooking.service_name}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12, marginBottom: 2 }}>
                    {new Date(selectedBooking.appointment_time).toLocaleString()}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12 }}>
                    Duration: {selectedBooking.duration_minutes || 30} minutes
                  </Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{ color: SALON_COLORS.primary, fontSize: 18, fontFamily: Fonts.black }}
                  >
                    {fmtETB(selectedBooking.price || 0)}
                  </Text>
                  {selectedBooking.deposit_amount > 0 && (
                    <Text style={{ color: '#00A86B', fontSize: 12, marginTop: 2 }}>
                      Deposit paid: {fmtETB(selectedBooking.deposit_amount)}
                    </Text>
                  )}
                </View>
              </Card>

              {selectedBooking.status === 'PENDING' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <CButton
                    title="Confirm"
                    onPress={() => updateBooking(selectedBooking.id, 'CONFIRMED')}
                    style={{ flex: 1 }}
                  />
                  <CButton
                    title="Decline"
                    onPress={() => updateBooking(selectedBooking.id, 'CANCELLED')}
                    style={{ flex: 1, backgroundColor: '#E8312A' }}
                  />
                </View>
              )}

              {selectedBooking.status === 'CONFIRMED' && (
                <CButton
                  title="Start Service"
                  onPress={() => updateBooking(selectedBooking.id, 'IN_PROGRESS')}
                />
              )}

              {selectedBooking.status === 'IN_PROGRESS' && (
                <CButton
                  title="Mark Completed"
                  onPress={() => updateBooking(selectedBooking.id, 'COMPLETED')}
                />
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

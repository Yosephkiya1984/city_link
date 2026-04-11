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
import { ServiceBooking } from '../../types';

import { useRealtimePostgres } from '../../hooks/useRealtimePostgres';
import {
  fetchClinicAppointments,
  fetchClinicServices,
  updateAppointmentStatus,
  createService,
} from '../../services/services.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Clinic color scheme
const CLINIC_COLORS = {
  primary: '#06B6D4',
  primaryL: 'rgba(6,182,212,0.1)',
  primaryB: 'rgba(6,182,212,0.28)',
  status: {
    PENDING: '#F5B800', // Amber
    CONFIRMED: '#00A86B', // Green
    IN_PROGRESS: '#06B6D4', // Teal
    COMPLETED: '#00A86B', // Green
    CANCELLED: '#E8312A', // Red
  } as Record<string, string>,
};

export default function ClinicDashboard() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const balance = useAppStore((s) => s.balance);
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const reset = useAppStore((s) => s.reset);

  const [activeTab, setActiveTab] = useState('queue');
  const [appointments, setAppointments] = useState<ServiceBooking[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ServiceBooking | null>(null);
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);
  const [waitTime, setWaitTime] = useState(20); // minutes
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration_minutes: 30,
    category: 'GP',
    description: '',
    available: true,
  });

  // KPI calculations
  const todayAppointments = appointments.filter(
    (a: ServiceBooking) => new Date(a.appointment_time).toDateString() === new Date().toDateString()
  ).length;

  const pendingAppointments = appointments.filter((a: ServiceBooking) => a.status === 'PENDING').length;
  const inProgressAppointments = appointments.filter((a: ServiceBooking) => a.status === 'IN_PROGRESS').length;

  const todayRevenue = appointments
    .filter(
      (a: ServiceBooking) =>
        a.status === 'COMPLETED' &&
        new Date(a.appointment_time).toDateString() === new Date().toDateString()
    )
    .reduce((sum: number, a: ServiceBooking) => sum + (a.price || 0), 0);

  const avgWaitTime = 20; // Would be calculated from actual data

  const loadData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [appointmentsRes, servicesRes] = await Promise.all([
        fetchClinicAppointments(currentUser.id),
        fetchClinicServices(currentUser.id),
      ]);

      if (appointmentsRes.data) {
        const sortedAppointments = (appointmentsRes.data as ServiceBooking[]).sort(
          (a: ServiceBooking, b: ServiceBooking) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()
        );
        setAppointments(sortedAppointments);
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

  // Real-time appointment updates
  useRealtimePostgres({
    channelName: `clinic-appointments-${currentUser?.id}`,
    table: 'service_bookings',
    filter: `clinic_id=eq.${currentUser?.id}`,
    enabled: !!currentUser?.id,
    onPayload: (payload: any) => {
      if (payload.eventType === 'INSERT') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('ðŸ¥ New appointment request!', 'info');
        loadData();
      } else {
        loadData();
      }
    },
  });

  const updateAppointment = async (appointmentId: string, newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const result = await (updateAppointmentStatus as any)(appointmentId, newStatus);
      if (!result.error) {
        showToast(`Appointment ${newStatus.toLowerCase().replace('_', ' ')}`, 'success');
        loadData();
      } else {
        showToast(result.error || 'Failed to update appointment', 'error');
      }
    } catch (error) {
      showToast('Failed to update appointment', 'error');
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
        clinic_id: currentUser.id,
        name: newService.name,
        price: parseFloat(newService.price),
        duration_minutes: newService.duration_minutes,
        category: newService.category,
        description: newService.description,
        available: newService.available,
        created_at: new Date().toISOString(),
      };

      const result = await (createService as any)(serviceData);
      if (!result.error) {
        setServices([serviceData, ...services]);
        setNewService({
          name: '',
          price: '',
          duration_minutes: 30,
          category: 'GP',
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

  const getStatusColor = (status: string) => CLINIC_COLORS.status[status] || C.sub;
  const getStatusBg = (status: string) => {
    const color = CLINIC_COLORS.status[status];
    return color ? `${color}20` : C.surface;
  };

  const AppointmentCard = ({ appointment }: { appointment: ServiceBooking }) => {
    const appointmentTime = new Date(appointment.appointment_time);
    const isToday = appointmentTime.toDateString() === new Date().toDateString();

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedAppointment(appointment);
          setShowAppointmentDetail(true);
        }}
      >
        <Card
          style={{
            marginBottom: 12,
            padding: 16,
            borderLeftWidth: 3,
            borderLeftColor: getStatusColor(appointment.status),
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
                  Patient {appointment.patient_id ? appointment.patient_id.slice(-4) : 'Unknown'}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    backgroundColor: getStatusBg(appointment.status),
                  }}
                >
                  <Text
                    style={{
                      color: getStatusColor(appointment.status),
                      fontSize: 9,
                      fontFamily: Fonts.bold,
                      textTransform: 'uppercase',
                    }}
                  >
                    {appointment.status.replace('_', ' ')}
                  </Text>
                </View>
                {isToday && (
                  <View
                    style={{
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: CLINIC_COLORS.primaryL,
                    }}
                  >
                    <Text
                      style={{
                        color: CLINIC_COLORS.primary,
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
                {appointment.service_name}
              </Text>

              <Text style={{ color: C.sub, fontSize: 11, marginBottom: 4 }}>
                {appointmentTime.toLocaleDateString()} at{' '}
                {appointmentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>

              <Text style={{ color: C.sub, fontSize: 11, marginBottom: 8 }}>
                Duration: {appointment.duration_minutes || 30} minutes
              </Text>

              <Text style={{ color: CLINIC_COLORS.primary, fontSize: 16, fontFamily: Fonts.black }}>
                {fmtETB(appointment.price || 0)}
              </Text>

              {appointment.deposit_amount > 0 && (
                <Text style={{ color: '#00A86B', fontSize: 11, marginTop: 2 }}>
                  Deposit: {fmtETB(appointment.deposit_amount)}
                </Text>
              )}
            </View>
          </View>

          {appointment.status === 'PENDING' && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <CButton
                title="Confirm"
                onPress={() => updateAppointment(appointment.id, 'CONFIRMED')}
                style={{ flex: 1 }}
                size="sm"
              />
              <CButton
                title="Decline"
                onPress={() => updateAppointment(appointment.id, 'CANCELLED')}
                style={{ flex: 1, backgroundColor: '#E8312A' }}
                size="sm"
              />
            </View>
          )}

          {appointment.status === 'CONFIRMED' && (
            <CButton
              title="Call Patient In"
              onPress={() => updateAppointment(appointment.id, 'IN_PROGRESS')}
              style={{ marginTop: 12 }}
              size="sm"
            />
          )}

          {appointment.status === 'IN_PROGRESS' && (
            <CButton
              title="Mark Completed"
              onPress={() => updateAppointment(appointment.id, 'COMPLETED')}
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
        title={`ðŸ ¥ Clinic Dashboard - Est. wait: ${waitTime} min`}
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
        {/* Wait Time Banner */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 16,
            backgroundColor: 'rgba(245,184,0,0.1)',
            borderRadius: Radius.xl,
            padding: 12,
            borderWidth: 1,
            borderColor: 'rgba(245,184,0,0.28)',
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="time" size={20} color="#F5B800" />
              <Text style={{ color: '#F5B800', fontSize: 12, fontFamily: Fonts.bold }}>
                Current Wait Time: {waitTime} minutes
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const newTime = Math.max(0, waitTime - 5);
                setWaitTime(newTime);
                showToast(`Wait time updated to ${newTime} minutes`, 'info');
              }}
            >
              <Text style={{ color: CLINIC_COLORS.primary, fontSize: 10, fontFamily: Fonts.bold }}>
                UPDATE
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Revenue Stats */}
        <View style={{ padding: 16 }}>
          <LinearGradient
            colors={[CLINIC_COLORS.primaryL, 'transparent']}
            style={{ borderRadius: Radius['3xl'], padding: 24, ...Shadow.md }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: C.text, fontSize: 13, fontFamily: Fonts.bold, opacity: 0.8 }}>
                  Today's Appointments
                </Text>
                <Text
                  style={{
                    color: CLINIC_COLORS.primary,
                    fontSize: 32,
                    fontFamily: Fonts.black,
                    marginTop: 4,
                  }}
                >
                  {todayAppointments}
                </Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: CLINIC_COLORS.primaryL,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="medical" size={24} color={CLINIC_COLORS.primary} />
              </View>
            </View>

            <View
              style={{ height: 1, backgroundColor: 'rgba(6,182,212,0.2)', marginVertical: 20 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#F5B800', fontSize: 16, fontFamily: Fonts.black }}>
                  {pendingAppointments}
                </Text>
                <Text
                  style={{ color: 'rgba(245,184,0,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  PENDING
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{ color: CLINIC_COLORS.primary, fontSize: 16, fontFamily: Fonts.black }}
                >
                  {inProgressAppointments}
                </Text>
                <Text
                  style={{ color: 'rgba(6,182,212,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  IN PROGRESS
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{ color: CLINIC_COLORS.primary, fontSize: 16, fontFamily: Fonts.black }}
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
          {['queue', 'services', 'stats'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: Radius.xl,
                backgroundColor: activeTab === tab ? CLINIC_COLORS.primaryL : C.surface,
                borderWidth: 1.5,
                borderColor: activeTab === tab ? CLINIC_COLORS.primaryB : C.edge2,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? CLINIC_COLORS.primary : C.sub,
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
        {activeTab === 'queue' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Patient Queue" />
            {loading && appointments.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                Loading appointments...
              </Text>
            ) : appointments.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                No appointments yet
              </Text>
            ) : (
              appointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            )}
          </View>
        )}

        {activeTab === 'services' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Medical Services" />
            <CButton
              title="Add Service"
              onPress={() => setShowAddService(true)}
              style={{ marginBottom: 16 }}
            />

            {['GP', 'Diagnostic', 'Specialist'].map((category) => (
              <View key={category} style={{ marginBottom: 20 }}>
                <Text
                  style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black, marginBottom: 8 }}
                >
                  {category}
                </Text>
                {services
                  .filter((service) => service.category === category)
                  .map((service) => (
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
                              color: CLINIC_COLORS.primary,
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
                            setServices(
                              services.map((s) =>
                                s.id === service.id ? { ...s, available: newAvailable } : s
                              )
                            );
                            showToast(
                              `Service ${newAvailable ? 'available' : 'unavailable'}`,
                              'info'
                            );
                          }}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: service.available ? CLINIC_COLORS.primaryL : C.surface,
                            borderWidth: 1,
                            borderColor: service.available ? CLINIC_COLORS.primaryB : C.edge2,
                          }}
                        >
                          <Text
                            style={{
                              color: service.available ? CLINIC_COLORS.primary : C.sub,
                              fontSize: 10,
                              fontFamily: Fonts.bold,
                            }}
                          >
                            {service.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  ))}
              </View>
            ))}
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
              Add Medical Service
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
                onChangeText={(text: string) => setNewService({ ...newService, name: text })}
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
                onChangeText={(text: string) => setNewService({ ...newService, price: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Category
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['GP', 'Diagnostic', 'Specialist'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setNewService({ ...newService, category })}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor:
                        newService.category === category ? CLINIC_COLORS.primaryL : C.surface,
                      borderWidth: 1,
                      borderColor:
                        newService.category === category ? CLINIC_COLORS.primaryB : C.edge2,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: newService.category === category ? CLINIC_COLORS.primary : C.sub,
                        fontSize: 10,
                        fontFamily: Fonts.bold,
                      }}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Duration (minutes)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[15, 30, 45, 60, 90].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    onPress={() => setNewService({ ...newService, duration_minutes: duration })}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor:
                        newService.duration_minutes === duration
                          ? CLINIC_COLORS.primaryL
                          : C.surface,
                      borderWidth: 1,
                      borderColor:
                        newService.duration_minutes === duration ? CLINIC_COLORS.primaryB : C.edge2,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color:
                          newService.duration_minutes === duration ? CLINIC_COLORS.primary : C.sub,
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
                onChangeText={(text: string) => setNewService({ ...newService, description: text })}
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

      {/* Appointment Detail Modal */}
      <Modal visible={showAppointmentDetail} animationType="slide" presentationStyle="pageSheet">
        {selectedAppointment && (
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
                Appointment Details
              </Text>
              <TouchableOpacity
                onPress={() => setShowAppointmentDetail(false)}
                style={{ padding: 8 }}
              >
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
                    Patient{' '}
                    {selectedAppointment.patient_id
                      ? selectedAppointment.patient_id.slice(-4)
                      : 'Unknown'}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: getStatusBg(selectedAppointment.status),
                    }}
                  >
                    <Text
                      style={{
                        color: getStatusColor(selectedAppointment.status),
                        fontSize: 10,
                        fontFamily: Fonts.bold,
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedAppointment.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 4 }}
                  >
                    {selectedAppointment.service_name}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12, marginBottom: 2 }}>
                    {new Date(selectedAppointment.appointment_time).toLocaleString()}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12 }}>
                    Duration: {selectedAppointment.duration_minutes || 30} minutes
                  </Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{ color: CLINIC_COLORS.primary, fontSize: 18, fontFamily: Fonts.black }}
                  >
                    {fmtETB(selectedAppointment.price || 0)}
                  </Text>
                  {selectedAppointment.deposit_amount > 0 && (
                    <Text style={{ color: '#00A86B', fontSize: 12, marginTop: 2 }}>
                      Deposit paid: {fmtETB(selectedAppointment.deposit_amount)}
                    </Text>
                  )}
                </View>
              </Card>

              {selectedAppointment.status === 'PENDING' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <CButton
                    title="Confirm"
                    onPress={() => updateAppointment(selectedAppointment.id, 'CONFIRMED')}
                    style={{ flex: 1 }}
                  />
                  <CButton
                    title="Decline"
                    onPress={() => updateAppointment(selectedAppointment.id, 'CANCELLED')}
                    style={{ flex: 1, backgroundColor: '#E8312A' }}
                  />
                </View>
              )}

              {selectedAppointment.status === 'CONFIRMED' && (
                <CButton
                  title="Call Patient In"
                  onPress={() => updateAppointment(selectedAppointment.id, 'IN_PROGRESS')}
                />
              )}

              {selectedAppointment.status === 'IN_PROGRESS' && (
                <CButton
                  title="Mark Completed"
                  onPress={() => updateAppointment(selectedAppointment.id, 'COMPLETED')}
                />
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

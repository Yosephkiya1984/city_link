import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius } from '../../theme';
import * as Haptics from 'expo-haptics';
import { fetchServiceProviders, bookService } from '../../services/services.service';
import { uid, t } from '../../utils';

export function ServicesScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const balance = useAppStore((s) => s.balance);
  const setBalance = useAppStore((s) => s.setBalance);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const lang = useAppStore((s) => s.lang);

  const [svcType, setSvcType] = useState('salon');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await fetchServiceProviders(svcType);
      setProviders(data || []);
      setLoading(false);
    }
    load();
  }, [svcType]);

  async function handleBook() {
    if (!currentUser) {
      showToast(t('Sign in to book', lang), 'error');
      return;
    }
    // Escrow payment required at booking.
    const depositAmount = 100;
    if (balance < depositAmount) {
      showToast(t('Insufficient balance for deposit', lang), 'error');
      return;
    }

    const payload = {
      id: uid(),
      citizen_id: currentUser.id,
      merchant_id: bookingModal.id,
      provider_name: bookingModal.merchant_name,
      service_type: svcType,
      amount_escrowed: depositAmount,
    };

    try {
      const res = await bookService(payload);
      if (res.error) {
        showToast(res.error || t('Failed to book appointment', lang), 'error');
        return;
      }

      // Success: New balance returned by RPC
      const finalBalance = res.data?.new_balance ?? balance - depositAmount;
      setBalance(finalBalance);

      showToast(t('Appointment booked with escrow! ðŸŽ‰', lang), 'success');
      setBookingModal(null);

      // Haptics for satisfaction
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('🔧 handleBook error:', e);
      showToast(t('Connection error', lang), 'error');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title="💈 Services" />
      <View style={{ flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 }}>
        {[
          { v: 'salon', l: '💈 Salon' },
          { v: 'clinic', l: 'ðŸ¥ Clinic' },
        ].map(({ v, l }) => (
          <TouchableOpacity
            key={v}
            onPress={() => setSvcType(v)}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              borderRadius: Radius.lg,
              backgroundColor: svcType === v ? C.purpleL : C.lift,
              borderWidth: 1,
              borderColor: svcType === v ? C.purple : C.edge2,
            }}
          >
            <Text style={{ color: svcType === v ? C.purple : C.sub, fontWeight: '700' }}>
              {t(l, lang)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 80 }}>
        {loading ? (
          <Text style={{ color: C.sub, textAlign: 'center', marginTop: 40 }}>
            {t('Loadingâ€¦', lang)}
          </Text>
        ) : providers.length === 0 ? (
          <EmptyState
            icon={svcType === 'salon' ? 'ðŸ’‡â€â™€ï¸' : 'ðŸ©º'}
            title={`No ${svcType}s found`}
            subtitle="Merchants are registering now."
          />
        ) : (
          providers.map((p) => (
            <View
              key={p.id}
              style={{
                backgroundColor: C.surface,
                borderRadius: Radius.xl,
                borderWidth: 1,
                borderColor: C.edge,
                padding: 16,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '700' }}>
                    {p.merchant_name}
                  </Text>
                  <Text style={{ color: C.sub, marginTop: 2 }}>ðŸ“ Bole Â· â­ 4.7</Text>
                </View>
              </View>
              <CButton
                title={t('Book Appointment', lang)}
                onPress={() => setBookingModal(p)}
                size="sm"
                style={{ marginTop: 12 }}
              />
            </View>
          ))
        )}
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={!!bookingModal} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setBookingModal(null)}
        >
          <Pressable
            style={{
              backgroundColor: C.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={{
                color: C.text,
                fontSize: FontSize['2xl'],
                fontWeight: '800',
                marginBottom: 8,
              }}
            >
              {t('Book', lang)} {bookingModal?.merchant_name}
            </Text>
            <Text style={{ color: C.sub, marginBottom: 20 }}>
              An escrow deposit of 100 ETB is required to hold this appointment.
            </Text>
            <CButton
              title={t('Pay 100 ETB & Reserve', lang)}
              onPress={handleBook}
              style={{ marginTop: 8 }}
            />
            <CButton
              title={t('Cancel', lang)}
              onPress={() => setBookingModal(null)}
              variant="ghost"
              style={{ marginTop: 8 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default ServicesScreen;

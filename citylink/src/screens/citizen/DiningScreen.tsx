import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius } from '../../theme';
import { CButton, SectionTitle, EmptyState } from '../../components';
import { fmtETB, uid, t } from '../../utils';
import { fetchRestaurants } from '../../services/food.service';

export function DiningScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const balance = useAppStore((s) => s.balance);
  const setBalance = useAppStore((s) => s.setBalance);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const showToast = useAppStore((s) => s.showToast);
  const currentUser = useAppStore((s) => s.currentUser);
  const lang = useAppStore((s) => s.lang);

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reserveModal, setReserveModal] = useState(null);

  useEffect(() => {
    async function loadRests() {
      setLoading(true);
      const { data } = await fetchRestaurants();
      if (data) setRestaurants(data);
      setLoading(false);
    }
    loadRests();
  }, []);

  async function handleReservation() {
    if (!currentUser) {
      showToast(t('Sign in to reserve', lang), 'error');
      return;
    }
    // As per Goal #9 Dining Reservation might optionally escrow a fee, but usually free reservation.
    // Here we simulate successful booking confirmation.
    showToast(t('Table Reserved! ðŸ·', lang), 'success');
    setReserveModal(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title="ðŸ½ï¸ Dining & Reservations" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle title={t('Featured Restaurants', lang)} />
        {loading ? (
          <Text style={{ color: C.sub, textAlign: 'center', marginTop: 40 }}>
            {t('Loadingâ€¦', lang)}
          </Text>
        ) : restaurants.length === 0 ? (
          <EmptyState icon="ðŸ·" title="No restaurants available" subtitle="Check back later." />
        ) : (
          restaurants.map((r) => (
            <View
              key={r.id}
              style={{
                backgroundColor: C.surface,
                borderRadius: Radius.xl,
                borderWidth: 1,
                borderColor: C.edge,
                padding: 16,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '700' }}>
                {r.merchant_name}
              </Text>
              <Text style={{ color: C.sub, marginTop: 4 }}>â­ 4.8 Â· {r.merchant_type}</Text>
              <CButton
                title={t('Reserve Table', lang)}
                onPress={() => setReserveModal(r)}
                size="sm"
                style={{ marginTop: 12 }}
              />
            </View>
          ))
        )}
      </ScrollView>

      {/* Reservation Confirmation Modal */}
      <Modal visible={!!reserveModal} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setReserveModal(null)}
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
              {t('Reserve Table at', lang)} {reserveModal?.merchant_name}
            </Text>
            <Text style={{ color: C.sub, marginBottom: 20 }}>
              Select table size and time (demo).
            </Text>
            <CButton
              title={t('Confirm Reservation', lang)}
              onPress={handleReservation}
              style={{ marginTop: 8 }}
            />
            <CButton
              title={t('Cancel', lang)}
              onPress={() => setReserveModal(null)}
              variant="ghost"
              style={{ marginTop: 8 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default DiningScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius } from '../../theme';
import { CButton, SectionTitle, EmptyState } from '../../components';
import { fmtETB, uid, t } from '../../utils';
import { fetchRestaurants, fetchFoodItems, placeOrder } from '../../services/food.service';

export function FoodScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const balance = useAppStore((s) => s.balance);
  const setBalance = useAppStore((s) => s.setBalance);
  const currentUser = useAppStore((s) => s.currentUser);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const showToast = useAppStore((s) => s.showToast);
  const lang = useAppStore((s) => s.lang);

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRest, setSelectedRest] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [cart, setCart] = useState({});
  
  useEffect(() => {
    async function loadRests() {
      setLoading(true);
      const { data, error } = await fetchRestaurants();
      if (!error && data) setRestaurants(data);
      setLoading(false);
    }
    loadRests();
  }, []);

  async function openRestaurant(r) {
    setSelectedRest(r);
    setCart({});
    setMenuLoading(true);
    const { data } = await fetchFoodItems(r.id);
    setMenuItems(data || []);
    setMenuLoading(false);
  }

  const cartTotal = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = menuItems.find((m) => m.id === itemId);
    return sum + (item?.price || 0) * qty;
  }, 0);

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  function addToCart(itemId) {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  }
  function removeFromCart(itemId) {
    setCart((prev) => {
      const next = { ...prev };
      if (next[itemId] > 1) next[itemId]--;
      else delete next[itemId];
      return next;
    });
  }

  async function handlePlaceOrder() {
    if (!currentUser) { showToast(t('Sign in to order', lang), 'error'); return; }
    if (cartTotal > balance) { showToast(t('Insufficient balance', lang), 'error'); return; }
    
    // Delivery PIN Generation for Security
    const pin = String(1000 + Math.floor(Math.random() * 9000));
    const orderId = uid();
    
    setLoading(true); // Re-using loading state for submission
    
    const payload = {
      id: orderId,
      citizen_id: currentUser.id,
      merchant_id: selectedRest.id,
      restaurant: selectedRest.merchant_name,
      items: cartCount,
      total: cartTotal,
      delivery_pin: pin,
      items_json: JSON.stringify(cart)
    };
    
    try {
      const r = await placeOrder(payload);
      
      if (r.ok) {
        // Success: New balance is returned by the atomic RPC
        const finalBalance = r.data?.new_balance ?? (balance - cartTotal);
        setBalance(finalBalance);
        
        showToast(t('Order placed! ðŸ›µ On the way!', lang), 'success');
        setCart({}); 
        setSelectedRest(null);
        
        // Haptic feedback for successful purchase
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        showToast(r.error || t('Failed to place order', lang), 'error');
      }
    } catch (e) {
        console.error('🔧 handlePlaceOrder error:', e);
        showToast(t('Connection error. Please try again.', lang), 'error');
    } finally {
        setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('food_delivery_title')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <SectionTitle title={t('rests_near_you')} />
        {loading ? (
          <Text style={{ color: C.sub, textAlign: 'center', marginTop: 40 }}>{t('Loadingâ€¦', lang)}</Text>
        ) : restaurants.length === 0 ? (
          <EmptyState icon="ðŸ¥¡" title={t('no_rests_title')} subtitle={t('no_rests_sub')} />
        ) : restaurants.map((r) => (
          <TouchableOpacity key={r.id} onPress={() => openRestaurant(r)}
            style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: C.surface,
              borderRadius: Radius.xl, borderWidth: 1, borderColor: C.edge, overflow: 'hidden' }}>
            <View style={{ height: 80, backgroundColor: C.lift, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 44 }}>{r.merchant_name?.includes('Pizza') ? 'ðŸ•' : 'ðŸ‡ªðŸ‡¹'}</Text>
            </View>
            <View style={{ padding: 14 }}>
              <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '700' }}>{r.merchant_name}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                <Text style={{ color: C.amber }}>â­ 4.5</Text>
                <Text style={{ color: C.sub }}>ðŸ• 20-30 min</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Restaurant menu modal */}
      <Modal visible={!!selectedRest} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => setSelectedRest(null)} />
        {selectedRest && (
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 40, maxHeight: '80%' }}>
            <Text style={{ color: C.text, fontSize: FontSize['2xl'], fontWeight: '800', marginBottom: 4 }}>
              {selectedRest.merchant_name}
            </Text>
            
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 20 }}>
              {menuLoading ? (
                 <Text style={{ color: C.sub }}>{t('Loadingâ€¦', lang)}</Text>
              ) : menuItems.length === 0 ? (
                 <Text style={{ color: C.sub }}>{t('no_menu_avail')}</Text>
              ) : menuItems.map((item) => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.edge }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontWeight: '700' }}>{item.name}</Text>
                    <Text style={{ color: C.sub, fontSize: FontSize.sm, marginTop: 2 }}>{item.description || t('delicious_meal')}</Text>
                    <Text style={{ color: C.green, fontWeight: '800', marginTop: 4 }}>{item.price} {t('ETB', lang)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {cart[item.id] > 0 && (
                      <>
                        <TouchableOpacity onPress={() => removeFromCart(item.id)}
                          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.redL,
                            alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: C.red, fontWeight: '800' }}>âˆ’</Text>
                        </TouchableOpacity>
                        <Text style={{ color: C.text, fontWeight: '800', minWidth: 16, textAlign: 'center' }}>
                          {cart[item.id]}
                        </Text>
                      </>
                    )}
                    <TouchableOpacity onPress={() => addToCart(item.id)}
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.greenL,
                        alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: C.green, fontWeight: '800' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            {cartCount > 0 && (
              <CButton title={`ðŸ›’ ${t('Confirm', lang)} (${cartCount}) â€” ${fmtETB(cartTotal)} ${t('ETB', lang)}`}
                onPress={handlePlaceOrder} style={{ marginTop: 16 }} />
            )}
            <CButton title={t('Cancel', lang)} onPress={() => setSelectedRest(null)} variant="ghost" style={{ marginTop: 8 }} />
          </View>
        )}
      </Modal>
    </View>
  );
}

export default FoodScreen;

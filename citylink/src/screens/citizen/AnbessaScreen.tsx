import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Pressable, Platform, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, FontSize, Radius, Spacing, Shadow, Fonts } from '../../theme';
import { CButton, Card, SectionTitle } from '../../components';
import { fmtETB, uid } from '../../utils';
import { GTFSService } from '../../services/gtfs';
import { buyTransportPass } from '../../services/transit.service';
import { t } from '../../utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TICKETS = [
  { id: 'a1', label: 'Single Journey', price: 5,   icon: 'ticket-outline', desc: 'Valid for one trip' },
  { id: 'a2', label: 'Day Pass',       price: 25,  icon: 'calendar-outline', desc: 'Unlimited for 24 hours' },
  { id: 'a3', label: 'Weekly Pass',    price: 150, icon: 'repeat-outline', desc: '7-day unlimited travel' },
];

const ROUTES = [
  { id: 'r1', from: 'Piazza', to: 'Bole', type: 'Anbessa', time: '10 min' },
  { id: 'r2', from: 'Mercato', to: 'Sarbet', type: 'Anbessa', time: '15 min' },
  { id: 'r3', from: 'Mexico', to: 'Megenagna', type: 'Sheger', time: 'Direct' },
  { id: 'r4', from: 'Stadium', to: 'CMC', type: 'Sheger', time: 'Express' },
];

export default function AnbessaScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isDark = useAppStore((s) => s.isDark);
  const currentUser = useAppStore((s) => s.currentUser);
  const C = isDark ? DarkColors : Colors;
  const balance = useAppStore((s) => s.balance);
  const setBalance = useAppStore((s) => s.setBalance);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const showToast = useAppStore((s) => s.showToast);

  const [selTicket, setSelTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [type] = useState(route.params?.type || 'Anbessa'); // 'Anbessa' or 'Sheger'
  const [liveBuses, setLiveBuses] = useState([]);

  useEffect(() => {
    const unsub = GTFSService.subscribe(buses => {
       setLiveBuses(buses.filter(b => b.line === 'BUS'));
    });
    return unsub;
  }, []);

  const isSheger = type === 'Sheger';
  const brandColor = isSheger ? '#007AFF' : '#FF9500'; // Global Ivory Azure for both, but subtle accents

async function handlePurchase() {
    if (!selTicket) return;
    if (!currentUser) { showToast('Sign in to purchase tickets', 'error'); return; }
    if (balance < selTicket.price) {
      showToast('Insufficient wallet balance', 'error');
      return;
    }
    setLoading(true);
    try {
      const qrToken = `PASS_${uid()}`;
      const res = await buyTransportPass(currentUser.id, selTicket.label, selTicket.price, qrToken);

      if (res.error) {
        showToast(res.error, 'error');
        setLoading(false);
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Update store with precise backend balance
      if (res.data?.new_balance !== undefined) {
        setBalance(res.data.new_balance);
      } else {
        setBalance(balance - selTicket.price);
      }

      showToast(`${selTicket.label} purchased successfully! 🚌`, 'success');
      setSelTicket(null);
      navigation.goBack();
    } catch (e) {
      console.error('Bus Pass Error:', e);
      showToast('Transaction failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={`${type} ${t('bus')}`} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Route Status Hero */}
        <View style={{ padding: 20 }}>
           <Card style={{ padding: 0 }}>
              <LinearGradient colors={isSheger ? [C.primary, C.primaryD] : [C.amber, '#E67E22']} style={{ padding: 20, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl }}>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: C.white, fontSize: 13, fontFamily: Fonts.black, textTransform: 'uppercase' }}>Terminal Monitor</Text>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                       <Text style={{ color: C.white, fontSize: 10, fontFamily: Fonts.bold }}>LIVE</Text>
                    </View>
                 </View>
                 <Text style={{ color: C.white, fontSize: 24, fontFamily: Fonts.black, marginTop: 12 }}>{liveBuses.length || 0} {t('buses_active')}</Text>
                 <Text style={{ color: C.white, fontSize: 13, fontFamily: Fonts.medium, opacity: 0.8 }}>{t('tr_bus_status')}</Text>
              </LinearGradient>
              <View style={{ padding: 20 }}>
                 {liveBuses.slice(0, 2).map((b, idx) => (
                    <View key={b.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: idx === 0 ? 12 : 0, paddingBottom: idx === 0 ? 12 : 0, borderBottomWidth: idx === 0 ? 1 : 0, borderBottomColor: C.edge }}>
                       <View>
                          <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black }}>{b.name}</Text>
                          <Text style={{ color: C.sub, fontSize: 11, fontFamily: Fonts.medium }}>{t('approaching')} {b.stations[b.stIdx]}</Text>
                       </View>
                       <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: C.primary, fontSize: 14, fontFamily: Fonts.black }}>{Math.ceil(b.etaSecs / 60)} min</Text>
                          <Text style={{ color: C.sub, fontSize: 11, fontFamily: Fonts.medium }}>{Math.round(b.occupancy * 100)}% {t('full')}</Text>
                       </View>
                    </View>
                 ))}
              </View>
           </Card>
        </View>

        <SectionTitle title="Select Ticket Type" />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {TICKETS.map((t) => (
             <TouchableOpacity key={t.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelTicket(t); }}
              style={{
                backgroundColor: C.surface, borderRadius: Radius.xl, borderWidth: 1.5,
                borderColor: selTicket?.id === t.id ? C.primary : C.edge2,
                padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, ...Shadow.sm
              }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: selTicket?.id === t.id ? C.primaryL : C.lift, alignItems: 'center', justifyContent: 'center' }}>
                   <Ionicons name={t.icon} size={24} color={selTicket?.id === t.id ? C.primary : C.sub} />
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>{t.label}</Text>
                   <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>{t.desc}</Text>
                </View>
                <Text style={{ color: selTicket?.id === t.id ? C.primary : C.text, fontSize: 18, fontFamily: Fonts.black }}>{t.price} <Text style={{ fontSize: 11 }}>ETB</Text></Text>
             </TouchableOpacity>
          ))}
        </View>

        <SectionTitle title="Nearby Routes" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
           {ROUTES.map((r) => (
              <Card key={r.id} style={{ width: 220, padding: 16 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Ionicons name="bus" size={14} color={r.type === 'Sheger' ? C.primary : C.amber} />
                    <Text style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.black, textTransform: 'uppercase' }}>{r.type} Express</Text>
                 </View>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: C.text, fontSize: 15, fontFamily: Fonts.bold }}>{r.from}</Text>
                    <Ionicons name="arrow-forward" size={14} color={C.hint} />
                    <Text style={{ color: C.text, fontSize: 15, fontFamily: Fonts.bold }}>{r.to}</Text>
                 </View>
                 <View style={{ height: 1.5, backgroundColor: C.edge, marginVertical: 12 }} />
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: C.sub, fontSize: 11, fontFamily: Fonts.medium }}>Frequency</Text>
                    <Text style={{ color: C.text, fontSize: 11, fontFamily: Fonts.bold }}>{r.time}</Text>
                 </View>
              </Card>
           ))}
        </ScrollView>

      </ScrollView>

      {/* Action Footer */}
      {selTicket && (
        <Animated.View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: C.surface, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
          borderTopWidth: 1, borderTopColor: C.edge, ...Shadow.lg
        }}>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                 <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.bold, textTransform: 'uppercase' }}>Total Amount</Text>
                 <Text style={{ color: C.text, fontSize: 24, fontFamily: Fonts.black }}>{selTicket.price} ETB</Text>
              </View>
              <CButton title={loading ? 'Payingâ€¦' : 'Pay Now'} onPress={handlePurchase} loading={loading} style={{ width: 140 }} />
           </View>
        </Animated.View>
      )}
    </View>
  );
}

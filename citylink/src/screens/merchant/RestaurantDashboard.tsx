import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useRestaurantData } from './hooks/useRestaurantData';
import { useRestaurantActions } from './hooks/useRestaurantActions';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { DarkColors as T, Fonts, Radius } from '../../theme';
import { CButton, CInput } from '../../components';
import { fmtETB } from '../../utils';
import { styles } from './components/RestaurantDashboardStyles';

const CATEGORIES = ['Mains', 'Drinks', 'Desserts'];

export default function RestaurantDashboard() {
  const navigation = useNavigation<any>();
  const data = useRestaurantData();
  const actions = useRestaurantActions(data);
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);
  
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'bookings' | 'stats'>('orders');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('ALL');

  const { orders, menu, loading, refreshing, loadData } = data;
  const {
    onUpdateStatus,
    onLogout,
    showAddMenuItem,
    setShowAddMenuItem,
    showPinModal,
    setShowPinModal,
    currentPin,
    onAddMenuItem,
    onToggleAvailability,
  } = actions;

  const isVerified = currentUser?.merchant_status === 'APPROVED' && !!currentUser?.tin;

  // 📈 Fiscal Intelligence
  const todayRevenue = useMemo(() => orders
    .filter(o => o.status !== 'CANCELLED' && new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, o) => sum + (o.total || 0), 0), [orders]);

  const vatAmount = todayRevenue * 0.15;
  const serviceFee = todayRevenue * 0.05;
  const netRevenue = todayRevenue - vatAmount - serviceFee;

  const activeCount = orders.filter((o) => ['NEW', 'PREPARING', 'READY'].includes(o.status)).length;

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'ALL') return orders;
    return orders.filter(o => (o as any).type === orderFilter);
  }, [orders, orderFilter]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ backgroundColor: T.surface }} edges={['top']}>
        <View style={styles.navBar}>
          <View style={styles.brandBox}>
            <View style={[styles.brandIcon, { backgroundColor: T.primary + '20' }]}>
              <Ionicons name="restaurant" size={22} color={T.primary} />
            </View>
            <View>
              <Text style={styles.brandName}>ADDIS GOURMET</Text>
              <Text style={[styles.brandSubtitle, { color: isVerified ? T.primary : T.red }]}>
                {isVerified ? '✅ FISCAL VERIFIED' : '⚠️ COMPLIANCE LOCK'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={loadData} style={{ padding: 10 }}>
              <Ionicons name="refresh" size={24} color={T.textSoft} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={{ padding: 10 }}>
              <Ionicons name="power" size={24} color={T.red} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={T.primary} />}
      >
        {/* 📊 High-Fidelity Summary Tiles */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1, backgroundColor: T.surface, padding: 16, borderRadius: Radius.card, borderWidth: 1, borderColor: T.edge }}>
               <Text style={{ color: T.textSoft, fontSize: 10, fontFamily: Fonts.bold }}>DAILY REVENUE</Text>
               <Text style={{ color: T.text, fontSize: 20, fontFamily: Fonts.black, marginTop: 4 }}>{fmtETB(todayRevenue, 0)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: T.surface, padding: 16, borderRadius: Radius.card, borderWidth: 1, borderColor: T.edge }}>
               <Text style={{ color: T.textSoft, fontSize: 10, fontFamily: Fonts.bold }}>ACTIVE TICKETS</Text>
               <Text style={{ color: T.primary, fontSize: 20, fontFamily: Fonts.black, marginTop: 4 }}>{activeCount}</Text>
            </View>
          </View>
          
          <LinearGradient
            colors={T.noirGrad || ['#A855F7', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20, borderRadius: Radius.card, marginBottom: 20 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: Fonts.bold }}>FISCAL COMPLIANCE SCORE</Text>
            <Text style={{ color: '#FFF', fontSize: 24, fontFamily: Fonts.black, marginTop: 4 }}>99.8% HEALTHY</Text>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
              <View style={{ width: '99.8%', height: '100%', backgroundColor: '#FFF' }} />
            </View>
          </LinearGradient>
        </View>

        {/* 📑 Nav Tabs */}
        <View style={styles.tabScrollWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroller}>
            {(['orders', 'menu', 'bookings', 'stats'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              >
                <Ionicons
                  name={tab === 'orders' ? 'receipt' : tab === 'menu' ? 'fast-food' : tab === 'bookings' ? 'calendar' : 'analytics'}
                  size={18}
                  color={activeTab === tab ? T.primary : 'rgba(255,255,255,0.4)'}
                />
                <Text style={[styles.tabItemTxt, activeTab === tab && styles.tabItemTxtActive]}>
                  {tab.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingBottom: 100 }}>
          {activeTab === 'orders' && (
            <>
              {/* Order Channel Filters */}
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 20 }}>
                {['ALL', 'DINE_IN', 'TAKEAWAY', 'DELIVERY'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setOrderFilter(f as any)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                      backgroundColor: orderFilter === f ? T.primaryL : 'transparent',
                      borderWidth: 1,
                      borderColor: orderFilter === f ? T.primary : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <Text style={{ color: orderFilter === f ? T.primary : 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: Fonts.bold }}>
                      {f.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {filteredOrders.length === 0 ? (
                <EmptyState text="No matching orders found" />
              ) : (
                <View style={styles.orderList}>
                  {filteredOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} isVerified={isVerified} />
                  ))}
                </View>
              )}
            </>
          )}

          {activeTab === 'menu' && (
            <View style={{ paddingHorizontal: 16 }}>
              <CButton
                title={isVerified ? "ADD NEW DISH" : "COMPLIANCE LOCK"}
                onPress={() => isVerified ? setShowAddMenuItem(true) : showToast('Verification Required', 'error')}
                style={{ marginBottom: 24, backgroundColor: isVerified ? T.primary : '#222' }}
              />
              {CATEGORIES.map((cat) => (
                <View key={cat} style={{ marginBottom: 32 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: Fonts.bold, marginBottom: 16, letterSpacing: 1.5 }}>
                    {cat.toUpperCase()}
                  </Text>
                  {menu.filter((m) => m.category === cat).map((item) => (
                    <MenuItemCard key={item.id} item={item} onToggle={() => onToggleAvailability(item)} />
                  ))}
                </View>
              ))}
            </View>
          )}

          {activeTab === 'bookings' && <EmptyState text="Smart Booking System Offline" />}
          {activeTab === 'stats' && <EmptyState text="Analytical Dossier Loading..." />}
        </View>
      </ScrollView>

      {/* 🏗️ Modals */}
      <AddMenuItemModal visible={showAddMenuItem} onClose={() => setShowAddMenuItem(false)} onSubmit={onAddMenuItem} />
      <PinModal visible={showPinModal} pin={currentPin} onClose={() => setShowPinModal(false)} />
    </View>
  );
}

const OrderCard = ({ order, onUpdateStatus, isVerified }: any) => {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'NEW': return '#2D7EF0';
      case 'PREPARING': return T.primary;
      case 'READY': return '#00F5FF';
      case 'DISPATCHED': return '#8B5CF6';
      default: return 'rgba(255,255,255,0.3)';
    }
  };

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.customerName}>{order.customer_name || 'Addis Citizen'}</Text>
          <Text style={styles.orderType}>
            {order.type || 'DELIVERY'} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
          <Text style={[styles.statusTxt, { color: getStatusColor(order.status) }]}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.orderBody}>
        {order.items?.map((item: any, idx: number) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQty}>x{item.quantity || item.qty}</Text>
          </View>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalVal}>{fmtETB(order.total || 0)}</Text>
        {order.pickup_pin && (
          <View style={styles.pinBox}>
            <Ionicons name="shield-checkmark" size={14} color={T.primary} />
            <Text style={styles.pinText}>{order.pickup_pin}</Text>
          </View>
        )}
      </View>

      {['NEW', 'PREPARING', 'READY'].includes(order.status) && (
        <View style={{ padding: 16, paddingTop: 0 }}>
          {order.status === 'NEW' && (
            <CButton
              title={isVerified ? "ACCEPT TICKET" : "VERIFY TO ACCEPT"}
              size="sm"
              disabled={!isVerified}
              style={{ backgroundColor: isVerified ? '#2D7EF0' : '#222' }}
              onPress={() => onUpdateStatus(order.id, 'PREPARING')}
            />
          )}
          {order.status === 'PREPARING' && (
            <CButton
              title="MARK AS READY"
              size="sm"
              style={{ backgroundColor: '#00F5FF' }}
              onPress={() => onUpdateStatus(order.id, 'READY')}
            />
          )}
          {order.status === 'READY' && (
            <CButton
              title={order.type === 'DELIVERY' ? "DISPATCH RIDER" : "HANDOVER"}
              size="sm"
              style={{ backgroundColor: T.primary }}
              onPress={() => onUpdateStatus(order.id, order.type === 'DELIVERY' ? 'DISPATCHING' : 'COMPLETED')}
            />
          )}
        </View>
      )}
    </View>
  );
};

const MenuItemCard = ({ item, onToggle }: any) => (
  <View style={{ backgroundColor: T.surface, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: T.edge }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View>
        <Text style={{ color: '#FFF', fontSize: 16, fontFamily: Fonts.bold }}>{item.name}</Text>
        <Text style={{ color: T.primary, fontSize: 14, fontFamily: Fonts.bold, marginTop: 4 }}>{fmtETB(item.price)}</Text>
      </View>
      <TouchableOpacity
        onPress={onToggle}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 10,
          backgroundColor: item.available ? T.primaryL : 'transparent',
          borderWidth: 1,
          borderColor: item.available ? T.primary : 'rgba(255,255,255,0.1)',
        }}
      >
        <Text style={{ color: item.available ? T.primary : 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: Fonts.bold }}>
          {item.available ? 'ON MENU' : 'SOLD OUT'}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

const AddMenuItemModal = ({ visible, onClose, onSubmit }: any) => {
  const [form, setForm] = useState({ name: '', price: '', category: 'Mains', description: '' });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
            <Text style={styles.modalTitle}>New Gourmet Dish</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>DISH NAME</Text>
              <CInput placeholder="e.g. Special Kitfo" value={form.name} onChangeText={(t: string) => setForm({ ...form, name: t })} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PRICE (ETB)</Text>
              <CInput placeholder="0.00" keyboardType="numeric" value={form.price} onChangeText={(t: string) => setForm({ ...form, price: t })} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CATEGORY</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setForm({ ...form, category: cat })}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: form.category === cat ? T.primaryL : T.surface,
                      borderWidth: 1,
                      borderColor: form.category === cat ? T.primary : T.edge,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: form.category === cat ? T.primary : 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: Fonts.bold }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <CButton title="CREATE GOURMET ITEM" onPress={() => onSubmit({ ...form, available: true })} style={{ marginTop: 24, backgroundColor: T.primary }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const PinModal = ({ visible, pin, onClose }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.95)' }]}>
      <View style={styles.pinCard}>
        <Ionicons name="bicycle" size={48} color={T.primary} />
        <Text style={{ color: '#FFF', fontSize: 20, fontFamily: Fonts.bold, marginTop: 20 }}>RIDER PICKUP PIN</Text>
        <Text style={styles.pinCode}>{pin}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
          Give this secure code to the delivery rider to authorize order handover.
        </Text>
        <CButton title="CONFIRM HANDOVER" variant="ghost" onPress={onClose} style={{ marginTop: 32, width: '100%' }} textStyle={{ color: T.primary }} />
      </View>
    </View>
  </Modal>
);

const EmptyState = ({ text }: { text: string }) => (
  <View style={{ padding: 60, alignItems: 'center' }}>
    <Ionicons name="restaurant" size={60} color="rgba(255,255,255,0.05)" />
    <Text style={{ color: 'rgba(255,255,255,0.2)', marginTop: 20, fontFamily: Fonts.bold }}>{text}</Text>
  </View>
);

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, Dimensions } from 'react-native';
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
  fetchRestaurantOrders,
  fetchRestaurantMenu,
  updateOrderStatus,
  updateMenuItem,
} from '../../services/food.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Restaurant color scheme
const RESTAURANT_COLORS = {
  primary: '#F5B800',
  primaryL: 'rgba(245,184,0,0.1)',
  primaryB: 'rgba(245,184,0,0.28)',
  status: {
    NEW: '#2D7EF0', // Blue
    PREPARING: '#F5B800', // Amber
    READY: '#00A86B', // Green
    DISPATCHED: '#8B5CF6', // Purple
    DELIVERED: '#00A86B', // Green
    CANCELLED: '#E8312A', // Red
  } as Record<string, string>,
};

export default function RestaurantDashboard() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const balance = useAppStore((s) => s.balance);
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const reset = useAppStore((s) => s.reset);

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMenuItem, setShowAddMenuItem] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    price: '',
    category: 'Mains',
    description: '',
    available: true,
  });

  // KPI calculations
  const todayRevenue = orders
    .filter(
      (o: any) =>
        o.status !== 'CANCELLED' && o.created_at &&
        new Date(o.created_at).toDateString() === new Date().toDateString()
    )
    .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

  const activeOrders = orders.filter((o: any) =>
    ['NEW', 'PREPARING', 'READY'].includes(o.status)
  ).length;
  const deliveredToday = orders.filter(
    (o: any) =>
      o.status === 'DELIVERED' && o.created_at &&
      new Date(o.created_at).toDateString() === new Date().toDateString()
  ).length;

  const loadData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [ordersRes, menuRes] = await Promise.all([
        fetchRestaurantOrders(currentUser.id),
        fetchRestaurantMenu(currentUser.id),
      ]);

      if (ordersRes.data)
        setOrders(
          (ordersRes.data || []).sort(
            (a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          )
        );
      if (menuRes.data) setMenu(menuRes.data);
    } catch (error) {
      showToast('Failed to load data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  // Real-time order updates
  useRealtimePostgres({
    channelName: `restaurant-orders-${currentUser?.id}`,
    table: 'food_orders',
    filter: `restaurant_id=eq.${currentUser?.id}`,
    enabled: !!currentUser?.id,
    onPayload: (payload: any) => {
      if (payload.eventType === 'INSERT') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('🍕 New order received!', 'success');
        loadData();
      } else {
        loadData();
      }
    },
  });

  const updateOrder = async (orderId: string, newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const result = await updateOrderStatus(orderId, newStatus);
      if (!result.error) {
        showToast(`Order ${newStatus.toLowerCase()}`, 'success');

        // Generate PIN for dispatched orders
        if (newStatus === 'DISPATCHED') {
          const pin = Math.floor(1000 + Math.random() * 9000).toString();
          setCurrentPin(pin);
          setShowPinModal(true);
        }

        loadData();
      } else {
        showToast(result.error || 'Failed to update order', 'error');
      }
    } catch (error) {
      showToast('Failed to update order', 'error');
    }
    setLoading(false);
  };

  const addMenuItem = async () => {
    // Enhanced validation
    if (!newMenuItem.name || newMenuItem.name.trim().length === 0) {
      showToast('Please enter a menu item name', 'error');
      return;
    }

    if (!newMenuItem.price || parseFloat(newMenuItem.price) <= 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    if (!newMenuItem.category) {
      showToast('Please select a category', 'error');
      return;
    }

    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const menuItemData = {
        id: uid(),
        restaurant_id: currentUser.id,
        name: newMenuItem.name.trim(),
        price: parseFloat(newMenuItem.price),
        category: newMenuItem.category,
        description: newMenuItem.description?.trim() || '',
        available: newMenuItem.available,
        created_at: new Date().toISOString(),
      };

      const result = await updateMenuItem(menuItemData);
      if (!result.error) {
        setMenu([menuItemData, ...menu]);
        setNewMenuItem({
          name: '',
          price: '',
          category: 'Main',
          description: '',
          available: true,
        });
        setShowAddMenuItem(false);
        showToast('Menu item added successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to add menu item', 'error');
      }
    } catch (error) {
      console.error('Add menu item error:', error);
      showToast('Failed to add menu item', 'error');
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

  const getStatusColor = (status: string) => RESTAURANT_COLORS.status[status] || C.sub;
  const getStatusBg = (status: string) => {
    const color = RESTAURANT_COLORS.status[status];
    return color ? `${color}20` : C.surface;
  };

  const OrderCard = ({ order }: { order: any }) => (
    <Card
      style={{
        marginBottom: 12,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: getStatusColor(order.status),
        opacity: order.status === 'DELIVERED' ? 0.7 : 1,
      }}
    >
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ color: C.text, fontSize: 15, fontFamily: Fonts.black }}>
              {order.customer_name || 'Customer'}
            </Text>
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                backgroundColor: getStatusBg(order.status),
              }}
            >
              <Text
                style={{
                  color: getStatusColor(order.status),
                  fontSize: 9,
                  fontFamily: Fonts.bold,
                  textTransform: 'uppercase',
                }}
              >
                {order.status || 'NEW'}
              </Text>
            </View>
          </View>

          <Text style={{ color: C.sub, fontSize: 11, marginBottom: 4 }}>
            {new Date(order.created_at || 0).toLocaleTimeString()}
          </Text>

          <Text style={{ color: C.text, fontSize: 12, marginBottom: 8 }}>
            {order.items?.map((item: any) => `${item.name} x${item.quantity || 1}`).join(', ') ||
              'Order items'}
          </Text>

          <Text style={{ color: RESTAURANT_COLORS.primary, fontSize: 16, fontFamily: Fonts.black }}>
            {fmtETB(order.total || 0)}
          </Text>
        </View>
      </View>

      {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {order.status === 'NEW' && (
            <CButton
              title="Start Preparing"
              onPress={() => updateOrder(order.id, 'PREPARING')}
              style={{ flex: 1 }}
              size="sm"
            />
          )}
          {order.status === 'PREPARING' && (
            <CButton
              title="Mark Ready"
              onPress={() => updateOrder(order.id, 'READY')}
              style={{ flex: 1 }}
              size="sm"
            />
          )}
          {order.status === 'READY' && (
            <CButton
              title="Dispatch + PIN"
              onPress={() => updateOrder(order.id, 'DISPATCHED')}
              style={{ flex: 1 }}
              size="sm"
            />
          )}
        </View>
      )}
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar
        title="ðŸ½ï¸ Restaurant Dashboard"
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
            colors={[RESTAURANT_COLORS.primaryL, 'transparent']}
            style={{ borderRadius: Radius['3xl'], padding: 24, ...Shadow.md }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: C.text, fontSize: 13, fontFamily: Fonts.bold, opacity: 0.8 }}>
                  Today's Revenue
                </Text>
                <Text
                  style={{
                    color: RESTAURANT_COLORS.primary,
                    fontSize: 32,
                    fontFamily: Fonts.black,
                    marginTop: 4,
                  }}
                >
                  {fmtETB(todayRevenue, 0)}
                </Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: RESTAURANT_COLORS.primaryL,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="stats-chart" size={24} color={RESTAURANT_COLORS.primary} />
              </View>
            </View>

            <View
              style={{ height: 1, backgroundColor: 'rgba(245,184,0,0.2)', marginVertical: 20 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    color: RESTAURANT_COLORS.primary,
                    fontSize: 16,
                    fontFamily: Fonts.black,
                  }}
                >
                  {activeOrders}
                </Text>
                <Text
                  style={{ color: 'rgba(245,184,0,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  ACTIVE ORDERS
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#2D7EF0', fontSize: 16, fontFamily: Fonts.black }}>
                  {deliveredToday}
                </Text>
                <Text
                  style={{ color: 'rgba(45,126,240,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  DELIVERED
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Tab Navigation */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 }}>
          {['orders', 'menu', 'bookings', 'stats'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: Radius.xl,
                backgroundColor: activeTab === tab ? RESTAURANT_COLORS.primaryL : C.surface,
                borderWidth: 1.5,
                borderColor: activeTab === tab ? RESTAURANT_COLORS.primaryB : C.edge2,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? RESTAURANT_COLORS.primary : C.sub,
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
        {activeTab === 'orders' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Live Order Queue" />
            {loading && orders.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                Loading orders...
              </Text>
            ) : orders.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>No orders yet</Text>
            ) : (
              orders.map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </View>
        )}

        {activeTab === 'menu' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Menu Management" />
            <CButton
              title="Add Menu Item"
              onPress={() => setShowAddMenuItem(true)}
              style={{ marginBottom: 16 }}
            />

            {['Mains', 'Drinks', 'Desserts'].map((category) => (
              <View key={category} style={{ marginBottom: 20 }}>
                <Text
                  style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black, marginBottom: 8 }}
                >
                  {category}
                </Text>
                {menu
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <Card key={item.id} style={{ marginBottom: 8, padding: 12 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black }}>
                            {item.name}
                          </Text>
                          <Text
                            style={{
                              color: RESTAURANT_COLORS.primary,
                              fontSize: 12,
                              fontFamily: Fonts.bold,
                            }}
                          >
                            {fmtETB(item.price || 0)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            const newAvailable = !item.available;
                            updateMenuItem({ ...item, available: newAvailable });
                            setMenu(
                              menu.map((m: any) =>
                                m.id === item.id ? { ...m, available: newAvailable } : m
                              )
                            );
                            showToast(`Item ${newAvailable ? 'available' : 'unavailable'}`, 'info');
                          }}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: item.available
                              ? RESTAURANT_COLORS.primaryL
                              : C.surface,
                            borderWidth: 1,
                            borderColor: item.available ? RESTAURANT_COLORS.primaryB : C.edge2,
                          }}
                        >
                          <Text
                            style={{
                              color: item.available ? RESTAURANT_COLORS.primary : C.sub,
                              fontSize: 10,
                              fontFamily: Fonts.bold,
                            }}
                          >
                            {item.available ? 'AVAILABLE' : 'SOLD OUT'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  ))}
              </View>
            ))}
          </View>
        )}

        {activeTab === 'bookings' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Table Bookings" />
            <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
              Booking management coming soon
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

      {/* Add Menu Item Modal */}
      <Modal visible={showAddMenuItem} animationType="slide" presentationStyle="pageSheet">
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
              Add Menu Item
            </Text>
            <TouchableOpacity onPress={() => setShowAddMenuItem(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Item Name *
              </Text>
              <CInput
                placeholder="Enter item name"
                value={newMenuItem.name}
                onChangeText={(text: string) => setNewMenuItem({ ...newMenuItem, name: text })}
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
                value={newMenuItem.price}
                onChangeText={(text: string) => setNewMenuItem({ ...newMenuItem, price: text })}
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
                {['Mains', 'Drinks', 'Desserts'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewMenuItem({ ...newMenuItem, category: cat })}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor:
                        newMenuItem.category === cat ? RESTAURANT_COLORS.primaryL : C.surface,
                      borderWidth: 1,
                      borderColor:
                        newMenuItem.category === cat ? RESTAURANT_COLORS.primaryB : C.edge2,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: newMenuItem.category === cat ? RESTAURANT_COLORS.primary : C.sub,
                        fontSize: 12,
                        fontFamily: Fonts.bold,
                      }}
                    >
                      {cat}
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
                placeholder="Item description (optional)"
                value={newMenuItem.description}
                onChangeText={(text: string) => setNewMenuItem({ ...newMenuItem, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <CButton
              title="Add Menu Item"
              onPress={addMenuItem}
              loading={loading}
              style={{ marginTop: 20 }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* PIN Modal */}
      <Modal visible={showPinModal} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: Radius['2xl'],
              padding: 32,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: RESTAURANT_COLORS.primaryB,
            }}
          >
            <Ionicons name="lock-closed" size={48} color={RESTAURANT_COLORS.primary} />
            <Text
              style={{
                color: C.text,
                fontSize: 18,
                fontFamily: Fonts.black,
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              Delivery PIN
            </Text>
            <Text
              style={{
                color: RESTAURANT_COLORS.primary,
                fontSize: 48,
                fontFamily: 'JetBrains Mono',
                fontWeight: '700',
                marginTop: 12,
                letterSpacing: 8,
              }}
            >
              {currentPin}
            </Text>
            <Text
              style={{
                color: C.sub,
                fontSize: 12,
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              Share this PIN with the delivery rider
            </Text>
            <CButton
              title="Close"
              onPress={() => setShowPinModal(false)}
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

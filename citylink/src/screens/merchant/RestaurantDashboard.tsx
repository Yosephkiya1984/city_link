import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  StatusBar,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRenderCount } from '../../utils/debug/performanceMonitor';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';



// Store & Hooks
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { useRestaurantData } from './hooks/useRestaurantData';
import { useRestaurantActions } from './hooks/useRestaurantActions';
import { HospitalityService } from '../../services/hospitality.service';
import { 
  fetchRestaurantOrders, 
  fetchRestaurantMenu, 
  fetchMerchantRestaurant,
  updateStockQuantity,
  fetchFoodOrderById 
} from '../../services/food.service';

// Theme & Styles
import { D, Radius, Fonts, Spacing, Shadow } from '../../components/hospitality/HospitalityTheme';
import { styles } from './components/RestaurantDashboardStyles';
import { useT } from '../../utils/i18n';
import { Typography, GlassCard } from '../../components';
import { fmtETB } from '../../utils';
import { FoodOrder, FoodProduct, StaffProfile, Table } from '../../types/domain_types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';

// Premium Modular Components
import { HospitalityOverviewTab } from './components/HospitalityOverviewTab';
import { DashboardOrdersTab } from './components/DashboardOrdersTab';
import { RestaurantKDSTab } from './components/RestaurantKDSTab';
import { DashboardFinanceTab } from './components/DashboardFinanceTab';
import { VisualTableBuilder } from '../../components/hospitality/VisualTableBuilder';
import { FoodManagementModal } from '../../components/merchant/FoodManagementModal';
import { RestaurantPinModal } from '../../components/merchant/RestaurantPinModal';
import { QuickSaleModal } from './components/QuickSaleModal';
import { TableManagementModal } from './components/TableManagementModal';
import { HospitalityWaitlistTab } from './components/HospitalityWaitlistTab';
import { HospitalityReservationsTab } from './components/HospitalityReservationsTab';
import { HospitalityEventsTab } from './components/HospitalityEventsTab';
import { HospitalityStaffTab } from './components/HospitalityStaffTab';
import { DashboardInventoryTab } from './components/DashboardInventoryTab';
import { EthiopianReceipt } from '../../components/core/EthiopianReceipt';
import { Modal } from 'react-native';

export default function RestaurantDashboard({ staffMode, staffRole, merchantId }: { staffMode?: boolean; staffRole?: string; merchantId?: string } = {}) {
  useRenderCount('RestaurantDashboard');
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState('overview');
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);

  // Load Restaurant Data
  const restaurantData = useRestaurantData(merchantId);
  const {
    orders,
    menu,
    reservations,
    tables,
    refreshing,
    loadData,
    updateTablePosition,
    addTable,
    deleteTable,
    assignStaff,
    staff,
    restaurant,
    stock,
    lowStockAlerts,
    waitlist,
    onWaitlistAction,
    loading,
    updateStock,
    events,
    transactions,
  } = restaurantData;

  const isWhitelisted =
    currentUser?.phone === '0911178024' ||
    currentUser?.phone === '251911178024';

  const actions = useRestaurantActions(restaurantData, isWhitelisted);
  const {
    actionLoading,
    onUpdateStatus,
    onSettlePayment,
    onAddMenuItem,
    onToggleAvailability,
    onRejectOrder,
    onLogout,
    onWithdraw,
    showAddMenuItem,
    setShowAddMenuItem,
    showPinModal,
    setShowPinModal,
    currentPin,
    selectedImage,
    onPickImage,
    uploading,
    editingProduct,
    setEditingProduct,
    onSetTableStatus,
    onUpdateReservationStatus,
    onFireReservation,
    onRetryDispatch,
    bannerImage,
    bannerUploading,
    onPickBanner,
    onUploadBanner,
  } = actions;

  const [receiptOrder, setReceiptOrder] = useState<FoodOrder | null>(null);

  const handleViewTransactionReceipt = async (orderId: string) => {
    // 1. Try local cache
    const localOrder = orders.find(o => o.id === orderId);
    if (localOrder) {
      setReceiptOrder(localOrder);
      return;
    }

    // 2. Fetch from DB
    try {
      const { data, error } = await fetchFoodOrderById(orderId);
      if (error || !data) throw new Error(error || 'Order not found');
      setReceiptOrder(data);
    } catch (err) {
      showToast('Could not fetch receipt details', 'error');
    }
  };

  const businessName = currentUser?.business_name || currentUser?.full_name || 'Restaurant';

  const TABS = [
    { id: 'overview', icon: 'grid', label: 'Overview' },
    { id: 'kds', icon: 'desktop', label: 'KDS' },
    { id: 'orders', icon: 'list', label: 'Orders' },
    { id: 'waitlist', icon: 'people', label: 'Waitlist' },
    { id: 'reservations', icon: 'calendar', label: 'Bookings' },
    { id: 'tables', icon: 'apps', label: 'Floor Plan' },
    { id: 'menu', icon: 'book', label: 'Menu' },
    { id: 'stock', icon: 'cube', label: 'Stock' },
    { id: 'staff', icon: 'people-circle', label: 'Team' },
    { id: 'finance', icon: 'wallet', label: 'Finance' },
  ].filter(tab => {
    if (!staffMode) return true;
    if (staffRole === 'waiter') return ['tables', 'orders', 'kds', 'waitlist'].includes(tab.id);
    if (staffRole === 'chef') return ['kds', 'stock'].includes(tab.id);
    if (staffRole === 'manager') return true;
    return true;
  });

  useEffect(() => {
    const tabExists = TABS.some(t => t.id === activeTab);
    if (!tabExists && TABS.length > 0) {
      setActiveTab(TABS[0].id);
    }
  }, [activeTab, staffRole, staffMode]);

  const handleTabPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(id);
  };

  const totalSales = orders
    .filter((o) => o.status === 'COMPLETED' || o.status === 'SERVED')
    .reduce((s, o) => s + (o.total || 0), 0);

  const renderTabContent = () => {
    // 🔍 DIAGNOSTIC: Ensure all modular tab components are correctly defined
    if (__DEV__) {
      const components: Record<string, any> = {
        overview: HospitalityOverviewTab,
        orders: DashboardOrdersTab,
        kds: RestaurantKDSTab,
        tables: VisualTableBuilder,
        menu: true,
        reservations: HospitalityReservationsTab,
        waitlist: HospitalityWaitlistTab,
        events: HospitalityEventsTab,
        staff: HospitalityStaffTab,
        stock: DashboardInventoryTab,
        finance: DashboardFinanceTab,
      };
      
      if (!components[activeTab]) {
        console.warn(`[RestaurantDashboard] Component for tab "${activeTab}" is undefined!`);
        return (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h3" color="red">Component Not Found</Typography>
            <Typography variant="body" color="sub">The ${activeTab} component failed to load.</Typography>
          </View>
        );
      }
    }

    switch (activeTab) {
      case 'overview':
        return (
          <View>
            {/* ─── Hospitality Bento Header ─── */}
            <View style={{ paddingHorizontal: 16, marginTop: 10, marginBottom: 16, gap: 14 }}>
              {/* Welcome & Pulse Card */}
              <View style={localStyles.welcomeCard}>
                <View style={{ zIndex: 10 }}>
                  <Typography variant="h1" style={{ color: '#FFF' }}>Kitchen Pulse</Typography>
                  <Typography variant="hint" color="sub" style={{ marginTop: 4 }}>
                    {orders.filter(o => ['PENDING', 'PREPARING'].includes(o.status)).length} active orders. {tables.filter(t => t.status === 'occupied').length} tables occupied.
                  </Typography>
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, zIndex: 10 }}>
                  <TouchableOpacity onPress={() => setActiveTab('kds')} style={localStyles.quickAction}>
                    <Ionicons name="desktop" size={18} color="#00210F" />
                    <Typography variant="title" style={{ color: '#00210F', fontSize: 13 }}>KDS View</Typography>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowQuickSale(true)} style={[localStyles.quickAction, { backgroundColor: D.lift, borderWidth: 1, borderColor: D.edge }]}>
                    <Ionicons name="flash" size={18} color="#FFF" />
                    <Typography variant="title" style={{ color: '#FFF', fontSize: 13 }}>Quick Sale</Typography>
                  </TouchableOpacity>
                </View>
                <Ionicons name="restaurant" size={140} color={D.primary} style={localStyles.welcomeBgIcon} />
              </View>

              {/* Today's Revenue Card */}
              <LinearGradient
                colors={['#FFB347', '#FF8C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={localStyles.financeCard}
              >
                <Typography variant="hint" style={{ color: '#FFF', letterSpacing: 1.5, opacity: 0.9 }}>GROSS REVENUE</Typography>
                <Typography variant="h1" style={{ color: '#FFF', fontSize: 32, marginVertical: 4 }}>{fmtETB(totalSales)}</Typography>
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Typography variant="hint" style={{ color: '#FFF', fontSize: 11, opacity: 0.8 }}>Daily Capacity</Typography>
                    <Typography variant="hint" style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>62%</Typography>
                  </View>
                  <View style={localStyles.progressBar}>
                    <View style={{ width: '62%', height: '100%', backgroundColor: '#FFF' }} />
                  </View>
                </View>
              </LinearGradient>
            </View>

            <HospitalityOverviewTab 
              orders={orders} 
              inventory={menu} 
              tables={tables} 
              reservations={reservations} 
              restaurant={restaurant}
              bannerImage={bannerImage}
              bannerUploading={bannerUploading}
              onPickBanner={onPickBanner}
              onUploadBanner={onUploadBanner}
              onInitializeTables={actions.onInitializeTables}
              styles={styles} 
              t={t} 
              showToast={showToast} 
            />
          </View>
        );
      case 'kds':
        return <RestaurantKDSTab orders={orders} loading={loading} onUpdateStatus={onUpdateStatus} onRetryDispatch={onRetryDispatch} t={t} />;
      case 'orders':
        return (
          <DashboardOrdersTab 
            orders={orders} 
            loading={loading} 
            handleMarkShipped={(id: string) => onUpdateStatus(id, 'PREPARING')}
            handleConfirmPickup={(id: string) => onUpdateStatus(id, 'READY')}
            handleCompleteOrder={(id: string) => onUpdateStatus(id, 'COMPLETED')}
            handleRetryDispatch={onRetryDispatch}
            handleCancelOrder={onRejectOrder}
            handleSettlePayment={onSettlePayment}
            handleViewReceipt={(o: FoodOrder) => setReceiptOrder(o)}
            mode="restaurant" 
            t={t} 
            isWaiter={staffRole === 'waiter'}
          />
        );
      case 'waitlist':
        return <HospitalityWaitlistTab waitlist={waitlist} loading={loading} onAction={onWaitlistAction} t={t} />;
      case 'reservations':
        return (
          <HospitalityReservationsTab 
            reservations={reservations} 
            loading={loading} 
            onUpdateStatus={onUpdateReservationStatus} 
            onCreateReservation={actions.onCreateReservation}
            onReleaseEscrow={actions.onReleaseHospitalityEscrow}
            onNoShow={actions.onNoShowReservation}
            tables={tables}
            merchantId={restaurant?.merchant_id || currentUser.id}
            t={t} 
          />
        );
      case 'tables':
        const decoratedTables = tables.map(table => {
          const upcoming = reservations
            .filter(r => r.table_id === table.id && ['PENDING', 'CONFIRMED'].includes(r.status))
            .sort((a, b) => new Date(a.reservation_time).getTime() - new Date(b.reservation_time).getTime())[0];
          
          if (upcoming) {
            return { 
              ...table, 
              status: table.status === 'free' ? 'reserved' : table.status,
              upcoming_reservation: upcoming 
            };
          }
          return table;
        });

        return (
          <VisualTableBuilder 
            tables={decoratedTables} 
            staff={staff} 
            onUpdatePosition={updateTablePosition} 
            onAddTable={addTable} 
            onDeleteTable={deleteTable} 
            onAssignStaff={assignStaff} 
            onTablePress={(t: Table) => { setSelectedTable(t); setShowTableModal(true); }}
            hideEditControl={staffRole === 'waiter'}
          />
        );
      case 'menu':
        return (
          <View style={{ padding: Spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Typography variant="h2">Digital Menu</Typography>
              <TouchableOpacity 
                style={{ backgroundColor: D.primary + '20', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: D.primary + '40' }}
                onPress={() => setShowAddMenuItem(true)}
              >
                <Typography variant="title" style={{ color: D.primary, fontSize: 13 }}>+ Add Item</Typography>
              </TouchableOpacity>
            </View>

            <View style={styles.menuGrid}>
              <AnimatePresence>
                {menu.map((item: FoodProduct, idx: number) => (
                  <MotiView
                    key={item.id}
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: idx * 50 }}
                    style={styles.foodCard}
                  >
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => { setEditingProduct(item); setShowAddMenuItem(true); }}
                    >
                      <View style={styles.foodImg}>
                        {item.image_url ? (
                          <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                            <Ionicons name="fast-food" size={40} color={D.white} />
                          </View>
                        )}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.8)']}
                          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 }}
                        />
                      </View>
                      
                      <GlassCard variant="blur" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0 }}>
                        <View style={styles.foodInfo}>
                          <Typography variant="title" numberOfLines={1} style={{ fontSize: 14 }}>{item.name}</Typography>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h3" style={{ color: D.primary, fontSize: 13 }}>{fmtETB(item.price)}</Typography>
                            {item.stock < 10 && (
                              <View style={{ backgroundColor: D.red + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Typography variant="hint" style={{ color: D.red, fontSize: 9 }}>LOW</Typography>
                              </View>
                            )}
                          </View>
                        </View>
                      </GlassCard>
                    </TouchableOpacity>
                  </MotiView>
                ))}
              </AnimatePresence>
            </View>
          </View>
        );
      case 'stock':
        return <DashboardInventoryTab inventory={stock} lowStockAlerts={lowStockAlerts} updateStock={updateStock} styles={styles} t={t} />;
      case 'staff':
        return <HospitalityStaffTab staff={staff} loading={loading} onAddStaff={() => navigation.navigate('ManageStaff' as any)} onRemoveStaff={() => {}} t={t} />;
      case 'events':
        return <HospitalityEventsTab events={events} loading={loading} onCreateEvent={() => {}} t={t} />;
      case 'finance':
        return (
          <DashboardFinanceTab 
            walletTransactions={transactions} 
            totalSales={totalSales}
            withdrawing={actionLoading} 
            handleWithdraw={onWithdraw} 
            handleViewReceipt={handleViewTransactionReceipt}
            styles={styles} 
            t={t} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: D.ink }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        
        {/* Top Navigation Bar */}
        {/* ─── Premium Header ─── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <MotiView 
              from={{ opacity: 0, translateX: -20 }} 
              animate={{ opacity: 1, translateX: 0 }}
              style={styles.brandInfo}
            >
              <Typography variant="h1" style={styles.brandTitle}>{businessName}</Typography>
              <View style={styles.statusRow}>
                <MotiView
                  from={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ loop: true, type: 'timing', duration: 1500 }}
                  style={styles.onlineDot}
                />
                <Typography variant="hint" style={styles.brandTag}>• LIVE KITCHEN</Typography>
              </View>
            </MotiView>
            
            <View style={styles.headerActions}>
              <TouchableOpacity activeOpacity={0.7} style={styles.actionCircle} onPress={() => setShowQuickSale(true)}>
                <Ionicons name="flash" size={20} color={D.primary} />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} style={styles.actionCircle} onPress={() => navigation.navigate('ChatInbox')}>
                <Ionicons name="mail" size={20} color={D.white} />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} style={[styles.actionCircle, { borderColor: D.red + '40' }]} onPress={onLogout}>
                <Ionicons name="power" size={20} color={D.red} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tab Scroller */}
        <View style={styles.tabScrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContentContainer}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleTabPress(tab.id)}
                style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
              >
                <Ionicons 
                  name={tab.icon as React.ComponentProps<typeof Ionicons>['name']} 
                  size={18} 
                  color={activeTab === tab.id ? D.ink : D.sub} 
                />
                <Text style={[styles.tabButtonText, activeTab === tab.id && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={D.primary} />
          }
        >
          <AnimatePresence exitBeforeEnter>
            <MotiView
              key={activeTab}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -10 }}
              transition={{ type: 'timing', duration: 300 }}
              style={{ paddingBottom: 120 }}
            >
              {renderTabContent()}
            </MotiView>
          </AnimatePresence>
        </ScrollView>

        {/* Modals */}
        <FoodManagementModal
          visible={showAddMenuItem}
          onClose={() => { setShowAddMenuItem(false); setEditingProduct(null); }}
          onSave={onAddMenuItem}
          editingProduct={editingProduct}
          uploading={uploading}
          pickImage={onPickImage}
          selectedImage={selectedImage}
        />

        <RestaurantPinModal visible={showPinModal} onClose={() => setShowPinModal(false)} pin={currentPin} />

        <QuickSaleModal
          visible={showQuickSale}
          onClose={() => setShowQuickSale(false)}
          menuItems={menu}
          merchantId={restaurant?.id || ''}
          showToast={showToast}
        />

        <TableManagementModal
          visible={showTableModal}
          onClose={() => setShowTableModal(false)}
          table={selectedTable}
          staff={staff}
          onSetStatus={onSetTableStatus}
          onAssignStaff={assignStaff}
          hideAssignStaff={staffRole === 'waiter'}
        />

        <Modal visible={!!receiptOrder} animationType="slide" transparent statusBarTranslucent>
          <EthiopianReceipt
            order={receiptOrder}
            merchant={restaurant}
            onClose={() => setReceiptOrder(null)}
          />
        </Modal>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  welcomeCard: {
    backgroundColor: D.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: D.edge,
    padding: 24,
    overflow: 'hidden',
  },
  welcomeBgIcon: {
    position: 'absolute',
    right: -30,
    top: -10,
    opacity: 0.1,
    transform: [{ rotate: '15deg' }],
  },
  quickAction: {
    backgroundColor: D.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  financeCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#FFB347',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
});

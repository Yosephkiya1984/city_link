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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';

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
import { D, Radius, Fonts, Spacing, Shadow } from './components/StitchTheme';
import { styles } from './components/RestaurantDashboardStyles';
import { useT } from '../../utils/i18n';
import { Screen, Typography, Surface, SectionTitle } from '../../components';
import { fmtETB } from '../../utils';

// Premium Modular Components
import { HospitalityOverviewTab } from './components/HospitalityOverviewTab';
import { DashboardOrdersTab } from './components/DashboardOrdersTab';
import { RestaurantKDSTab } from './components/RestaurantKDSTab';
import { DashboardFinanceTab } from './components/DashboardFinanceTab';
import { VisualTableBuilder } from './components/VisualTableBuilder';
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

export default function RestaurantDashboard({ staffMode, staffRole }: { staffMode?: boolean; staffRole?: string } = {}) {
  const t = useT();
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState('overview');
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showTableModal, setShowTableModal] = useState(false);

  // Load Restaurant Data
  const restaurantData = useRestaurantData();
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

  const [receiptOrder, setReceiptOrder] = useState<any>(null);

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

  const handleTabPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(id);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
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
            styles={styles} 
            t={t} 
            showToast={showToast} 
          />
        );
      case 'kds':
        return <RestaurantKDSTab orders={orders} loading={loading} onUpdateStatus={onUpdateStatus} onRetryDispatch={onRetryDispatch} t={t} />;
      case 'orders':
        return (
          <DashboardOrdersTab 
            orders={orders} 
            loading={loading} 
            handleMarkShipped={(id: any) => onUpdateStatus(id, 'PREPARING')}
            handleConfirmPickup={(id: any) => onUpdateStatus(id, 'READY')}
            handleCompleteOrder={(id: any) => onUpdateStatus(id, 'COMPLETED')}
            handleRetryDispatch={onRetryDispatch}
            handleCancelOrder={onRejectOrder}
            handleSettlePayment={onSettlePayment}
            handleViewReceipt={(o: any) => setReceiptOrder(o)}
            mode="restaurant" 
            t={t} 
          />
        );
      case 'waitlist':
        return <HospitalityWaitlistTab waitlist={waitlist} loading={loading} onAction={onWaitlistAction} t={t} />;
      case 'reservations':
        return <HospitalityReservationsTab reservations={reservations} loading={loading} onUpdateStatus={onUpdateReservationStatus} t={t} />;
      case 'tables':
        return (
          <VisualTableBuilder 
            tables={tables} 
            staff={staff} 
            onUpdatePosition={updateTablePosition} 
            onAddTable={addTable} 
            onDeleteTable={deleteTable} 
            onAssignStaff={assignStaff} 
            onTablePress={(t: any) => { setSelectedTable(t); setShowTableModal(true); }}
          />
        );
      case 'menu':
        return (
          <View style={{ padding: Spacing.lg }}>
            <SectionTitle title="Digital Menu" rightLabel="Add Item" onRightPress={() => setShowAddMenuItem(true)} />
            <View style={styles.menuGrid}>
              {menu.map((item: any) => (
                <Surface key={item.id} variant="lift" style={styles.foodCard}>
                  <TouchableOpacity onPress={() => { setEditingProduct(item); setShowAddMenuItem(true); }}>
                    <Image source={{ uri: item.image_url }} style={styles.foodImg} />
                    <View style={styles.foodInfo}>
                      <Typography variant="title" numberOfLines={1}>{item.name}</Typography>
                      <Typography variant="h3" color="primary">ETB {fmtETB(item.price)}</Typography>
                    </View>
                  </TouchableOpacity>
                </Surface>
              ))}
            </View>
          </View>
        );
      case 'stock':
        return <DashboardInventoryTab inventory={stock} lowStockAlerts={lowStockAlerts} updateStock={updateStock} styles={styles} t={t} />;
      case 'staff':
        return <HospitalityStaffTab staff={staff} loading={loading} onAddStaff={() => (navigation as any).navigate('ManageStaff')} onRemoveStaff={() => {}} t={t} />;
      case 'events':
        return <HospitalityEventsTab events={events} loading={loading} onCreateEvent={() => {}} t={t} />;
      case 'finance':
        return (
          <DashboardFinanceTab 
            walletTransactions={transactions} 
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
    <SafeAreaView style={{ flex: 1, backgroundColor: D.ink }}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        
        {/* Top Navigation Bar */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <MotiView from={{ opacity: 0, translateX: -20 }} animate={{ opacity: 1, translateX: 0 }}>
              <Typography variant="h2">{businessName}</Typography>
              <View style={styles.statusRow}>
                <View style={styles.onlineDot} />
                <Typography variant="hint" color="primary">LIVE KITCHEN</Typography>
              </View>
            </MotiView>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionCircle} onPress={() => setShowQuickSale(true)}>
                <Ionicons name="flash" size={20} color={D.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCircle} onPress={() => (navigation as any).navigate('ChatInbox')}>
                <Ionicons name="mail" size={20} color={D.white} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionCircle, { borderColor: D.red }]} onPress={onLogout}>
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
                  name={tab.icon as any} 
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
        />

        <Modal visible={!!receiptOrder} animationType="slide" transparent statusBarTranslucent>
          <EthiopianReceipt
            order={receiptOrder}
            merchant={restaurant}
            onClose={() => setReceiptOrder(null)}
          />
        </Modal>
      </View>
    </SafeAreaView>
  );
}

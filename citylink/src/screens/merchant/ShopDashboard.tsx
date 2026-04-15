import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { signOut } from '../../services/auth.service';
import { DarkColors as T } from '../../theme';

// Import extracted hooks & sub-components
import { useShopData } from './hooks/useShopData';
import { useShopActions } from './hooks/useShopActions';
import { DashboardOverviewTab } from './components/DashboardOverviewTab';
import { DashboardInventoryTab } from './components/DashboardInventoryTab';
import { DashboardOrdersTab } from './components/DashboardOrdersTab';
import { DashboardFinanceTab } from './components/DashboardFinanceTab';
import { styles } from './components/ShopDashboardStyles';

// Modals are kept internal for brevity or could be extracted. We will leave them in a separate extraction phase if needed.
import { Modal, ActivityIndicator, Image, TextInput, Alert } from 'react-native';

export default function ShopDashboard() {
  const navigation: any = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState('overview');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '', price: '', category: 'Electronics', stock: '10', description: '', condition: 'new',
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showShipSuccess, setShowShipSuccess] = useState<any>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [pinPromptOrder, setPinPromptOrder] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [submittingPin, setSubmittingPin] = useState(false);
  const [shipping, setShipping] = useState(false);

  const businessName = currentUser?.business_name || currentUser?.full_name || 'Store Front';

  // Hook 1: Data fetching & Realtime subs
  const {
    orders,
    inventory,
    setInventory,
    loading,
    setLoading,
    refreshing,
    setRefreshing,
    walletTransactions,
    salesHistory,
    openDisputes,
    loadData
  } = useShopData();

  // Hook 2: Actions
  const {
    handleSaveProduct,
    handleEditProduct,
    handleDeleteProduct,
    handleMarkShipped,
    handleConfirmPickup,
    handleDispatchRetry,
    handleCancelOrder,
    handleSwitchSelfDelivery,
    submitSelfDeliveryPin,
    handleMessageBuyer,
    handleWithdraw,
  } = useShopActions({
    currentUser, showToast, loadData,
    newProduct, setNewProduct,
    editingProduct, setEditingProduct,
    selectedImage, setSelectedImage,
    setUploading, setShowProductModal,
    setInventory, shipping, setShipping,
    loading, setLoading,
    pinPromptOrder, setPinPromptOrder,
    pinInput, setPinInput, setSubmittingPin,
    setShowShipSuccess, setWithdrawing, orders
  });

  const handleLogout = async () => {
    try {
      await signOut();
      await useAuthStore.getState().setCurrentUser(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Mobile Navbar ────────────────────────────────────────── */}
      <View style={styles.navBarMobile}>
        <View style={styles.brandBoxMobile}>
          <View style={styles.brandIconMobile}>
            <Ionicons name="storefront" size={18} color={T.primary} />
          </View>
          <View>
            <Text style={styles.brandNameMobile}>{businessName}</Text>
            <Text style={styles.brandSubtitleMobile}>VERIFIED MERCHANT</Text>
          </View>
        </View>
        <View style={styles.navRight}>
          <TouchableOpacity style={styles.navIconBtn} onPress={() => navigation.navigate('ChatInbox')}>
            <Ionicons name="chatbubbles-outline" size={24} color={T.onVariant} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navIconBtn}>
            <Ionicons name="notifications-outline" size={24} color={T.onVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBoxMobile} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={T.tertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Scrollable Tabs ────────────────────────────────────────── */}
      <View style={styles.tabScrollWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroller}>
          {[
            { id: 'overview', icon: 'grid', label: 'Overview' },
            { id: 'inventory', icon: 'file-tray-stacked', label: 'Inventory' },
            { id: 'orders', icon: 'cart', label: 'Orders' },
            { id: 'finance', icon: 'cash', label: 'Finance' },
          ].map((link) => {
            const active = activeTab === link.id;
            return (
              <TouchableOpacity
                key={link.id}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setActiveTab(link.id)}
              >
                <Ionicons name={(active ? link.icon : `${link.icon}-outline`) as any} size={16} color={active ? T.primary : T.onVariant} />
                <Text style={[styles.tabItemTxt, active && styles.tabItemTxtActive]}>{link.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={T.primary} />
        }
      >
        {activeTab === 'overview' && (
          <DashboardOverviewTab orders={orders} inventory={inventory} salesHistory={salesHistory} showToast={showToast} styles={styles} />
        )}
        {activeTab === 'inventory' && (
          <DashboardInventoryTab
            inventory={inventory} inventorySearch={inventorySearch} setInventorySearch={setInventorySearch}
            setShowProductModal={setShowProductModal} handleEditProduct={handleEditProduct}
            handleDeleteProduct={handleDeleteProduct} loading={loading} styles={styles}
          />
        )}
        {activeTab === 'orders' && (
          <DashboardOrdersTab
            orders={orders} openDisputes={openDisputes} loading={loading} shipping={shipping}
            handleMarkShipped={handleMarkShipped} handleConfirmPickup={handleConfirmPickup}
            handleDispatchRetry={handleDispatchRetry} handleCancelOrder={handleCancelOrder}
            handleSwitchSelfDelivery={handleSwitchSelfDelivery} handleMessageBuyer={handleMessageBuyer}
            setPinInput={setPinInput} setPinPromptOrder={setPinPromptOrder} styles={styles}
          />
        )}
        {activeTab === 'finance' && (
          <DashboardFinanceTab walletTransactions={walletTransactions} withdrawing={withdrawing} handleWithdraw={handleWithdraw} styles={styles} />
        )}
      </ScrollView>

      {/* Modals are kept here for layout simplicity during decomposition */}
      <Modal visible={showProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Ionicons name="close" size={24} color={T.onSurface} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.submitBtn, uploading && { opacity: 0.7 }]} onPress={handleSaveProduct} disabled={uploading}>
              {uploading ? <ActivityIndicator color={T.ink} /> : <Text style={styles.submitBtnText}>{editingProduct ? 'Save' : 'Upload'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!showShipSuccess} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center', paddingVertical: 40 }]}>
            <View style={[styles.successCirc, { backgroundColor: T.primary + '20' }]}>
              <Ionicons name="checkmark-circle" size={64} color={T.primary} />
            </View>
            <Text style={[styles.modalTitle, { marginTop: 24 }]}>Shipment Confirmed!</Text>
            <Text style={[styles.pageSubtitle, { textAlign: 'center', marginHorizontal: 20, marginTop: 8 }]}>
              Share this PIN:
            </Text>
            <View style={styles.pinDisplayCard}>
              <Text style={styles.pinTextLarge}>{showShipSuccess?.delivery_pin}</Text>
            </View>
            <TouchableOpacity style={[styles.submitBtn, { width: '100%', marginTop: 32 }]} onPress={() => setShowShipSuccess(null)}>
              <Text style={styles.submitBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

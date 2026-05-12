import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Image,
  TextInput,
  Alert,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { signOut } from '../../services/auth.service';
import { DarkColors as T } from '../../theme';
import { useT } from '../../utils/i18n';
import { Radius, Spacing, Fonts, Shadow, D } from '../../components/hospitality/HospitalityTheme';
import { LinearGradient } from 'expo-linear-gradient';

// Import extracted hooks & sub-components
import { useShopData } from './hooks/useShopData';
import { useShopActions } from './hooks/useShopActions';
import { DashboardOverviewTab } from './components/DashboardOverviewTab';
import { DashboardInventoryTab } from './components/DashboardInventoryTab';
import { DashboardOrdersTab } from './components/DashboardOrdersTab';
import { DashboardFinanceTab } from './components/DashboardFinanceTab';
import { styles } from './components/ShopDashboardStyles';
import { EthiopianReceipt } from '../../components/core/EthiopianReceipt';

import { PerformanceProfiler } from '../../utils/debug/memoryManager';

// Profile the tabs
const ProfiledOverview = PerformanceProfiler.profileComponent(DashboardOverviewTab, 'DashboardOverviewTab');
const ProfiledInventory = PerformanceProfiler.profileComponent(DashboardInventoryTab, 'DashboardInventoryTab');
const ProfiledOrders = PerformanceProfiler.profileComponent(DashboardOrdersTab, 'DashboardOrdersTab');
const ProfiledFinance = PerformanceProfiler.profileComponent(DashboardFinanceTab, 'DashboardFinanceTab');

// Modular Components
import { ProductManagementModal } from '../../components/merchant/ProductManagementModal';
import { OrderVerificationModal } from '../../components/merchant/OrderVerificationModal';
import { Screen, Typography, Surface, SectionTitle } from '../../components';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { fmtETB } from '../../utils';

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
    backgroundColor: D.blue,
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
    shadowColor: '#4DE693',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0,33,15,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
});

export default function ShopDashboard() {
  const t = useT();
  const navigation: any = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState('overview');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: 'Electronics',
    stock: '10',
    description: '',
    condition: 'new',
  });
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showShipSuccess, setShowShipSuccess] = useState<any>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [pinPromptOrder, setPinPromptOrder] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [submittingPin, setSubmittingPin] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);

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
    loadData,
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
    currentUser,
    showToast,
    loadData,
    newProduct,
    setNewProduct,
    editingProduct,
    setEditingProduct,
    selectedImage,
    setSelectedImage,
    setUploading,
    setShowProductModal,
    setInventory,
    shipping,
    setShipping,
    loading,
    setLoading,
    pinPromptOrder,
    setPinPromptOrder,
    pinInput,
    setPinInput,
    setSubmittingPin,
    setShowShipSuccess,
    setWithdrawing,
    orders,
  });

  // 🛡️ Developer Whitelist: Bypass KYC for test account 0911178024
  const isWhitelisted =
    currentUser?.phone === '0911178024' ||
    currentUser?.phone === '251911178024' ||
    currentUser?.phone === '+251911178024';

  const isVerified =
    isWhitelisted || (currentUser?.merchant_status === 'APPROVED' && !!currentUser?.tin);

  const handleLogout = async () => {
    try {
      await signOut();
      await useAuthStore.getState().setCurrentUser(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const pickImage = async () => {
    if (!isVerified) {
      showToast(t('verification_required_msg'), 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const totalSales = React.useMemo(() => 
    orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((s, o) => s + (o.total || 0), 0),
    [orders]
  );

  return (
    <Screen style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ─── Premium Navbar ─── */}
      <View style={styles.navBarMobile}>
        <View style={styles.brandBoxMobile}>
          <View style={styles.brandIconMobile}>
            <Ionicons name="storefront" size={20} color={D.blue} />
          </View>
          <View>
            <Text style={styles.brandNameMobile}>{businessName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                style={[styles.brandSubtitleMobile, { color: isVerified ? D.blue : '#FF3B30' }]}
              >
                {isVerified ? t('verified_merchant') : t('action_required')}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.navRight}>
          <TouchableOpacity
            style={styles.navIconBtn}
            onPress={() => navigation.navigate('ChatInbox')}
          >
            <Ionicons name="chatbubbles-outline" size={22} color={D.sub} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navIconBtn} onPress={handleLogout}>
            <Ionicons name="power" size={22} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Tabs (MOVED TO TOP - STICKY) ─── */}
      <View style={styles.tabScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroller}
        >
          {[
            { id: 'overview', icon: 'grid', label: t('overview_tab') },
            { id: 'inventory', icon: 'file-tray-stacked', label: t('inventory_tab') },
            { id: 'orders', icon: 'cart', label: t('orders_tab') },
            { id: 'finance', icon: 'cash', label: t('finance_tab') },
          ].map((link) => {
            const active = activeTab === link.id;
            return (
              <TouchableOpacity
                key={link.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(link.id);
                }}
              >
                <View style={[styles.tabItem, active && styles.tabItemActive]}>
                  <Ionicons
                    name={(active ? link.icon : `${link.icon}-outline`) as any}
                    size={16}
                    color={active ? '#00210F' : D.sub}
                  />
                  <Text style={[styles.tabItemTxt, active && styles.tabItemTxtActive]}>
                    {link.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={D.blue} />
        }
      >
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <View>
              {/* ─── Bento Header (Only on Overview) ─── */}
              <View style={{ paddingHorizontal: 16, marginTop: 10, marginBottom: 16, gap: 14 }}>
                {/* Welcome Card */}
                <View style={localStyles.welcomeCard}>
                  <View style={{ zIndex: 10 }}>
                    <Typography variant="h1" style={{ color: '#FFF' }}>Welcome back</Typography>
                    <Typography variant="hint" color="sub" style={{ marginTop: 4 }}>
                      {inventory.length} items in stock. {orders.filter(o => o.status === 'PENDING').length} new orders.
                    </Typography>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, zIndex: 10 }}>
                    <TouchableOpacity onPress={() => setActiveTab('orders')} style={localStyles.quickAction}>
                      <Ionicons name="cart" size={18} color="#00210F" />
                      <Typography variant="title" style={{ color: '#00210F', fontSize: 13 }}>Orders</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowProductModal(true)} style={[localStyles.quickAction, { backgroundColor: D.lift, borderWidth: 1, borderColor: D.edge }]}>
                      <Ionicons name="add" size={18} color="#FFF" />
                      <Typography variant="title" style={{ color: '#FFF', fontSize: 13 }}>New Product</Typography>
                    </TouchableOpacity>
                  </View>
                  <Ionicons name="bag-handle" size={140} color={D.blue} style={localStyles.welcomeBgIcon} />
                </View>

                {/* Finance Summary Card */}
                <LinearGradient
                  colors={['#4DE693', '#2B9E5F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={localStyles.financeCard}
                >
                  <Typography variant="hint" style={{ color: '#00210F', letterSpacing: 1.5, opacity: 0.7 }}>STORE REVENUE</Typography>
                  <Typography variant="h1" style={{ color: '#00210F', fontSize: 32, marginVertical: 4 }}>{fmtETB(totalSales)}</Typography>
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Typography variant="hint" style={{ color: '#00210F', fontSize: 11 }}>Monthly Goal</Typography>
                      <Typography variant="hint" style={{ color: '#00210F', fontSize: 11, fontWeight: '700' }}>85%</Typography>
                    </View>
                    <View style={localStyles.progressBar}>
                      <View style={{ width: '85%', height: '100%', backgroundColor: '#00210F' }} />
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <ProfiledOverview
                orders={orders}
                inventory={inventory}
                salesHistory={salesHistory}
                showToast={showToast}
                styles={styles}
                t={t}
              />
            </View>
          )}
          {activeTab === 'inventory' && (
            <ProfiledInventory
              inventory={inventory}
              inventorySearch={inventorySearch}
              setInventorySearch={setInventorySearch}
              setShowProductModal={setShowProductModal}
              handleEditProduct={handleEditProduct}
              handleDeleteProduct={handleDeleteProduct}
              loading={loading}
              styles={styles}
              t={t}
            />
          )}
          {activeTab === 'orders' && (
            <ProfiledOrders
              orders={orders}
              openDisputes={openDisputes}
              loading={loading}
              shipping={shipping}
              handleMarkShipped={handleMarkShipped}
              handleConfirmPickup={handleConfirmPickup}
              handleDispatchRetry={handleDispatchRetry}
              handleCancelOrder={handleCancelOrder}
              handleSwitchSelfDelivery={handleSwitchSelfDelivery}
              handleMessageBuyer={handleMessageBuyer}
              setPinInput={setPinInput}
              setPinPromptOrder={setPinPromptOrder}
              handleViewReceipt={(o: any) => setReceiptOrder(o)}
              styles={styles}
              t={t}
            />
          )}
          {activeTab === 'finance' && (
            <ProfiledFinance
              walletTransactions={walletTransactions}
              totalSales={totalSales}
              withdrawing={withdrawing}
              handleWithdraw={handleWithdraw}
              styles={styles}
              t={t}
            />
          )}
        </View>
      </ScrollView>

      <ProductManagementModal
        visible={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        selectedImage={selectedImage}
        pickImage={pickImage}
        removeImage={() => setSelectedImage(null)}
        uploading={uploading}
      />

      <OrderVerificationModal
        visible={!!pinPromptOrder}
        onClose={() => setPinPromptOrder(null)}
        onConfirm={submitSelfDeliveryPin}
        order={pinPromptOrder}
        pinInput={pinInput}
        setPinInput={setPinInput}
        loading={submittingPin}
      />

      <Modal visible={!!showShipSuccess} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center', paddingVertical: 40 }]}>
            <View style={[styles.successCirc, { backgroundColor: D.blue + '20' }]}>
              <Ionicons name="checkmark-circle" size={64} color={D.blue} />
            </View>
            <Text style={[styles.modalTitle, { marginTop: 24 }]}>{t('shipment_confirmed')}</Text>
            <Text
              style={[
                styles.pageSubtitle,
                { textAlign: 'center', marginHorizontal: 20, marginTop: 8 },
              ]}
            >
              {t('share_pin_label')}
            </Text>
            <View style={styles.pinDisplayCard}>
              <Text style={styles.pinTextLarge}>{showShipSuccess?.delivery_pin}</Text>
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, { width: '100%', marginTop: 32, backgroundColor: D.blue }]}
              onPress={() => setShowShipSuccess(null)}
            >
              <Text style={styles.submitBtnText}>{t('got_it')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!receiptOrder} animationType="slide" transparent statusBarTranslucent>
        <EthiopianReceipt
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      </Modal>
    </Screen>
  );
}

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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { signOut } from '../../services/auth.service';
import { DarkColors as T, Fonts, Spacing, Radius, Shadow } from '../../theme';
import { useT } from '../../utils/i18n';
import { D } from './components/StitchTheme';
import { LinearGradient } from 'expo-linear-gradient';

// Import extracted hooks & sub-components
import { useShopData } from './hooks/useShopData';
import { useShopActions } from './hooks/useShopActions';
import { DashboardOverviewTab } from './components/DashboardOverviewTab';
import { DashboardInventoryTab } from './components/DashboardInventoryTab';
import { DashboardOrdersTab } from './components/DashboardOrdersTab';
import { DashboardFinanceTab } from './components/DashboardFinanceTab';
import { styles } from './components/ShopDashboardStyles';

// Modular Components
import { ProductManagementModal } from '../../components/merchant/ProductManagementModal';
import { OrderVerificationModal } from '../../components/merchant/OrderVerificationModal';
import { Screen, Typography, Surface, SectionTitle } from '../../components';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { fmtETB } from '../../utils';

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

  const totalSales = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((s, o) => s + (o.total || 0), 0);

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
        {/* ─── Bento Header ─── */}
        <View style={{ paddingHorizontal: 16, marginTop: 10, marginBottom: 16, gap: 14 }}>
          {/* Welcome Card */}
          <View
            style={{
              backgroundColor: D.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: D.edge,
              padding: 24,
              overflow: 'hidden',
            }}
          >
            <View style={{ zIndex: 10 }}>
              <Text
                style={{ color: '#FFF', fontSize: 28, fontFamily: Fonts.headline, marginBottom: 8 }}
              >
                Welcome back
              </Text>
              <Text style={{ color: D.sub, fontSize: 14, fontFamily: Fonts.bold, lineHeight: 20 }}>
                {inventory.length} items in stock.{' '}
                {orders.filter((o) => o.status === 'PENDING').length} orders awaiting processing.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, zIndex: 10 }}>
              <TouchableOpacity
                onPress={() => setActiveTab('orders')}
                style={{
                  backgroundColor: D.blue,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="cart" size={20} color="#00210F" />
                <Text style={{ color: '#00210F', fontFamily: Fonts.bold, fontSize: 14 }}>
                  Orders
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowProductModal(true)}
                style={{
                  backgroundColor: D.lift,
                  borderWidth: 1,
                  borderColor: D.edge,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={{ color: '#FFF', fontFamily: Fonts.bold, fontSize: 14 }}>
                  New Product
                </Text>
              </TouchableOpacity>
            </View>
            <Ionicons
              name="bag-handle"
              size={140}
              color={D.blue}
              style={{
                position: 'absolute',
                right: -30,
                top: -10,
                opacity: 0.1,
                transform: [{ rotate: '15deg' }],
              }}
            />
          </View>

          {/* Finance Summary Card */}
          <LinearGradient
            colors={['#4DE693', '#2B9E5F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 24,
              shadowColor: '#4DE693',
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <Text
              style={{
                color: '#00210F',
                fontSize: 11,
                fontFamily: Fonts.bold,
                letterSpacing: 2,
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              Store Revenue
            </Text>
            <Text
              style={{
                color: '#00210F',
                fontSize: 36,
                fontFamily: Fonts.headline,
                marginVertical: 8,
                letterSpacing: -1,
              }}
            >
              ETB {fmtETB(totalSales, 0)}
            </Text>
            <View style={{ marginTop: 12 }}>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}
              >
                <Text style={{ color: '#00210F', fontSize: 13, opacity: 0.8 }}>Monthly Goal</Text>
                <Text style={{ color: '#00210F', fontSize: 13, fontFamily: Fonts.bold }}>85%</Text>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: 'rgba(0,33,15,0.15)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <View style={{ width: '85%', height: '100%', backgroundColor: '#00210F' }} />
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <DashboardOverviewTab
              orders={orders}
              inventory={inventory}
              salesHistory={salesHistory}
              showToast={showToast}
              styles={styles}
              t={t}
            />
          )}
          {activeTab === 'inventory' && (
            <DashboardInventoryTab
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
            <DashboardOrdersTab
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
              styles={styles}
              t={t}
            />
          )}
          {activeTab === 'finance' && (
            <DashboardFinanceTab
              walletTransactions={walletTransactions}
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
    </Screen>
  );
}

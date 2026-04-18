import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
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
import * as ImagePicker from 'expo-image-picker';

export default function ShopDashboard() {
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

  const handleLogout = async () => {
    try {
      await signOut();
      await useAuthStore.getState().setCurrentUser(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
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
          <TouchableOpacity
            style={styles.navIconBtn}
            onPress={() => navigation.navigate('ChatInbox')}
          >
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroller}
        >
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
                <Ionicons
                  name={(active ? link.icon : `${link.icon}-outline`) as any}
                  size={16}
                  color={active ? T.primary : T.onVariant}
                />
                <Text style={[styles.tabItemTxt, active && styles.tabItemTxtActive]}>
                  {link.label}
                </Text>
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={T.primary}
          />
        }
      >
        {activeTab === 'overview' && (
          <DashboardOverviewTab
            orders={orders}
            inventory={inventory}
            salesHistory={salesHistory}
            showToast={showToast}
            styles={styles}
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
          />
        )}
        {activeTab === 'finance' && (
          <DashboardFinanceTab
            walletTransactions={walletTransactions}
            withdrawing={withdrawing}
            handleWithdraw={handleWithdraw}
            styles={styles}
          />
        )}
      </ScrollView>

      {/* Modals are kept here for layout simplicity during decomposition */}
      <Modal visible={showProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Ionicons name="close" size={24} color={T.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <View style={styles.imagePickerContainer}>
                <Text style={styles.inputLabel}>Product Photo</Text>
                {selectedImage || editingProduct?.image_url ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: selectedImage?.uri || editingProduct?.image_url }}
                      style={styles.imagePreview}
                    />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setSelectedImage(null)}
                    >
                      <Ionicons name="close-circle" size={24} color={T.tertiary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                    <View style={styles.imageIconCircle}>
                      <Ionicons name="camera" size={24} color={T.primary} />
                    </View>
                    <Text style={styles.imagePickerTxt}>Tap to upload photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Product Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Wireless Headphones"
                  placeholderTextColor={T.sub}
                  value={newProduct.name}
                  onChangeText={(t) => setNewProduct({ ...newProduct, name: t })}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Price (ETB)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0.00"
                    placeholderTextColor={T.sub}
                    keyboardType="numeric"
                    value={newProduct.price}
                    onChangeText={(t) => setNewProduct({ ...newProduct, price: t })}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Stock</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="10"
                    placeholderTextColor={T.sub}
                    keyboardType="numeric"
                    value={newProduct.stock}
                    onChangeText={(t) => setNewProduct({ ...newProduct, stock: t })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Electronics', 'Fashion', 'Home', 'Food', 'Other'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.smallBadge,
                        newProduct.category === cat && { backgroundColor: T.primary + '30' },
                      ]}
                      onPress={() => setNewProduct({ ...newProduct, category: cat })}
                    >
                      <Text
                        style={[
                          styles.smallBadgeText,
                          newProduct.category === cat && { color: T.primary },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Tell buyers about your product..."
                  placeholderTextColor={T.sub}
                  multiline
                  value={newProduct.description}
                  onChangeText={(t) => setNewProduct({ ...newProduct, description: t })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Condition</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {['new', 'like-new', 'good'].map((cond) => (
                    <TouchableOpacity
                      key={cond}
                      style={[
                        styles.smallBadge,
                        newProduct.condition === cond && { backgroundColor: T.primary + '30' },
                      ]}
                      onPress={() => setNewProduct({ ...newProduct, condition: cond })}
                    >
                      <Text
                        style={[
                          styles.smallBadgeText,
                          newProduct.condition === cond && { color: T.primary },
                        ]}
                      >
                        {cond}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, uploading && { opacity: 0.7 }]}
              onPress={handleSaveProduct}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={T.ink} />
              ) : (
                <Text style={styles.submitBtnText}>{editingProduct ? 'Save' : 'Upload'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Secure PIN Entry Modal ─── */}
      <Modal visible={!!pinPromptOrder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Delivery Verification</Text>
                <Text style={styles.pageSubtitle}>Enter the 6-digit PIN from the buyer</Text>
              </View>
              <TouchableOpacity onPress={() => setPinPromptOrder(null)}>
                <Ionicons name="close" size={24} color={T.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <View style={[styles.successCirc, { backgroundColor: T.secondary + '20', marginBottom: 20 }]}>
                <Ionicons name="shield-checkmark" size={48} color={T.secondary} />
              </View>
              
              <Text style={[styles.ocProdName, { fontSize: 18, marginBottom: 4 }]}>
                {pinPromptOrder?.product_name}
              </Text>
              <Text style={[styles.ocProdDetail, { marginBottom: 24 }]}>
                Order #{pinPromptOrder?.id?.slice(0, 8).toUpperCase()}
              </Text>

              <TextInput
                style={[styles.modalInput, { 
                  fontSize: 32, 
                  letterSpacing: 8, 
                  textAlign: 'center', 
                  width: '80%',
                  height: 60,
                  backgroundColor: T.top,
                  borderColor: T.secondary,
                }]}
                placeholder="000000"
                placeholderTextColor={T.edge}
                keyboardType="numeric"
                maxLength={6}
                value={pinInput}
                onChangeText={setPinInput}
                autoFocus
              />
              
              <Text style={{ color: T.onVariant, fontSize: 12, marginTop: 12, textAlign: 'center' }}>
                Funds will be released to your wallet immediately upon correct verification.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: T.secondary }, submittingPin && { opacity: 0.7 }]}
              onPress={submitSelfDeliveryPin}
              disabled={submittingPin}
            >
              {submittingPin ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="lock-open-outline" size={18} color="#000" style={{ marginRight: 8 }} />
                  <Text style={[styles.submitBtnText, { color: '#000' }]}>Verify & Release Escrow</Text>
                </>
              )}
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
            <Text
              style={[
                styles.pageSubtitle,
                { textAlign: 'center', marginHorizontal: 20, marginTop: 8 },
              ]}
            >
              Share this PIN:
            </Text>
            <View style={styles.pinDisplayCard}>
              <Text style={styles.pinTextLarge}>{showShipSuccess?.delivery_pin}</Text>
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, { width: '100%', marginTop: 32 }]}
              onPress={() => setShowShipSuccess(null)}
            >
              <Text style={styles.submitBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D, Fonts } from './StitchTheme';
import { OfflineSyncService } from '../../../services/OfflineSyncService';
import * as Crypto from 'expo-crypto';

interface QuickSaleModalProps {
  visible: boolean;
  onClose: () => void;
  menuItems: any[];
  merchantId: string;
  showToast: (msg: string, type?: 'success'|'error') => void;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({ visible, onClose, menuItems, merchantId, showToast }) => {
  const [cart, setCart] = useState<any[]>([]);

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.id !== itemId));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      const offlineId = Crypto.randomUUID();
      await OfflineSyncService.addOrder({
        id: offlineId,
        merchantId,
        items: cart,
        total,
        status: 'pending_sync',
        createdAt: new Date().toISOString()
      });

      showToast('Sale Complete! Added to Kitchen Queue.', 'success');
      setCart([]);
      onClose();
    } catch (error) {
      showToast('Failed to process Quick Sale', 'error');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={D.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>⚡ Quick Sale</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* Menu Area */}
          <View style={styles.menuArea}>
            <Text style={styles.sectionTitle}>Menu ({menuItems.length})</Text>
            <FlatList
              data={menuItems}
              keyExtractor={(item) => item.id}
              numColumns={2}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.menuItem} onPress={() => addToCart(item)}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{item.price} ETB</Text>
                  <View style={styles.addIcon}>
                    <Ionicons name="add" size={16} color={D.ink} />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Cart Area */}
          <View style={styles.cartArea}>
            <Text style={styles.sectionTitle}>Current Order</Text>
            
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={40} color={D.sub} />
                <Text style={{ color: D.sub, marginTop: 8 }}>Tap items to add</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {cart.map((c) => (
                  <View key={c.id} style={styles.cartRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName}>{c.name}</Text>
                      <Text style={styles.cartItemPrice}>{c.qty} x {c.price} ETB</Text>
                    </View>
                    <Text style={styles.cartItemTotal}>{c.qty * c.price} ETB</Text>
                    <TouchableOpacity onPress={() => removeFromCart(c.id)} style={styles.removeBtn}>
                      <Ionicons name="trash-outline" size={16} color={D.red} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.checkoutFooter}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>{total} ETB</Text>
              </View>
              <TouchableOpacity 
                style={[styles.checkoutBtn, cart.length === 0 && { opacity: 0.5 }]} 
                onPress={handleCheckout}
                disabled={cart.length === 0}
              >
                <Text style={styles.checkoutText}>Charge & Send to Kitchen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: D.surface,
    backgroundColor: D.ink
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: D.surface,
    alignItems: 'center', justifyContent: 'center'
  },
  headerTitle: { color: D.text, fontFamily: Fonts.bold, fontSize: 18 },
  content: { flex: 1, flexDirection: 'row' },
  menuArea: { flex: 2, padding: 16, borderRightWidth: 1, borderRightColor: D.surface },
  cartArea: { flex: 1, padding: 16, backgroundColor: '#FAFAFA' },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, color: D.text, marginBottom: 16 },
  menuItem: {
    flex: 1, margin: 4, padding: 16,
    backgroundColor: D.ink, borderRadius: 12,
    borderWidth: 1, borderColor: D.surface,
    position: 'relative', height: 100
  },
  itemName: { fontFamily: Fonts.medium, fontSize: 14, color: D.text },
  itemPrice: { fontFamily: Fonts.bold, fontSize: 14, color: D.primary, marginTop: 4 },
  addIcon: {
    position: 'absolute', bottom: 12, right: 12,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: D.primary,
    alignItems: 'center', justifyContent: 'center'
  },
  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cartRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: D.surface
  },
  cartItemName: { fontFamily: Fonts.medium, fontSize: 14, color: D.text },
  cartItemPrice: { fontFamily: Fonts.regular, fontSize: 12, color: D.sub, marginTop: 2 },
  cartItemTotal: { fontFamily: Fonts.bold, fontSize: 14, color: D.text, marginHorizontal: 12 },
  removeBtn: { padding: 8 },
  checkoutFooter: {
    borderTopWidth: 1, borderTopColor: D.surface,
    paddingTop: 16, marginTop: 16
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  totalLabel: { fontFamily: Fonts.bold, fontSize: 18, color: D.text },
  totalAmount: { fontFamily: Fonts.black, fontSize: 20, color: D.primary },
  checkoutBtn: {
    backgroundColor: D.primary,
    padding: 16, borderRadius: 12,
    alignItems: 'center'
  },
  checkoutText: { fontFamily: Fonts.bold, fontSize: 16, color: D.ink }
});

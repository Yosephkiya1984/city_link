import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { D, Radius, Fonts, Shadow } from './StitchTheme';
import { Typography, Surface } from '../../../components';
import { fmtETB } from '../../../utils';

export function DashboardInventoryTab({
  inventory = [],
  inventorySearch = '', // Shop prop
  setInventorySearch, // Shop prop
  setShowProductModal, // Shop prop
  handleEditProduct, // Shop prop
  handleDeleteProduct, // Shop prop
  onEditProduct, // Restaurant prop
  onDeleteProduct, // Restaurant prop
  onAddProduct, // Restaurant prop
  loading = false,
  styles,
  t,
}: any) {
  const [localSearch, setLocalSearch] = React.useState('');
  
  const search = setInventorySearch ? inventorySearch : localSearch;
  const setSearch = setInventorySearch || setLocalSearch;

  const filtered = useMemo(() => {
    return inventory.filter((p: any) => 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      p.sku?.toLowerCase().includes(search.toLowerCase())
    );
  }, [inventory, search]);

  const lowStock = inventory.filter((p: any) => (p.stock || p.quantity) < 10).length;

  return (
    <View style={{ flex: 1 }}>
      <View style={localStyles.searchBar}>
        <Ionicons name="search" size={20} color={D.sub} />
        <TextInput
          placeholder="Search items..."
          placeholderTextColor={D.sub}
          style={localStyles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity 
          style={localStyles.addBtn} 
          onPress={setShowProductModal ? () => setShowProductModal(true) : onAddProduct}
        >
          <Ionicons name="add" size={24} color={D.ink} />
        </TouchableOpacity>
      </View>

      <View style={localStyles.quickStats}>
        <Surface variant="lift" style={localStyles.statBox}>
          <Typography variant="h3">{inventory.length}</Typography>
          <Typography variant="hint" color="sub">TOTAL ITEMS</Typography>
        </Surface>
        <Surface variant="lift" style={localStyles.statBox}>
          <Typography variant="h3" color="red">{lowStock}</Typography>
          <Typography variant="hint" color="sub">LOW STOCK</Typography>
        </Surface>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <AnimatePresence>
          {filtered.map((item: any, i: number) => (
            <MotiView
              key={item.id}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 50 }}
            >
              <Surface variant="lift" style={localStyles.itemCard}>
                <Image 
                  source={{ uri: item.image_url || item.image || 'https://via.placeholder.com/150' }} 
                  style={localStyles.itemImage} 
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Typography variant="title" numberOfLines={1}>{item.name}</Typography>
                  <Typography variant="hint" color="sub">{item.category} • {item.sku || 'No SKU'}</Typography>
                  <View style={localStyles.stockRow}>
                    <View style={[localStyles.stockIndicator, { backgroundColor: (item.stock || item.quantity) < 10 ? D.red : D.primary }]} />
                    <Typography variant="hint" style={{ color: (item.stock || item.quantity) < 10 ? D.red : D.sub }}>
                      {item.stock || item.quantity} in stock
                    </Typography>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Typography variant="h3">{fmtETB(item.price)}</Typography>
                  <View style={localStyles.actions}>
                    <TouchableOpacity onPress={() => (handleEditProduct ? handleEditProduct(item) : onEditProduct(item))}>
                      <Ionicons name="create-outline" size={20} color={D.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => (handleDeleteProduct ? handleDeleteProduct(item.id) : onDeleteProduct(item.id))}>
                      <Ionicons name="trash-outline" size={20} color={D.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Surface>
            </MotiView>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <View style={localStyles.empty}>
            <Ionicons name="cube-outline" size={64} color={D.lift} />
            <Typography variant="title" color="sub">No items found</Typography>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: D.surface, paddingHorizontal: 16, borderRadius: Radius.lg, marginBottom: 20, borderWidth: 1, borderColor: D.edge },
  searchInput: { flex: 1, height: 50, color: D.white, fontFamily: Fonts.medium, marginLeft: 10 },
  addBtn: { backgroundColor: D.primary, width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  quickStats: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, padding: 16, borderRadius: Radius.lg, alignItems: 'center' },
  itemCard: { flexDirection: 'row', padding: 12, borderRadius: Radius.lg, marginBottom: 12, alignItems: 'center' },
  itemImage: { width: 60, height: 60, borderRadius: Radius.md, backgroundColor: D.surface },
  stockRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stockIndicator: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  empty: { padding: 60, alignItems: 'center' },
});

import React, { useMemo, memo } from 'react';
import { useRenderCount } from '../../../utils/debug/performanceMonitor';
import { View, Text, TouchableOpacity, TextInput, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { FlashList } from '@shopify/flash-list';
import { Typography, GlassCard, GlassView } from '../../../components';
import { fmtETB } from '../../../utils';
import { useTheme } from '../../../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Product } from '../../../types/domain_types';

export interface DashboardInventoryTabProps {
  inventory: Product[];
  inventorySearch: string;
  setInventorySearch?: (val: string) => void;
  setShowProductModal?: (val: boolean) => void;
  handleEditProduct?: (product: Product) => void;
  handleDeleteProduct?: (id: string) => void;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (id: string) => void;
  onAddProduct?: () => void;
  loading?: boolean;
  t: (key: string) => string;
}

export interface InventoryItemProps {
  item: Product;
  index: number;
  C: any;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

// Memoized Item Component for peak performance
const InventoryItem = React.memo(({ item, index, C, onEdit, onDelete }: InventoryItemProps) => {
  const stock = item.stock ?? (item as any).quantity ?? 0;
  const isLow = stock < 10;
  const itemImage = item.image_url || item.image;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay: Math.min(index * 30, 300) }}
    >
      <GlassView style={localStyles.itemCard}>
        <View style={localStyles.imageSection}>
          {itemImage ? (
            <Image source={{ uri: itemImage }} style={localStyles.itemImage} />
          ) : (
            <View style={[localStyles.itemImage, { backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="fast-food-outline" size={24} color={C.sub} />
            </View>
          )}
          <View style={localStyles.priceTag}>
            <Typography variant="title" style={{ fontSize: 12, fontWeight: '800', color: '#00210F' }}>
              {fmtETB(item.price)}
            </Typography>
          </View>
        </View>

        <View style={localStyles.contentSection}>
          <View>
            <Typography variant="h3" numberOfLines={1}>{item.name}</Typography>
            <Typography variant="hint" color="sub" style={{ fontSize: 11, marginTop: 2 }}>
              {item.category || 'Uncategorized'} • {(item as any).sku || 'N/A'}
            </Typography>
          </View>

          <View style={localStyles.footer}>
            <View style={[localStyles.stockBadge, { backgroundColor: isLow ? C.red + '15' : C.primary + '15' }]}>
              <View style={[localStyles.statusDot, { backgroundColor: isLow ? C.red : C.primary }]} />
              <Typography variant="hint" style={{ color: isLow ? C.red : C.primary, fontSize: 10, fontWeight: '700' }}>
                {stock} UNITS
              </Typography>
            </View>

            <View style={localStyles.actionStrip}>
              <TouchableOpacity style={localStyles.miniAction} onPress={() => onEdit(item)}>
                <Ionicons name="create-outline" size={16} color={C.white} />
              </TouchableOpacity>
              <TouchableOpacity style={localStyles.miniAction} onPress={() => onDelete(item.id)}>
                <Ionicons name="trash-outline" size={16} color={C.red} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </GlassView>
    </MotiView>
  );
});

export const DashboardInventoryTab = memo(function DashboardInventoryTab({
  inventory = [],
  inventorySearch = '',
  setInventorySearch,
  setShowProductModal,
  handleEditProduct,
  handleDeleteProduct,
  onEditProduct,
  onDeleteProduct,
  onAddProduct,
  loading = false,
  t,
}: DashboardInventoryTabProps) {
  useRenderCount('DashboardInventoryTab');
  const C = useTheme();
  const [localSearch, setLocalSearch] = React.useState('');
  
  const search = setInventorySearch ? inventorySearch : localSearch;
  const setSearch = setInventorySearch || setLocalSearch;

  const filtered = useMemo(() => {
    return inventory.filter((p) => 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      // @ts-ignore sku not in base Product but might be in record
      p.sku?.toLowerCase().includes(search.toLowerCase())
    );
  }, [inventory, search]);

  const lowStock = useMemo(() => 
    inventory.filter((p) => (p.stock || 0) < 10).length,
    [inventory]
  );

  const onEdit = handleEditProduct || onEditProduct;
  const onDelete = handleDeleteProduct || onDeleteProduct;

  if (loading && inventory.length === 0) {
    return (
      <View style={{ flex: 1, gap: 12 }}>
        {[1, 2, 3, 4].map(i => (
          <GlassCard key={i} style={{ height: 100, opacity: 0.5 }}><View /></GlassCard>
        ))}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={localStyles.searchContainer}>
        <View style={localStyles.searchBar}>
          <Ionicons name="search-outline" size={18} color={C.sub} />
          <TextInput
            placeholder="Search items..."
            placeholderTextColor={C.sub}
            style={localStyles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity 
          style={localStyles.addBtn} 
          onPress={setShowProductModal ? () => setShowProductModal(true) : onAddProduct}
        >
          <LinearGradient
            colors={[C.primary, C.primary + 'CC']}
            style={localStyles.addBtnGradient}
          >
            <Ionicons name="add" size={24} color="#00210F" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={localStyles.quickStats}>
        <GlassView style={localStyles.statBox}>
          <Typography variant="h2">{inventory.length}</Typography>
          <Typography variant="hint" style={{ color: C.sub, fontSize: 9, letterSpacing: 1, fontWeight: '700' }}>TOTAL MENU</Typography>
        </GlassView>
        <GlassView style={[localStyles.statBox, lowStock > 0 && { borderColor: C.red + '40' }]}>
          <Typography variant="h2" style={{ color: lowStock > 0 ? C.red : C.white }}>{lowStock}</Typography>
          <Typography variant="hint" style={{ color: lowStock > 0 ? C.red : C.sub, fontSize: 9, letterSpacing: 1, fontWeight: '700' }}>LOW STOCK</Typography>
        </GlassView>
      </View>

      <FlashList
        data={filtered}
        renderItem={({ item, index }) => (
          <InventoryItem 
            item={item} 
            index={index} 
            C={C} 
            onEdit={onEdit || (() => {})} 
            onDelete={onDelete || (() => {})} 
          />
        )}
        keyExtractor={(item) => item.id}
        estimatedItemSize={136}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={!loading ? (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={localStyles.empty}>
            <View style={localStyles.emptyIconBox}>
              <Ionicons name="file-tray-outline" size={48} color={C.border} />
            </View>
            <Typography variant="title" color="sub">No matches found</Typography>
            <Typography variant="hint" color="sub" style={{ marginTop: 4 }}>Try a different search term</Typography>
          </MotiView>
        ) : null}
      />
    </View>
  );
});

const localStyles = StyleSheet.create({
  searchContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  searchInput: { flex: 1, height: 52, color: '#FFFFFF', fontSize: 15, marginLeft: 10 },
  addBtn: { width: 52, height: 52, borderRadius: 16, overflow: 'hidden' },
  addBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  quickStats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, padding: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  
  itemCard: { flexDirection: 'row', borderRadius: 28, marginBottom: 16, overflow: 'hidden', height: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  imageSection: { width: 120, height: 120, position: 'relative' },
  itemImage: { width: '100%', height: '100%' },
  priceTag: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#4DE693', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 8 },
  
  contentSection: { flex: 1, padding: 16, justifyContent: 'space-between' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  
  actionStrip: { flexDirection: 'row', gap: 10 },
  miniAction: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  empty: { padding: 80, alignItems: 'center', justifyContent: 'center' },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});

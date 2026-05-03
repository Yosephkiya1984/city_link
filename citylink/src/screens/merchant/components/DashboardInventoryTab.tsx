import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D, Radius, Fonts } from './StitchTheme';
import { Product } from '../../../types/domain_types';
import { fmtETB } from '../../../utils';
import { t } from '../../../utils/i18n';

const { width } = Dimensions.get('window');

export interface InventoryTabProps {
  inventory: Product[];
  inventorySearch: string;
  setInventorySearch: (s: string) => void;
  setShowProductModal: (b: boolean) => void;
  handleEditProduct: (p: Product) => void;
  handleDeleteProduct: (id: string) => void;
  loading: boolean;
  styles: any;
  t: any;
}

export function DashboardInventoryTab({
  inventory,
  inventorySearch,
  setInventorySearch,
  setShowProductModal,
  handleEditProduct,
  handleDeleteProduct,
  loading,
  styles,
  t,
}: InventoryTabProps) {
  const filteredInventory = inventory.filter(
    (p: Product) =>
      !inventorySearch ||
      (p.name || p.title || '').toLowerCase().includes(inventorySearch.toLowerCase())
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.pageTitle}>{t('inventory_tab')}</Text>
          <Text style={styles.pageSubtitle}>{t('manage_product_catalogue')}</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButtonSolid}
          onPress={() => setShowProductModal(true)}
        >
          <Ionicons name="add" size={16} color={D.ink} />
          <Text style={styles.btnTextThick}>{t('add')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRowMobile}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={D.onVariant} />
          <TextInput
            placeholder={t('search_products_placeholder')}
            placeholderTextColor={D.onVariant}
            style={[styles.searchInput, { fontFamily: Fonts.regular }]}
            value={inventorySearch}
            onChangeText={setInventorySearch}
          />
        </View>
        {inventorySearch.length > 0 && (
          <TouchableOpacity
            style={styles.iconButtonOutlined}
            onPress={() => setInventorySearch('')}
          >
            <Ionicons name="close" size={20} color={D.onVariant} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ gap: 12 }}>
        {filteredInventory.length === 0 && !loading && (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ionicons name="cube-outline" size={48} color={D.edge} />
            <Text style={{ color: D.onVariant, marginTop: 12, fontFamily: Fonts.regular }}>
              {inventorySearch ? t('no_matching_products') : t('no_products_in_stock')}
            </Text>
          </View>
        )}
        {filteredInventory.map((p: Product) => {
          const isLow = (p.stock || 0) < 15;
          const barColor = p.stock === 0 ? D.tertiary : isLow ? D.gold : D.primary;
          const maxStock = p.max_stock || 100;
          const imgUri = p.image_url || p.image || (p.images_json && p.images_json[0]);
          return (
            <View key={p.id} style={styles.productMobileCard}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.productMobileImg, { overflow: 'hidden' }]}>
                  {imgUri ? (
                    <Image source={{ uri: imgUri }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="cube" size={24} color={D.primary} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={[styles.tsName, { fontFamily: Fonts.bold }]} numberOfLines={1}>
                    {p.name || p.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 4,
                    }}
                  >
                    <Text style={[styles.tableSku, { fontFamily: Fonts.mono }]}>
                      ID: {p.id.slice(0, 8)}
                    </Text>
                    <Text style={[styles.tsPrice, { fontFamily: Fonts.black }]}>
                      {fmtETB(p.price)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                <View style={styles.catBadge}>
                  <Text style={[styles.catBadgeText, { fontFamily: Fonts.black }]}>
                    {p.category ? p.category.toUpperCase() : t('general_up')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtnSmall}
                  onPress={() => handleEditProduct(p)}
                >
                  <Ionicons name="create-outline" size={14} color={D.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteBtnSmall, { marginLeft: 8 }]}
                  onPress={() => handleDeleteProduct(p.id)}
                >
                  <Ionicons name="trash-outline" size={14} color={D.tertiary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <Text style={[styles.stockText, { fontFamily: Fonts.bold }]}>
                  <Text style={{ color: p.stock > 0 ? D.text : D.tertiary }}>{p.stock || 0}</Text>/
                  {maxStock}
                </Text>
                <View style={styles.stockBarBgMob}>
                  <View
                    style={[
                      styles.stockBarFill,
                      {
                        width: `${((p.stock || 0) / maxStock) * 100}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

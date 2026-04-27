import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ImageBackground,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { MotiView } from 'moti';
import { useFood } from '../../hooks/useFood';
import { foodStyles as styles } from './FoodScreen.styles';
import { DarkColors as T, Fonts, Radius } from '../../theme';
import { fmtETB } from '../../utils';
import { CButton } from '../../components/ui/CButton';
import { SuccessOverlay } from '../../components/layout/SuccessOverlay';
import { ProcessingOverlay } from '../../components/layout/ProcessingOverlay';

const TONIGHT_DATA = [
  {
    id: 't1',
    name: 'Zoma Lounge',
    vibe: 'Jazz & Cognac',
    status: 'LIVE',
    cover: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 't2',
    name: 'Black Rose',
    vibe: 'Techno Underground',
    status: 'FULL',
    cover: 'https://images.unsplash.com/photo-1574096079513-d8259312b785?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 't3',
    name: 'Brickhouse',
    vibe: 'Classic Rock',
    status: 'TABLES',
    cover: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800',
  },
];

export function FoodScreen() {
  const {
    activeTab,
    setActiveTab,
    restaurants,
    loading,
    selectedRest,
    setSelectedRest,
    menuItems,
    menuLoading,
    cart,
    mode,
    setMode,
    cartTotal,
    cartCount,
    addToCart,
    removeFromCart,
    openRestaurant,
    showToast,
  } = useFood();

  const [orderProcessing, setOrderProcessing] = React.useState(false);
  const [orderSuccess, setOrderSuccess] = React.useState(false);

  const handleOrder = async () => {
    setOrderProcessing(true);
    await new Promise(r => setTimeout(r, 2000)); // Simulate
    setOrderProcessing(false);
    setOrderSuccess(true);
  };

  const renderRestaurant = ({ item: r }: any) => (
    <TouchableOpacity style={styles.restCard} onPress={() => openRestaurant(r)}>
      <View style={styles.cardCover}>
        <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800' }} style={{ flex: 1 }}>
          <View style={styles.cardOverlay} />
          <View style={styles.cardBadge}>
            <Text style={styles.badgeText}>FAYDA VERIFIED</Text>
          </View>
        </ImageBackground>
      </View>
      <View style={styles.cardBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.restName}>{r.merchant_name}</Text>
          <Text style={styles.restRating}>⭐ 4.8</Text>
        </View>
        <Text style={styles.restMeta}>Traditional • Bole • 25-35 min</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerMeta}>
          <View>
            <Text style={styles.headerTitle}>ADDIS</Text>
            <Text style={[styles.headerTitle, { color: T.primary }]}>GOURMET</Text>
          </View>
          <View style={[styles.districtBadge, { backgroundColor: T.primary + '22' }]}>
            <Ionicons name="location" size={14} color={T.primary} />
            <Text style={[styles.districtText, { color: T.primary }]}>BOLE DISTRICT</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabBar}>
        {(['delivery', 'tonight', 'grocery', 'cafe'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'tonight' ? '🌙 TONIGHT' : tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'tonight' ? (
          <ScrollView contentContainerStyle={styles.listContent}>
            {TONIGHT_DATA.map((item) => (
              <TouchableOpacity key={item.id} style={styles.nightCard} onPress={() => { setSelectedRest(item); setMode('RESERVE'); }}>
                <ImageBackground source={{ uri: item.cover }} style={[styles.nightGradient, { borderRadius: Radius.card, overflow: 'hidden' }]}>
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' }} />
                  <View style={[styles.liveBadge, { backgroundColor: T.primary }]}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF', marginRight: 6 }} />
                    <Text style={styles.liveText}>{item.status}</Text>
                  </View>
                  <View style={{ padding: 24 }}>
                    <Text style={styles.nightName}>{item.name}</Text>
                    <Text style={styles.nightVibe}>{item.vibe}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <FlashList
            data={restaurants}
            renderItem={renderRestaurant}
            estimatedItemSize={280}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={loading ? <ActivityIndicator color={T.primary} style={{ marginTop: 40 }} /> : null}
          />
        )}
      </View>

      <Modal visible={!!selectedRest} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }} onPress={() => setSelectedRest(null)} />
        {selectedRest && (
          <MotiView 
            from={{ translateY: 300 }}
            animate={{ translateY: 0 }}
            style={styles.menuContent}
          >
            <View style={styles.menuHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{selectedRest.merchant_name}</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                  <TouchableOpacity onPress={() => setMode('DELIVERY')} style={{ opacity: mode === 'DELIVERY' ? 1 : 0.4 }}>
                    <Text style={{ color: T.primary, fontFamily: Fonts.bold, fontSize: 13 }}>🛵 DELIVERY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMode('RESERVE')} style={{ opacity: mode === 'RESERVE' ? 1 : 0.4 }}>
                    <Text style={{ color: T.primary, fontFamily: Fonts.bold, fontSize: 13 }}>🍷 RESERVE</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedRest(null)} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {mode === 'DELIVERY' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {menuLoading ? (
                  <ActivityIndicator color={T.primary} style={{ marginTop: 40 }} />
                ) : (
                  menuItems.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                        <Text style={styles.itemPrice}>{fmtETB(item.price)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        {cart[item.id] > 0 && (
                          <>
                            <TouchableOpacity onPress={() => removeFromCart(item.id)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="remove" size={20} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={{ color: '#FFF', fontFamily: Fonts.bold, fontSize: 16, minWidth: 24, textAlign: 'center' }}>{cart[item.id]}</Text>
                          </>
                        )}
                        <TouchableOpacity onPress={() => addToCart(item.id)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="add" size={20} color={T.ink} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            ) : (
              <View style={styles.reserveForm}>
                <Text style={styles.formLabel}>GUEST COUNT</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                  {[2, 4, 6, 8].map(n => (
                    <TouchableOpacity key={n} style={{ flex: 1, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                      <Text style={{ color: '#FFF', fontFamily: Fonts.bold }}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <CButton title="CONFIRM RESERVATION" onPress={handleOrder} />
              </View>
            )}

            {mode === 'DELIVERY' && cartCount > 0 && (
              <View style={{ padding: 24 }}>
                <CButton 
                  title={`🛒 ORDER (${cartCount}) • ${fmtETB(cartTotal)}`} 
                  onPress={handleOrder} 
                />
              </View>
            )}
          </MotiView>
        )}
      </Modal>

      <ProcessingOverlay visible={orderProcessing} message="Placing your gourmet order..." />
      <SuccessOverlay 
        visible={orderSuccess} 
        title="Order Placed!" 
        subtitle="🛵 Your gourmet meal is being prepared and will be with you shortly." 
        onClose={() => {
          setOrderSuccess(false);
          setSelectedRest(null);
        }} 
      />
    </View>
  );
}

export default FoodScreen;

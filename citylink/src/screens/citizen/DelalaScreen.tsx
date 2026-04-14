import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

import { useAppStore } from '../../store/AppStore';
import { hasSupabase } from '../../services/supabase';
import { fetchChatThreads } from '../../services/chat.service';

// Modular Components
import { COLORS, CATEGORIES } from '../../components/delala/constants';
import DelalaTopBar from '../../components/delala/DelalaTopBar';
import { DelalaSearchBar, DelalaCategoryFilter } from '../../components/delala/DelalaControls';
import PublicPropertyCard from '../../components/delala/PublicPropertyCard';
import InventoryPropertyCard from '../../components/delala/InventoryPropertyCard';
import MessageThread from '../../components/delala/MessageThread';
import { ChatModal, FAB } from '../../components/delala/DelalaOverlays';

// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Mock Data (Until Migrated to DB)
// ——————————————————————————————————————————————————————————————————————————————————————————————————
const PUBLIC_LISTINGS = [
  {
    id: '1',
    title: 'Modernist Villa in Bole',
    category: 'House Sale',
    price: 45000000,
    area_sqm: 320,
    location: 'Bole, Addis Ababa',
    description: 'Luxury 4-bedroom villa with private garden and state-of-the-art security systems.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCob1un65FVX-dDUBomhPMesnN6__ah2Jgbhvo9GSEqBAwgIeoBjZtbkFxBNaBXM2wISDYT_K1S1T5gMloCI2ryyc7x0wkb5idKxTEVMC1_m-jmYuU1qLp2t0wT48fNXZ-asGXt3RhgzUNcdGbEJ3IoXr5HDnm3upIxUT-2YmlVGLRxRo0HYbpv0a5G2dCqGM2gR87BnWnjgWP4UCdaucUoqYUhqStm0gzc-JnqfV1AThsRNNIUSXB80QdTTqaxUqnLXWCOday2ISf3',
    broker: { name: 'Abebe Molla', verified: true },
    features: ['Video', 'Verified'],
  },
  {
    id: '2',
    title: 'Premium Office Suite',
    category: 'Office Space',
    price: 120000,
    area_sqm: 200,
    location: 'Kirkos, Financial District',
    description: 'Modern office space with high visibility and easy accessibility.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAL3ig35shxJydxUp8RwkyXY_eICZ1qyGXTJkNig7kgj4tyMqREcOOEqak9pT3rxtZk_v2cP8C8UCeLvrZABkkP7QvWJbKuAkwCUL0VJ7RGLAtDlgdjuLTaANY-oM5yqAw6bwtuofduRaytReOSZXs9nj347iap_L88sX16PJkte9-thPwUlCRfJ78IHDO9RubJdeTJBAJLFO6EDpcipmZSXEtTRXuJPp4rA0dGN6YqJuMKBbyAsUDUJW805ThoSsGlvJcQbU100xTV',
    broker: { name: 'Samrawit G.', verified: true },
    features: ['Verified'],
  },
];

const PRIVATE_INVENTORY = [
  {
    id: 'inv1',
    title: 'The Zenith Tower Penthouse',
    category: 'House Sale',
    price: 85000000,
    location: 'Bole, Addis Ababa',
    status: 'NEGOTIATING',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGR2qkmwoIfVTs5rO_YiDJe56KP769XiS-9QW1V1JKDqjep6-1jLTadaYvyy-NBjrooaO5qOFegiqF6GwilXIjbDgi4PbMnUT7a9la9TQGoRE6QKqWx9yu-AlP1fT1jB7Daerj3WC1gxXeuRR3rKHfAJaoh9Pb9EFE4Wp4idNBHjMDNpaiZoKCy0Nt4FyX329TtQ9t-nioVswmLYdzXQwSF2eRVTRN2e_m6O24Ix-f4hNCprRWgEa-YYujWjQWMT0f55GUYpJjpyuB',
    negotiations: [{ merchant: 'Abebe Molla', offer: 82000000 }],
  },
];

// ——————————————————————————————————————————————————————————————————————————————————————————————————
// MAIN SCREEN
// ——————————————————————————————————————————————————————————————————————————————————————————————————
export default function DelalaScreen() {
  const navigation: any = useNavigation();
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);

  const [activeScreen, setActiveScreen] = useState('Listings');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load live threads when on messages screen
  const loadThreads = useCallback(async () => {
    if (!currentUser?.id || !hasSupabase()) return;
    setLoading(true);
    const { data } = await fetchChatThreads(currentUser.id);
    if (data) setThreads(data);
    setLoading(false);
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeScreen === 'Messages') loadThreads();
  }, [activeScreen, loadThreads]);

  // Unified Filtered Data
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (activeScreen === 'Listings') {
      return PUBLIC_LISTINGS.filter(p => 
        (selectedCategory === 'All' || p.category === selectedCategory) &&
        (p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q))
      );
    }
    if (activeScreen === 'Inventory') {
      return PRIVATE_INVENTORY.filter(p => 
        (selectedCategory === 'All' || p.category === selectedCategory) &&
        (p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q))
      );
    }
    return threads.filter(t => {
      const isUserA = t.user_a_id === currentUser?.id;
      const other = isUserA ? t.user_b : t.user_a;
      const name = (other?.business_name || other?.full_name || 'Agent').toLowerCase();
      return name.includes(q);
    });
  }, [activeScreen, selectedCategory, searchQuery, threads, currentUser?.id]);

  // Handlers
  const handleNegotiate = useCallback((property: any) => {
    if (!currentUser?.id) {
       showToast('Please login to negotiate', 'error');
       return;
    }
    const agentId = property.poster_id || property.agent_id || 'mock-id';
    const participants = [currentUser.id, agentId].sort();
    const threadId = participants.join('_');

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Chat', {
      threadId,
      recipientId: agentId,
      recipientName: property.broker?.name || 'Agent',
      propertyTitle: property.title,
    });
  }, [currentUser?.id, navigation, showToast]);

  const handleThreadPress = useCallback((thread: any) => {
    const isUserA = thread.user_a_id === currentUser?.id;
    const other = isUserA ? thread.user_b : thread.user_a;
    navigation.navigate('Chat', {
      threadId: thread.thread_id,
      recipientName: other?.business_name || other?.full_name || 'Agent',
      recipientId: other?.id,
    });
  }, [currentUser?.id, navigation]);

  // Rendering
  const renderItem = useCallback(({ item }: { item: any }) => {
    if (activeScreen === 'Listings') {
      return <PublicPropertyCard property={item} onPress={() => handleNegotiate(item)} />;
    }
    if (activeScreen === 'Inventory') {
      return <InventoryPropertyCard property={item} onPress={() => {}} onNegotiate={handleNegotiate} />;
    }
    return <MessageThread thread={item} onPress={() => handleThreadPress(item)} currentUser={currentUser} />;
  }, [activeScreen, handleNegotiate, handleThreadPress, currentUser]);

  const ListHeader = useMemo(() => (
    <View style={styles.listHeader}>
      <DelalaSearchBar value={searchQuery} onChangeText={setSearchQuery} />
      {activeScreen !== 'Messages' && (
        <DelalaCategoryFilter 
          categories={CATEGORIES} 
          selected={selectedCategory} 
          onSelect={setSelectedCategory} 
        />
      )}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{activeScreen}</Text>
        {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
      </View>
    </View>
  ), [searchQuery, activeScreen, selectedCategory, loading]);

  const EmptyState = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={COLORS.outline} />
      <Text style={styles.emptyText}>No results found in {activeScreen}</Text>
    </View>
  ), [activeScreen]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      
      <DelalaTopBar 
        activeScreen={activeScreen} 
        onScreenChange={setActiveScreen} 
        userImage="https://lh3.googleusercontent.com/aida-public/AB6AXuCHwmA-YZrrtVyhsk4Sr6u9lf6Bw1m9DgQVeF-DP5u8cb6eFFQuO00EF6s24Cf2c7x_AtxYSPsYUgSthpfi6v8JgXryKaiTUqYV6kgiW8ErWBEuyDdcIxbutNP9Y2vOgOTEOEYI9gywt2ofFAxE1eYEYcN5SMsHEtkkU-OP9DLXBZopRhZDNmkUIqxAPwlCh_mXstEN5oVynZpzJdrdhUjjZsLAx0OBjkYFbnXAh_PQhQqM8Y8HRL7FC8kHGArKfe9d7l8Hnyym2JVU" 
      />

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || item.thread_id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={5}
      />

      <FAB activeScreen={activeScreen} onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listHeader: { paddingTop: 20 },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    marginBottom: 16,
    marginTop: 8
  },
  sectionTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: COLORS['on-surface'],
    letterSpacing: -0.5
  },
  listContent: { 
    paddingTop: 100, 
    paddingBottom: 100,
    paddingHorizontal: 16
  },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 100 
  },
  emptyText: { 
    color: COLORS.outline, 
    marginTop: 12, 
    fontSize: 14, 
    fontWeight: '600' 
  },
});

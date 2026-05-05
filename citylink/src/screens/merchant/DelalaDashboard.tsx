import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
  Dimensions,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { useDelalaData } from './hooks/useDelalaData';
import { useDelalaActions } from './hooks/useDelalaActions';
import { useAuthStore } from '../../store/AuthStore';
import { D, Radius, Fonts, Spacing, Shadow } from './components/StitchTheme';
import { fmtETB } from '../../utils';
import { styles } from './components/DelalaDashboardStyles';
import { useT } from '../../utils/i18n';
import { Typography, Surface, SectionTitle } from '../../components';
import { ListingManagementModal } from '../../components/merchant/ListingManagementModal';

export default function DelalaDashboard() {
  const t = useT();
  const currentUser = useAuthStore((s) => s.currentUser);
  const signOut = useAuthStore((s) => s.signOut);
  const [activeTab, setActiveTab] = useState<'listings' | 'leads' | 'deals' | 'finance'>('listings');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);

  const data = useDelalaData();
  const actions = useDelalaActions(data);

  const { listings, enquiries, refreshing, loadData } = data;
  const { handleContactLead, onCreateListing } = actions;

  const activeLeads = enquiries.length;
  const totalListingsValue = useMemo(() => listings.reduce((acc: number, l: any) => acc + (l.price || 0), 0), [listings]);

  const renderListings = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={D.gold} />}
      contentContainerStyle={{ padding: Spacing.xl }}
    >
      <View style={localStyles.heroRow}>
        <Surface variant="lift" style={[localStyles.heroCard, { backgroundColor: D.gold + '10' }]}>
          <Typography variant="hint" color="sub">PORTFOLIO VALUE</Typography>
          <Typography variant="h1" style={{ color: D.gold }}>{fmtETB(totalListingsValue)}</Typography>
        </Surface>
        <Surface variant="lift" style={[localStyles.heroCard, { backgroundColor: D.primary + '10' }]}>
          <Typography variant="hint" color="sub">ACTIVE LEADS</Typography>
          <Typography variant="h1" color="primary">{activeLeads}</Typography>
        </Surface>
      </View>

      <SectionTitle title="Manage Portfolio" rightLabel="Filters" />

      {listings.length === 0 ? (
        <View style={localStyles.emptyState}>
          <Ionicons name="home-outline" size={64} color={D.lift} />
          <Typography variant="title" color="sub">No listings yet.</Typography>
          <TouchableOpacity style={localStyles.emptyBtn} onPress={() => setShowAddModal(true)}>
            <Typography variant="h3" style={{ color: D.ink }}>Create First Listing</Typography>
          </TouchableOpacity>
        </View>
      ) : (
        listings.map((l: any, i: number) => (
          <MotiView
            key={l.id}
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 100 }}
          >
            <Surface variant="lift" style={localStyles.listingCard}>
              <View style={localStyles.listingImageWrap}>
                <Image source={{ uri: l.image_url || 'https://via.placeholder.com/400' }} style={localStyles.listingImage} />
                <View style={localStyles.listingTypeBadge}>
                  <Text style={localStyles.typeText}>{l.type?.toUpperCase() || 'SALE'}</Text>
                </View>
              </View>
              <View style={localStyles.listingContent}>
                <View style={{ flex: 1 }}>
                  <Typography variant="h3">{l.title}</Typography>
                  <Typography variant="title" color="primary" style={{ marginTop: 4 }}>{fmtETB(l.price)}</Typography>
                  <Typography variant="hint" color="sub" style={{ marginTop: 4 }}>{l.location || 'Addis Ababa'}</Typography>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={localStyles.actionBtn} onPress={() => { setEditingListing(l); setShowAddModal(true); }}>
                    <Ionicons name="create-outline" size={18} color={D.sub} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[localStyles.actionBtn, { backgroundColor: D.primary }]}>
                    <Ionicons name="share-social-outline" size={18} color={D.ink} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={localStyles.listingStats}>
                <View style={localStyles.stat}>
                  <Ionicons name="eye-outline" size={14} color={D.sub} />
                  <Typography variant="hint" color="sub" style={{ marginLeft: 4 }}>{l.views || 0} Views</Typography>
                </View>
                <View style={localStyles.stat}>
                  <Ionicons name="people-outline" size={14} color={D.sub} />
                  <Typography variant="hint" color="sub" style={{ marginLeft: 4 }}>{activeLeads} Leads</Typography>
                </View>
              </View>
            </Surface>
          </MotiView>
        ))
      )}
    </ScrollView>
  );

  const renderLeads = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.xl }}>
      <SectionTitle title="Client Inquiries" />
      {enquiries.map((e: any, i: number) => (
        <Surface key={e.id} variant="lift" style={localStyles.leadCard}>
          <View style={localStyles.leadAvatar}>
            <Typography variant="h3" style={{ color: D.gold }}>{e.user_name?.[0] || 'C'}</Typography>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Typography variant="title">{e.user_name || 'Client'}</Typography>
            <Typography variant="hint" color="primary" numberOfLines={1}>{e.listing_title}</Typography>
            <Typography variant="body" color="sub" style={{ marginTop: 4 }} numberOfLines={2}>"{e.message}"</Typography>
          </View>
          <TouchableOpacity style={localStyles.contactBtn} onPress={() => handleContactLead(e)}>
            <Ionicons name="chatbubble-ellipses" size={20} color={D.gold} />
          </TouchableOpacity>
        </Surface>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.ink }}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Typography variant="h2">Agency Hub</Typography>
              <View style={localStyles.licenseRow}>
                <Ionicons name="ribbon" size={12} color={D.primary} />
                <Typography variant="hint" color="primary" style={{ marginLeft: 4 }}>LICENSED BROKER</Typography>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TouchableOpacity style={localStyles.logoutBtn} onPress={signOut}>
                <Ionicons name="log-out-outline" size={18} color={D.error} />
                <Typography variant="hint" style={{ color: D.error, marginLeft: 4 }}>Logout</Typography>
              </TouchableOpacity>
              <TouchableOpacity style={localStyles.profileBtn}>
                <Ionicons name="person-circle-outline" size={28} color={D.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.tabContainer}>
          {(['listings', 'leads', 'deals', 'finance'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <AnimatePresence exitBeforeEnter>
          <MotiView 
            key={activeTab} 
            from={{ opacity: 0, translateX: 10 }} 
            animate={{ opacity: 1, translateX: 0 }} 
            style={{ flex: 1 }}
          >
            {activeTab === 'listings' && renderListings()}
            {activeTab === 'leads' && renderLeads()}
            {activeTab === 'finance' && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons name="cash-outline" size={64} color={D.lift} />
                <Typography variant="title" color="sub">Commission tracking coming soon...</Typography>
              </View>
            )}
          </MotiView>
        </AnimatePresence>

        {activeTab === 'listings' && (
          <TouchableOpacity style={localStyles.fab} onPress={() => { setEditingListing(null); setShowAddModal(true); }}>
            <LinearGradient colors={[D.primary, D.blue]} style={localStyles.fabGradient}>
              <Ionicons name="add" size={32} color={D.ink} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <ListingManagementModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={onCreateListing}
          editingListing={editingListing}
        />
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  licenseRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.edge },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: D.error + '10', paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.m, borderWidth: 1, borderColor: D.error + '30' },
  heroRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  heroCard: { flex: 1, padding: 20, borderRadius: Radius.lg },
  listingCard: { borderRadius: Radius.xl, marginBottom: 20, overflow: 'hidden' },
  listingImageWrap: { height: 180, width: '100%' },
  listingImage: { width: '100%', height: '100%' },
  listingTypeBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: D.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 10, fontFamily: Fonts.black, color: D.ink },
  listingContent: { padding: 16, flexDirection: 'row', alignItems: 'flex-start' },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.edge },
  listingStats: { flexDirection: 'row', padding: 12, backgroundColor: D.surface, borderTopWidth: 1, borderTopColor: D.edge, gap: 20 },
  stat: { flexDirection: 'row', alignItems: 'center' },
  emptyState: { padding: 40, alignItems: 'center', marginTop: 60 },
  emptyBtn: { backgroundColor: D.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: Radius.xl, marginTop: 20 },
  leadCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.lg, marginBottom: 12 },
  leadAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: D.gold + '20', alignItems: 'center', justifyContent: 'center' },
  contactBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.edge },
  fab: { position: 'absolute', bottom: 30, right: 30, ...Shadow.primary },
  fabGradient: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});

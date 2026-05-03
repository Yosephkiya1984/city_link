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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';

import { useDelalaData } from './hooks/useDelalaData';
import { useDelalaActions } from './hooks/useDelalaActions';
import { useAuthStore } from '../../store/AuthStore';
import { D, Radius, Fonts } from './components/StitchTheme';
import { fmtETB } from '../../utils';
import { styles } from './components/DelalaDashboardStyles';
import { useT } from '../../utils/i18n';

const { width } = Dimensions.get('window');

export default function DelalaDashboard() {
  const t = useT();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState<'listings' | 'leads' | 'deals' | 'finance'>(
    'listings'
  );

  const data = useDelalaData();
  const actions = useDelalaActions(data);

  const { listings, enquiries, loading, refreshing, loadData } = data;
  const { handleContactLead, handleDeleteListing } = actions;

  const totalViews = useMemo(
    () => listings.reduce((acc, l) => acc + (l.views || 0), 0),
    [listings]
  );
  const activeLeads = enquiries.length;

  const renderListings = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={D.gold} />
      }
    >
      <View style={styles.bentoContainer}>
        <View style={styles.bentoRow}>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.bentoCard}
          >
            <Text style={styles.bentoLabel}>{t('total_listings')}</Text>
            <Text style={styles.bentoValue}>{listings.length}</Text>
          </MotiView>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 100 }}
            style={styles.bentoCard}
          >
            <Text style={styles.bentoLabel}>{t('active_enquiries')}</Text>
            <Text style={[styles.bentoValue, { color: D.gold }]}>{activeLeads}</Text>
          </MotiView>
        </View>
      </View>

      {listings.length === 0 ? (
        <View style={{ padding: 60, alignItems: 'center' }}>
          <Ionicons name="home-outline" size={64} color={D.lift} />
          <Text style={{ color: D.sub, marginTop: 16, fontFamily: Fonts.bold }}>
            {t('no_listings_yet')}
          </Text>
        </View>
      ) : (
        listings.map((l, i) => (
          <MotiView
            key={l.id}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200 + i * 100 }}
            style={styles.listingCard}
          >
            {l.image_url ? (
              <Image source={{ uri: l.image_url }} style={styles.listingImage} />
            ) : (
              <View
                style={[styles.listingImage, { alignItems: 'center', justifyContent: 'center' }]}
              >
                <Ionicons name="image-outline" size={48} color={D.rim} />
              </View>
            )}
            <View style={styles.listingInfo}>
              <Text style={styles.listingTitle}>{l.title}</Text>
              <Text style={styles.listingPrice}>
                {fmtETB(l.price)} / {l.type || 'Unit'}
              </Text>

              <View style={styles.listingStats}>
                <View style={styles.listingStatItem}>
                  <Ionicons name="eye-outline" size={14} color={D.sub} />
                  <Text style={styles.listingStatText}>
                    {l.views || 0} {t('views')}
                  </Text>
                </View>
                <View style={styles.listingStatItem}>
                  <Ionicons name="chatbubble-outline" size={14} color={D.sub} />
                  <Text style={styles.listingStatText}>
                    {activeLeads} {t('leads')}
                  </Text>
                </View>
              </View>
            </View>
          </MotiView>
        ))
      )}
    </ScrollView>
  );

  const renderLeads = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {enquiries.length === 0 ? (
        <View style={{ padding: 60, alignItems: 'center' }}>
          <Ionicons name="people-outline" size={48} color={D.lift} />
          <Text style={{ color: D.sub, marginTop: 16, fontFamily: Fonts.bold }}>
            {t('no_active_leads')}
          </Text>
        </View>
      ) : (
        enquiries.map((e, i) => (
          <MotiView
            key={e.id}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: i * 50 }}
            style={styles.leadCard}
          >
            <View style={styles.leadAvatar}>
              <Ionicons name="person" size={24} color={D.sub} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.leadName}>{e.user_name || t('prospective_client')}</Text>
                <Text style={styles.leadTime}>{new Date(e.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.leadListing}>{e.listing_title}</Text>
              <Text style={{ fontSize: 13, color: D.white, marginTop: 8 }} numberOfLines={1}>
                "{e.message || t('no_message_provided')}"
              </Text>
            </View>
            <TouchableOpacity style={{ padding: 8 }} onPress={() => handleContactLead(e)}>
              <Ionicons name="chevron-forward" size={24} color={D.gold} />
            </TouchableOpacity>
          </MotiView>
        ))
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.brandTitle}>Delala Hub</Text>
            <Text style={styles.brandTag}>{t('professional_brokerage')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="briefcase-outline" size={28} color={D.gold} />
            <TouchableOpacity 
              style={{ marginLeft: 16, padding: 8, backgroundColor: D.lift, borderRadius: 12, borderWidth: 1, borderColor: D.edge }} 
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await useAuthStore.getState().signOut();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={D.red} />
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
              {t(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <AnimatePresence exitBeforeEnter>
        <View style={{ flex: 1 }}>
          {activeTab === 'listings' && renderListings()}
          {activeTab === 'leads' && renderLeads()}
        </View>
      </AnimatePresence>

      {activeTab === 'listings' && (
        <TouchableOpacity style={styles.addBtn} onPress={() => {}}>
          <Ionicons name="add" size={32} color={D.ink} />
        </TouchableOpacity>
      )}
    </View>
  );
}

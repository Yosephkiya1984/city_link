import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDelalaData } from './hooks/useDelalaData';
import { useDelalaActions } from './hooks/useDelalaActions';
import { DarkColors as T, Radius, FontSize, Fonts } from '../../theme';
import { fmtETB } from '../../utils';
import { CButton, CInput } from '../../components';
import { styles } from './components/DelalaDashboardStyles';

const ADDIS_NOIR = {
  ink: '#0B0D11',
  surface: '#131720',
  lift: '#1B2030',
  rim: '#242B3D',
  gold: '#F97316', // Delala Orange
  cyan: '#00F5FF',
  glass: 'rgba(255, 255, 255, 0.05)',
  edge: 'rgba(255, 255, 255, 0.08)',
};

export default function DelalaDashboard() {
  const data = useDelalaData();
  const actions = useDelalaActions(data);
  const [activeTab, setActiveTab] = useState<'listings' | 'leads' | 'deals'>('listings');

  const { listings, enquiries, loading, refreshing, loadData } = data;
  const {
    onUpdateListing,
    onCreateListing,
    onLogout,
    showAddListing,
    setShowAddListing,
    showListingDetail,
    setShowListingDetail,
    selectedListing,
    setSelectedListing,
  } = actions;

  // KPIs
  const activeCount = listings.filter((l) => l.status === 'ACTIVE').length;
  const leadCount = enquiries.length;
  const monthlyRev = enquiries
    .filter((e) => e.status === 'COMPLETED')
    .reduce((sum, e) => sum + (e.commission_amount || 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ backgroundColor: T.lift }}>
        <View style={styles.navBar}>
          <View style={styles.brandBox}>
            <View style={styles.brandIcon}>
              <Ionicons name="business" size={20} color="#F97316" />
            </View>
            <View>
              <Text style={styles.brandName}>DELALA-LINK</Text>
              <Text style={styles.brandSubtitle}>PROPERTY AGENT</Text>
            </View>
          </View>
          <TouchableOpacity style={{ padding: 8 }} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={22} color="#E8312A" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.tabScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroller}
        >
          {(['listings', 'leads', 'deals'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            >
              <Ionicons
                name={tab === 'listings' ? 'home' : tab === 'leads' ? 'people' : 'hand-left'}
                size={16}
                color={activeTab === tab ? '#F97316' : T.sub}
              />
              <Text style={[styles.tabItemTxt, activeTab === tab && styles.tabItemTxtActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#F97316" />
        }
      >
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginVertical: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: ADDIS_NOIR.surface,
              padding: 16,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: ADDIS_NOIR.edge,
            }}
          >
            <Text
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 10,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Listings
            </Text>
            <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              {activeCount}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: ADDIS_NOIR.surface,
              padding: 16,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: ADDIS_NOIR.edge,
            }}
          >
            <Text
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 10,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Leads
            </Text>
            <Text style={{ color: ADDIS_NOIR.gold, fontSize: 24, fontWeight: '800', marginTop: 4 }}>
              {leadCount}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: ADDIS_NOIR.surface,
              padding: 16,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: ADDIS_NOIR.edge,
            }}
          >
            <Text
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 10,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Rev
            </Text>
            <Text style={{ color: ADDIS_NOIR.cyan, fontSize: 18, fontWeight: '800', marginTop: 4 }}>
              {fmtETB(monthlyRev, 0)}
            </Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
        ) : (
          <View style={{ paddingBottom: 100 }}>
            {activeTab === 'listings' && (
              <View style={{ paddingTop: 8 }}>
                <CButton
                  title="List New Property"
                  onPress={() => setShowAddListing(true)}
                  style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: '#F97316' }}
                />
                {listings.length === 0 ? (
                  <EmptyState text="No properties listed yet" icon="home-outline" />
                ) : (
                  listings.map((l) => (
                    <PropertyCard
                      key={l.id}
                      property={l}
                      onPress={() => {
                        setSelectedListing(l);
                        setShowListingDetail(true);
                      }}
                    />
                  ))
                )}
              </View>
            )}

            {activeTab === 'leads' && (
              <View style={{ padding: 16 }}>
                {enquiries.length === 0 ? (
                  <EmptyState text="No client leads yet" icon="people-outline" />
                ) : (
                  enquiries.map((e) => <LeadCard key={e.id} lead={e} />)
                )}
              </View>
            )}

            {activeTab === 'deals' && (
              <EmptyState text="Deal pipeline coming soon" icon="hand-left-outline" />
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Listing Modal */}
      <AddListingModal
        visible={showAddListing}
        onClose={() => setShowAddListing(false)}
        onSubmit={onCreateListing}
      />

      {/* Listing Detail Modal */}
      <Modal visible={showListingDetail} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}
            >
              <Text style={{ color: T.text, fontSize: 18, fontWeight: '800' }}>
                Property Detail
              </Text>
              <TouchableOpacity onPress={() => setShowListingDetail(false)}>
                <Ionicons name="close" size={24} color={T.text} />
              </TouchableOpacity>
            </View>
            {selectedListing && (
              <>
                <Text style={styles.propertyTitle}>{selectedListing.title}</Text>
                <Text style={styles.propertyPrice}>{fmtETB(selectedListing.price)}</Text>
                <Text style={styles.propertyLoc}>{selectedListing.location}</Text>
                <View style={{ height: 1, backgroundColor: T.edge, marginVertical: 20 }} />
                <Text style={{ color: T.sub, fontSize: 13, lineHeight: 20 }}>
                  {selectedListing.description || 'No description provided.'}
                </Text>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
                  <CButton
                    title="Remove"
                    variant="ghost"
                    onPress={() => onUpdateListing(selectedListing.id, 'REMOVED')}
                    style={{ flex: 1 }}
                  />
                  <CButton
                    title="Mark as Sold"
                    onPress={() => onUpdateListing(selectedListing.id, 'COMPLETED')}
                    style={{ flex: 2, backgroundColor: '#F97316' }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const StatCard = ({ value, label }: any) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const PropertyCard = ({ property, onPress }: any) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.propertyTitle}>{property.title}</Text>
        <Text style={styles.propertyPrice}>{fmtETB(property.price)}</Text>
        <Text style={styles.propertyLoc}>ðŸ“ {property.location}</Text>
      </View>
      <View
        style={[
          styles.badge,
          { backgroundColor: property.status === 'ACTIVE' ? '#00A86B20' : '#F9731620' },
        ]}
      >
        <Text
          style={[styles.badgeTxt, { color: property.status === 'ACTIVE' ? '#00A86B' : '#F97316' }]}
        >
          {property.status}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

const LeadCard = ({ lead }: any) => (
  <View style={styles.leadCard}>
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: T.rim,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="person" size={20} color={T.sub} />
    </View>
    <View style={styles.leadInfo}>
      <Text style={styles.leadName}>{lead.client_name || 'Anonymous Client'}</Text>
      <Text style={styles.leadSub}>Interested in: {lead.listing_title}</Text>
    </View>
    <TouchableOpacity style={{ padding: 8 }}>
      <Ionicons name="chatbubble-ellipses" size={22} color="#F97316" />
    </TouchableOpacity>
  </View>
);

const AddListingModal = ({ visible, onClose, onSubmit }: any) => {
  const [form, setForm] = useState({
    title: '',
    price: '',
    location: '',
    description: '',
    category: 'For Sale',
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            <Text style={{ color: T.text, fontSize: 18, fontWeight: '800' }}>List Property</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={T.text} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <CInput
                placeholder="e.g. 3BR Villa in Bole"
                value={form.title}
                onChangeText={(t: string) => setForm({ ...form, title: t })}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price (ETB)</Text>
              <CInput
                placeholder="0.00"
                keyboardType="numeric"
                value={form.price}
                onChangeText={(t: string) => setForm({ ...form, price: t })}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <CInput
                placeholder="e.g. Bole Atlas"
                value={form.location}
                onChangeText={(t: string) => setForm({ ...form, location: t })}
              />
            </View>
            <CButton
              title="Post Property"
              onPress={() => onSubmit(form)}
              style={{ backgroundColor: '#F97316', marginTop: 12 }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const EmptyState = ({ text, icon }: { text: string; icon: any }) => (
  <View style={{ padding: 60, alignItems: 'center' }}>
    <Ionicons name={icon} size={48} color={T.rim} />
    <Text style={{ color: T.sub, marginTop: 16, fontWeight: '600' }}>{text}</Text>
  </View>
);

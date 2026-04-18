import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAuthStore } from '../../store/AuthStore';
import { useSystemStore } from '../../store/SystemStore';
import { useWalletStore } from '../../store/WalletStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, Card, SectionTitle, CInput } from '../../components';
import { fmtETB, uid, fmtDateTime } from '../../utils';
import { t } from '../../utils/i18n';
import { PropertyListing } from '../../types';

import { useRealtimePostgres } from '../../hooks/useRealtimePostgres';
import {
  fetchPropertyListings,
  fetchPropertyEnquiries,
  updateListingStatus,
  createListing,
} from '../../services/services.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Delala color scheme
const DELALA_COLORS = {
  primary: '#F97316',
  primaryL: 'rgba(249,115,22,0.1)',
  primaryB: 'rgba(249,115,22,0.28)',
  status: {
    ACTIVE: '#00A86B', // Green
    NEGOTIATING: '#F97316', // Orange
    AGREED: '#8B5CF6', // Purple
    COMPLETED: '#00A86B', // Green
    REMOVED: '#8A9AB8', // Grey
  } as Record<string, string>,
};

export default function DelalaDashboard() {
  const navigation = useNavigation();
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const balance = useWalletStore((s) => s.balance);
  const currentUser = useAuthStore((s) => s.currentUser);
  const showToast = useSystemStore((s) => s.showToast);
  const resetAuth = useAuthStore((s) => s.reset);
  const resetWallet = useWalletStore((s) => s.reset);
  const resetSystem = useSystemStore((s) => s.reset);

  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddListing, setShowAddListing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [showListingDetail, setShowListingDetail] = useState(false);
  const [showEnquiryDetail, setShowEnquiryDetail] = useState(false);
  const [newListing, setNewListing] = useState({
    title: '',
    category: 'For Rent',
    price: '',
    location: '',
    description: '',
    status: 'ACTIVE',
  });

  // KPI calculations
  const activeListings = listings.filter((l: PropertyListing) => l.status === 'ACTIVE').length;
  const pendingEnquiries = enquiries.filter((e: any) => e.status === 'PENDING').length;
  const negotiatingListings = listings.filter(
    (l: PropertyListing) => l.status === 'NEGOTIATING'
  ).length;

  const monthlyCommission = enquiries
    .filter(
      (e: any) =>
        e.status === 'COMPLETED' && new Date(e.created_at).getMonth() === new Date().getMonth()
    )
    .reduce((sum: number, e: any) => sum + (e.commission_amount || 0), 0);

  const loadData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [listingsRes, enquiriesRes] = await Promise.all([
        fetchPropertyListings(currentUser.id),
        fetchPropertyEnquiries(currentUser.id),
      ]);

      if (listingsRes.data) {
        const sortedListings = (listingsRes.data as PropertyListing[]).sort(
          (a: PropertyListing, b: PropertyListing) =>
            new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
        );
        setListings(sortedListings);
      }
      if (enquiriesRes.data) {
        const sortedEnquiries = (enquiriesRes.data as any[]).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setEnquiries(sortedEnquiries);
      }
    } catch (error) {
      showToast('Failed to load data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  // Real-time enquiry updates
  useRealtimePostgres({
    channelName: `delala-enquiries-${currentUser?.id || 'guest'}`,
    table: 'property_enquiries',
    filter: `agent_id=eq.${currentUser?.id || ''}`,
    enabled: !!currentUser?.id,
    onPayload: (payload: any) => {
      if (payload.eventType === 'INSERT') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('ðŸ  New property enquiry!', 'info');
        loadData();
      } else {
        loadData();
      }
    },
  });

  const updateListing = async (listingId: string, newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const result = await updateListingStatus(listingId, newStatus);
      if (!result.error) {
        showToast(`Listing ${newStatus.toLowerCase()}`, 'success');
        loadData();
      } else {
        showToast(result.error || 'Failed to update listing', 'error');
      }
    } catch (error) {
      showToast('Failed to update listing', 'error');
    }
    setLoading(false);
  };

  const addListing = async () => {
    if (!newListing.title || !newListing.price || !newListing.location) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const listingData = {
        id: uid(),
        poster_id: currentUser.id,
        title: newListing.title,
        category: newListing.category,
        price: parseFloat(newListing.price),
        location: newListing.location,
        description: newListing.description,
        status: newListing.status as any,
        created_at: new Date().toISOString(),
      };

      const result = await createListing(listingData as any);
      if (!result.error) {
        setListings([listingData as any, ...listings]);
        setNewListing({
          title: '',
          category: 'For Rent',
          price: '',
          location: '',
          description: '',
          status: 'ACTIVE',
        });
        setShowAddListing(false);
        showToast('Property listed successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to add listing', 'error');
      }
    } catch (error) {
      showToast('Failed to add listing', 'error');
    }
    setLoading(false);
  };

  const logout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Logged out successfully', 'success');
    resetAuth();
    resetWallet();
    resetSystem();

    // Use navigation.replace instead of reset to avoid the error
    try {
      (navigation as any).replace('Auth');
    } catch (error) {
      console.log('Navigation reset error, trying alternative method');
      (navigation as any).navigate('Auth');
    }
  };

  const getStatusColor = (status: string) => DELALA_COLORS.status[status] || C.sub;
  const getStatusBg = (status: string) => {
    const color = DELALA_COLORS.status[status];
    return color ? `${color}20` : C.surface;
  };

  const ListingCard = ({ listing }: { listing: PropertyListing }) => {
    const enquiryCount = enquiries.filter((e: any) => e.listing_id === listing.id).length;

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedListing(listing);
          setShowListingDetail(true);
        }}
      >
        <Card
          style={{
            marginBottom: 12,
            padding: 16,
            borderLeftWidth: 3,
            borderLeftColor: getStatusColor(listing.status),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ color: C.text, fontSize: 15, fontFamily: Fonts.black }}>
                  {listing.title}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    backgroundColor: getStatusBg(listing.status),
                  }}
                >
                  <Text
                    style={{
                      color: getStatusColor(listing.status),
                      fontSize: 9,
                      fontFamily: Fonts.bold,
                      textTransform: 'uppercase',
                    }}
                  >
                    {listing.status}
                  </Text>
                </View>
                {listing.status === 'NEGOTIATING' && (
                  <View
                    style={{
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: DELALA_COLORS.primaryL,
                    }}
                  >
                    <Text
                      style={{
                        color: DELALA_COLORS.primary,
                        fontSize: 8,
                        fontFamily: Fonts.bold,
                      }}
                    >
                      UNDER OFFER
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={{
                  color: DELALA_COLORS.primary,
                  fontSize: 16,
                  fontFamily: Fonts.black,
                  marginBottom: 4,
                }}
              >
                {listing.category === 'For Rent'
                  ? `${fmtETB(listing.price)}/mo`
                  : fmtETB(listing.price)}
              </Text>

              <Text style={{ color: C.sub, fontSize: 11, marginBottom: 4 }}>
                ðŸ“ {listing.location}
              </Text>

              <Text style={{ color: C.sub, fontSize: 11, marginBottom: 8 }}>
                Listed: {new Date(listing.created_at || Date.now()).toLocaleDateString()}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    backgroundColor: 'rgba(138,154,184,0.1)',
                  }}
                >
                  <Text
                    style={{
                      color: C.sub,
                      fontSize: 9,
                      fontFamily: Fonts.bold,
                    }}
                  >
                    {enquiryCount} ENQUIR{enquiryCount !== 1 ? 'IES' : 'Y'}
                  </Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 4,
                    backgroundColor: 'rgba(138,154,184,0.1)',
                  }}
                >
                  <Text
                    style={{
                      color: C.sub,
                      fontSize: 9,
                      fontFamily: Fonts.bold,
                    }}
                  >
                    {listing.category.replace(' ', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const EnquiryCard = ({ enquiry }: { enquiry: any }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedEnquiry(enquiry);
        setShowEnquiryDetail(true);
      }}
    >
      <Card style={{ marginBottom: 8, padding: 12 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black, marginBottom: 4 }}>
              {enquiry.client_name || 'Potential Client'}
            </Text>
            <Text style={{ color: C.sub, fontSize: 11, marginBottom: 2 }}>
              Re: {enquiry.listing_title}
            </Text>
            <Text style={{ color: C.sub, fontSize: 11 }}>
              {new Date(enquiry.created_at || Date.now()).toLocaleDateString()}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: DELALA_COLORS.primaryL,
            }}
          >
            <Text
              style={{
                color: DELALA_COLORS.primary,
                fontSize: 9,
                fontFamily: Fonts.bold,
              }}
            >
              REPLY
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar
        title="ðŸ  Delala Dashboard"
        right={
          <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
            <Ionicons name="log-out-outline" size={24} color={C.text} />
          </TouchableOpacity>
        }
      />

      {/* Additional Logout Button for visibility */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.edge2,
        }}
      >
        <TouchableOpacity
          onPress={logout}
          style={{
            backgroundColor: '#E8312A',
            borderRadius: Radius.xl,
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            alignSelf: 'flex-end',
          }}
        >
          <Ionicons name="log-out" size={16} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontFamily: Fonts.bold }}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue Stats */}
        <View style={{ padding: 16 }}>
          <LinearGradient
            colors={[DELALA_COLORS.primaryL, 'transparent']}
            style={{ borderRadius: Radius['3xl'], padding: 24, ...Shadow.md }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: C.text, fontSize: 13, fontFamily: Fonts.bold, opacity: 0.8 }}>
                  Active Listings
                </Text>
                <Text
                  style={{
                    color: DELALA_COLORS.primary,
                    fontSize: 32,
                    fontFamily: Fonts.black,
                    marginTop: 4,
                  }}
                >
                  {activeListings}
                </Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: DELALA_COLORS.primaryL,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="business" size={24} color={DELALA_COLORS.primary} />
              </View>
            </View>

            <View
              style={{ height: 1, backgroundColor: 'rgba(249,115,22,0.2)', marginVertical: 20 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#F97316', fontSize: 16, fontFamily: Fonts.black }}>
                  {pendingEnquiries}
                </Text>
                <Text
                  style={{ color: 'rgba(249,115,22,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  ENQUIRIES
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#8B5CF6', fontSize: 16, fontFamily: Fonts.black }}>
                  {negotiatingListings}
                </Text>
                <Text
                  style={{ color: 'rgba(139,92,246,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  NEGOTIATING
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{ color: DELALA_COLORS.primary, fontSize: 16, fontFamily: Fonts.black }}
                >
                  {fmtETB(monthlyCommission, 0)}
                </Text>
                <Text
                  style={{ color: 'rgba(249,115,22,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  COMMISSION
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Tab Navigation */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 }}>
          {['listings', 'enquiries', 'deals', 'stats'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: Radius.xl,
                backgroundColor: activeTab === tab ? DELALA_COLORS.primaryL : C.surface,
                borderWidth: 1.5,
                borderColor: activeTab === tab ? DELALA_COLORS.primaryB : C.edge2,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? DELALA_COLORS.primary : C.sub,
                  fontSize: 11,
                  fontFamily: Fonts.black,
                  textTransform: 'uppercase',
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'listings' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Property Listings" />
            <CButton
              title="Post New Listing"
              onPress={() => setShowAddListing(true)}
              style={{ marginBottom: 16 }}
            />

            {loading && listings.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                Loading listings...
              </Text>
            ) : listings.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                No listings yet
              </Text>
            ) : (
              listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)
            )}
          </View>
        )}

        {activeTab === 'enquiries' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Client Enquiries" />
            {loading && enquiries.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                Loading enquiries...
              </Text>
            ) : enquiries.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                No enquiries yet
              </Text>
            ) : (
              enquiries.map((enquiry) => <EnquiryCard key={enquiry.id} enquiry={enquiry} />)
            )}
          </View>
        )}

        {activeTab === 'deals' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Deal Pipeline" />
            <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
              Deal management coming soon
            </Text>
          </View>
        )}

        {activeTab === 'stats' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Analytics" />
            <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
              Analytics dashboard coming soon
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Listing Modal */}
      <Modal visible={showAddListing} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: C.ink }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: C.edge2,
            }}
          >
            <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
              Post New Property
            </Text>
            <TouchableOpacity onPress={() => setShowAddListing(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Property Title *
              </Text>
              <CInput
                placeholder="e.g., 3BR Apartment, Bole Road"
                value={newListing.title}
                onChangeText={(text: string) => setNewListing({ ...newListing, title: text })}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Category *
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['For Rent', 'For Sale', 'Commercial', 'Land'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setNewListing({ ...newListing, category })}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor:
                        newListing.category === category ? DELALA_COLORS.primaryL : C.surface,
                      borderWidth: 1,
                      borderColor:
                        newListing.category === category ? DELALA_COLORS.primaryB : C.edge2,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: newListing.category === category ? DELALA_COLORS.primary : C.sub,
                        fontSize: 10,
                        fontFamily: Fonts.bold,
                      }}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Price (ETB) *
              </Text>
              <CInput
                placeholder={newListing.category === 'For Rent' ? 'Monthly rent' : 'Sale price'}
                value={newListing.price}
                onChangeText={(text: string) => setNewListing({ ...newListing, price: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Location *
              </Text>
              <CInput
                placeholder="e.g., Bole, Addis Ababa"
                value={newListing.location}
                onChangeText={(text: string) => setNewListing({ ...newListing, location: text })}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Description
              </Text>
              <CInput
                placeholder="Property details, amenities, etc."
                value={newListing.description}
                onChangeText={(text: string) => setNewListing({ ...newListing, description: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <CButton
              title="Post Listing"
              onPress={addListing}
              loading={loading}
              style={{ marginTop: 20 }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Listing Detail Modal */}
      <Modal visible={showListingDetail} animationType="slide" presentationStyle="pageSheet">
        {selectedListing && (
          <View style={{ flex: 1, backgroundColor: C.ink }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.edge2,
              }}
            >
              <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
                Listing Details
              </Text>
              <TouchableOpacity onPress={() => setShowListingDetail(false)} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Card style={{ padding: 16, marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>
                    {selectedListing.title}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: getStatusBg(selectedListing.status),
                    }}
                  >
                    <Text
                      style={{
                        color: getStatusColor(selectedListing.status),
                        fontSize: 10,
                        fontFamily: Fonts.bold,
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedListing.status}
                    </Text>
                  </View>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      color: DELALA_COLORS.primary,
                      fontSize: 18,
                      fontFamily: Fonts.black,
                      marginBottom: 4,
                    }}
                  >
                    {selectedListing.category === 'For Rent'
                      ? `${fmtETB(selectedListing.price)}/mo`
                      : fmtETB(selectedListing.price)}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12, marginBottom: 2 }}>
                    ðŸ“ {selectedListing.location}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12 }}>
                    Listed:{' '}
                    {new Date(selectedListing.created_at || Date.now()).toLocaleDateString()}
                  </Text>
                </View>

                {selectedListing.description && (
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 14,
                        fontFamily: Fonts.bold,
                        marginBottom: 4,
                      }}
                    >
                      Description
                    </Text>
                    <Text style={{ color: C.sub, fontSize: 12, lineHeight: 18 }}>
                      {selectedListing.description}
                    </Text>
                  </View>
                )}
              </Card>

              {selectedListing.status === 'ACTIVE' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <CButton
                    title="Mark Negotiating"
                    onPress={() => updateListing(selectedListing.id, 'NEGOTIATING')}
                    style={{ flex: 1, backgroundColor: DELALA_COLORS.primaryL }}
                  />
                  <CButton
                    title="Remove Listing"
                    onPress={() => updateListing(selectedListing.id, 'REMOVED')}
                    style={{ flex: 1, backgroundColor: '#E8312A' }}
                  />
                </View>
              )}

              {selectedListing.status === 'NEGOTIATING' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <CButton
                    title="Mark Agreed"
                    onPress={() => updateListing(selectedListing.id, 'AGREED')}
                    style={{ flex: 1 }}
                  />
                  <CButton
                    title="Back to Active"
                    onPress={() => updateListing(selectedListing.id, 'ACTIVE')}
                    style={{ flex: 1, backgroundColor: C.surface }}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

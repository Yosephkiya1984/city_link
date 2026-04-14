// â”€â”€ DelalaScreen â€” Three-Screen Real Estate Ecosystem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
  StyleSheet,
  StatusBar,
  Dimensions,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useAppStore } from '../../store/AppStore';
import { fmtETB, timeAgo, uid } from '../../utils';
import { Fonts, Shadow } from '../../theme';
import { hasSupabase } from '../../services/supabase';
import { fetchChatThreads, createChatThread } from '../../services/chat.service';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Material Design 3 color system EXACT match
const COLORS = {
  surface: '#101319',
  'surface-container-lowest': '#0b0e13',
  'surface-container-low': '#191c21',
  'surface-container': '#1d2025',
  'surface-container-high': '#272a30',
  'surface-container-highest': '#32353b',
  'on-surface': '#e1e2ea',
  'on-surface-variant': '#bccabe',
  outline: '#869489',
  'outline-variant': '#3d4a41',
  primary: '#59de9b',
  'primary-container': '#00a86b',
  'primary-fixed': '#78fbb6',
  'on-primary': '#003921',
  'on-primary-container': '#00331d',
  secondary: '#ffd887',
  'secondary-container': '#f4b700',
  'on-secondary': '#402d00',
  'on-secondary-container': '#654a00',
  'inverse-surface': '#e1e2ea',
  'inverse-primary': '#006d43',
  error: '#ffb4ab',
  tertiary: '#ffb4aa',
  'tertiary-container': '#ff5a4c',
  'on-tertiary': '#690004',
  'on-tertiary-container': '#600003',
  background: '#101319',
  'on-background': '#e1e2ea',
};

// â”€â”€ Data Models â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Public Listings (Verified Merchant Posts Only)
const PUBLIC_LISTINGS = [
  {
    id: '1',
    title: 'Modernist Villa in Bole',
    category: 'House Sale',
    price: 45000000,
    area_sqm: 320,
    location: 'Bole, Addis Ababa',
    description:
      'Luxury 4-bedroom villa with private garden and state-of-the-art security systems.',
    bedrooms: 4,
    bathrooms: 3.5,
    status: 'ACTIVE',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCob1un65FVX-dDUBomhPMesnN6__ah2Jgbhvo9GSEqBAwgIeoBjZtbkFxBNaBXM2wISDYT_K1S1T5gMloCI2ryyc7x0wkb5idKxTEVMC1_m-jmYuU1qLp2t0wT48fNXZ-asGXt3RhgzUNcdGbEJ3IoXr5HDnm3upIxUT-2YmlVGLRxRo0HYbpv0a5G2dCqGM2gR87BnWnjgWP4UCdaucUoqYUhqStm0gzc-JnqfV1AThsRNNIUSXB80QdTTqaxUqnLXWCOday2ISf3',
    broker: {
      name: 'Abebe Molla',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA8QpyP-gjv4huMle3x7hXcPGKnCvojwrbF58cLYrryfGUGIJjDx02jOvIftOs3i-7n-K4M1s3HHP9lpM1-KlRKSFjHeOiwlpF-U8440GGykpRoK8m1eQO3oyNnq9Lh82M99nqnzWf94SKFGw-7gmYaSBzNd87PXLBulXtN_U5nQpCv3WWwYyP5_3s_XtScnkUCUDSkbEbmLrZQTK3MyDnspZAZ0SwTWwd-4xPlJxqXskD1sQVv71RTrqJV5Je2nk9YLSRlbyhWOruY',
      type: 'Verified Broker',
      verified: true,
    },
    features: ['Video', 'Verified'],
    featured: false,
    postedBy: 'merchant',
  },
  {
    id: '2',
    title: 'Premium Office Suite',
    category: 'Office Space',
    price: 120000,
    area_sqm: 200,
    location: 'Kirkos, Financial District',
    description: 'Modern office space with high visibility and easy accessibility.',
    bedrooms: 0,
    bathrooms: 2,
    status: 'ACTIVE',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAL3ig35shxJydxUp8RwkyXY_eICZ1qyGXTJkNig7kgj4tyMqREcOOEqak9pT3rxtZk_v2cP8C8UCeLvrZABkkP7QvWJbKuAkwCUL0VJ7RGLAtDlgdjuLTaANY-oM5yqAw6bwtuofduRaytReOSZXs9nj347iap_L88sX16PJkte9-thPwUlCRfJ78IHDO9RubJdeTJBAJLFO6EDpcipmZSXEtTRXuJPp4rA0dGN6YqJuMKBbyAsUDUJW805ThoSsGlvJcQbU100xTV',
    broker: {
      name: 'Samrawit G.',
      type: 'Verified Broker',
      verified: true,
    },
    features: ['Verified'],
    featured: false,
    postedBy: 'merchant',
  },
];

// Private Inventory (Your Posts + Merchant Negotiations)
const PRIVATE_INVENTORY = [
  {
    id: 'inv1',
    title: 'The Zenith Tower Penthouse',
    category: 'House Sale',
    price: 85000000,
    area_sqm: 450,
    location: 'Bole, Addis Ababa',
    description:
      'Experience unparalleled luxury in the heart of Addis Ababa. This 4-bedroom masterpiece features 360-degree views, private elevator access, and ultra-premium finishes.',
    bedrooms: 4,
    bathrooms: 4,
    status: 'NEGOTIATING',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAGR2qkmwoIfVTs5rO_YiDJe56KP769XiS-9QW1V1JKDqjep6-1jLTadaYvyy-NBjrooaO5qOFegiqF6GwilXIjbDgi4PbMnUT7a9la9TQGoRE6QKqWx9yu-AlP1fT1jB7Daerj3WC1gxXeuRR3rKHfAJaoh9Pb9EFE4Wp4idNBHjMDNpaiZoKCy0Nt4FyX329TtQ9t-nioVswmLYdzXQwSF2eRVTRN2e_m6O24Ix-f4hNCprRWgEa-YYujWjQWMT0f55GUYpJjpyuB',
    owner: {
      name: 'You (Owner)',
      type: 'Owner',
    },
    negotiations: [
      {
        merchant: 'Abebe Molla',
        offer: 82000000,
        status: 'active',
        lastMessage: 'Can we discuss the price further? I have interested buyers.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
    featured: true,
    postedBy: 'owner',
  },
  {
    id: 'inv2',
    title: 'Family Home in CMC',
    category: 'House Sale',
    price: 25000000,
    area_sqm: 280,
    location: 'CMC, Addis Ababa',
    description: 'Contemporary suburban family home with stone accents and a manicured lawn.',
    bedrooms: 3,
    bathrooms: 2,
    status: 'PENDING',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB0X27LY6OwJ7x8zA2TMWsd6zdRvV-rlTBC5OVW3f_hTLCBBlrIewbfkALO9cZJq2QSXK97cJpLxyxi8CPzj5aQY47uoV_UPa6eRl64QTwtvDrI57aUIrIDyhuI0j6_0898wo1SJWECv4AXOLiMfUIRg_D8jRhRx8VN0Xi5Egi83rrRvPeApwYwGoFfR3V0DsgUHvsb-sieaMT8IOIwa6zlQ6ZH_y0Ibd2Azw5ujI7Gwdzohr8KbfjEzf8nZuxO3S59_LRnXLVq3Gdh',
    owner: {
      name: 'You (Owner)',
      type: 'Owner',
    },
    negotiations: [],
    featured: false,
    postedBy: 'owner',
  },
  {
    id: 'inv3',
    title: '2023 Mercedes-Benz S-Class',
    category: 'Car Sale',
    price: 18000000,
    area_sqm: 0,
    location: 'Old Airport, Addis Ababa',
    description: 'Luxury executive car in pristine condition with full service history.',
    bedrooms: 0,
    bathrooms: 0,
    status: 'AGREED',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBkP4wMTMp9BRHPLHUhkChN45amgc79IrKk66ohbfhNSt31E7EEbPXL8aa4v381-SDcLzRfU8cTfc7EMt9kEI_HXTj2FXIATqqri1yTvgzDYWWNZ0EkwIvz_u79pVsWlHZnj3d6V6DeUzvoRH4Ts0JGqoXZ90Q3bA7aVxJz7zYWyWPZDNdAr3Co_5LXhUxhu92i5hLCnhYIi1-5C2Qyyxeo2BjCI-2vlswpfPVXH8XNt0Yw-S4SFcMOLeY0lg9Z6qPU0hfVarmMVGIC',
    owner: {
      name: 'You (Owner)',
      type: 'Owner',
    },
    negotiations: [
      {
        merchant: 'Hanna Tadesse',
        offer: 17500000,
        status: 'agreed',
        lastMessage: 'Great! I will repost this to public listings.',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    featured: false,
    postedBy: 'owner',
  },
];

// Messaging Data removed - now using live Supabase threads
// Category filters
const CATEGORIES = ['All', 'House Rent', 'House Sale', 'Car Sale', 'Office Space'];

// â”€â”€ Enhanced Top Bar Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EnhancedTopBar = ({
  activeScreen,
  onScreenChange,
  userImage,
}: {
  activeScreen: string;
  onScreenChange: (screen: string) => void;
  userImage: string;
}) => {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <Text style={styles.brandName}>Delala</Text>
      </View>

      <View style={styles.topBarRight}>
        <View style={styles.navLinks}>
          {['Listings', 'Inventory', 'Messages'].map((screen) => (
            <TouchableOpacity
              key={screen}
              onPress={() => onScreenChange(screen)}
              style={[styles.navLink, activeScreen === screen && styles.activeNavLink]}
            >
              <Text
                style={[styles.navLinkText, activeScreen === screen && styles.activeNavLinkText]}
              >
                {screen}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.profileContainer}>
          <Image source={{ uri: userImage }} style={styles.profileImage} />
        </View>
      </View>
    </View>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————————————————————
const SearchBar = ({ value, onChangeText }: any) => {
  return (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color={COLORS.outline} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search properties in Addis Ababa..."
        placeholderTextColor={COLORS.outline}
      />
    </View>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————————————————————
const CategoryFilter = ({ categories, selected, onSelect }: any) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
      contentContainerStyle={styles.categoryFilterContent}
    >
      {categories.map((category: any) => (
        <TouchableOpacity
          key={category}
          onPress={() => onSelect(category)}
          style={[styles.categoryChip, selected === category && styles.activeCategoryChip]}
        >
          <Text
            style={[
              styles.categoryChipText,
              selected === category && styles.activeCategoryChipText,
            ]}
          >
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————————————————————
const PublicPropertyCard = ({ property, onPress }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.propertyCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.propertyCardContent}
      >
        <View style={styles.propertyCardImageContainer}>
          <Image source={{ uri: property.image }} style={styles.propertyCardImage} />
          <View style={styles.propertyCardFeatures}>
            {property.features.slice(0, 2).map((feature: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.featureBadge,
                  feature === 'Video' && styles.videoBadge,
                  feature === 'Verified' && styles.verifiedBadgePrimary,
                ]}
              >
                {feature === 'Video' && (
                  <Ionicons name="videocam" size={12} color={COLORS['on-primary']} />
                )}
                <Text style={styles.featureBadgeText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.propertyCardContent}>
          <View style={styles.propertyCardHeader}>
            <Text style={styles.propertyCardTitle}>{property.title}</Text>
            <Text style={styles.propertyCardPrice}>ETB {fmtETB(property.price, 0)}</Text>
          </View>

          <View style={styles.propertyCardLocation}>
            <Ionicons name="location" size={16} color={COLORS.outline} />
            <Text style={styles.propertyCardLocationText}>{property.location}</Text>
          </View>

          <View style={styles.propertyCardFooter}>
            <View style={styles.propertyCardBroker}>
              {property.broker.image ? (
                <Image source={{ uri: property.broker.image }} style={styles.brokerImage} />
              ) : (
                <View style={styles.brokerPlaceholder}>
                  <Ionicons name="person" size={16} color={COLORS.outline} />
                </View>
              )}
              <View>
                <Text style={styles.brokerName}>{property.broker.name}</Text>
                {property.broker.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={10} color={COLORS['on-primary']} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.messageButton}>
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————————————————————
const InventoryPropertyCard = ({ property, onPress, onNegotiate }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const getStatusColor = (status: any) => {
    switch (status) {
      case 'NEGOTIATING':
        return COLORS.secondary;
      case 'AGREED':
        return COLORS.primary;
      case 'PENDING':
        return COLORS.outline;
      default:
        return COLORS.outline;
    }
  };

  return (
    <Animated.View style={[styles.inventoryCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.inventoryCardContent}
      >
        <View style={styles.inventoryCardImageContainer}>
          <Image source={{ uri: property.image }} style={styles.inventoryCardImage} />
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(property.status) }]}>
            <Text style={styles.statusBadgeText}>{property.status}</Text>
          </View>
        </View>

        <View style={styles.inventoryCardContent}>
          <View style={styles.inventoryCardHeader}>
            <Text style={styles.inventoryCardTitle}>{property.title}</Text>
            <Text style={styles.inventoryCardPrice}>ETB {fmtETB(property.price, 0)}</Text>
          </View>

          <View style={styles.inventoryCardLocation}>
            <Ionicons name="location" size={16} color={COLORS.outline} />
            <Text style={styles.inventoryCardLocationText}>{property.location}</Text>
          </View>

          {property.negotiations && property.negotiations.length > 0 && (
            <View style={styles.negotiationSection}>
              <Text style={styles.negotiationTitle}>Active Negotiations</Text>
              {property.negotiations?.map((negotiation: any, index: number) => (
                <View key={index} style={styles.negotiationItem}>
                  <Text style={styles.negotiationMerchant}>{negotiation.merchant}</Text>
                  <Text style={styles.negotiationOffer}>ETB {fmtETB(negotiation.offer, 0)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.inventoryCardActions}>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="create" size={16} color={COLORS['on-surface']} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

            {property.negotiations && property.negotiations.length > 0 ? (
              <TouchableOpacity
                style={styles.negotiateButton}
                onPress={() => onNegotiate(property)}
              >
                <Ionicons name="chatbubble" size={16} color={COLORS['on-primary']} />
                <Text style={styles.negotiateButtonText}>View Chat</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.negotiateButton}>
                <Ionicons name="add-circle" size={16} color={COLORS['on-primary']} />
                <Text style={styles.negotiateButtonText}>Find Delala</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const MessageThread = ({ thread, onPress, currentUser }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const isUserA = thread.user_a_id === currentUser?.id;
  const other = isUserA ? thread.user_b : thread.user_a;
  const name = other?.business_name || other?.full_name || 'Agent';

  return (
    <Animated.View style={[styles.messageThread, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.messageThreadContent}
      >
        <View style={styles.messageThreadHeader}>
          <View style={styles.participantInfo}>
            <View
              style={[
                styles.participantImage,
                {
                  backgroundColor: COLORS['surface-container-highest'],
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <Ionicons name="person" size={20} color={COLORS.outline} />
            </View>
            <View style={styles.participantDetails}>
              <View style={styles.participantNameRow}>
                <Text style={styles.participantName}>{name}</Text>
                {(other?.kyc_status === 'VERIFIED' || other?.merchant_status === 'APPROVED') && (
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                )}
              </View>
              <Text style={styles.propertyReference}>Negotiation Thread</Text>
            </View>
          </View>

          <View style={styles.messageThreadMeta}>
            <Text style={styles.lastMessageTime}>
              {thread.last_ts ? new Date(thread.last_ts).toLocaleDateString() : 'Active'}
            </Text>
          </View>
        </View>

        <Text style={styles.lastMessage} numberOfLines={2}>
          {thread.last_msg || 'No messages yet'}
        </Text>

        {thread.status === 'agreed' && (
          <View style={styles.agreementBadge}>
            <Ionicons name="checkmark-circle" size={12} color={COLORS['on-primary']} />
            <Text style={styles.agreementText}>Agreement Reached</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ——————————————————————————————————————————————————————————————————————————————————————————————————
const ChatModal = ({ visible, thread, onClose, onSendMessage }: any) => {
  const scrollViewRef = useRef(null);
  const [message, setMessage] = useState('');

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [message]);

  useEffect(() => {
    if (visible && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visible, thread?.messages]);

  if (!thread) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={onClose} style={styles.chatBackButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS['on-surface']} />
          </TouchableOpacity>

          <View style={styles.chatParticipantInfo}>
            <Image source={{ uri: thread.participant.image }} style={styles.chatParticipantImage} />
            <View>
              <Text style={styles.chatParticipantName}>{thread.participant.name}</Text>
              <Text style={styles.chatPropertyTitle}>{thread.property.title}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
            {thread?.messages?.map((msg: any) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.sender === 'owner' ? styles.ownerMessage : styles.merchantMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.sender === 'owner' ? styles.ownerMessageText : styles.merchantMessageText,
                ]}
              >
                {msg.text}
              </Text>
              {msg.type === 'offer' && (
                <View style={styles.offerContainer}>
                  <Text style={styles.offerText}>Offer: ETB {fmtETB(msg.offer, 0)}</Text>
                </View>
              )}
              <Text
                style={[
                  styles.messageTime,
                  msg.sender === 'owner' ? styles.ownerMessageTime : styles.merchantMessageTime,
                ]}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.outline}
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendButton,
              message.trim() ? styles.sendButtonActive : styles.sendButtonInactive,
            ]}
            disabled={!message.trim()}
          >
            <Ionicons name="send" size={20} color={COLORS['on-primary']} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// â”€â”€ FAB Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FAB = ({ activeScreen, onPress }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const getFABLabel = () => {
    switch (activeScreen) {
      case 'Listings':
        return 'Browse Public';
      case 'Inventory':
        return 'Post Property';
      case 'Messages':
        return 'New Message';
      default:
        return 'Add';
    }
  };

  return (
    <Animated.View style={[styles.fab, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={styles.fabButton}
      >
        <Ionicons name="add" size={24} color={COLORS['on-primary']} />
        <View style={styles.fabTooltip}>
          <Text style={styles.fabTooltipText}>{getFABLabel()}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function DelalaScreen() {
  const navigation: any = useNavigation();
  const [activeScreen, setActiveScreen] = useState('Listings');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);

  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);

  // Real Chat State
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);

  // Filter data based on active screen
  const getFilteredData = useCallback(() => {
    switch (activeScreen) {
      case 'Listings':
        return PUBLIC_LISTINGS.filter((property) => {
          const matchesCategory =
            selectedCategory === 'All' || property.category === selectedCategory;
          const matchesSearch =
            !searchQuery ||
            property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            property.location.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesCategory && matchesSearch;
        });

      case 'Inventory':
        return PRIVATE_INVENTORY.filter((property) => {
          const matchesCategory =
            selectedCategory === 'All' || property.category === selectedCategory;
          const matchesSearch =
            !searchQuery ||
            property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            property.location.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesCategory && matchesSearch;
        });

      case 'Messages':
        // Use live threads state for the messages screen
        return threads.filter((thread) => {
          const isUserA = thread.user_a_id === currentUser?.id;
          const other = isUserA ? thread.user_b : thread.user_a;
          const name = other?.business_name || other?.full_name || 'Agent';

          const matchesSearch =
            !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesSearch;
        });

      default:
        return [];
    }
  }, [activeScreen, selectedCategory, searchQuery]);

  const filteredData = getFilteredData();

  const handlePropertyPress = useCallback((property: any) => {
    setSelectedProperty(property);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const loadLiveThreads = useCallback(async () => {
    if (!currentUser?.id || !hasSupabase()) return;
    setLoadingThreads(true);
    const { data, error } = await fetchChatThreads(currentUser.id);
    if (data) setThreads(data);
    setLoadingThreads(false);
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeScreen === 'Messages') {
      loadLiveThreads();
    }
  }, [activeScreen, loadLiveThreads]);

  const handleNegotiate = useCallback(
    async (property: any) => {
      if (!currentUser?.id) {
        showToast('Please login to chat', 'error');
        return;
      }

      const agentId = property.poster_id || property.agent_id || property.seller_id || 'mock-agent-id';

      // Sort IDs to ensure consistent thread_id
      const participants = [currentUser.id, agentId].sort();
      const thread_id = participants.join('_');

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      navigation.navigate('Chat', {
        threadId: thread_id,
        recipientId: agentId,
        recipientName: property.agent_name || property.postedBy || 'Agent',
        propertyTitle: property.title,
      });
    },
    [currentUser?.id, navigation, showToast]
  );

  const handleMessageThreadPress = useCallback(
    (thread: any) => {
      const isUserA = thread.user_a_id === currentUser.id;
      const other = isUserA ? thread.user_b : thread.user_a;

      navigation.navigate('Chat', {
        threadId: thread.thread_id,
        recipientName: other?.business_name || other?.full_name || 'Agent',
        recipientId: other?.id,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [currentUser?.id, navigation]
  );

  const handleSendMessage = useCallback((messageText: any) => {
    // This is now handled by the ChatScreen
  }, []);

  const handleFABPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    switch (activeScreen) {
      case 'Listings':
        showToast('Browse public listings from verified merchants', 'info');
        break;
      case 'Inventory':
        showToast('Post new property to your inventory', 'info');
        break;
      case 'Messages':
        showToast('Start new conversation with merchant', 'info');
        break;
      default:
        showToast('Add new item', 'info');
    }
  }, [activeScreen]);

  const renderContent = () => {
    switch (activeScreen) {
      case 'Listings':
        return (
          <View style={styles.contentContainer}>
            {/* Search and Filter Section */}
            <View style={styles.searchSection}>
              <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
              <CategoryFilter
                categories={CATEGORIES}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </View>

            {/* Public Property Listings */}
            <FlatList
              data={filteredData}
              renderItem={({ item }) => (
                <PublicPropertyCard property={item} onPress={() => handlePropertyPress(item)} />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.propertiesList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="home" size={48} color={COLORS.outline} />
                  <Text style={styles.emptyStateTitle}>No Public Listings</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Verified merchants haven't posted any properties yet
                  </Text>
                </View>
              }
            />
          </View>
        );

      case 'Inventory':
        return (
          <View style={styles.contentContainer}>
            {/* Header */}
            <View style={styles.inventoryHeader}>
              <Text style={styles.inventoryTitle}>My Inventory</Text>
              <Text style={styles.inventorySubtitle}>
                Manage your properties and negotiations with delala merchants
              </Text>
            </View>

            {/* Inventory Properties */}
            <FlatList
              data={filteredData}
              renderItem={({ item }) => (
                <InventoryPropertyCard
                  property={item}
                  onPress={() => handlePropertyPress(item)}
                  onNegotiate={handleNegotiate}
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.propertiesList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="list" size={48} color={COLORS.outline} />
                  <Text style={styles.emptyStateTitle}>No Properties in Inventory</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Post your first property to start working with delala merchants
                  </Text>
                </View>
              }
            />
          </View>
        );

      case 'Messages':
        return (
          <View style={styles.contentContainer}>
            {/* Header */}
            <View style={styles.messagesHeader}>
              <Text style={styles.messagesTitle}>Messages</Text>
              <Text style={styles.messagesSubtitle}>Negotiate with verified delala merchants</Text>
            </View>

            {/* Message Threads */}
            <FlatList
              data={filteredData}
              renderItem={({ item }) => (
                <MessageThread
                  thread={item}
                  onPress={() => handleMessageThreadPress(item)}
                  currentUser={currentUser}
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.messagesList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble" size={48} color={COLORS.outline} />
                  <Text style={styles.emptyStateTitle}>No Messages</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Start negotiating with delala merchants
                  </Text>
                </View>
              }
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />

      {/* Enhanced Top Bar */}
      <EnhancedTopBar
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        userImage="https://lh3.googleusercontent.com/aida-public/AB6AXuCHwmA-YZrrtVyhsk4Sr6u9lf6Bw1m9DgQVeF-DP5u8cb6eFFQuO00EF6s24Cf2c7x_AtxYSPsYUgSthpfi6v8JgXryKaiTUqYV6kgiW8ErWBEuyDdcIxbutNP9Y2vOgOTEOEYI9gywt2ofFAxE1eYEYcN5SMsHEtkkU-OP9DLXBZopRhZDNmkUIqxAPwlCh_mXstEN5oVynZpzJdrdhUjjZsLAx0OBjkYFbnXAh_PQhQqM8Y8HRL7FC8kHGArKfe9d7l8Hnyym2JVU"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>

      {/* FAB */}
      <FAB activeScreen={activeScreen} onPress={handleFABPress} />

      {/* Chat Modal */}
      <ChatModal
        visible={chatModalVisible}
        thread={selectedThread}
        onClose={() => {
          setChatModalVisible(false);
          setSelectedThread(null);
        }}
        onSendMessage={handleSendMessage}
      />
    </View>
  );
}

// â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Top Bar
  topBar: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 1000,
    backgroundColor: '#10131a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuButton: {
    padding: 4,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6366f1',
    fontFamily: Fonts.headline,
    letterSpacing: -0.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 8,
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  navLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  activeNavLinkText: {
    color: '#ffffff',
    fontWeight: '800',
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeNavLink: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  profileContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS['outline-variant'],
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Content
  scrollView: {
    flex: 1,
    marginTop: 110,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  contentContainer: {
    flex: 1,
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 40,
    gap: 24,
  },
  searchContainer: {
    position: 'relative',
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS['on-surface'],
    fontFamily: Fonts.body,
  },

  // Category Filter
  categoryFilter: {
    // Horizontal scroll container
  },
  categoryFilterContent: {
    gap: 12,
    paddingRight: 16,
  },
  categoryChip: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS['surface-container'],
    borderRadius: 12,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.outline,
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  activeCategoryChip: {
    backgroundColor: COLORS.primary,
  },
  activeCategoryChipText: {
    color: COLORS['on-primary'],
  },

  // Properties List
  propertiesList: {
    paddingHorizontal: 16,
    gap: 32,
  },

  // Public Property Card
  propertyCard: {
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 12,
    overflow: 'hidden',
    ...Shadow.xl,
  },
  propertyCardContent: {
    // Content container
  },
  propertyCardImageContainer: {
    position: 'relative',
    aspectRatio: 4 / 3,
    overflow: 'hidden',
  },
  propertyCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  propertyCardFeatures: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  featureBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoBadge: {
    backgroundColor: 'rgba(89, 222, 155, 0.9)',
  },
  verifiedBadgePrimary: {
    backgroundColor: 'rgba(255, 216, 135, 0.9)',
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS['on-primary'],
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },

  // Property Card Content

  propertyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  propertyCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
    flex: 1,
    marginRight: 16,
  },
  propertyCardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.secondary,
    fontFamily: Fonts.headline,
  },
  propertyCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  propertyCardLocationText: {
    fontSize: 14,
    color: COLORS.outline,
    fontFamily: Fonts.body,
  },
  propertyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyCardBroker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brokerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS['surface-container-high'],
    overflow: 'hidden',
  },
  brokerPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS['surface-container-high'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brokerName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS['on-surface-variant'],
    fontFamily: Fonts.body,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS['on-primary'],
    fontFamily: Fonts.label,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS['outline-variant'],
  },
  messageButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },

  // Inventory Card
  inventoryCard: {
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 12,
    overflow: 'hidden',
    ...Shadow.xl,
  },

  inventoryCardImageContainer: {
    position: 'relative',
    aspectRatio: 4 / 3,
    overflow: 'hidden',
  },
  inventoryCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS['on-primary'],
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },

  // Inventory Card Content
  inventoryCardContent: {
    padding: 24,
  },
  inventoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  inventoryCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
    flex: 1,
    marginRight: 16,
  },
  inventoryCardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.secondary,
    fontFamily: Fonts.headline,
  },
  inventoryCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  inventoryCardLocationText: {
    fontSize: 14,
    color: COLORS.outline,
    fontFamily: Fonts.body,
  },


  negotiationSection: {
    marginBottom: 16,
  },
  negotiationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS['on-surface-variant'],
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    marginBottom: 8,
  },
  negotiationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  negotiationMerchant: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS['on-surface'],
    fontFamily: Fonts.body,
  },
  negotiationOffer: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Fonts.headline,
  },
  inventoryCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS['outline-variant'],
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS['on-surface'],
    fontFamily: Fonts.label,
  },
  negotiateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  negotiateButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS['on-primary'],
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },

  // Message Thread
  messageThread: {
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Shadow.md,
  },
  messageThreadContent: {
    // Content container
  },
  messageThreadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  participantImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS['surface-container-high'],
    overflow: 'hidden',
  },
  participantDetails: {
    flex: 1,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
  propertyReference: {
    fontSize: 12,
    color: COLORS.outline,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  messageThreadMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  lastMessageTime: {
    fontSize: 12,
    color: COLORS.outline,
    fontFamily: Fonts.body,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS['on-primary'],
    fontFamily: Fonts.label,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS['on-surface-variant'],
    fontFamily: Fonts.body,
    lineHeight: 20,
    marginBottom: 8,
  },
  agreementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  agreementText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS['on-primary'],
    fontFamily: Fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },

  // Chat Modal
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS['outline-variant'],
  },
  chatBackButton: {
    padding: 8,
    marginRight: 12,
  },
  chatParticipantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  chatParticipantImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS['surface-container-high'],
    overflow: 'hidden',
  },
  chatParticipantName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
  },
  chatPropertyTitle: {
    fontSize: 12,
    color: COLORS.outline,
    fontFamily: Fonts.body,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  ownerMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  merchantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS['surface-container-high'],
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownerMessageText: {
    color: COLORS['on-primary'],
  },
  merchantMessageText: {
    color: COLORS['on-surface'],
  },
  offerContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  offerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS['on-primary'],
    fontFamily: Fonts.label,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  ownerMessageTime: {
    color: COLORS['on-primary'],
  },
  merchantMessageTime: {
    color: COLORS.outline,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS['outline-variant'],
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS['on-surface'],
    fontFamily: Fonts.body,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.primary,
  },
  sendButtonInactive: {
    backgroundColor: COLORS['surface-container-high'],
  },

  // Headers
  inventoryHeader: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  inventoryTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS['on-background'],
    fontFamily: Fonts.headline,
    marginBottom: 8,
  },
  inventorySubtitle: {
    fontSize: 16,
    color: COLORS['on-surface-variant'],
    fontFamily: Fonts.body,
    lineHeight: 24,
  },
  messagesHeader: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  messagesTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS['on-background'],
    fontFamily: Fonts.headline,
    marginBottom: 8,
  },
  messagesSubtitle: {
    fontSize: 16,
    color: COLORS['on-surface-variant'],
    fontFamily: Fonts.body,
    lineHeight: 24,
  },
  messagesList: {
    paddingHorizontal: 16,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS['on-surface'],
    fontFamily: Fonts.headline,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.outline,
    fontFamily: Fonts.body,
    textAlign: 'center',
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 24,
  },
  fabButton: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.xl,
  },
  fabTooltip: {
    position: 'absolute',
    right: 64,
    backgroundColor: COLORS['surface-container-high'],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  fabTooltipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS['on-surface'],
    fontFamily: Fonts.label,
  },
});

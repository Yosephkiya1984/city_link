import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Fonts, FontSize, Shadow } from '../../theme';
import { approveMerchant, rejectMerchant } from '../../services/admin.service';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MerchantModule({ merchants, onRefresh, loading }) {
  const theme = useTheme();
  const isMobile = SCREEN_WIDTH < 768;

  const handleApprove = async (id, name) => {
    if (Platform.OS === 'web') {
      try {
        if (window.confirm(`Approve ${name} as a verified CityLink merchant?`)) {
          const res = await approveMerchant(id);
          if (res.error) window.alert(res.error);
          else onRefresh();
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    Alert.alert('Confirm Approval', `Approve ${name} as a verified CityLink merchant?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          const res = await approveMerchant(id);
          if (res.error) Alert.alert('Error', res.error);
          else onRefresh();
        },
      },
    ]);
  };

  const handleReject = async (id, name) => {
    if (Platform.OS === 'web') {
      try {
        const reason = window.prompt(`Explain why ${name} is being rejected:`, '');
        if (reason !== null) {
          const res = await rejectMerchant(id, reason || 'Incomplete documentation');
          if (res.error) window.alert(res.error);
          else onRefresh();
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}

    Alert.prompt('Rejection Reason', `Explain why ${name} is being rejected:`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async (reason) => {
          const res = await rejectMerchant(id, reason || 'Incomplete documentation');
          if (res.error) Alert.alert('Error', res.error);
          else onRefresh();
        },
      },
    ]);
  };

  const renderMerchant = ({ item }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.rim, padding: isMobile ? 16 : 20 },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.businessInfo}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: theme.primary + '15',
                width: isMobile ? 40 : 48,
                height: isMobile ? 40 : 48,
              },
            ]}
          >
            <Text style={{ color: theme.primary, fontWeight: '800', fontSize: isMobile ? 16 : 18 }}>
              {item.business_name?.[0] || 'B'}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={[
                styles.businessName,
                { color: theme.text, fontFamily: Fonts.label, fontSize: isMobile ? 14 : 16 },
              ]}
              numberOfLines={1}
            >
              {item.business_name}
            </Text>
            <Text
              style={[
                styles.ownerName,
                { color: theme.sub, fontFamily: Fonts.body, fontSize: isMobile ? 11 : 12 },
              ]}
              numberOfLines={1}
            >
              {item.full_name} • {item.merchant_type?.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: theme.amber + '12' }]}>
          <Text style={{ color: theme.amber, fontSize: 9, fontWeight: '800' }}>PENDING</Text>
        </View>
      </View>

      <View
        style={[styles.divider, { backgroundColor: theme.rim, marginVertical: isMobile ? 12 : 16 }]}
      />

      <View style={isMobile ? styles.detailsStack : styles.detailsGrid}>
        <DetailItem label="TIN" value={item.tin || 'N/A'} icon="card-outline" isMobile={isMobile} />
        <DetailItem
          label="License"
          value={item.license_no || 'N/A'}
          icon="document-text-outline"
          isMobile={isMobile}
        />
        {(!isMobile || merchants.length < 5) && (
          <>
            <DetailItem
              label="Location"
              value={`${item.subcity || 'Addis'}`}
              icon="location-outline"
              isMobile={isMobile}
            />
            <DetailItem label="Phone" value={item.phone} icon="call-outline" isMobile={isMobile} />
          </>
        )}
      </View>

      <View style={[styles.actions, { gap: isMobile ? 8 : 12 }]}>
        <TouchableOpacity
          onPress={() => handleReject(item.id, item.business_name)}
          style={[styles.rejectBtn, { borderColor: theme.red + '30', height: isMobile ? 40 : 44 }]}
        >
          <Text style={{ color: theme.red, fontFamily: Fonts.label, fontSize: isMobile ? 12 : 14 }}>
            Reject
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleApprove(item.id, item.business_name)}
          style={[
            styles.approveBtn,
            { backgroundColor: theme.primary, height: isMobile ? 40 : 44 },
          ]}
        >
          <Text style={{ color: theme.ink, fontFamily: Fonts.label, fontSize: isMobile ? 12 : 14 }}>
            Approve
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : merchants.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shield-checkmark-outline" size={48} color={theme.rim} />
          <Text style={{ color: theme.sub, marginTop: 12 }}>No pending merchants</Text>
        </View>
      ) : (
        <FlatList
          data={merchants}
          keyExtractor={(item) => item.id}
          renderItem={renderMerchant}
          contentContainerStyle={{ padding: isMobile ? 16 : 24, paddingBottom: 100 }}
          numColumns={SCREEN_WIDTH > 1000 ? 2 : 1}
          columnWrapperStyle={SCREEN_WIDTH > 1000 ? { gap: 24 } : null}
        />
      )}
    </View>
  );
}

function DetailItem({ label, value, icon, isMobile }) {
  const theme = useTheme();
  return (
    <View style={[styles.detailItem, isMobile && { width: '100%', marginBottom: 6 }]}>
      <Ionicons name={icon} size={14} color={theme.sub} style={{ marginRight: 6 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.detailLabel, { color: theme.hint }]}>{label.toUpperCase()}</Text>
        <Text
          style={[styles.detailValue, { color: theme.textSoft, fontSize: isMobile ? 12 : 13 }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 20,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  businessInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessName: {
    fontSize: 16,
  },
  ownerName: {
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  divider: {
    height: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  detailsStack: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    width: '45%',
    minWidth: 140,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailValue: {
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  rejectBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    flex: 2,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
});

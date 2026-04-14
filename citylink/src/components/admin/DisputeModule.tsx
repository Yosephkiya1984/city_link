import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Fonts, FontSize, Shadow } from '../../theme';
import { supaQuery } from '../../services/supabase';
import { rpcReleaseEscrow, rpcCancelAndRefundOrder } from '../../services/marketplace.service';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface Dispute {
  id: string;
  type: 'MARKETPLACE' | 'RESTAURANT';
  name: string;
  amount: number;
  total: number;
  status: string;
  dispute_reason?: string;
  reason?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    phone: string;
  };
  escrow_id?: string;
}

export default function DisputeModule() {
  const theme = useTheme();
  const isMobile = SCREEN_WIDTH < 768;
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  const fetchDisputes = async () => {
    setLoading(true);
    // Combine both Marketplace and Restaurant disputes.
    // We fetch food orders without a join first to avoid relationship hint errors (citizen_id FK ambiguous)
    const [mktRes, foodRes] = await Promise.all([
      supaQuery((c) =>
        c
          .from('marketplace_orders')
          .select('*, profiles!buyer_id(full_name, phone)')
          .eq('status', 'DISPUTED')
          .order('created_at', { ascending: false })
      ),
      supaQuery((c) =>
        c
          .from('food_orders')
          .select('*')
          .eq('status', 'DISPUTED')
          .order('created_at', { ascending: false })
      ),
    ]);

    const mkt = (mktRes.data || []).map((d) => ({
      ...d,
      type: 'MARKETPLACE',
      name: d.product_name,
      amount: d.total,
    }));

    // Manual mapping for food users to avoid relationship hint errors
    const foodRaw = foodRes.data || [];
    const citizenIds = [...new Set(foodRaw.map((o) => o.citizen_id).filter((id) => !!id))];

    const profileMap: Record<string, any> = {};
    if (citizenIds.length > 0) {
      const { data: profiles } = await supaQuery((c) =>
        c.from('profiles').select('id, full_name, phone').in('id', citizenIds)
      );
      (profiles || []).forEach((p) => {
        profileMap[p.id] = p;
      });
    }

    const food = foodRaw.map((d) => ({
      ...d,
      type: 'RESTAURANT',
      name: d.restaurant_name || 'Food Order',
      amount: d.total,
      profiles: profileMap[d.citizen_id],
    }));

    setDisputes(
      ([...mkt, ...food] as Dispute[]).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async (dispute: Dispute, action: 'REFUND' | 'RELEASE') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    const actionLabel = action === 'REFUND' ? 'Refund Buyer' : 'Release Funds';

    if (Platform.OS === 'web') {
      if (window.confirm(`Confirm ${actionLabel.toLowerCase()} for this ${dispute.type} case?`)) {
        let res;
        if (dispute.type === 'MARKETPLACE') {
          if (action === 'REFUND')
            res = await rpcCancelAndRefundOrder(dispute.id, 'Resolved by Admin');
          else {
            if (!dispute.escrow_id) {
              window.alert('No escrow lock found for this dispute. Manual intervention required.');
              return;
            }
            res = await rpcReleaseEscrow(dispute.escrow_id, dispute.id);
          }
        } else {
          const targetStatus = action === 'REFUND' ? 'CANCELLED' : 'COMPLETED';
          res = await supaQuery((c) =>
            c.from('food_orders').update({ status: targetStatus }).eq('id', dispute.id)
          );
        }

        if (res.error) window.alert(res.error);
        else {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
          fetchDisputes();
          setSelectedDispute(null);
        }
      }
      return;
    }

    Alert.alert(
      'Resolve Dispute',
      `Confirm ${actionLabel.toLowerCase()} for this ${dispute.type} case?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: action === 'REFUND' ? 'destructive' : 'default',
          onPress: async () => {
            let res;
            if (dispute.type === 'MARKETPLACE') {
              if (action === 'REFUND')
                res = await rpcCancelAndRefundOrder(dispute.id, 'Resolved by Admin');
              else {
                if (!dispute.escrow_id) {
                  Alert.alert('Error', 'No escrow lock found for this dispute. Manual intervention required.');
                  return;
                }
                res = await rpcReleaseEscrow(dispute.escrow_id, dispute.id);
              }
            } else {
              // Restaurant resolving (standard status based for now)
              const targetStatus = action === 'REFUND' ? 'CANCELLED' : 'COMPLETED';
              res = await supaQuery((c) =>
                c.from('food_orders').update({ status: targetStatus }).eq('id', dispute.id)
              );
            }

            if (res.error) Alert.alert('Error', res.error);
            else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              fetchDisputes();
              setSelectedDispute(null);
            }
          },
        },
      ]
    );
  };

  const renderDisputeCard = ({ item }: { item: Dispute }) => {
    const isSelected = selectedDispute?.id === item.id;
    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedDispute(item);
          Haptics.selectionAsync();
        }}
        style={[
          styles.disputeCard,
          {
            backgroundColor: theme.surface,
            borderColor: isSelected ? theme.primary : theme.rim,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.typeBox}>
            <MaterialCommunityIcons
              name={(item.type === 'MARKETPLACE' ? 'shopping-outline' : 'food-outline') as any}
              size={12}
              color={item.type === 'MARKETPLACE' ? theme.primary : theme.secondary}
            />
            <Text
              style={[
                styles.typeLabel,
                { color: item.type === 'MARKETPLACE' ? theme.primary : theme.secondary },
              ]}
            >
              {item.type}
            </Text>
          </View>
          <Text style={[styles.timeLabel, { color: theme.hint }]}>ID: {item.id.slice(0, 6)}</Text>
        </View>

        <Text
          style={[styles.productName, { color: theme.text, fontFamily: Fonts.label }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={[styles.reason, { color: theme.red, fontFamily: Fonts.body }]}
          numberOfLines={2}
        >
          {item.dispute_reason || item.reason || 'Buyer claims issue with quality/delivery'}
        </Text>

        <View style={styles.amountBox}>
          <Text style={[styles.amount, { color: theme.primary, fontFamily: Fonts.headline }]}>
            {item.total} ETB
          </Text>
          <Ionicons name="alert-circle" size={16} color={theme.red} />
        </View>
      </TouchableOpacity>
    );
  };

  const showSidebar = !isMobile || !selectedDispute;
  const showDetail = !isMobile || selectedDispute;

  return (
    <View style={styles.container}>
      {showSidebar && (
        <View
          style={[
            styles.sidebar,
            isMobile && { width: '100%', borderRightWidth: 0 },
            { borderRightColor: theme.rim },
          ]}
        >
          <View style={styles.moduleHeader}>
            <Text style={[styles.moduleTitle, { color: theme.text, fontFamily: Fonts.headline }]}>
              Active Disputes
            </Text>
            <View style={[styles.countBadge, { backgroundColor: theme.primary }]}>
              <Text style={{ color: theme.ink, fontWeight: '800', fontSize: 10 }}>
                {disputes.length}
              </Text>
            </View>
          </View>

          <FlatList
            data={disputes}
            renderItem={renderDisputeCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', marginTop: 40, padding: 20 }}>
                {loading ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <>
                    <Ionicons name="documents-outline" size={40} color={theme.rim} />
                    <Text style={{ color: theme.sub, marginTop: 12, textAlign: 'center' }}>
                      No active disputes in the city registry.
                    </Text>
                  </>
                )}
              </View>
            )}
          />
        </View>
      )}

      {showDetail && (
        <View style={styles.mainArea}>
          {selectedDispute ? (
            <ScrollView contentContainerStyle={{ padding: isMobile ? 20 : 40, paddingBottom: 100 }}>
              {isMobile && (
                <TouchableOpacity onPress={() => setSelectedDispute(null)} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color={theme.primary} />
                  <Text style={{ color: theme.primary, marginLeft: 8, fontFamily: Fonts.label }}>
                    BACK TO LIST
                  </Text>
                </TouchableOpacity>
              )}

              <View style={[styles.detailHeader, isMobile && { flexDirection: 'column', gap: 20 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.caseId, { color: theme.sub }]}>
                    CASE ID: {selectedDispute.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.largeTitle,
                      {
                        color: theme.text,
                        fontFamily: Fonts.headline,
                        fontSize: isMobile ? 22 : 28,
                      },
                    ]}
                  >
                    {selectedDispute.name}
                  </Text>
                  <View style={styles.identityStrip}>
                    <Text style={{ color: theme.sub, fontSize: 12 }}>
                      Buyer: {selectedDispute.profiles?.full_name || 'Citizen'}
                    </Text>
                  </View>
                </View>
                <View style={styles.actionGroup}>
                  <TouchableOpacity
                    onPress={() => handleResolve(selectedDispute, 'REFUND')}
                    style={[
                      styles.actionBtn,
                      { borderColor: theme.red, flex: 1, height: isMobile ? 44 : 48 },
                    ]}
                  >
                    <Text style={{ color: theme.red, fontSize: 12, fontFamily: Fonts.label }}>
                      REFUND
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleResolve(selectedDispute, 'RELEASE')}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: theme.primary, flex: 2, height: isMobile ? 44 : 48 },
                    ]}
                  >
                    <Text style={{ color: theme.ink, fontSize: 12, fontFamily: Fonts.label }}>
                      RELEASE FUNDS
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.evidenceSection}>
                <Text style={[styles.sectionLabel, { color: theme.sub, fontFamily: Fonts.label }]}>
                  CASE EVIDENCE
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.evidencePlaceholder,
                        {
                          backgroundColor: theme.rim,
                          borderColor: theme.rim,
                          width: isMobile ? 120 : 160,
                          height: isMobile ? 90 : 120,
                        },
                      ]}
                    >
                      <Ionicons name="image-outline" size={24} color={theme.sub} />
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.historySection}>
                <Text style={[styles.sectionLabel, { color: theme.sub, fontFamily: Fonts.label }]}>
                  INVESTIGATION LOGS
                </Text>
                <LogItem
                  time="10:24 AM"
                  user="SYSTEM"
                  text={`Registry entry for ${selectedDispute.type} dispute.`}
                  isMobile={isMobile}
                />
                <LogItem
                  time="10:25 AM"
                  user="BUYER"
                  text={selectedDispute.dispute_reason || 'Item/Service was not as described.'}
                  isMobile={isMobile}
                />
                <LogItem
                  time="12:30 PM"
                  user="BOT"
                  text="Automated damage/quality verification pending."
                  isMobile={isMobile}
                />
              </View>
            </ScrollView>
          ) : (
            <View style={styles.centerContent}>
              <MaterialCommunityIcons name="gavel" size={80} color={theme.rim} />
              <Text style={[styles.emptyPrompt, { color: theme.sub }]}>
                SELECT A DISPUTE TO RESOLVE
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function LogItem({ time, user, text, isMobile }: { time: string; user: string; text: string; isMobile: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.logItem,
        { flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 4 : 12, marginBottom: 16 },
      ]}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Text style={[styles.logTime, { color: theme.hint }]}>{time}</Text>
        <Text style={[styles.logUser, { color: theme.primary }]}>[{user}]</Text>
      </View>
      <Text style={[styles.logText, { color: theme.textSoft }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 300,
    borderRightWidth: 1,
  },
  moduleHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moduleTitle: {
    fontSize: 18,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  disputeCard: {
    padding: 14,
    borderRadius: Radius.lg,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeLabel: {
    fontSize: 10,
  },
  productName: {
    fontSize: 14,
    marginBottom: 2,
  },
  reason: {
    fontSize: 11,
    marginBottom: 12,
  },
  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 15,
  },
  mainArea: {
    flex: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPrompt: {
    letterSpacing: 2,
    marginTop: 20,
    fontSize: 12,
    fontWeight: '700',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  caseId: {
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 4,
  },
  largeTitle: {
    lineHeight: 34,
  },
  identityStrip: {
    marginTop: 8,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
  },
  evidenceSection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  evidencePlaceholder: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySection: {
    marginBottom: 32,
  },
  logItem: {
    alignItems: 'flex-start',
  },
  logTime: {
    fontSize: 10,
    fontWeight: '600',
    minWidth: 60,
  },
  logUser: {
    fontSize: 10,
    fontWeight: '800',
    minWidth: 50,
  },
  logText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});

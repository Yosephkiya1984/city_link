import React, { useState, useEffect, useCallback } from 'react';
import { User, DeliveryAgent } from '../../types';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Fonts } from '../../theme';
import { Surface } from '../ui/Surface';
import { Typography } from '../ui/Typography';
import { supaQuery } from '../../services/supabase';
import { approveAgent, rejectAgent } from '../../services/admin.service';
import * as Haptics from 'expo-haptics';
import { t } from '../../utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DeliveryAgentModule() {
  const theme = useTheme();
  const isMobile = SCREEN_WIDTH < 768;
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAgent, setSelectedAgent] = useState<DeliveryAgent | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadAgentsData = useCallback(async () => {
    const { data } = await supaQuery((c) =>
      c
        .from('delivery_agents')
        .select(`*, profile:profiles!delivery_agents_id_fkey(full_name, phone, subcity)`)
        .order('created_at', { ascending: false })
    );
    return data || [];
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    const data = await loadAgentsData();
    setAgents(data);
    setLoading(false);
  }, [loadAgentsData]);

  useEffect(() => {
    let ignore = false;
    loadAgentsData().then((data) => {
      if (!ignore) {
        setAgents(data);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadAgentsData]);

  const handleApprove = (agent: DeliveryAgent) => {
    const name = agent.profile?.full_name || String(agent.id).slice(0, 8);

    if (Platform.OS === 'web') {
      try {
        if (window.confirm(t('approve_confirm'))) {
          approveAgent(agent.id).then((res) => {
            if (res.error) window.alert(res.error);
            else handleRefresh();
          });
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      /* ignore */
    }

    Alert.alert(t('approve_agent'), t('approve_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('approve'),
        onPress: async () => {
          setLoading(true);
          const res = await approveAgent(agent);
          if (res.error) {
            Alert.alert('Error', res.error);
            setLoading(false);
          } else {
            handleRefresh();
          }
        },
      },
    ]);
  };

  const handleReject = (agent: DeliveryAgent) => {
    const name = agent.profile?.full_name || String(agent.id).slice(0, 8);

    if (Platform.OS === 'web') {
      try {
        const reason = window.prompt(t('explain_rejection'), '');
        if (reason !== null) {
          rejectAgent(agent.id, reason || t('incomplete_docs')).then((res) => {
            if (res.error) window.alert(res.error);
            else handleRefresh();
          });
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      /* ignore */
    }

    Alert.prompt(t('rejection_reason'), t('explain_rejection'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('reject'),
        style: 'destructive',
        onPress: async (reason?: string) => {
          setLoading(true);
          const res = await rejectAgent(agent.id, reason || t('incomplete_docs'));
          if (res.error) {
            Alert.alert('Error', res.error);
            setLoading(false);
          } else {
            handleRefresh();
          }
        },
      },
    ]);
  };

  const handleSuspend = (agent: DeliveryAgent) => {
    const name = agent.profile?.full_name || String(agent.id).slice(0, 8);
    const action = agent.agent_status === 'SUSPENDED' ? t('reactivate') : t('suspend');
    const newStatus = agent.agent_status === 'SUSPENDED' ? 'APPROVED' : 'SUSPENDED';

    if (Platform.OS === 'web') {
      try {
        if (window.confirm(`${action} ${name}?`)) {
          supaQuery((c) =>
            c.from('delivery_agents').update({ agent_status: newStatus }).eq('id', agent.id)
          ).then((res) => {
            if (res.error) window.alert(res.error);
            else handleRefresh();
          });
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      /* ignore */
    }

    Alert.alert(`${action} ${t('role_agent')}`, `${action} ${name}?`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: action,
        style: agent.agent_status === 'SUSPENDED' ? 'default' : 'destructive',
        onPress: async () => {
          const res = await supaQuery((c) =>
            c.from('delivery_agents').update({ agent_status: newStatus }).eq('id', agent.id)
          );
          if (res.error) Alert.alert('Error', res.error);
          else handleRefresh();
        },
      },
    ]);
  };

  const statusColor = (status: DeliveryAgent['agent_status']) => {
    if (status === 'APPROVED') return theme.green || '#68d391';
    if (status === 'SUSPENDED') return theme.red || '#fc8181';
    return theme.amber || '#f6e05e';
  };

  const vehicleIcon = (v: DeliveryAgent['vehicle_type']) => {
    switch (v) {
      case 'motorcycle':
        return 'bicycle';
      case 'car':
        return 'car';
      case 'bicycle':
        return 'bicycle';
      case 'tuktuk':
        return 'car-sport';
      case 'foot':
        return 'walk';
      default:
        return 'car';
    }
  };

  const renderAgent = ({ item }: { item: DeliveryAgent }) => (
    <Surface variant="card" padding={16} radius="xl" style={{ marginBottom: 14 }}>
      <View style={styles.cardHeader}>
        <View style={styles.agentInfo}>
          <View style={[styles.avatar, { backgroundColor: statusColor(item.agent_status) + '20' }]}>
            <Ionicons
              name={vehicleIcon(item.vehicle_type) as any}
              size={20}
              color={statusColor(item.agent_status)}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {item.profile?.full_name || t('unknown_agent')}
            </Text>
            <Text style={[styles.sub, { color: theme.sub }]} numberOfLines={1}>
              {t(item.vehicle_type?.toLowerCase() || 'car')} •{' '}
              {item.profile?.phone || t('no_phone')}
            </Text>
          </View>
        </View>
        <View
          style={[styles.statusPill, { backgroundColor: statusColor(item.agent_status) + '18' }]}
        >
          <Text style={{ color: statusColor(item.agent_status), fontSize: 9, fontWeight: '800' }}>
            {item.agent_status}
          </Text>
        </View>
        <TouchableOpacity style={styles.inspectBtn} onPress={() => setSelectedAgent(item)}>
          <Ionicons name="eye-outline" size={16} color={theme.primary} />
          <Text style={[styles.inspectBtnText, { color: theme.primary }]}>
            {t('inspect').toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.rim }]} />

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.hint }]}>
            {t('plate').toUpperCase()}
          </Text>
          <Text style={[styles.detailValue, { color: theme.sub }]}>
            {item.plate_number || 'N/A'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.hint }]}>
            {t('license').toUpperCase()}
          </Text>
          <Text style={[styles.detailValue, { color: theme.sub }]}>{item.license_number}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.hint }]}>
            {t('deliveries').toUpperCase()}
          </Text>
          <Text style={[styles.detailValue, { color: theme.sub }]}>
            {item.total_deliveries || 0}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.hint }]}>
            {t('rating').toUpperCase()}
          </Text>
          <Text style={[styles.detailValue, { color: theme.sub }]}>
            ⭐ {Number(item.rating || 5).toFixed(1)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {item.agent_status === 'PENDING' ? (
          <>
            <TouchableOpacity
              onPress={() => handleReject(item)}
              style={[styles.rejectBtn, { borderColor: (theme.red || '#fc8181') + '30' }]}
            >
              <Text
                style={{ color: theme.red || '#fc8181', fontFamily: Fonts.label, fontSize: 12 }}
              >
                {t('reject')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleApprove(item)}
              style={[styles.approveBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={{ color: theme.ink, fontFamily: Fonts.label, fontSize: 12 }}>
                {t('approve')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => handleSuspend(item)}
            style={[
              styles.toggleBtn,
              {
                backgroundColor:
                  item.agent_status === 'SUSPENDED'
                    ? (theme.green || '#68d391') + '15'
                    : (theme.red || '#fc8181') + '15',
                borderColor:
                  item.agent_status === 'SUSPENDED'
                    ? (theme.green || '#68d391') + '40'
                    : (theme.red || '#fc8181') + '40',
              },
            ]}
          >
            <Ionicons
              name={item.agent_status === 'SUSPENDED' ? 'checkmark-circle' : 'ban'}
              size={14}
              color={
                item.agent_status === 'SUSPENDED'
                  ? theme.green || '#68d391'
                  : theme.red || '#fc8181'
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                color:
                  item.agent_status === 'SUSPENDED'
                    ? theme.green || '#68d391'
                    : theme.red || '#fc8181',
                fontFamily: Fonts.label,
                fontSize: 12,
              }}
            >
              {item.agent_status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Surface>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : agents.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bicycle-outline" size={48} color={theme.rim} />
          <Text style={{ color: theme.sub, marginTop: 12 }}>{t('no_agents_registered')}</Text>
        </View>
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id}
          renderItem={renderAgent}
          contentContainerStyle={{ padding: isMobile ? 16 : 24, paddingBottom: 100 }}
        />
      )}

      {/* ══ Agent Inspection Dossier ══ */}
      {selectedAgent && (
        <View style={styles.modalOverlay}>
          <View style={[styles.dossierSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.dossierHeader}>
              <View>
                <Text style={[styles.dossierTitle, { color: theme.text }]}>
                  {t('agent_dossier')}
                </Text>
                <Text style={[styles.dossierId, { color: theme.hint }]}>
                  ID: {selectedAgent.id}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedAgent(null)}>
                <Ionicons name="close-circle" size={28} color={theme.sub} />
              </TouchableOpacity>
            </View>

            <View style={[styles.dossierContent, { borderColor: theme.rim }]}>
              <View style={styles.dossierRow}>
                <View style={styles.dossierField}>
                  <Text style={styles.dossierLabel}>{t('full_name').toUpperCase()}</Text>
                  <Text style={[styles.dossierValue, { color: theme.text }]}>
                    {selectedAgent.profile?.full_name}
                  </Text>
                </View>
                <View style={styles.dossierField}>
                  <Text style={styles.dossierLabel}>{t('fayda_status')}</Text>
                  <View style={styles.verifiedRow}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.green} />
                    <Text
                      style={{ color: theme.green, fontWeight: '800', fontSize: 12, marginLeft: 4 }}
                    >
                      {t('verified').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.dossierRow}>
                <View style={styles.dossierField}>
                  <Text style={styles.dossierLabel}>{t('vehicle_type').toUpperCase()}</Text>
                  <Text style={[styles.dossierValue, { color: theme.text }]}>
                    {t(selectedAgent.vehicle_type?.toLowerCase() || 'car').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.dossierField}>
                  <Text style={styles.dossierLabel}>{t('plate_number').toUpperCase()}</Text>
                  <Text style={[styles.dossierValue, { color: theme.text }]}>
                    {selectedAgent.plate_number || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.dossierRow}>
                <View style={styles.dossierField}>
                  <Text style={styles.dossierLabel}>{t('license_id_no')}</Text>
                  <Text style={[styles.dossierValue, { color: theme.text }]}>
                    {selectedAgent.license_number}
                  </Text>
                </View>
                <View style={styles.dossierField}>
                  <Text style={styles.dossierLabel}>{t('phone').toUpperCase()}</Text>
                  <Text style={[styles.dossierValue, { color: theme.text }]}>
                    {selectedAgent.profile?.phone}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.dossierActions}>
              {selectedAgent.agent_status === 'PENDING' ? (
                <>
                  <TouchableOpacity
                    style={[styles.dossierRejectBtn, { borderColor: theme.red + '40' }]}
                    onPress={() => {
                      handleReject(selectedAgent);
                      setSelectedAgent(null);
                    }}
                  >
                    <Text style={{ color: theme.red, fontWeight: '900' }}>
                      {t('reject_application').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dossierApproveBtn, { backgroundColor: theme.primary }]}
                    onPress={() => {
                      handleApprove(selectedAgent);
                      setSelectedAgent(null);
                    }}
                  >
                    <Text style={{ color: theme.ink, fontWeight: '900' }}>
                      {t('grant_permit').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.dossierToggleBtn,
                    {
                      backgroundColor:
                        selectedAgent.agent_status === 'SUSPENDED'
                          ? theme.green + '20'
                          : theme.red + '20',
                    },
                  ]}
                  onPress={() => {
                    handleSuspend(selectedAgent);
                    setSelectedAgent(null);
                  }}
                >
                  <Text
                    style={{
                      color: selectedAgent.agent_status === 'SUSPENDED' ? theme.green : theme.red,
                      fontWeight: '900',
                    }}
                  >
                    {selectedAgent.agent_status === 'SUSPENDED'
                      ? 'REACTIVE AGENT'
                      : 'SUSPEND PERMIT'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { padding: 16, borderRadius: Radius.xl, borderWidth: 1, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  agentInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 14, fontFamily: Fonts.label },
  sub: { fontSize: 11, fontFamily: Fonts.body, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  divider: { height: 1, marginVertical: 12 },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  detailItem: { minWidth: 70 },
  detailLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  detailValue: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    flex: 2,
    borderRadius: Radius.lg,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  // Inspection Dossier Styles
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(99,179,237,0.1)',
  },
  inspectBtnText: { fontSize: 10, fontWeight: '800' },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  dossierSheet: {
    width: '100%',
    maxWidth: 500,
    borderRadius: Radius['2xl'],
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  dossierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  dossierTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  dossierId: { fontSize: 10, marginTop: 4, fontFamily: Fonts.body },

  dossierContent: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 20, gap: 20 },
  dossierRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 },
  dossierField: { flex: 1 },
  dossierLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dossierValue: { fontSize: 14, fontWeight: '700' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center' },

  dossierActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  dossierRejectBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dossierApproveBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dossierToggleBtn: {
    width: '100%',
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

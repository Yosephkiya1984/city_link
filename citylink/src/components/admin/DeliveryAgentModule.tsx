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
import { supaQuery } from '../../services/supabase';
import { approveAgent, rejectAgent } from '../../services/admin.service';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DeliveryAgentModule() {
  const theme = useTheme();
  const isMobile = SCREEN_WIDTH < 768;
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    const { data } = await supaQuery((c) =>
      c
        .from('delivery_agents')
        .select(`*, profile:profiles!delivery_agents_id_fkey(full_name, phone, subcity)`)
        .order('created_at', { ascending: false })
    );
    setAgents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleApprove = (agent: DeliveryAgent) => {
    const name = agent.profile?.full_name || String(agent.id).slice(0, 8);

    if (Platform.OS === 'web') {
      try {
        if (window.confirm(`Approve ${name} as a delivery agent?`)) {
          approveAgent(agent.id).then((res) => {
            if (res.error) window.alert(res.error);
            else loadAgents();
          });
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    Alert.alert('Approve Agent', `Approve ${name} as a delivery agent?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setLoading(true);
          const res = await approveAgent(agent);
          if (res.error) {
            Alert.alert('Error', res.error);
            setLoading(false);
          } else {
            loadAgents();
          }
        },
      },
    ]);
  };

  const handleReject = (agent: DeliveryAgent) => {
    const name = agent.profile?.full_name || String(agent.id).slice(0, 8);

    if (Platform.OS === 'web') {
      try {
        const reason = window.prompt(`Explain why ${name} is being rejected:`, '');
        if (reason !== null) {
          rejectAgent(agent.id, reason || 'Incomplete documentation').then((res) => {
            if (res.error) window.alert(res.error);
            else loadAgents();
          });
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
        onPress: async (reason?: string) => {
          setLoading(true);
          const res = await rejectAgent(agent.id, reason || 'Incomplete documentation');
          if (res.error) {
            Alert.alert('Error', res.error);
            setLoading(false);
          } else {
            loadAgents();
          }
        },
      },
    ]);
  };

  const handleSuspend = (agent: DeliveryAgent) => {
    const name = agent.profile?.full_name || String(agent.id).slice(0, 8);
    const action = agent.agent_status === 'SUSPENDED' ? 'Reactivate' : 'Suspend';
    const newStatus = agent.agent_status === 'SUSPENDED' ? 'APPROVED' : 'SUSPENDED';

    if (Platform.OS === 'web') {
      try {
        if (window.confirm(`${action} ${name}?`)) {
          supaQuery((c) =>
            c.from('delivery_agents').update({ agent_status: newStatus }).eq('id', agent.id)
          ).then((res) => {
            if (res.error) window.alert(res.error);
            else loadAgents();
          });
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}

    Alert.alert(`${action} Agent`, `${action} ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: agent.agent_status === 'SUSPENDED' ? 'default' : 'destructive',
        onPress: async () => {
          const res = await supaQuery((c) =>
            c.from('delivery_agents').update({ agent_status: newStatus }).eq('id', agent.id)
          );
          if (res.error) Alert.alert('Error', res.error);
          else loadAgents();
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
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.rim }]}>
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
              {item.profile?.full_name || 'Unknown Agent'}
            </Text>
            <Text style={[styles.sub, { color: theme.sub }]} numberOfLines={1}>
              {item.vehicle_type?.toUpperCase()} • {item.profile?.phone || 'No phone'}
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
      </View>

      <View style={[styles.divider, { backgroundColor: theme.rim }]} />

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.hint }]}>PLATE</Text>
          <Text style={[styles.detailValue, { color: theme.sub }]}>
            {item.plate_number || 'N/A'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.hint }]}>LICENSE</Text>
          <Text style={[styles.detailValue, { color: theme.sub }]}>{item.license_number}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.hint }]}>DELIVERIES</Text>
          <Text style={[styles.detailValue, { color: theme.sub }]}>
            {item.total_deliveries || 0}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.hint }]}>RATING</Text>
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
                Reject
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleApprove(item)}
              style={[styles.approveBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={{ color: theme.ink, fontFamily: Fonts.label, fontSize: 12 }}>
                Approve
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
    </View>
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
          <Text style={{ color: theme.sub, marginTop: 12 }}>No delivery agents registered</Text>
        </View>
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id}
          renderItem={renderAgent}
          contentContainerStyle={{ padding: isMobile ? 16 : 24, paddingBottom: 100 }}
        />
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
});

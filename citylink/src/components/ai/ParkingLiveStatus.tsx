import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getClient } from '../../services/supabase';
import { Colors, LightColors, Fonts, Radius, Shadow } from '../../theme';
import { useSystemStore } from '../../store/SystemStore';
import { MotiView } from 'moti';
import { t } from '../../utils/i18n';

interface ParkingLiveStatusProps {
  sessionId: string;
  plate: string;
}

export const ParkingLiveStatus: React.FC<ParkingLiveStatusProps> = ({ sessionId, plate }) => {
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState<string>('00:00:00');

  useEffect(() => {
    const client = getClient();
    if (!client) { setLoading(false); return; }

    // Initial fetch
    const fetchSession = async () => {
      const { data } = await client
        .from('parking_sessions')
        .select('*, parking_lots(name)')
        .eq('id', sessionId)
        .single();

      if (data) setSession(data);
      setLoading(false);
    };

    fetchSession();

    // Realtime subscription
    const channel = client
      .channel(`parking_${sessionId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parking_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload: any) => {
          setSession((prev: any) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    let timer: any;
    if (session?.status === 'ACTIVE' && session.entry_at) {
      timer = setInterval(() => {
        const start = new Date(session.entry_at).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, now - start);
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setDuration(`${h}:${m}:${s}`);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [session?.status, session?.entry_at]);

  if (loading) return null;
  if (!session) return <Text style={{ color: C.sub }}>Session not found</Text>;

  const getStatusConfig = () => {
    switch (session.status) {
      case 'PENDING_AUTH':
        return {
          text: t('parking_waiting_auth'),
          icon: 'shield-checkmark-outline',
          color: C.amber,
          sub: t('parking_waiting_auth_desc')
        };
      case 'RESERVED':
        return { 
          text: t('parking_heading_lot'), 
          icon: 'navigate-circle', 
          color: C.primary,
          sub: t('parking_entry_pending', { name: session.parking_lots?.name || 'lot' })
        };
      case 'ACTIVE':
        const serviceNames = (session.services || []).join(', ').replace(/_/g, ' ');
        return { 
          text: t('parking_active'), 
          icon: 'checkmark-circle', 
          color: C.green,
          sub: t('parking_duration', { time: duration }) + (serviceNames ? ` • ${serviceNames}` : '')
        };
      case 'COMPLETED':
        return { 
          text: t('session_ended'), 
          icon: 'exit-outline', 
          color: C.sub,
          sub: t('session_ended_desc') + `: ${session.total_amount} ETB`
        };
      default:
        return { text: session.status, icon: 'help-circle', color: C.sub, sub: '' };
    }
  };

  const config = getStatusConfig();

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={[styles.container, { backgroundColor: C.lift, borderColor: config.color + '44' }]}
    >
      <View style={styles.header}>
        <MotiView
          animate={{ 
            opacity: ['ACTIVE', 'PENDING_AUTH'].includes(session.status) ? [1, 0.4, 1] : 1,
            scale: session.status === 'PENDING_AUTH' ? [1, 1.1, 1] : 1
          }}
          transition={{ loop: true, duration: session.status === 'PENDING_AUTH' ? 1000 : 1500 }}
        >
          <Ionicons name={config.icon as any} size={24} color={config.color} />
        </MotiView>
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusText, { color: C.text }]}>{config.text}</Text>
          <Text style={[styles.subText, { color: C.sub }]}>{config.sub}</Text>
        </View>
      </View>

      <View style={[styles.plateBadge, { backgroundColor: C.edge2 }]}>
        <Text style={[styles.plateText, { color: C.text }]}>{plate}</Text>
      </View>

      {session.status === 'RESERVED' && (
        <TouchableOpacity style={[styles.qrBtn, { backgroundColor: C.primary }]}>
          <Ionicons name="keypad-outline" size={18} color="#fff" />
          <Text style={styles.qrBtnText}>{t('parking_show_code')}</Text>
        </TouchableOpacity>
      )}
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: 12,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  subText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  plateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  plateText: {
    fontSize: 14,
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  qrBtnText: {
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: 14,
  }
});

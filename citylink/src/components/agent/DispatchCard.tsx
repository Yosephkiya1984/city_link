import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Surface } from '../ui/Surface';
import { Typography } from '../ui/Typography';
import { DarkColors as T, Fonts } from '../../theme';
import { t } from '../../utils/i18n';

// --- Props ---
interface DispatchCardProps {
  dispatch: any;
  onAccept: (d: any) => void;
  onDecline: (d: any) => void;
}

// --- Countdown Hook ---
function useCountdown(expiresAt: string) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecs(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return secs;
}

function fmtETB(n: number) {
  return (n || 0).toLocaleString('en-ET');
}

export function DispatchCard({ dispatch, onAccept, onDecline }: DispatchCardProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  const secs = useCountdown(dispatch.expires_at);
  const order = dispatch.order;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const mins = Math.floor(secs / 60);
  const sec = secs % 60;
  const urgent = secs < 60;

  return (
    <Animated.View
      style={[
        s.dispatchCard,
        {
          transform: [{ scale: pulse }],
          backgroundColor: T.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: T.edge,
        },
      ]}
    >
      <LinearGradient colors={['#131720', '#0B0D11']} style={s.dispatchGradient}>
        {/* Header */}
        <View style={s.dispatchHeader}>
          <View style={s.dispatchBadge}>
            <Ionicons name="flash" size={14} color={T.yellow} />
            <Text style={s.dispatchBadgeText}>{t('new_delivery_job_title')}</Text>
          </View>
          <View style={[s.timerBox, urgent && { backgroundColor: T.redDim }]}>
            <Ionicons name="timer-outline" size={14} color={urgent ? T.red : T.yellow} />
            <Text style={[s.timerText, urgent && { color: T.red }]}>
              {mins}:{sec.toString().padStart(2, '0')}
            </Text>
          </View>
        </View>

        {/* Pickup */}
        <View style={s.addressRow}>
          <View style={[s.dot, { backgroundColor: T.green }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.addressLabel}>{t('role_merchant').toUpperCase()}</Text>
            <Text style={s.addressText}>
              {order?.merchant?.business_name ||
                order?.merchant?.merchant_name ||
                order?.merchant?.full_name ||
                t('role_merchant')}
            </Text>
            <Text style={s.addressSub}>
              {order?.merchant?.subcity || order?.merchant?.address || 'Addis Ababa'},{' '}
              {order?.merchant?.woreda || ''}
            </Text>
          </View>
        </View>

        {/* Dropoff */}
        <View style={s.addressRow}>
          <View style={[s.dot, { backgroundColor: T.red }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.addressLabel}>{t('role_citizen').toUpperCase()}</Text>
            <Text style={s.addressText}>
              {order?.shipping_address || t('match_orders_radius_msg')}
            </Text>
          </View>
        </View>

        {/* Earnings */}
        <View style={s.earningsRow}>
          <View>
            <Text style={s.earningsLabel}>{t('order_value_label')}</Text>
            <Text style={s.earningsValue}>ETB {fmtETB(order?.total)}</Text>
          </View>
          <View style={s.earningsDivider} />
          <View>
            <Text style={s.earningsLabel}>{t('your_pay_label').toUpperCase()}</Text>
            <Text style={[s.earningsValue, { color: T.green }]}>
              ETB {fmtETB(Math.floor((order?.total || 0) * 0.12))}
            </Text>
          </View>
          <View style={s.earningsDivider} />
          <View>
            <Text style={s.earningsLabel}>
              {order?.order_type === 'FOOD'
                ? t('restaurant_label').toUpperCase()
                : t('shopper').toUpperCase()}
            </Text>
            <Text style={s.earningsValue} numberOfLines={1}>
              {order?.display_name || order?.product_name || order?.restaurant_name || '—'}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={s.dispatchBtns}>
          <TouchableOpacity
            style={[
              s.declineBtn,
              { backgroundColor: 'transparent', borderColor: T.rim, borderWidth: 1 },
            ]}
            onPress={() => onDecline(dispatch)}
          >
            <Ionicons name="close" size={20} color={(T as any).crimson} />
            <Text style={[s.declineBtnText, { color: (T as any).crimson }]}>
              {t('decline_btn')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.acceptBtn, { backgroundColor: (T as any).gold }]}
            onPress={() => onAccept(dispatch)}
          >
            <Ionicons name="checkmark" size={20} color={T.bg} />
            <Text style={[s.acceptBtnText, { color: T.bg }]}>{t('accept_job_btn')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  dispatchCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dispatchGradient: {
    padding: 20,
  },
  dispatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dispatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  dispatchBadgeText: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 168, 48, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  timerText: {
    color: '#F0A830',
    fontSize: 12,
    fontWeight: '800',
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  addressLabel: {
    color: '#8B949E',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  addressText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '800',
  },
  addressSub: {
    color: '#8B949E',
    fontSize: 12,
    marginTop: 2,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 16,
    marginVertical: 4,
  },
  earningsDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  earningsLabel: {
    color: '#8B949E',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  earningsValue: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  dispatchBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  acceptBtn: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptBtnText: {
    fontSize: 16,
    fontWeight: '900',
  },
  declineBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});

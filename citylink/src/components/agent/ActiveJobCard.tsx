import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Surface } from '../ui/Surface';
import { Typography } from '../ui/Typography';
import { DarkColors as T, Fonts } from '../../theme';
import { UnifiedOrder } from '../../services/delivery.service';
import { t } from '../../utils/i18n';

interface ActiveJobCardProps {
  job: UnifiedOrder;
  onPickedUp: (j: any) => void;
  onArrived: (j: any) => void;
  onEnterPin: (j: any) => void;
  onReject: (j: any) => void;
}

function fmtETB(n: number) {
  return (n || 0).toLocaleString('en-ET');
}

function fmtTime(iso: string) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
}

export function ActiveJobCard({
  job,
  onPickedUp,
  onArrived,
  onEnterPin,
  onReject,
}: ActiveJobCardProps) {
  const statusConfig: Record<string, any> = {
    AGENT_ASSIGNED: {
      label: t('head_to_pickup_label'),
      icon: 'navigate-outline',
      color: T.primary,
      next: 'pickup',
    },
    SHIPPED: {
      label: t('head_to_dropoff_label'),
      icon: 'car-outline',
      color: '#f59e0b',
      next: 'arrived',
    },
    IN_TRANSIT: {
      label: t('head_to_dropoff_label'),
      icon: 'car-outline',
      color: '#f59e0b',
      next: 'arrived',
    },
    AWAITING_PIN: {
      label: t('get_delivery_pin_msg'),
      icon: 'keypad-outline',
      color: T.green,
      next: 'enter_pin',
    },
  };
  const cfg = statusConfig[job.status] || {};

  return (
    <Surface variant="flat" padding={0} radius="2xl" style={s.activeJobCard}>
      {/* Mini Navigation Map */}
      <View style={s.miniMapContainer}>
        <MapView
          style={s.miniMap}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: job.merchant?.lat || 9.0333,
            longitude: job.merchant?.lng || 38.75,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          {/* Pickup Marker */}
          {job.merchant?.lat && (
            <Marker
              coordinate={{
                latitude: job.merchant.lat,
                longitude: job.merchant.lng!,
              }}
              title={t('role_merchant')}
            >
              <View style={s.markerContainer}>
                <Ionicons name="location" size={24} color={T.primary} />
              </View>
            </Marker>
          )}

          {/* Delivery Marker */}
          {job.destination_lat && (
            <Marker
              coordinate={{
                latitude: job.destination_lat,
                longitude: job.destination_lng!,
              }}
              title={t('role_citizen')}
            >
              <View style={s.markerContainer}>
                <Ionicons name="flag" size={24} color={T.red} />
              </View>
            </Marker>
          )}
        </MapView>
      </View>

      <LinearGradient
        colors={[T.surface, T.bg]}
        style={[s.activeJobGradient, { borderRadius: 24, borderWidth: 1, borderColor: T.edge }]}
      >
        <View style={s.activeJobHeader}>
          <View
            style={[
              s.statusPill,
              {
                backgroundColor: `${cfg.color}20`,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: `${cfg.color}40`,
              },
            ]}
          >
            <Ionicons name={cfg.icon || 'cube-outline'} size={14} color={cfg.color} />
            <Text style={[s.statusPillText, { color: cfg.color, fontWeight: '800' }]}>
              {cfg.label}
            </Text>
          </View>
          <Text style={s.activeJobTime}>{fmtTime(job.created_at)}</Text>
        </View>

        <Text style={s.activeJobProduct}>{job.display_name}</Text>
        
        <View style={s.statsStrip}>
          <View style={s.statItem}>
            <Text style={s.statLabel}>{t('your_pay_label').toUpperCase()}</Text>
            <Text style={s.statValue}>ETB {fmtETB(Math.floor((job.total || 0) * 0.12))}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statLabel}>{t('order_value_label').toUpperCase()}</Text>
            <Text style={s.statValue}>ETB {fmtETB(job.total)}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statLabel}>{t('type_label')?.toUpperCase() || 'TYPE'}</Text>
            <Text style={s.statValue}>{job.order_type}</Text>
          </View>
        </View>

        <View style={s.addressRow}>
          <View style={[s.dot, { backgroundColor: T.green }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.addressLabel}>{t('role_merchant').toUpperCase()}</Text>
            <Text style={s.addressText}>{job.merchant?.business_name || t('role_merchant')}</Text>
            {(job.merchant?.subcity || job.merchant?.woreda) && (
              <Text style={s.addressSub}>
                {job.merchant?.subcity}{job.merchant?.woreda ? `, Woreda ${job.merchant?.woreda}` : ''}
              </Text>
            )}
          </View>
        </View>
        <View style={s.addressRow}>
          <View style={[s.dot, { backgroundColor: T.red }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.addressLabel}>{t('role_citizen').toUpperCase()}</Text>
            <Text style={s.addressText}>{job.shipping_address}</Text>
          </View>
        </View>

        {cfg.next === 'pickup' && (
          <View>
            <TouchableOpacity
              style={[
                s.actionBtn,
                job.agent_confirmed_pickup && { backgroundColor: T.surfaceHigh },
              ]}
              onPress={() => onPickedUp(job)}
              disabled={job.agent_confirmed_pickup}
            >
              <Ionicons
                name={job.agent_confirmed_pickup ? 'time-outline' : 'bag-check-outline'}
                size={18}
                color={job.agent_confirmed_pickup ? T.textSub : '#0a0e14'}
              />
              <Text style={[s.actionBtnText, job.agent_confirmed_pickup && { color: T.textSub }]}>
                {job.agent_confirmed_pickup
                  ? t('waiting_merchant_msg')
                  : t('picked_up_package_btn')}
              </Text>
            </TouchableOpacity>

            {job.merchant_confirmed_pickup && !job.agent_confirmed_pickup && (
              <Text
                style={{
                  color: T.primary,
                  textAlign: 'center',
                  marginTop: 10,
                  fontSize: 12,
                  fontWeight: '800',
                }}
              >
                {t('merchant_confirmed_handover_msg')}
              </Text>
            )}
          </View>
        )}
        {cfg.next === 'arrived' && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: T.yellow }]}
            onPress={() => onArrived(job)}
          >
            <Ionicons name="location-outline" size={18} color="#0a0e14" />
            <Text style={s.actionBtnText}>{t('i_have_arrived_btn')}</Text>
          </TouchableOpacity>
        )}
        {cfg.next === 'enter_pin' && (
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: T.green }]}
              onPress={() => onEnterPin(job)}
            >
              <Ionicons name="keypad-outline" size={18} color="#0a0e14" />
              <Text style={s.actionBtnText}>{t('enter_delivery_pin_btn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.actionBtn,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: (T as any).crimson,
                  borderRadius: 16,
                },
              ]}
              onPress={() => onReject(job)}
            >
              <Ionicons name="alert-circle-outline" size={18} color={(T as any).crimson} />
              <Text style={[s.actionBtnText, { color: (T as any).crimson }]}>
                {t('unable_to_deliver_btn')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </Surface>
  );
}

const s = StyleSheet.create({
  activeJobCard: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  miniMapContainer: {
    height: 120,
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    marginBottom: -24,
    zIndex: 0,
  },
  miniMap: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
  },
  activeJobGradient: {
    padding: 20,
    paddingTop: 32,
    zIndex: 1,
  },
  activeJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  statusPillText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  activeJobTime: {
    color: '#8B949E',
    fontSize: 12,
  },
  activeJobProduct: {
    color: '#E2E8F0',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  activeJobEarning: {
    color: '#8B949E',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 20,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: {
    fontSize: 9,
    color: '#8B949E',
    fontWeight: '700',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '900',
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: 12,
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
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  addressText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  addressSub: {
    color: '#8B949E',
    fontSize: 12,
    marginTop: 2,
  },
  actionBtn: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
    backgroundColor: '#22C97A',
  },
  actionBtnText: {
    color: '#0a0e14',
    fontSize: 16,
    fontWeight: '900',
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D, Radius, Fonts } from './StitchTheme';
import { fmtETB, fmtDateTime } from '../../../utils';
import { t } from '../../../utils/i18n';

const { width } = Dimensions.get('window');

import { MarketplaceOrder, Dispute } from '../../../types';

export interface DashboardOrdersTabProps {
  orders: MarketplaceOrder[];
  openDisputes: Dispute[];
  loading: boolean;
  shipping: boolean;
  handleMarkShipped: (id: string) => void;
  handleConfirmPickup: (id: string) => void;
  handleDispatchRetry: (id: string) => void;
  handleCancelOrder: (id: string) => void;
  handleSwitchSelfDelivery: (order: MarketplaceOrder) => void;
  handleMessageBuyer: (order: MarketplaceOrder) => void;
  setPinInput: (val: string) => void;
  setPinPromptOrder: (order: MarketplaceOrder | null) => void;
  styles: any;
  t: any;
}

export function DashboardOrdersTab({
  orders,
  openDisputes,
  loading,
  shipping,
  handleMarkShipped,
  handleConfirmPickup,
  handleDispatchRetry,
  handleCancelOrder,
  handleSwitchSelfDelivery,
  handleMessageBuyer,
  setPinInput,
  setPinPromptOrder,
  styles,
  t,
}: DashboardOrdersTabProps) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.pageTitle}>{t('orders_tab')}</Text>
          <Text style={styles.pageSubtitle}>
            {
              orders.filter((o) =>
                [
                  'PAID',
                  'SHIPPED',
                  'DISPATCHING',
                  'AGENT_ASSIGNED',
                  'IN_TRANSIT',
                  'AWAITING_PIN',
                ].includes(o.status as any)
              ).length
            }{' '}
            {t('active_shipments')}
          </Text>
        </View>
      </View>

      {openDisputes.length > 0 && (
        <View style={styles.alertBanner}>
          <View style={styles.alertIconBox}>
            <Ionicons name="warning" size={16} color={D.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { fontFamily: Fonts.bold }]}>
              {openDisputes.length} {t('open_dispute')}
              {openDisputes.length > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.alertSub, { fontFamily: Fonts.regular }]}>
              {openDisputes[0]?.reason || t('needs_resolution_24h')}
            </Text>
          </View>
        </View>
      )}

      <View style={{ gap: 16 }}>
        {orders.length === 0 && !loading && (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ionicons name="cart-outline" size={48} color={D.edge} />
            <Text style={{ color: D.sub, marginTop: 12, fontFamily: Fonts.regular }}>
              {t('no_orders_yet')}
            </Text>
          </View>
        )}
        {orders.map((o) => (
          <View key={o.id} style={styles.orderMobileCard}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.ocId, { fontFamily: Fonts.mono }]}>
                  {o.id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={[styles.ocTimeTxtMobile, { fontFamily: Fonts.regular }]}>
                  {' '}
                  •{' '}
                  {new Date(o.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.ocStatusBadge,
                  {
                    backgroundColor:
                      o.status === 'PAID'
                        ? D.primary + '30'
                        : [
                              'SHIPPED',
                              'DISPATCHING',
                              'AGENT_ASSIGNED',
                              'IN_TRANSIT',
                              'AWAITING_PIN',
                            ].includes(o.status)
                          ? D.gold + '30'
                          : o.status === 'COMPLETED'
                            ? D.primary + '30'
                            : o.status === 'DISPUTED'
                              ? D.red + '30'
                              : D.lift,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.ocStatusTxt,
                    {
                      fontFamily: Fonts.black,
                      color:
                        o.status === 'PAID'
                          ? D.primary
                          : [
                                'SHIPPED',
                                'DISPATCHING',
                                'AGENT_ASSIGNED',
                                'IN_TRANSIT',
                                'AWAITING_PIN',
                              ].includes(o.status)
                            ? D.gold
                            : o.status === 'COMPLETED'
                              ? D.primary
                              : o.status === 'DISPUTED'
                                ? D.red
                                : D.sub,
                    },
                  ]}
                >
                  {o.status.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <View
                style={[styles.ocImgMobile, { alignItems: 'center', justifyContent: 'center' }]}
              >
                <Ionicons name="cube" size={24} color={D.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ocProdName, { fontFamily: Fonts.bold }]}>
                  {o.product_name}
                </Text>
                <Text
                  style={[styles.ocProdDetail, { fontFamily: Fonts.regular }]}
                  numberOfLines={1}
                >
                  {t('quantity_label')}: {o.qty || 1}
                </Text>
                <Text style={[styles.ocBigAmountMobile, { fontFamily: Fonts.black }]}>
                  {fmtETB(o.total)}
                </Text>
              </View>
            </View>

            <View style={styles.ocDivider} />

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ocTinyLabel, { fontFamily: Fonts.bold }]}>
                  {t('shipping_address_required').toUpperCase()}
                </Text>
                <Text style={[styles.ocAddressTxt, { fontFamily: Fonts.regular }]}>
                  {o.shipping_address || 'Standard Delivery'}
                </Text>
              </View>
              <View
                style={{ flex: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: D.edge }}
              >
                <Text style={[styles.ocTinyLabel, { fontFamily: Fonts.bold }]}>
                  {['DISPATCHING', 'AGENT_ASSIGNED'].includes(o.status)
                    ? t('pickup_pin_up')
                    : t('escrow_status_up')}
                </Text>
                {['DISPATCHING', 'AGENT_ASSIGNED'].includes(o.status) ? (
                  <View style={styles.ocPinBoxMobile}>
                    <Text style={[styles.ocPinTxt, { fontFamily: Fonts.mono }]}>
                      {o.pickup_pin || t('generating')}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons
                      name={o.status === 'COMPLETED' ? 'checkmark-circle' : 'lock-closed'}
                      size={14}
                      color={o.status === 'COMPLETED' ? D.primary : D.gold}
                    />
                    <Text
                      style={[
                        styles.ocLockTxt,
                        { fontFamily: Fonts.bold },
                        o.status === 'COMPLETED' && { color: D.primary },
                      ]}
                    >
                      {o.status === 'COMPLETED' ? t('released') : t('funds_secured')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
              {o.status === 'PAID' ? (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: D.primary, flex: 2 }]}
                  onPress={() => handleMarkShipped(o.id)}
                >
                  <Ionicons
                    name="cube-outline"
                    size={16}
                    color={D.ink}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.ocBtnTxt, { color: D.ink, fontFamily: Fonts.black }]}>
                    {t('mark_shipped')}
                  </Text>
                </TouchableOpacity>
              ) : o.status === 'DISPATCHING' ? (
                <View style={{ flexDirection: 'row', gap: 8, flex: 2 }}>
                  <TouchableOpacity
                    style={[styles.ocBtnMobile, { backgroundColor: D.lift, flex: 1.2 }]}
                    disabled
                  >
                    <ActivityIndicator size="small" color={D.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.ocBtnTxt, { color: D.sub, fontFamily: Fonts.bold }]}>
                      {t('finding_driver')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.ocBtnMobile,
                      {
                        backgroundColor: D.lift,
                        flex: 1,
                        borderColor: D.edge,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleSwitchSelfDelivery(o)}
                  >
                    <Text style={[styles.ocBtnTxt, { color: D.text, fontFamily: Fonts.bold }]}>
                      {t('self_deliver')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : o.status === 'SHIPPED' || o.status === 'SELF_DELIVERY' ? (
                <View style={{ flex: 2, gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.ocBtnMobile, { backgroundColor: D.green }]}
                    onPress={() => {
                      setPinInput('');
                      setPinPromptOrder(o);
                    }}
                  >
                    <Ionicons
                      name="checkmark-done"
                      size={14}
                      color="#000"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.ocBtnTxt, { color: '#000', fontFamily: Fonts.black }]}>
                      {t('complete_delivery_pin')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.ocBtnMobile,
                      {
                        backgroundColor: D.lift,
                        borderColor: D.primary + '30',
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleDispatchRetry(o.id)}
                  >
                    <Ionicons
                      name="bicycle-outline"
                      size={14}
                      color={D.primary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.ocBtnTxt,
                        { color: D.primary, fontSize: 11, fontFamily: Fonts.bold },
                      ]}
                    >
                      {t('search_for_drivers')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : o.status === 'AGENT_ASSIGNED' ? (
                <View style={{ flex: 2, gap: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.ocBtnMobile,
                      { backgroundColor: o.merchant_confirmed_pickup ? D.lift : D.primary },
                    ]}
                    onPress={() => handleConfirmPickup(o.id)}
                    disabled={o.merchant_confirmed_pickup}
                  >
                    <Ionicons
                      name={o.merchant_confirmed_pickup ? 'time-outline' : 'hand-right-outline'}
                      size={16}
                      color={o.merchant_confirmed_pickup ? D.sub : D.ink}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.ocBtnTxt,
                        {
                          color: o.merchant_confirmed_pickup ? D.sub : D.ink,
                          fontFamily: Fonts.black,
                        },
                      ]}
                    >
                      {o.merchant_confirmed_pickup ? t('awaiting_agent') : t('confirm_handover')}
                    </Text>
                  </TouchableOpacity>
                  {o.agent_confirmed_pickup && !o.merchant_confirmed_pickup && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: D.primary,
                        textAlign: 'center',
                        fontFamily: Fonts.black,
                      }}
                    >
                      {t('agent_confirmed_pickup_up')}
                    </Text>
                  )}
                </View>
              ) : ['IN_TRANSIT', 'AWAITING_PIN'].includes(o.status) ? (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: D.lift, flex: 2 }]}
                  disabled
                >
                  <Text style={[styles.ocBtnTxt, { color: D.sub, fontFamily: Fonts.bold }]}>
                    {o.status === 'AWAITING_PIN' ? t('driver_arrived_pin') : t('driver_on_route')}
                  </Text>
                </TouchableOpacity>
              ) : o.status === 'DISPUTED' ? (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: D.red + '30', flex: 2 }]}
                  disabled
                >
                  <Text style={[styles.ocBtnTxt, { color: D.red, fontFamily: Fonts.black }]}>
                    {t('disputed')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: D.lift, flex: 2 }]}
                  disabled
                >
                  <Text style={[styles.ocBtnTxt, { color: D.primary, fontFamily: Fonts.black }]}>
                    {t('completed')}
                  </Text>
                </TouchableOpacity>
              )}
              {o.status === 'PAID' && (
                <TouchableOpacity
                  style={[styles.ocBtnMobileOutlined, { flex: 1, borderColor: D.red + '80' }]}
                  onPress={() => handleCancelOrder(o.id)}
                >
                  <Text
                    style={[
                      styles.ocBtnOutlinedTxtMobile,
                      { color: D.red, fontFamily: Fonts.bold },
                    ]}
                  >
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.ocBtnMobileOutlined, { flex: 1, borderColor: D.primary + '50' }]}
                onPress={() => handleMessageBuyer(o)}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={14}
                  color={D.primary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.ocBtnOutlinedTxtMobile,
                    { color: D.primary, fontFamily: Fonts.bold },
                  ]}
                >
                  {t('message')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ocBtnMobileOutlined, { flex: 1 }]}>
                <Text style={[styles.ocBtnOutlinedTxtMobile, { fontFamily: Fonts.bold }]}>
                  {t('details')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

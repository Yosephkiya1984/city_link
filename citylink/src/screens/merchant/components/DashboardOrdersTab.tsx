import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors as T, Fonts } from '../../../theme';
import { fmtETB } from '../../../utils';

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
}: DashboardOrdersTabProps) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.pageTitle}>Orders</Text>
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
            active shipments
          </Text>
        </View>
      </View>

      {openDisputes.length > 0 && (
        <View style={styles.alertBanner}>
          <View style={styles.alertIconBox}>
            <Ionicons name="warning" size={16} color={T.tertiary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { fontFamily: Fonts.bold }]}>
              {openDisputes.length} Open Dispute{openDisputes.length > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.alertSub, { fontFamily: Fonts.regular }]}>
              {openDisputes[0]?.reason || 'Needs resolution within 24h.'}
            </Text>
          </View>
        </View>
      )}

      <View style={{ gap: 16 }}>
        {orders.length === 0 && !loading && (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ionicons name="cart-outline" size={48} color={T.edge} />
            <Text style={{ color: T.onVariant, marginTop: 12, fontFamily: Fonts.regular }}>No orders yet</Text>
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
                <Text style={[styles.ocId, { fontFamily: Fonts.mono }]}>{o.id.slice(0, 8).toUpperCase()}</Text>
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
                        ? T.primaryD + '30'
                        : [
                                'SHIPPED',
                                'DISPATCHING',
                                'AGENT_ASSIGNED',
                                'IN_TRANSIT',
                                'AWAITING_PIN',
                              ].includes(o.status)
                          ? T.secondary + '30'
                          : o.status === 'COMPLETED'
                            ? T.primary + '30'
                            : o.status === 'DISPUTED'
                              ? T.tertiary + '30'
                              : T.top,
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
                          ? T.primary
                          : [
                                'SHIPPED',
                                'DISPATCHING',
                                'AGENT_ASSIGNED',
                                'IN_TRANSIT',
                                'AWAITING_PIN',
                              ].includes(o.status)
                            ? T.secondary
                            : o.status === 'COMPLETED'
                              ? T.primary
                              : o.status === 'DISPUTED'
                                ? T.tertiary
                                : T.onVariant,
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
                <Ionicons name="cube" size={24} color={T.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ocProdName, { fontFamily: Fonts.bold }]}>{o.product_name}</Text>
                <Text style={[styles.ocProdDetail, { fontFamily: Fonts.regular }]} numberOfLines={1}>
                  Quantity: {o.qty || 1}
                </Text>
                <Text style={[styles.ocBigAmountMobile, { fontFamily: Fonts.black }]}>
                  {fmtETB(o.total)}
                </Text>
              </View>
            </View>

            <View style={styles.ocDivider} />

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ocTinyLabel, { fontFamily: Fonts.bold }]}>SHIPPING ADDRESS</Text>
                <Text style={[styles.ocAddressTxt, { fontFamily: Fonts.regular }]}>{o.shipping_address || 'Standard Delivery'}</Text>
              </View>
              <View
                style={{ flex: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: T.edge }}
              >
                <Text style={[styles.ocTinyLabel, { fontFamily: Fonts.bold }]}>
                  {['DISPATCHING', 'AGENT_ASSIGNED'].includes(o.status)
                    ? 'PICKUP PIN'
                    : 'ESCROW STATUS'}
                </Text>
                {['DISPATCHING', 'AGENT_ASSIGNED'].includes(o.status) ? (
                  <View style={styles.ocPinBoxMobile}>
                    <Text style={[styles.ocPinTxt, { fontFamily: Fonts.mono }]}>{o.pickup_pin || 'Generating...'}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons
                      name={o.status === 'COMPLETED' ? 'checkmark-circle' : 'lock-closed'}
                      size={14}
                      color={o.status === 'COMPLETED' ? T.primary : T.secondary}
                    />
                    <Text
                      style={[styles.ocLockTxt, { fontFamily: Fonts.bold }, o.status === 'COMPLETED' && { color: T.primary }]}
                    >
                      {o.status === 'COMPLETED' ? 'Released' : 'Funds Secured'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
              {o.status === 'PAID' ? (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: T.primaryD, flex: 2 }]}
                  onPress={() => handleMarkShipped(o.id)}
                >
                  <Ionicons
                    name="cube-outline"
                    size={16}
                    color={T.ink}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.ocBtnTxt, { color: T.ink, fontFamily: Fonts.black }]}>Mark Shipped</Text>
                </TouchableOpacity>
              ) : o.status === 'DISPATCHING' ? (
                <View style={{ flexDirection: 'row', gap: 8, flex: 2 }}>
                  <TouchableOpacity
                    style={[styles.ocBtnMobile, { backgroundColor: T.top, flex: 1.2 }]}
                    disabled
                  >
                    <ActivityIndicator size="small" color={T.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.ocBtnTxt, { color: T.onVariant, fontFamily: Fonts.bold }]}>Finding Driver...</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.ocBtnMobile,
                      {
                        backgroundColor: T.top,
                        flex: 1,
                        borderColor: T.edge,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleSwitchSelfDelivery(o)}
                  >
                    <Text style={[styles.ocBtnTxt, { color: T.onSurface, fontFamily: Fonts.bold }]}>Self-Deliver</Text>
                  </TouchableOpacity>
                </View>
              ) : (o.status === 'SHIPPED' || o.status === 'SELF_DELIVERY') ? (
                <View style={{ flex: 2, gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.ocBtnMobile, { backgroundColor: T.green }]}
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
                      Complete Delivery (PIN)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.ocBtnMobile,
                      {
                        backgroundColor: T.top,
                        borderColor: T.primary + '30',
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleDispatchRetry(o.id)}
                  >
                    <Ionicons
                      name="bicycle-outline"
                      size={14}
                      color={T.primary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.ocBtnTxt, { color: T.primary, fontSize: 11, fontFamily: Fonts.bold }]}>
                      Search for Drivers
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : o.status === 'AGENT_ASSIGNED' ? (
                <View style={{ flex: 2, gap: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.ocBtnMobile,
                      { backgroundColor: o.merchant_confirmed_pickup ? T.top : T.primary },
                    ]}
                    onPress={() => handleConfirmPickup(o.id)}
                    disabled={o.merchant_confirmed_pickup}
                  >
                    <Ionicons
                      name={o.merchant_confirmed_pickup ? 'time-outline' : 'hand-right-outline'}
                      size={16}
                      color={o.merchant_confirmed_pickup ? T.onVariant : T.ink}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.ocBtnTxt,
                        { color: o.merchant_confirmed_pickup ? T.onVariant : T.ink, fontFamily: Fonts.black },
                      ]}
                    >
                      {o.merchant_confirmed_pickup ? 'Awaiting Agent...' : 'Confirm Handover'}
                    </Text>
                  </TouchableOpacity>
                  {o.agent_confirmed_pickup && !o.merchant_confirmed_pickup && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: T.primary,
                        textAlign: 'center',
                        fontFamily: Fonts.black,
                      }}
                    >
                      AGENT HAS CONFIRMED PICKUP
                    </Text>
                  )}
                </View>
              ) : ['IN_TRANSIT', 'AWAITING_PIN'].includes(o.status) ? (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: T.top, flex: 2 }]}
                  disabled
                >
                  <Text style={[styles.ocBtnTxt, { color: T.onVariant, fontFamily: Fonts.bold }]}>
                    {o.status === 'AWAITING_PIN'
                      ? 'Driver Arrived (Awaiting PIN)'
                      : 'Driver on Route to Buyer'}
                  </Text>
                </TouchableOpacity>
              ) : o.status === 'DISPUTED' ? (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: T.tertiary + '30', flex: 2 }]}
                  disabled
                >
                  <Text style={[styles.ocBtnTxt, { color: T.tertiary, fontFamily: Fonts.black }]}>Disputed</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.ocBtnMobile, { backgroundColor: T.top, flex: 2 }]}
                  disabled
                >
                  <Text style={[styles.ocBtnTxt, { color: T.primary, fontFamily: Fonts.black }]}>Completed</Text>
                </TouchableOpacity>
              )}
              {o.status === 'PAID' && (
                <TouchableOpacity
                  style={[styles.ocBtnMobileOutlined, { flex: 1, borderColor: T.tertiary + '80' }]}
                  onPress={() => handleCancelOrder(o.id)}
                >
                  <Text style={[styles.ocBtnOutlinedTxtMobile, { color: T.tertiary, fontFamily: Fonts.bold }]}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.ocBtnMobileOutlined, { flex: 1, borderColor: T.primary + '50' }]}
                onPress={() => handleMessageBuyer(o)}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={14}
                  color={T.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.ocBtnOutlinedTxtMobile, { color: T.primary, fontFamily: Fonts.bold }]}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ocBtnMobileOutlined, { flex: 1 }]}>
                <Text style={[styles.ocBtnOutlinedTxtMobile, { fontFamily: Fonts.bold }]}>Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

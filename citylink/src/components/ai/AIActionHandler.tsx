import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, LightColors, FontSize, Radius, Shadow, Fonts } from '../../theme';
import { useSystemStore } from '../../store/SystemStore';
import { useWalletStore } from '../../store/WalletStore';
import { t } from '../../utils/i18n';
import { ParkingLiveStatus } from './ParkingLiveStatus';
import { AIDispatcher } from '../../services/ai.dispatcher';
import { fmtETB } from '../../utils';

type ActionType =
  | 'get_wallet_balance' | 'process_p2p_transfer' | 'pay_utility_bill' | 'pay_traffic_fine'
  | 'find_nearby_parking' | 'start_parking_session'
  | 'search_restaurant' | 'get_food_menu'
  | 'search_listings' | 'check_order_status' | 'reveal_delivery_pin' | 'update_product_stock'
  | 'contribute_to_ekub' | 'vouch_for_ekub_payout' | 'perform_ekub_draw' | 'release_ekub_pot'
  | 'get_merchant_summary' | 'ship_marketplace_order' | 'fire_order_to_kitchen' | 'set_table_status'
  | 'verify_fayda_id'
  | 'SPENDING_INSIGHT' | 'SPLIT_SUGGESTION' | 'BUDGET_ALERT' | 'SAVINGS_TIP'
  | 'RELEASE_ESCROW' | 'PAY_EKUB' | 'VIEWING_SCHEDULED' | 'BROKER_VERIFIED'
  | 'PARKING_BOOKED' | 'IPS_REQUEST_SENT' | 'FAYDA_VERIFIED'
  | 'buy_marketplace_item' | 'order_food_item';

interface AIActionHandlerProps {
  action: { type: ActionType; data: any };
  onActionComplete?: () => void;
}

const CONFIRMATION_REQUIRED_TOOLS: ActionType[] = [
  'process_p2p_transfer',
  'pay_utility_bill',
  'pay_traffic_fine',
  'contribute_to_ekub',
  'release_ekub_pot',
  'RELEASE_ESCROW',
  'PAY_EKUB',
  'start_parking_session',
  'verify_fayda_id',
  'ship_marketplace_order',
  'buy_marketplace_item',
  'order_food_item'
];

export const AIActionHandler: React.FC<AIActionHandlerProps> = ({ action, onActionComplete }) => {
  const isDark = useSystemStore((s) => s.isDark);
  const showToast = useSystemStore((s) => s.showToast);
  const setBalance = useWalletStore((s) => s.setBalance);
  const navigation = useNavigation<any>();
  const C = isDark ? Colors : LightColors;
  
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const isExecutingRef = useRef(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const isAutonomous = !CONFIRMATION_REQUIRED_TOOLS.includes(action.type);

  const execute = async () => {
    if (finished || isExecutingRef.current) return;
    isExecutingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await AIDispatcher.executeTool(action.type as any, action.data || {});
      setResult(res);
      if (res?.ok) {
        setFinished(true); // Permanent disable after success
        if (res.status === 'QUEUED_OFFLINE') {
          showToast('Offline: Action Queued for Retry', 'info');
        } else {
          // Silent success for autonomous background tasks
          if (!isAutonomous) showToast('Action Successful', 'success');
        }
        if (res.new_balance !== undefined) setBalance(res.new_balance);
        
        // Auto-close for one-off tasks (like status updates)
        const isPersistent = !!(res.delivery_pin || res.lots || res.restaurants || res.total_spent);
        if (!isPersistent && !isAutonomous) {
           setTimeout(() => onActionComplete?.(), 1500);
        }
      } else {
        setError(res?.error || 'Execution failed');
        showToast(res?.error || 'Execution failed', 'error');
      }
      return res;
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
      showToast(e.message || 'Unexpected error', 'error');
    } finally {
      setLoading(false);
      isExecutingRef.current = false;
    }
  };

  useEffect(() => {
    // Proactive trigger for non-critical autonomous tasks
    if (isAutonomous && !finished && !loading && !result) {
      execute();
    }
  }, [action.type, isAutonomous]);

  const renderTransferCard = () => {
    const { recipient_phone, amount, note } = action.data;
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.primary + '44' }]}>
        <View style={styles.header}>
          <Ionicons name="paper-plane" size={20} color={C.primary} />
          <Text style={[styles.title, { color: C.text }]}>Send Money</Text>
        </View>
        <View style={[styles.infoRow, { backgroundColor: C.edge2 + '44' }]}>
          <Text style={[styles.infoText, { color: C.sub }]}>To</Text>
          <Text style={[styles.infoText, { color: C.text, fontFamily: Fonts.bold }]}>{recipient_phone}</Text>
        </View>
        <View style={[styles.infoRow, { backgroundColor: C.edge2 + '44', marginTop: 4 }]}>
          <Text style={[styles.infoText, { color: C.sub }]}>Amount</Text>
          <Text style={[styles.infoText, { color: C.primary, fontFamily: Fonts.black }]}>{amount} ETB</Text>
        </View>
        {note ? <Text style={[styles.content, { color: C.sub, marginTop: 8 }]}>Note: {note}</Text> : null}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.miniButton, { backgroundColor: finished ? C.green : C.primary }]} 
            onPress={execute} 
            disabled={loading || finished}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : 
             finished ? <Ionicons name="checkmark-circle" size={20} color="#fff" /> :
             <Text style={styles.buttonText}>Confirm and Send</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.miniButton, { backgroundColor: C.edge2 }]} onPress={onActionComplete} disabled={loading || finished}>
            <Text style={[styles.buttonText, { color: C.sub }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFindParkingCard = () => (
    <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.primary + '44' }]}>
      <View style={styles.header}>
        <Ionicons name="car" size={20} color={C.primary} />
        <Text style={[styles.title, { color: C.text }]}>Nearby Parking</Text>
      </View>
      {result?.lots ? (
        <ScrollView style={{ maxHeight: 160 }}>
          {result.lots.slice(0, 5).map((lot: any, i: number) => (
            <View key={i} style={[styles.infoRow, { backgroundColor: C.edge2 + '33', marginBottom: 8, justifyContent: 'space-between' }]}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="location" size={14} color={C.primary} />
                <View>
                  <Text style={[styles.infoText, { color: C.text, fontFamily: Fonts.bold }]}>{lot.name || lot.address}</Text>
                  <Text style={{ color: C.sub, fontSize: FontSize.xs }}>{lot.distance_km}km • {lot.eta} • {lot.available_spots} spots</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.miniButton, { backgroundColor: C.primary, flex: 0, paddingHorizontal: 12, paddingVertical: 4 }]}
                onPress={() => {
                  // Trigger booking for this specific lot
                  AIDispatcher.executeTool('start_parking_session', { 
                    lot_id: lot.id, 
                    // spot_id omitted — RPC auto-assigns a free spot
                    vehicle_plate: 'AA-2-12345' // User can update plate from profile
                  }).then(res => {
                    if (res?.ok) {
                      setFinished(true);
                      showToast('Parking Session Started!', 'success');
                    } else {
                      showToast(res?.error || 'Could not start session', 'error');
                    }
                  });
                }}
              >
                <Text style={[styles.buttonText, { fontSize: FontSize.xs }]}>Book</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={[styles.content, { color: C.sub }]}>Find available parking lots near you in Addis Ababa.</Text>
      )}
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: finished ? C.green : C.primary, marginTop: 8 }]} 
        onPress={execute} 
        disabled={loading || finished}
      >
        {loading ? <ActivityIndicator size="small" color="#fff" /> : 
         finished ? <Ionicons name="checkmark-circle" size={20} color="#fff" /> :
         <Text style={styles.buttonText}>{result ? 'Refresh' : 'Find Parking Now'}</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderRevealPinCard = () => (
    <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.green + '55' }]}>
      <View style={styles.header}>
        <Ionicons name="keypad" size={20} color={C.green} />
        <Text style={[styles.title, { color: C.text }]}>Delivery PIN</Text>
      </View>
      {result?.delivery_pin ? (
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <Text style={{ color: C.green, fontSize: 42, fontFamily: Fonts.black, letterSpacing: 10 }}>
            {result.delivery_pin}
          </Text>
          <Text style={[styles.content, { color: C.sub, textAlign: 'center', marginTop: 8 }]}>
            Give this PIN to your delivery agent to confirm receipt and release payment.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.content, { color: C.sub }]}>
            Your 6-digit PIN authorizes the agent to complete the handover and releases your escrow payment.
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: C.green }]} onPress={execute} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#000" /> : <Text style={[styles.buttonText, { color: '#000' }]}>Reveal My PIN</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderContributeEkubCard = () => {
    const { round_number, amount } = action.data;
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.green + '44' }]}>
        <View style={styles.header}>
          <Ionicons name="people" size={20} color={C.green} />
          <Text style={[styles.title, { color: C.text }]}>Ekub Contribution</Text>
        </View>
        <Text style={[styles.content, { color: C.sub }]}>
          Pay{amount ? ` ${amount} ETB` : ''} for Round {round_number || '?'} of your savings circle.
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: C.green }]} onPress={execute} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#000" /> : <Text style={[styles.buttonText, { color: '#000' }]}>Pay Contribution</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearchFoodCard = () => {
    const { query } = action.data || {};
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.edge2 }]}>
        <View style={styles.header}>
          <Ionicons name="restaurant" size={20} color={C.primary} />
          <Text style={[styles.title, { color: C.text }]}>Restaurants{query ? (' for ' + query) : ''}</Text>
        </View>
        {result?.restaurants ? (
          <ScrollView style={{ maxHeight: 160 }}>
            {result.restaurants.slice(0, 5).map((r: any, i: number) => (
              <TouchableOpacity key={i} style={[styles.infoRow, { backgroundColor: C.edge2 + '33', marginBottom: 4 }]}
                onPress={() => navigation.navigate('Food', { restaurantId: r.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoText, { color: C.text, fontFamily: Fonts.bold }]}>{r.name}</Text>
                  <Text style={{ color: C.sub, fontSize: FontSize.xs }}>{r.avg_delivery_minutes || 30} min</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={C.sub} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={[styles.content, { color: C.sub }]}>Find restaurants near you in Addis Ababa.</Text>
        )}
        <TouchableOpacity style={[styles.button, { backgroundColor: C.primary, marginTop: 8 }]} onPress={execute} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>{result ? 'Refresh' : 'Search Now'}</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderSpendingInsight = () => {
    const { category, amount, period } = action.data;
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.edge2 }]}>
        <View style={styles.header}>
          <Ionicons name="analytics" size={20} color={C.primary} />
          <Text style={[styles.title, { color: C.text }]}>{t('spending_insights')}</Text>
        </View>
        <Text style={[styles.content, { color: C.sub }]}>
          You spent <Text style={{ color: C.primary, fontFamily: Fonts.bold }}>{amount} ETB</Text> on {category} this {period}.
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: C.primary }]} onPress={onActionComplete}>
          <Text style={styles.buttonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEscrowAction = () => {
    const { amount, escrowId, merchantName } = action.data;
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.primary + '44' }]}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={20} color={C.primary} />
          <Text style={[styles.title, { color: C.text }]}>Release Escrow</Text>
        </View>
        <Text style={[styles.content, { color: C.sub }]}>
          Authorize release of <Text style={{ color: C.primary, fontFamily: Fonts.bold }}>{amount} ETB</Text> to {merchantName}?
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.miniButton, { backgroundColor: C.primary }]}
            onPress={() => { navigation.navigate('Wallet', { screen: 'EscrowDetails', params: { escrowId } }); onActionComplete?.(); }}>
            <Text style={styles.buttonText}>Review and Release</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.miniButton, { backgroundColor: C.edge2 }]} onPress={onActionComplete}>
            <Text style={[styles.buttonText, { color: C.sub }]}>Dispute</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEkubAction = () => {
    const { amount, ekubName, ekubId } = action.data;
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.green + '44' }]}>
        <View style={styles.header}>
          <Ionicons name="people" size={20} color={C.green} />
          <Text style={[styles.title, { color: C.text }]}>Ekub Contribution</Text>
        </View>
        <Text style={[styles.content, { color: C.sub }]}>
          Your contribution of <Text style={{ color: C.green, fontFamily: Fonts.bold }}>{amount} ETB</Text> for "{ekubName}" is due.
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: C.green }]}
          onPress={() => { navigation.navigate('Wallet', { screen: 'EkubPay', params: { ekubId, amount } }); onActionComplete?.(); }}>
          <Text style={[styles.buttonText, { color: '#000' }]}>Authenticate and Pay</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBrokerAction = () => {
    const { name, rank, escrows, verified, subcity } = action.data;
    const rankColor = rank > 80 ? C.green : rank > 50 ? C.yellow : C.red;
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: rankColor + '44' }]}>
        <View style={styles.header}>
          <Ionicons name="ribbon" size={20} color={rankColor} />
          <Text style={[styles.title, { color: C.text }]}>Broker Verified</Text>
        </View>
        <View style={styles.brokerProfile}>
          <View>
            <Text style={[styles.brokerName, { color: C.text }]}>{name}</Text>
            <Text style={[styles.brokerMeta, { color: C.sub }]}>{subcity || 'Addis Ababa'} Specialist</Text>
          </View>
          <View style={[styles.rankBadge, { backgroundColor: rankColor + '22' }]}>
            <Text style={[styles.rankText, { color: rankColor }]}>{rank}%</Text>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: C.text }]}>{escrows}</Text>
            <Text style={[styles.statLabel, { color: C.sub }]}>Escrows</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name={verified ? 'checkmark-circle' : 'close-circle'} size={16} color={verified ? C.green : C.sub} />
            <Text style={[styles.statLabel, { color: C.sub }]}>Verified</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFaydaAction = () => {
    const { profile } = action.data;
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.primary + '44' }]}>
        <View style={styles.header}>
          <Ionicons name="checkmark-sharp" size={24} color={C.primary} />
          <Text style={[styles.title, { color: C.text, fontSize: FontSize.lg }]}>Fayda Verified</Text>
        </View>
        <View style={styles.brokerProfile}>
          <View>
            <Text style={[styles.brokerName, { color: C.text }]}>{profile.full_name}</Text>
            <Text style={[styles.brokerMeta, { color: C.sub }]}>ID: {profile.fayda_id}</Text>
          </View>
          <View style={[styles.rankBadge, { backgroundColor: C.primary + '22' }]}>
            <Text style={[styles.rankText, { color: C.primary }]}>Active</Text>
          </View>
        </View>
        <View style={[styles.infoRow, { backgroundColor: C.edge2 + '44', marginTop: 8 }]}>
          <Ionicons name="location" size={16} color={C.primary} />
          <Text style={[styles.infoText, { color: C.text }]}>{profile.region} National ID Registry</Text>
        </View>
      </View>
    );
  };

  const renderUtilityBillCard = () => {
    const { bill_id, amount, provider } = action.data;
    const isFine = action.type === 'pay_traffic_fine';
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.amber + '44' }]}>
        <View style={styles.header}>
          <Ionicons name={isFine ? "warning" : "receipt"} size={20} color={C.amber} />
          <Text style={[styles.title, { color: C.text }]}>{isFine ? 'Traffic Fine' : 'Utility Bill'}</Text>
        </View>
        <View style={[styles.infoRow, { backgroundColor: C.edge2 + '44' }]}>
          <Text style={[styles.infoText, { color: C.sub }]}>ID</Text>
          <Text style={[styles.infoText, { color: C.text }]}>{bill_id || action.data.fine_id}</Text>
        </View>
        {amount && (
          <View style={[styles.infoRow, { backgroundColor: C.edge2 + '44', marginTop: 4 }]}>
            <Text style={[styles.infoText, { color: C.sub }]}>Amount</Text>
            <Text style={[styles.infoText, { color: C.amber, fontFamily: Fonts.bold }]}>{fmtETB(amount)} ETB</Text>
          </View>
        )}
        <TouchableOpacity style={[styles.button, { backgroundColor: C.amber, marginTop: 12 }]} onPress={execute} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#000" /> : <Text style={[styles.buttonText, { color: '#000' }]}>Authorize Payment</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderMerchantOpsCard = () => {
    const { type } = action;
    const { order_id, product_id, new_stock, table_id, status } = action.data;
    
    let title = 'Merchant Action';
    let icon = 'business';
    let details = '';
    let btnColor = C.primary;
    let btnText = 'Confirm Action';

    if (type === 'ship_marketplace_order') {
      title = 'Ship Order';
      icon = 'cube';
      details = `Dispatch Order #${order_id} to delivery?`;
    } else if (type === 'fire_order_to_kitchen') {
      title = 'Start Cooking';
      icon = 'flame';
      details = `Move Food Order #${order_id} to PREPARING?`;
    } else if (type === 'set_table_status') {
      title = 'Table Update';
      icon = 'restaurant';
      details = `Set Table ${table_id} to ${status}?`;
    } else if (type === 'update_product_stock') {
      title = 'Stock Update';
      icon = 'list';
      details = `Update Product ${product_id} stock to ${new_stock}?`;
    } else if (type === 'perform_ekub_draw') {
      title = 'Ekub Draw';
      icon = 'trophy';
      details = `Perform Round Draw for ${action.data.ekub_id}?`;
      btnColor = C.gold;
    } else if (type === 'release_ekub_pot') {
      title = 'Release Pot';
      icon = 'cash';
      details = `Release ETB ${fmtETB(action.data.amount || 0)} to Winner?`;
      btnColor = C.gold;
    }

    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: btnColor + '44' }]}>
        <View style={styles.header}>
          <Ionicons name={icon as any} size={20} color={btnColor} />
          <Text style={[styles.title, { color: C.text }]}>{title}</Text>
        </View>
        <Text style={[styles.content, { color: C.sub }]}>{details}</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: btnColor }]} onPress={execute} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>{btnText}</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderFaydaRequestCard = () => (
    <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.blue + '44' }]}>
      <View style={styles.header}>
        <Ionicons name="finger-print" size={20} color={C.blue} />
        <Text style={[styles.title, { color: C.text }]}>Identity Verification</Text>
      </View>
      <Text style={[styles.content, { color: C.sub }]}>
        Verify Fayda ID: <Text style={{ color: C.text, fontFamily: Fonts.bold }}>{action.data.fayda_id}</Text>
      </Text>
      <TouchableOpacity style={[styles.button, { backgroundColor: C.blue }]} onPress={execute} disabled={loading}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Verify Now</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderBuyMarketplaceItem = () => {
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.primary + '44' }]}>
        <View style={styles.header}>
          <Ionicons name="cart" size={20} color={C.primary} />
          <Text style={[styles.title, { color: C.text }]}>Buy Product</Text>
        </View>
        {result?.product ? (
          <>
            <View style={[styles.infoRow, { backgroundColor: C.edge2 + '44' }]}>
              <Text style={[styles.infoText, { color: C.text, fontFamily: Fonts.bold }]}>{result.product.name}</Text>
              <Text style={[styles.infoText, { color: C.primary, marginLeft: 'auto' }]}>{fmtETB(result.product.price)} ETB</Text>
            </View>
            <TouchableOpacity style={[styles.button, { backgroundColor: C.primary, marginTop: 12 }]} onPress={() => {
              navigation.navigate('Marketplace', { screen: 'ProductDetails', params: { id: result.product.id } });
              onActionComplete?.();
            }}>
              <Text style={styles.buttonText}>View & Buy</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.content, { color: C.sub }]}>Preparing product for checkout...</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: C.primary }]} onPress={execute} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Fetch Product Info</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const renderOrderFoodItem = () => {
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.amber + '44' }]}>
        <View style={styles.header}>
          <Ionicons name="fast-food" size={20} color={C.amber} />
          <Text style={[styles.title, { color: C.text }]}>Order Food</Text>
        </View>
        {result?.menu_item ? (
          <>
            <View style={[styles.infoRow, { backgroundColor: C.edge2 + '44' }]}>
              <Text style={[styles.infoText, { color: C.text, fontFamily: Fonts.bold }]}>{result.menu_item.name}</Text>
              <Text style={[styles.infoText, { color: C.amber, marginLeft: 'auto' }]}>{fmtETB(result.menu_item.price)} ETB</Text>
            </View>
            <TouchableOpacity style={[styles.button, { backgroundColor: C.amber, marginTop: 12 }]} onPress={() => {
              navigation.navigate('Food', { screen: 'RestaurantDetails', params: { restaurantId: result.restaurant_id } });
              onActionComplete?.();
            }}>
              <Text style={[styles.buttonText, { color: '#000' }]}>View & Order</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.content, { color: C.sub }]}>Preparing your order...</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: C.amber }]} onPress={execute} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#000" /> : <Text style={[styles.buttonText, { color: '#000' }]}>Fetch Order Info</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  switch (action.type) {
    case 'process_p2p_transfer': return renderTransferCard();
    case 'pay_utility_bill':
    case 'pay_traffic_fine': return renderUtilityBillCard();
    case 'find_nearby_parking':
    case 'start_parking_session': return renderFindParkingCard();
    case 'reveal_delivery_pin': return renderRevealPinCard();
    case 'contribute_to_ekub':
    case 'vouch_for_ekub_payout': return renderContributeEkubCard();
    case 'search_restaurant':
    case 'get_food_menu': return renderSearchFoodCard();
    case 'buy_marketplace_item': return renderBuyMarketplaceItem();
    case 'order_food_item': return renderOrderFoodItem();
    case 'ship_marketplace_order':
    case 'fire_order_to_kitchen':
    case 'set_table_status':
    case 'update_product_stock':
    case 'perform_ekub_draw':
    case 'release_ekub_pot':
    case 'get_merchant_summary': return renderMerchantOpsCard();
    case 'verify_fayda_id': return renderFaydaRequestCard();
    case 'SPENDING_INSIGHT':
    case 'SAVINGS_TIP':
    case 'BUDGET_ALERT': return renderSpendingInsight();
    case 'RELEASE_ESCROW': return renderEscrowAction();
    case 'PAY_EKUB': return renderEkubAction();
    case 'PARKING_BOOKED': {
      const { sessionId, plate } = action.data;
      return <ParkingLiveStatus sessionId={sessionId} plate={plate} />;
    }
    case 'BROKER_VERIFIED': return renderBrokerAction();
    case 'FAYDA_VERIFIED': return renderFaydaAction();
    default: return null;
  }
};

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: Radius.xl, borderWidth: 1, marginTop: 12, ...Shadow.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: FontSize.md, fontFamily: Fonts.black },
  content: { fontSize: FontSize.sm, fontFamily: Fonts.medium, lineHeight: 20, marginBottom: 16 },
  button: { paddingVertical: 10, borderRadius: Radius.lg, alignItems: 'center' },
  buttonText: { fontSize: FontSize.sm, fontFamily: Fonts.bold, color: '#fff' },
  actions: { flexDirection: 'row', gap: 8 },
  miniButton: { flex: 1, paddingVertical: 8, borderRadius: Radius.md, alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: Radius.md },
  infoText: { fontSize: FontSize.xs, fontFamily: Fonts.medium },
  brokerProfile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brokerName: { fontSize: FontSize.lg, fontFamily: Fonts.bold },
  brokerMeta: { fontSize: FontSize.xs, fontFamily: Fonts.medium },
  rankBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full },
  rankText: { fontSize: FontSize.md, fontFamily: Fonts.black },
  statsContainer: { flexDirection: 'row', gap: 24, borderTopWidth: 1, borderTopColor: '#8882', paddingTop: 12 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: FontSize.md, fontFamily: Fonts.bold },
  statLabel: { fontSize: FontSize.xs, fontFamily: Fonts.medium },
});

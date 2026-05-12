import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface ReceiptProps {
  order: any;
  merchant?: any;
  onClose: () => void;
  isAgentMode?: boolean; 
}

export const EthiopianReceipt: React.FC<ReceiptProps> = ({ order, merchant, onClose, isAgentMode = false }) => {
  const C = useTheme();
  if (!order) return null;
  
  const date = new Date(order.created_at || Date.now());
  const dateStr = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) + ', ' + date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true
  });
  const tin = merchant?.tin || '0012345678'; // Fallback if missing
  const license = merchant?.license_no || 'L/000/2026';
  
  // Agent Specific Calculations
  const agentGross = Number(order.agent_fee || 0);
  const agentTax = agentGross * 0.02; // 2% Withholding Tax
  const agentPlatformFee = agentGross * 0.03; // 3% Platform Usage Fee
  const agentNet = agentGross - agentTax - agentPlatformFee;

  // Citizen/Merchant Calculations
  const platformFee = Number(order.platform_fee || 0);
  const baseTotal = Number(order.total_amount || order.total || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const grandTotal = baseTotal + platformFee;
  
  const vatRate = 0.15;
  const subtotal = baseTotal / (1 + vatRate);
  const vatAmount = baseTotal - subtotal;

  const handleShare = async () => {
    try {
      const msg = isAgentMode 
        ? `CityLink Agent Receipt - Net: ${fmtETB(agentNet)}\nOrder: ${order.id}`
        : `CityLink Receipt - ${order.id}\nTotal: ${fmtETB(grandTotal)}\nMerchant: ${order.restaurant_name || merchant?.business_name}`;
      
      await Share.share({ message: msg });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={s.overlay}>
      <View style={s.receiptContainer}>
        {/* Header Actions */}
        <View style={s.topActions}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
            <Ionicons name="share-outline" size={24} color={C.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          {/* Official Branding */}
          <View style={s.fiscalHeader}>
            <Text style={[s.fiscalTitle, { color: C.text }]}>
              {isAgentMode ? 'OFFICIAL SERVICE SETTLEMENT' : 'OFFICIAL FISCAL RECEIPT'}
            </Text>
            <Text style={s.fiscalSubtitle}>REPUBLIC OF ETHIOPIA - MINISTRY OF REVENUE</Text>
          </View>

          {/* Merchant/Agent Identity */}
          <View style={s.section}>
            <Text style={[s.businessName, { color: C.primary }]}>
              {isAgentMode ? 'CityLink Courier Network' : (order.restaurant_name || merchant?.business_name || 'CityLink Merchant')}
            </Text>
            <Text style={s.metaText}>Address: Addis Ababa, Ethiopia</Text>
            {!isAgentMode && (
              <>
                <View style={s.row}>
                  <Text style={s.label}>TIN:</Text>
                  <Text style={s.value}>{tin}</Text>
                </View>
                <View style={s.row}>
                  <Text style={s.label}>License:</Text>
                  <Text style={s.value}>{license}</Text>
                </View>
              </>
            )}
          </View>

          <View style={s.divider} />

          {/* Order Details */}
          <View style={s.section}>
            <View style={s.row}>
              <Text style={s.label}>Date:</Text>
              <Text style={s.value}>{dateStr}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Invoice #:</Text>
              <Text style={s.value}>{order.id.slice(0, 12).toUpperCase()}</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Items Table */}
          <View style={s.itemTable}>
            <View style={[s.row, s.tableHeader]}>
              <Text style={[s.itemCell, { flex: 4, color: '#64748b' }]}>Description</Text>
              <Text style={[s.itemCell, { textAlign: 'center', flex: 1.5, color: '#64748b' }]}>
                {isAgentMode ? 'Unit' : 'Qty'}
              </Text>
              <Text style={[s.itemCell, { textAlign: 'right', flex: 2.5, color: '#64748b' }]}>Amount</Text>
            </View>
            
            {isAgentMode ? (
              <View style={s.row}>
                <Text style={[s.itemCell, { flex: 4 }]}>Logistics Service Fee</Text>
                <Text style={[s.itemCell, { textAlign: 'center', flex: 1.5 }]}>1</Text>
                <Text style={[s.itemCell, { textAlign: 'right', fontWeight: '700', flex: 2.5 }]}>
                  {agentGross.toFixed(2)}
                </Text>
              </View>
            ) : (
              (order.items || []).map((item: any, idx: number) => {
                const itemQty = item.qty || item.quantity || 1;
                const itemPrice = item.price || item.unit_price || 0;
                return (
                  <View key={idx} style={s.row}>
                    <Text style={[s.itemCell, { flex: 4 }]}>{item.name}</Text>
                    <Text style={[s.itemCell, { textAlign: 'center', flex: 1.5 }]}>{itemQty}</Text>
                    <Text style={[s.itemCell, { textAlign: 'right', fontWeight: '700', flex: 2.5 }]}>
                      {(Number(itemPrice) * itemQty).toFixed(2)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          <View style={s.divider} />

          {/* Totals Section */}
          <View style={[s.summary, { backgroundColor: C.surfaceHigh }]}>
            {isAgentMode ? (
              <>
                <View style={s.row}>
                  <Text style={[s.label, { color: C.sub }]}>Gross Earnings</Text>
                  <Text style={[s.value, { color: C.text }]}>{agentGross.toFixed(2)} ETB</Text>
                </View>
                <View style={s.row}>
                  <Text style={[s.label, { color: C.red }]}>Withholding Tax (2%)</Text>
                  <Text style={[s.value, { color: C.red }]}>-{agentTax.toFixed(2)} ETB</Text>
                </View>
                <View style={s.row}>
                  <Text style={[s.label, { color: C.red }]}>Platform Fee (3%)</Text>
                  <Text style={[s.value, { color: C.red }]}>-{agentPlatformFee.toFixed(2)} ETB</Text>
                </View>
                <View style={[s.row, { marginTop: 12, borderTopWidth: 1, borderTopColor: C.edge2, paddingTop: 12 }]}>
                  <Text style={[s.grandTotalLabel, { color: C.text }]}>NET SETTLEMENT</Text>
                  <Text style={[s.grandTotalValue, { color: C.primary }]}>{agentNet.toFixed(2)} ETB</Text>
                </View>
              </>
            ) : (
              <>
                <View style={s.row}>
                  <Text style={[s.label, { color: C.sub }]}>Subtotal (Excl. VAT)</Text>
                  <Text style={[s.value, { color: C.text }]}>{subtotal.toFixed(2)} ETB</Text>
                </View>
                <View style={s.row}>
                  <Text style={[s.label, { color: C.sub }]}>VAT (15%)</Text>
                  <Text style={[s.value, { color: C.text }]}>{vatAmount.toFixed(2)} ETB</Text>
                </View>
                {deliveryFee > 0 && (
                  <View style={s.row}>
                    <Text style={[s.label, { color: C.sub }]}>Delivery Fee</Text>
                    <Text style={[s.value, { color: C.text }]}>{deliveryFee.toFixed(2)} ETB</Text>
                  </View>
                )}
                {platformFee > 0 && (
                  <View style={s.row}>
                    <Text style={[s.label, { color: C.sub }]}>Platform Service Fee</Text>
                    <Text style={[s.value, { color: C.text }]}>{platformFee.toFixed(2)} ETB</Text>
                  </View>
                )}
                <View style={[s.row, { marginTop: 12, borderTopWidth: 1, borderTopColor: C.edge2, paddingTop: 12 }]}>
                  <Text style={[s.grandTotalLabel, { color: C.text }]}>GRAND TOTAL</Text>
                  <Text style={[s.grandTotalValue, { color: C.primary }]}>{grandTotal.toFixed(2)} ETB</Text>
                </View>
              </>
            )}
          </View>

          {/* QR Code Section */}
          <View style={[s.qrContainer, { backgroundColor: C.surfaceHigh, borderColor: C.edge2 }]}>
            <QRCode
              value={`https://citylink.app/verify/receipt/${order.id}`}
              size={120}
              color={C.text}
              backgroundColor="transparent"
            />
            <Text style={[s.qrHint, { color: C.sub }]}>SCAN TO VERIFY LEGAL AUTHENTICITY</Text>
          </View>

          <View style={s.footer}>
            <Text style={[s.footerText, { color: C.sub }]}>Computer Generated - No Signature Required</Text>
            <Text style={[s.footerText, { color: C.sub }]}>CityLink Digital Ecosystem v2.1 (Standardized)</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  receiptContainer: {
    backgroundColor: '#FFFFFF', // Paper-white for fiscal receipt
    borderRadius: 32,
    overflow: 'hidden',
    maxHeight: '92%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeBtn: { padding: 8 },
  shareBtn: { padding: 8 },
  content: { padding: 24 },
  fiscalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fiscalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    color: '#0f172a',
  },
  fiscalSubtitle: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  section: { marginVertical: 8 },
  businessName: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    color: '#000000',
  },
  metaText: {
    fontSize: 13,
    marginBottom: 10,
    color: '#475569',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
    borderRadius: 1,
  },
  itemTable: { marginTop: 8 },
  tableHeader: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 12,
  },
  itemCell: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  summary: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981', // Keep success green for total
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 32,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  qrHint: {
    marginTop: 16,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#94a3b8',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
    color: '#94a3b8',
  },
});

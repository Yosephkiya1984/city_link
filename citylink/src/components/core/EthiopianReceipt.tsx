import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface ReceiptProps {
  order: any;
  merchant?: any;
  onClose: () => void;
}

export const EthiopianReceipt: React.FC<ReceiptProps> = ({ order, merchant, onClose }) => {
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
  
  // Ethiopian Tax Calculation (VAT 15%)
  const total = Number(order.total || 0);
  const vatRate = 0.15;
  const subtotal = total / (1 + vatRate);
  const vatAmount = total - subtotal;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `CityLink Receipt - ${order.id}\nTotal: ETB ${total}\nMerchant: ${order.restaurant_name || merchant?.business_name}`,
      });
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
            <Text style={s.fiscalTitle}>OFFICIAL FISCAL RECEIPT</Text>
            <Text style={s.fiscalSubtitle}>Ministry of Revenue, Ethiopia</Text>
          </View>

          {/* Merchant Section */}
          <View style={s.section}>
            <Text style={s.businessName}>{order.restaurant_name || merchant?.business_name || 'CityLink Merchant'}</Text>
            <Text style={s.metaText}>Address: Addis Ababa, Ethiopia</Text>
            <View style={s.row}>
              <Text style={s.label}>TIN:</Text>
              <Text style={s.value}>{tin}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>License:</Text>
              <Text style={s.value}>{license}</Text>
            </View>
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
              <Text style={[s.itemCell, { flex: 2 }]}>Description</Text>
              <Text style={[s.itemCell, { textAlign: 'center' }]}>Qty</Text>
              <Text style={[s.itemCell, { textAlign: 'right' }]}>Total</Text>
            </View>
            
            {(order.items || []).map((item: any, idx: number) => (
              <View key={idx} style={s.row}>
                <Text style={[s.itemCell, { flex: 2, color: C.text }]}>{item.name}</Text>
                <Text style={[s.itemCell, { textAlign: 'center' }]}>{item.quantity || 1}</Text>
                <Text style={[s.itemCell, { textAlign: 'right', fontWeight: '700' }]}>
                  {Number(item.price * (item.quantity || 1)).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={s.divider} />

          {/* Totals Section */}
          <View style={s.summary}>
            <View style={s.row}>
              <Text style={s.label}>Subtotal (Exclusive)</Text>
              <Text style={s.value}>{subtotal.toFixed(2)} ETB</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>VAT (15%)</Text>
              <Text style={s.value}>{vatAmount.toFixed(2)} ETB</Text>
            </View>
            {order.platform_fee > 0 && (
              <View style={s.row}>
                <Text style={s.label}>Platform Fee</Text>
                <Text style={s.value}>{Number(order.platform_fee).toFixed(2)} ETB</Text>
              </View>
            )}
            <View style={[s.row, { marginTop: 12 }]}>
              <Text style={s.grandTotalLabel}>GRAND TOTAL</Text>
              <Text style={s.grandTotalValue}>{total.toFixed(2)} ETB</Text>
            </View>
          </View>

          {/* QR Code Section */}
          <View style={s.qrContainer}>
            <QRCode
              value={`https://citylink.app/verify/receipt/${order.id}`}
              size={120}
              color={C.text}
              backgroundColor="transparent"
            />
            <Text style={s.qrHint}>Scan to verify this receipt</Text>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Computer Generated Receipt</Text>
            <Text style={s.footerText}>CityLink Digital Ecosystem v2.0</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  receiptContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  closeBtn: { padding: 4 },
  shareBtn: { padding: 4 },
  content: { padding: 24 },
  fiscalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fiscalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: 1.5,
  },
  fiscalSubtitle: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 4,
  },
  section: { marginVertical: 8 },
  businessName: {
    fontSize: 20,
    fontWeight: '900',
    color: C.primary,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  value: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  itemTable: { marginTop: 8 },
  tableHeader: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  itemCell: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
  },
  summary: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: C.primary,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 32,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrHint: {
    marginTop: 12,
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
  },
});

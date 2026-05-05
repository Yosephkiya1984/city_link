import React from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, Share, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../hooks/useTheme';
import { Fonts, Radius, Shadow, Colors, FontSize } from '../../theme';
import { fmtETB, fmtDateTime } from '../../utils';
import { CButton } from '../ui/CButton';

interface ReceiptItem {
  label: string;
  value: number;
}

interface LegalReceiptProps {
  visible: boolean;
  onClose: () => void;
  merchantName: string;
  merchantTIN: string;
  transactionId: string;
  date: string;
  amount: number;
  paymentMethod: 'WALLET' | 'CASH' | 'BANK_TRANSFER';
  items: ReceiptItem[];
  title?: string;
}

export function LegalReceipt({
  visible,
  onClose,
  merchantName,
  merchantTIN,
  transactionId,
  date,
  amount,
  paymentMethod,
  items,
  title = 'OFFICIAL FISCAL RECEIPT',
}: LegalReceiptProps) {
  const C = useTheme();

  const handleShare = async () => {
    try {
      await Share.share({
        message: [
          '🏙️ CityLink Digital Receipt',
          '─────────────────────────',
          `Merchant : ${merchantName}`,
          `TIN      : ${merchantTIN}`,
          `Date     : ${fmtDateTime(date)}`,
          `Ref      : ${transactionId}`,
          `Method   : ${paymentMethod}`,
          `Amount   : ${fmtETB(amount)}`,
          '─────────────────────────',
          'Verified by CityLink Infrastructure',
        ].join('\n'),
      });
    } catch (error) {
      console.log(error);
    }
  };

  const vat = amount * 0.15;
  const subtotal = amount - vat;

  const qrPayload = JSON.stringify({
    ref: transactionId,
    amount,
    merchant: merchantName,
    date,
    verified: true,
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: C.surface }]}>
          {/* Header Actions */}
          <View style={[styles.topActions, { backgroundColor: C.edge2, borderBottomColor: C.edge }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
              <Ionicons name="share-outline" size={24} color={C.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Fiscal Branding */}
            <View style={styles.fiscalHeader}>
              <Text style={[styles.fiscalTitle, { color: C.text }]}>{title}</Text>
              <Text style={[styles.fiscalSubtitle, { color: C.sub }]}>Ministry of Revenue, Ethiopia</Text>
            </View>

            {/* Merchant Section */}
            <View style={styles.section}>
              <Text style={[styles.merchantName, { color: C.primary }]}>{merchantName}</Text>
              <Text style={[styles.metaText, { color: C.sub }]}>Address: Addis Ababa, Ethiopia</Text>
              <View style={styles.row}>
                <Text style={[styles.label, { color: C.sub }]}>TIN:</Text>
                <Text style={[styles.value, { color: C.text }]}>{merchantTIN}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: C.sub }]}>Ref Number:</Text>
                <Text style={[styles.value, { color: C.text }]}>{transactionId}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Details Section */}
            <View style={styles.section}>
              <View style={styles.row}>
                <Text style={[styles.label, { color: C.sub }]}>Date:</Text>
                <Text style={[styles.value, { color: C.text }]}>{fmtDateTime(date)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: C.sub }]}>Payment Method:</Text>
                <Text style={[styles.value, { color: C.primary }]}>
                  {paymentMethod === 'WALLET' ? 'DIGITAL WALLET' : paymentMethod}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Items Table */}
            <View style={styles.itemTable}>
              <View style={[styles.row, styles.tableHeader, { borderBottomColor: C.edge }]}>
                <Text style={[styles.itemCell, { flex: 2, color: C.sub }]}>Description</Text>
                <Text style={[styles.itemCell, { textAlign: 'right', color: C.sub }]}>Total</Text>
              </View>
              
              {items.map((item, i) => (
                <View key={i} style={styles.row}>
                  <Text style={[styles.itemCell, { flex: 2, color: C.text }]}>{item.label}</Text>
                  <Text style={[styles.itemCell, { textAlign: 'right', color: C.text, fontWeight: '700' }]}>
                    {fmtETB(item.value)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            {/* Totals Section */}
            <View style={[styles.summary, { backgroundColor: C.edge2 }]}>
              <View style={styles.row}>
                <Text style={[styles.label, { color: C.sub }]}>Subtotal (Exclusive)</Text>
                <Text style={[styles.value, { color: C.text }]}>{fmtETB(subtotal)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: C.sub }]}>VAT (15%)</Text>
                <Text style={[styles.value, { color: C.text }]}>{fmtETB(vat)}</Text>
              </View>
              <View style={[styles.row, { marginTop: 12 }]}>
                <Text style={[styles.grandTotalLabel, { color: C.text }]}>GRAND TOTAL</Text>
                <Text style={[styles.grandTotalValue, { color: C.primary }]}>{fmtETB(amount)}</Text>
              </View>
            </View>

            {/* QR Code Section */}
            <View style={[styles.qrContainer, { backgroundColor: C.edge2, borderColor: C.edge }]}>
              <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}>
                <QRCode value={qrPayload} size={120} />
              </View>
              <Text style={[styles.qrHint, { color: C.sub }]}>Scan to verify this receipt</Text>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: C.hint }]}>Computer Generated Receipt</Text>
              <Text style={[styles.footerText, { color: C.hint }]}>CityLink Digital Ecosystem v2.0</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    maxHeight: '90%',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeBtn: { padding: 4 },
  shareBtn: { padding: 4 },
  scroll: {
    padding: 24,
  },
  fiscalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fiscalTitle: {
    fontSize: 16,
    fontFamily: Fonts.black,
    letterSpacing: 1.5,
  },
  fiscalSubtitle: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    marginTop: 4,
  },
  section: { marginVertical: 8 },
  merchantName: {
    fontSize: 20,
    fontFamily: Fonts.black,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
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
    fontFamily: Fonts.bold,
  },
  value: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 1,
  },
  itemTable: { marginTop: 8 },
  tableHeader: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  itemCell: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    flex: 1,
  },
  summary: {
    padding: 16,
    borderRadius: 16,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontFamily: Fonts.black,
  },
  grandTotalValue: {
    fontSize: 20,
    fontFamily: Fonts.black,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 32,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  qrHint: {
    marginTop: 12,
    fontSize: 10,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: Fonts.medium,
  },
});

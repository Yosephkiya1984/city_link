import React from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../hooks/useTheme';
import { Fonts, Radius, Shadow, Colors } from '../../theme';
import { fmtETB, fmtDateTime } from '../../utils';
import { CButton } from '../ui/CButton';
import { GlassView } from '../GlassView';

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
  title = 'FISCAL RECEIPT',
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
        <GlassView intensity={40} style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconBox, { backgroundColor: C.primary + '20' }]}>
                <Ionicons name="checkmark-circle" size={32} color={C.primary} />
              </View>
              <Text style={[styles.title, { color: C.text }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: C.sub }]}>
                Government Compliant Digital Document
              </Text>
            </View>

            {/* Receipt Body */}
            <View
              style={[styles.receiptPaper, { backgroundColor: C.surface, borderColor: C.edge }]}
            >
              <View style={styles.merchantInfo}>
                <Text style={[styles.merchantName, { color: C.text }]}>{merchantName}</Text>
                <Text style={[styles.tinText, { color: C.sub }]}>TIN: {merchantTIN}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: C.sub }]}>Ref Number</Text>
                <Text style={[styles.infoValue, { color: C.text }]}>{transactionId}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: C.sub }]}>Date & Time</Text>
                <Text style={[styles.infoValue, { color: C.text }]}>{fmtDateTime(date)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: C.sub }]}>Method</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: paymentMethod === 'WALLET' ? C.primary : Colors.gold },
                  ]}
                >
                  {paymentMethod === 'WALLET'
                    ? 'DIGITAL WALLET'
                    : paymentMethod === 'BANK_TRANSFER'
                      ? 'BANK TRANSFER'
                      : 'CASH PAYMENT'}
                </Text>
              </View>

              <View style={[styles.divider, { marginVertical: 16 }]} />

              {items.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={[styles.itemLabel, { color: C.text }]}>{item.label}</Text>
                  <Text style={[styles.itemValue, { color: C.text }]}>{fmtETB(item.value)}</Text>
                </View>
              ))}

              <View style={[styles.divider, { marginVertical: 16 }]} />

              <View style={styles.totalBlock}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: C.sub }]}>Subtotal</Text>
                  <Text style={[styles.summaryValue, { color: C.sub }]}>{fmtETB(subtotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: C.sub }]}>VAT (15%)</Text>
                  <Text style={[styles.summaryValue, { color: C.sub }]}>{fmtETB(vat)}</Text>
                </View>
                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                  <Text style={[styles.finalTotalLabel, { color: C.text }]}>TOTAL</Text>
                  <Text style={[styles.finalTotalValue, { color: C.primary }]}>
                    {fmtETB(amount)}
                  </Text>
                </View>
              </View>

              {/* QR Code Section */}
              <View style={styles.qrSection}>
                <View style={[styles.divider, { marginBottom: 20 }]} />
                <Text style={[styles.qrLabel, { color: C.sub }]}>Scan to Verify</Text>
                <View style={[styles.qrBox, { backgroundColor: '#fff' }]}>
                  <QRCode value={qrPayload} size={140} />
                </View>
                <Text style={[styles.qrRef, { color: C.hint }]} numberOfLines={1}>
                  {transactionId}
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Ionicons name="shield-checkmark" size={16} color={C.green} />
              <Text style={[styles.footerText, { color: C.sub }]}>
                Verified and Secured by CityLink Infrastructure
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <CButton title="Share" onPress={handleShare} variant="outline" style={{ flex: 1 }} />
            <CButton title="Done" onPress={onClose} style={{ flex: 1, marginLeft: 12 }} />
          </View>
        </GlassView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    maxHeight: '90%',
  },
  scroll: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 4,
  },
  receiptPaper: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 20,
    ...Shadow.md,
  },
  merchantInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  merchantName: {
    fontSize: 18,
    fontFamily: Fonts.black,
    textTransform: 'uppercase',
  },
  tinText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  infoValue: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  itemValue: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  totalBlock: {
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  summaryValue: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  finalTotalLabel: {
    fontSize: 20,
    fontFamily: Fonts.black,
  },
  finalTotalValue: {
    fontSize: 24,
    fontFamily: Fonts.black,
  },
  receiptCut: {
    position: 'absolute',
    bottom: -10,
    left: 20,
    right: 20,
    height: 20,
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  qrLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  qrBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  qrRef: {
    fontSize: 9,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  footerText: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});

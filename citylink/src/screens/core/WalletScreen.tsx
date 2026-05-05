import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { FlashList } from '../../components/common/SafeFlashList';

// â”€â”€ Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import {
  TopBar,
  CButton,
  SectionTitle,
  CInput,
  TransactionChart,
  TransactionItem,
  useTheme,
} from '../../components';
import { SuccessOverlay } from '../../components/layout/SuccessOverlay';
import { ProcessingOverlay } from '../../components/layout/ProcessingOverlay';
import { LegalReceipt } from '../../components/shared/LegalReceipt';
import { EthiopianReceipt } from '../../components/core/EthiopianReceipt';
import { Transaction } from '../../types/domain_types';

// â”€â”€ State & Theme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { Radius, Shadow, Fonts, FontSize, Spacing } from '../../theme';
import { fmtETB, t, getPhoneProvider } from '../../utils';
import { CHAPA_CHANNELS } from '../../config';

// â”€â”€ Domain Services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import * as WalletService from '../../services/wallet.service';
import PaymentService from '../../services/payment.service';
import { fetchFoodOrderById } from '../../services/food.service';
import { useServiceAccess } from '../../services/serviceAccess';

export default function WalletScreen() {
  const navigation = useNavigation();
  const C = useTheme();

  // â”€â”€ Global State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const currentUser = useAuthStore((s) => s.currentUser);
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const transactions = useWalletStore((s) => s.transactions);
  const setTransactions = useWalletStore((s) => s.setTransactions);
  const showToast = useSystemStore((s) => s.showToast);
  const { guardServiceAccess } = useServiceAccess();

  // â”€â”€ UI State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [loading, setLoading] = useState(false);
  const [topupModal, setTopupModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('telebirr');
  const [walletLimit, setWalletLimit] = useState(100);
  const [hasManuallySelected, setHasManuallySelected] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [fullOrder, setFullOrder] = useState<any>(null);
  const [fetchingReceipt, setFetchingReceipt] = useState(false);

  // â”€â”€ Verification Effect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const isVerified = currentUser?.fayda_verified || currentUser?.kyc_status === 'VERIFIED';
    setWalletLimit(isVerified ? 50000 : 100);

    // Auto-detect provider based on phone (only if not manually selected)
    if (!hasManuallySelected && currentUser?.phone) {
      const detected = getPhoneProvider(currentUser.phone);
      if (detected !== 'unknown') {
        setSelectedProvider(detected);
      }
    }
  }, [currentUser, hasManuallySelected]);

  // Reset manual selection flag when modal opens to allow auto-detection
  useEffect(() => {
    if (topupModal) {
      setHasManuallySelected(false);
    }
  }, [topupModal]);

  const fetchWallet = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const data = await WalletService.fetchWalletData(currentUser.id);
      if (data) {
        setBalance(data.balance);
        setTransactions(data.transactions || []);
      }

      // 📡 SHIELD 2.0: Background PIN Hash Sync (Refinement)
      const { ensureFullSync } = await import('../../services/walletPin');
      ensureFullSync(currentUser.id);
    } catch (e) {
      console.error('Wallet sync error:', e);
    }
  }, [currentUser?.id, setBalance, setTransactions]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSelectTransaction = async (tx: Transaction) => {
    setSelectedTx(tx);
    if (tx.category === 'food' && tx.reference_id) {
      setFetchingReceipt(true);
      try {
        const { data, error } = await fetchFoodOrderById(tx.reference_id);
        if (data) setFullOrder(data);
      } catch (e) {
        console.error('Receipt fetch error:', e);
      } finally {
        setFetchingReceipt(false);
      }
    } else {
      setFullOrder(null);
    }
  };

  const handleTopup = async () => {
    const canAccess = await guardServiceAccess('wallet top-up');
    if (!canAccess) return;

    const amt = parseFloat(amount);
    if (!amt || amt < 5) {
      showToast(t('min_topup_error'), 'error');
      return;
    }
    if (!currentUser || !currentUser.id) {
      showToast(t('auth_error'), 'error');
      return;
    }
    if (balance + amt > walletLimit) {
      showToast(t('limit_reached_error'), 'error');
      return;
    }

    setLoading(true);
    try {
      const initRes = await PaymentService.initialize({
        amount: amt,
        description: `Wallet Top-up via ${selectedProvider.toUpperCase()}`,
        channel: selectedProvider,
        phone: currentUser.phone || '',
        name: currentUser.full_name || 'CityLink User',
      });

      if (initRes.status === 'success') {
        setShowSuccess(true);
        setTopupModal(false);
        // We DO NOT clear amount here so the success message can show it

        // Polling fallback (optional, as Realtime is primary)
        setTimeout(() => fetchWallet(), 10000);
      } else {
        showToast(t('payment_init_failed'), 'error');
      }
    } catch (error) {
      showToast(t('system_unavailable'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const qrData = JSON.stringify({
    type: 'p2p',
    id: currentUser?.id,
    phone: currentUser?.phone,
  });

  const renderHeader = () => (
    <>
      <View style={styles.heroSection}>
        <LinearGradient
          colors={[C.primary, C.primaryB]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.walletCard}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.badge,
                { backgroundColor: walletLimit > 100 ? C.green : 'rgba(255,255,255,0.2)' },
              ]}
            >
              <Text style={styles.badgeText}>
                {walletLimit > 100 ? t('verified_status') : t('basic_status')}
              </Text>
            </View>
            <Ionicons name="card-outline" size={24} color={C.white} />
          </View>

          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>{t('available_balance')}</Text>
              <Text style={styles.balanceAmount}>{fmtETB(balance, 0)}</Text>
            </View>
            <View style={styles.limitIndicator}>
              <Text style={styles.limitText}>
                {t('limit_label')} {fmtETB(walletLimit, 0)}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => setTopupModal(true)} style={styles.primaryAction}>
              <Ionicons name="add-circle" size={18} color={C.primary} />
              <Text style={styles.primaryActionText}>{t('top_up')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setQrModal(true)} style={styles.secondaryAction}>
              <Ionicons name="qr-code-outline" size={20} color={C.white} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('SendMoney')}
              style={styles.secondaryAction}
            >
              <Ionicons name="send" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.chartSection}>
        <TransactionChart transactions={transactions} />
      </View>

      <View style={styles.activitySection}>
        <SectionTitle title={t('transactions')} action={t('filter')} />
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.ink }]}>
      <TopBar title={t('my_wallet')} />
      <FlashList
        data={transactions}
        keyExtractor={(item: any, index: number) => item.id || index.toString()}
        estimatedItemSize={80}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }: { item: any; index: number }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <TransactionItem tx={item} index={index} onPress={() => handleSelectTransaction(item)} />
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyActivity}>
            <Ionicons name="receipt-outline" size={48} color={C.hint} />
            <Text style={{ color: C.sub, marginTop: 16, fontFamily: Fonts.medium }}>
              {t('no_activity')}
            </Text>
          </View>
        )}
      />

      {/* QR MODAL */}
      <Modal visible={qrModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setQrModal(false)} />
        <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
          <Text style={[styles.modalTitle, { color: C.text }]}>{t('my_payment_qr')}</Text>
          <View style={styles.qrContainer}>
            <QRCode value={qrData} size={200} />
          </View>
          <Text style={[styles.qrUser, { color: C.text }]}>{currentUser?.full_name}</Text>
          <CButton
            title={t('close')}
            variant="secondary"
            onPress={() => setQrModal(false)}
            style={{ width: '100%' }}
          />
        </View>
      </Modal>

      {/* TOPUP MODAL */}
      <Modal visible={topupModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => !loading && setTopupModal(false)} />
        <View style={[styles.modalSheet, { backgroundColor: C.ink }]}>
          <Text style={[styles.modalTitle, { color: C.text }]}>{t('top_up_wallet')}</Text>

          <View style={[styles.limitBox, { backgroundColor: C.surface, borderColor: C.edge2 }]}>
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
              {t('available_space')}
            </Text>
            <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
              {fmtETB(walletLimit - balance, 0)}
            </Text>
          </View>

          <CInput
            label={t('amount_etb')}
            value={amount}
            onChangeText={setAmount}
            placeholder="500"
            keyboardType="numeric"
          />

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.bold, marginBottom: 12 }}>
              {t('select_channel')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {Object.entries(CHAPA_CHANNELS).map(([id, info]) => (
                <TouchableOpacity
                  key={id}
                  onPress={() => {
                    setSelectedProvider(id);
                    setHasManuallySelected(true);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: selectedProvider === id ? C.primary + '20' : C.surface,
                    borderWidth: 1.5,
                    borderColor: selectedProvider === id ? C.primary : C.edge2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{(info as any).icon}</Text>
                  <Text
                    style={{
                      color: selectedProvider === id ? C.text : C.sub,
                      fontSize: 13,
                      fontFamily: Fonts.bold,
                    }}
                  >
                    {(info as any).name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.amountPresetRow}>
            {[100, 500, 1000, 5000].map((a) => (
              <TouchableOpacity
                key={a}
                onPress={() => setAmount(String(a))}
                style={[styles.presetBtn, { backgroundColor: C.edge2 }]}
              >
                <Text style={{ color: C.text, fontSize: 12, fontFamily: Fonts.bold }}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <CButton
            title={loading ? t('processing') : t('proceed_payment')}
            onPress={handleTopup}
            loading={loading}
          />
        </View>
      </Modal>

      <SuccessOverlay
        visible={showSuccess}
        title={t('topup_initiated')}
        subtitle={t('topup_desc', {
          amount: fmtETB(parseFloat(amount) || 0, 0),
          provider: selectedProvider,
        })}
        onClose={() => {
          setShowSuccess(false);
          setAmount('');
        }}
      />

      <ProcessingOverlay visible={loading} message={t('topup_processing')} />

      {/* RECEIPT MODAL */}
      {selectedTx && !fullOrder && !fetchingReceipt && (
        <LegalReceipt
          visible={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          merchantName="CityLink Services"
          merchantTIN="0000000000"
          transactionId={selectedTx.reference_id || selectedTx.idempotency_key || selectedTx.id}
          date={selectedTx.created_at}
          amount={Number(selectedTx.amount)}
          paymentMethod="WALLET"
          title={selectedTx.type === 'credit' ? 'CREDIT RECEIPT' : 'DEBIT RECEIPT'}
          items={[
            {
              label: selectedTx.description || selectedTx.category,
              value: Number(selectedTx.amount),
            },
          ]}
        />
      )}

      {fullOrder && (
        <Modal visible={!!fullOrder} transparent animationType="slide">
          <EthiopianReceipt 
            order={fullOrder} 
            onClose={() => {
              setFullOrder(null);
              setSelectedTx(null);
            }} 
          />
        </Modal>
      )}

      {fetchingReceipt && (
        <ProcessingOverlay visible={true} message="Loading secure receipt..." />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: { padding: 16 },
  walletCard: { borderRadius: 32, padding: 24, ...Shadow.lg },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: Fonts.bold, textTransform: 'uppercase' },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  balanceLabel: { color: '#fff', fontSize: 12, fontFamily: Fonts.bold, opacity: 0.8 },
  balanceAmount: { color: '#fff', fontSize: 44, fontFamily: Fonts.black, marginTop: 4 },
  limitIndicator: { alignItems: 'flex-end' },
  limitText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: Fonts.medium },
  actionRow: { flexDirection: 'row', gap: 12 },
  primaryAction: {
    flex: 1,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryActionText: { color: '#000', fontSize: 14, fontFamily: Fonts.black },
  secondaryAction: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartSection: { paddingHorizontal: 16 },
  activitySection: { paddingHorizontal: 16 },
  emptyActivity: { padding: 60, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, paddingBottom: 50 },
  modalTitle: { fontSize: 24, fontFamily: Fonts.black, marginBottom: 24 },
  qrContainer: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 24,
    alignSelf: 'center',
  },
  qrUser: { fontSize: 18, fontFamily: Fonts.black, marginBottom: 30, textAlign: 'center' },
  limitBox: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  amountPresetRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
});

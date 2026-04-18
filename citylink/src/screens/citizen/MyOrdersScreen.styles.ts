import { StyleSheet, Dimensions } from 'react-native';
import { Fonts, Shadow } from '../../theme';

const { width } = Dimensions.get('window');

/**
 * MyOrdersScreen.styles — Extracted styles for MyOrdersScreen and its components.
 */
export const myOrdersStyles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontFamily: Fonts.black, fontSize: 18, marginBottom: 2 },
  summaryLabel: { fontFamily: Fonts.medium, fontSize: 11 },
  summaryDivider: { width: 1, height: 30 },

  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    width: '50%',
    top: 4,
    bottom: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', zIndex: 1 },
  segmentText: { fontFamily: Fonts.black, fontSize: 11, letterSpacing: 0.5 },

  scrollContent: { padding: 16, paddingBottom: 80 },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: { fontFamily: Fonts.black, fontSize: 18, marginBottom: 6 },
  emptyStateSub: { fontFamily: Fonts.medium, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    ...Shadow.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1 },
  productName: { fontFamily: Fonts.black, fontSize: 15, marginBottom: 3 },
  orderId: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 0.3 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: Fonts.black,
    fontSize: 10,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  countdownText: {
    fontFamily: Fonts.black,
    fontSize: 11,
    color: '#f59e0b',
  },
  divider: { height: 1, marginVertical: 14 },

  escrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  escrowText: { fontFamily: Fonts.medium, fontSize: 11, lineHeight: 16, flex: 1 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceLabel: { fontFamily: Fonts.black, fontSize: 9, letterSpacing: 0.5, marginBottom: 2 },
  priceValue: { fontFamily: Fonts.black, fontSize: 17, marginBottom: 4 },
  dateText: { fontFamily: Fonts.medium, fontSize: 11 },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: { fontFamily: Fonts.black, fontSize: 11 },

  ghostBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  ghostBtnText: { fontFamily: Fonts.bold, fontSize: 13 },

  trackerContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  trackerSteps: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  trackerDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  trackerLine: { flex: 1, height: 2 },
  trackerLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  trackerLabelText: { fontSize: 9, fontFamily: Fonts.bold, width: 60 },

  pinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  pinBoxTitle: { fontSize: 10, fontFamily: Fonts.black, marginBottom: 4 },
  pinBoxValue: { fontSize: 22, fontFamily: Fonts.black, letterSpacing: 2 },
  mapBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontFamily: Fonts.medium,
    fontSize: 15,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  actionBtn: {
    flex: 2,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  actionRow: { flexDirection: 'row', gap: 8 },
});

import { StyleSheet, Dimensions } from 'react-native';
import { Fonts, DarkColors as T, Radius } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink },

  // 🥘 Chef's NavBar
  navBar: {
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.edge,
  },
  brandBox: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: T.primaryL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.edge,
  },
  brandName: { color: T.text, fontSize: 20, fontFamily: Fonts.bold, letterSpacing: -0.5 },
  brandSubtitle: { color: T.primary, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1 },

  // 📊 Fiscal Dossier
  statsScroll: { paddingHorizontal: 16, marginVertical: 20 },
  dossierCard: {
    backgroundColor: T.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: T.edge,
    padding: 24,
    marginBottom: 20,
  },
  dossierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  dossierLabel: { color: T.textSoft, fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1 },
  fiscalBadge: {
    backgroundColor: T.tertiary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.tertiary + '30',
  },
  fiscalText: { color: T.tertiary, fontSize: 9, fontFamily: Fonts.bold },
  revenueValue: { color: T.text, fontSize: 36, fontFamily: Fonts.bold },
  taxRow: { flexDirection: 'row', gap: 20, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: T.edge },
  taxItem: { flex: 1 },
  taxLabel: { color: T.textSoft, fontSize: 9, fontFamily: Fonts.bold, marginBottom: 4 },
  taxValue: { color: T.primary, fontSize: 14, fontFamily: Fonts.bold },

  // 🎟️ KDS Tabs
  tabScrollWrap: { backgroundColor: T.ink, marginBottom: 12 },
  tabScroller: { paddingHorizontal: 16, gap: 10 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.edge,
  },
  tabItemActive: { backgroundColor: T.lift, borderColor: T.primary },
  tabItemTxt: { color: T.textSoft, fontSize: 12, fontFamily: Fonts.bold, marginLeft: 8 },
  tabItemTxtActive: { color: T.primary },

  // 📝 Chef's Tickets (Orders)
  orderList: { paddingHorizontal: 16, gap: 16 },
  orderCard: {
    backgroundColor: T.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: T.edge,
    overflow: 'hidden',
    marginBottom: 16,
  },
  orderHeader: { padding: 20, backgroundColor: 'rgba(255,255,255,0.02)', flexDirection: 'row', justifyContent: 'space-between' },
  customerName: { color: T.text, fontSize: 18, fontFamily: Fonts.bold },
  orderType: { color: T.textSoft, fontSize: 11, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusTxt: { fontSize: 10, fontFamily: Fonts.bold },

  orderBody: { padding: 20 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { color: T.text, opacity: 0.7, fontSize: 14, fontFamily: Fonts.medium },
  itemQty: { color: T.primary, fontSize: 14, fontFamily: Fonts.bold },
  
  orderFooter: { 
    padding: 20, 
    borderTopWidth: 1, 
    borderTopColor: T.edge, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalVal: { color: T.text, fontSize: 20, fontFamily: Fonts.bold },
  pinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.lift,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pinText: { color: T.primary, fontSize: 13, fontFamily: Fonts.bold, letterSpacing: 2 },

  // 🏗️ Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 50,
  },
  modalTitle: { color: T.text, fontSize: 24, fontFamily: Fonts.bold, marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { color: T.textSoft, fontSize: 11, fontFamily: Fonts.bold, marginBottom: 8, letterSpacing: 1 },

  // 🔢 PIN Display
  pinCard: {
    backgroundColor: T.surface,
    borderRadius: Radius.card,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.edge,
  },
  pinCode: {
    fontSize: 56,
    fontFamily: Fonts.bold,
    color: T.primary,
    letterSpacing: 12,
    marginVertical: 24,
  },
});

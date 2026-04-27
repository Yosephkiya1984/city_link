import { StyleSheet, Dimensions } from 'react-native';
import { DarkColors as T, Fonts, Radius } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink },

  // Header & NavBar
  header: {
    paddingTop: 10,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: T.edge,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  brandBox: { flexDirection: 'row', alignItems: 'center' },
  brandIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: T.primaryL,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: T.edge,
  },
  brandName: { color: T.text, fontSize: 18, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.success, marginRight: 6 },
  statusText: { color: T.textSoft, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.redL,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Revenue Dossier
  dossierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  dossierMain: {
    flex: 1,
    backgroundColor: T.surface,
    padding: 20,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: T.edge,
  },
  dossierLabel: { color: T.textSoft, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1 },
  dossierValue: { color: T.text, fontSize: 28, fontFamily: Fonts.bold, marginVertical: 4 },
  fiscalRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fiscalText: { color: T.success, fontSize: 10, fontWeight: '800' },
  scanActionBtn: { width: 80, height: 80 },
  scanActionGradient: {
    flex: 1,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.tertiary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  // Lockdown Banner
  lockdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.redL,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.redDim,
    gap: 12,
  },
  lockdownIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.redDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockdownTitle: { color: T.red, fontSize: 13, fontFamily: Fonts.bold },
  lockdownSub: { color: T.redL, fontSize: 11, marginTop: 2 },

  // Tabs
  tabContainer: { marginVertical: 16 },
  tabScroller: { paddingHorizontal: 16, gap: 10 },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.edge,
    gap: 8,
  },
  tabPillActive: { backgroundColor: T.lift, borderColor: T.primary },
  tabPillText: { color: T.textSoft, fontSize: 12, fontFamily: Fonts.bold },
  tabPillTextActive: { color: T.primary },

  // Occupancy Section
  liveContainer: { paddingHorizontal: 16 },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  occupancyTitle: { color: T.textSoft, fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1 },
  occupancySub: { color: T.text, fontSize: 16, fontFamily: Fonts.bold, marginTop: 2 },
  occupancyPercentBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.tertiary + '20',
    borderWidth: 1,
    borderColor: T.tertiary + '30',
  },
  occupancyPercentText: { color: T.tertiary, fontSize: 12, fontFamily: Fonts.bold },

  // Slot Grid
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotCard: {
    width: (SCREEN_WIDTH - 62) / 4,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surface,
  },
  slotOccupied: { borderColor: T.red, backgroundColor: T.redL },
  slotAvailable: { borderColor: T.success, backgroundColor: T.greenL },
  slotName: { fontSize: 15, fontFamily: Fonts.bold },
  slotOccupantPulse: {
    position: 'absolute',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.red,
  },

  // Session List
  sessionList: { paddingHorizontal: 16, gap: 12 },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.surface,
    padding: 16,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: T.edge,
  },
  sessionMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: T.lift,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionSpot: { color: T.text, fontSize: 14, fontFamily: Fonts.bold },
  sessionPlate: { color: T.textSoft, fontSize: 11, marginTop: 2 },
  sessionRight: { alignItems: 'flex-end' },
  sessionFare: { color: T.primary, fontSize: 16, fontFamily: Fonts.bold },
  sessionTime: { color: T.textSoft, fontSize: 10, marginTop: 4 },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 24,
    padding: 16,
    backgroundColor: T.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: T.edge,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { color: T.textSoft, fontSize: 11, fontWeight: '700' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  detailCard: {
    backgroundColor: T.surface,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: T.edge,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  detailLabel: { color: T.textSoft, fontSize: 12, fontWeight: '600' },
  detailValue: { color: T.text, fontSize: 14, fontFamily: Fonts.bold },

  emptyState: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: T.textSoft, marginTop: 12, fontSize: 14, fontWeight: '600' },
});

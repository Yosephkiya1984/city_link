import { StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';
import { D, Radius, Fonts } from './StitchTheme';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  // Global Layout
  container: { flex: 1, backgroundColor: D.ink },
  tabContent: { padding: 16, paddingBottom: 150 },
  
  // Header & Brand
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: D.ink,
    borderBottomWidth: 1,
    borderBottomColor: D.edge,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandInfo: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 24,
    fontFamily: Fonts.black,
    color: D.white,
    letterSpacing: -0.5,
  },
  brandTag: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: D.primary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: D.lift,
    borderWidth: 1.5,
    borderColor: D.rim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: D.red + '15',
    borderWidth: 1,
    borderColor: D.red + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  // Banner
  bannerContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  bannerTitle: {
    fontSize: 28,
    fontFamily: Fonts.black,
    color: D.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Navigation / Tabs
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: D.lift,
    borderWidth: 1,
    borderColor: D.edge,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: D.primary,
    borderColor: D.primary,
  },
  tabText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: D.sub,
  },
  tabTextActive: {
    color: D.ink,
  },

  // Overview / Bento Styles
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  pageTitle: { fontSize: 28, fontFamily: Fonts.black, color: D.white },
  pageSubtitle: { fontSize: 13, color: D.sub, marginTop: 4 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  premiumStatCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.edge,
    borderRadius: 24,
    padding: 16,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutChip: {
    alignSelf: 'flex-start',
    backgroundColor: D.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 12,
  },
  miniStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: D.lift,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: D.edge,
    marginBottom: 24,
  },
  miniStat: {
    alignItems: 'center',
    flex: 1,
  },

  // Chart Styles
  chartContainer: {
    backgroundColor: D.lift,
    borderWidth: 1,
    borderColor: D.edge,
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
  },
  chartHeader: { marginBottom: 16 },
  chartGraphArea: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: D.edge,
    padding: 8,
  },
  chartBars: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', height: 120 },
  chartCol: {
    width: 1,
    backgroundColor: 'transparent',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBarLine: { width: 2, backgroundColor: D.primary, position: 'absolute', bottom: 0 },

  // Top Products
  topSellingContainer: {
    backgroundColor: D.lift,
    borderWidth: 1,
    borderColor: D.edge,
    borderRadius: 24,
    padding: 16,
  },
  topSellingList: { marginTop: 16, gap: 16 },
  topSellingItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tsImage: { width: 44, height: 44, borderRadius: 8, backgroundColor: D.rim },

  // Orders Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.black,
    color: D.white,
  },
  viewAll: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: D.primary,
  },

  // Order Cards (Mobile)
  orderMobileCard: {
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.edge,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  ocId: { fontSize: 12, color: D.white, fontWeight: '700' },
  ocTimeTxtMobile: { fontSize: 11, color: D.sub },
  ocStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  ocStatusTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  ocImgMobile: { width: 48, height: 48, borderRadius: 8, backgroundColor: D.lift },
  ocProdName: { fontSize: 13, fontWeight: '700', color: D.white },
  ocProdDetail: { fontSize: 11, color: D.sub, marginTop: 2 },
  ocBigAmountMobile: { fontSize: 16, fontWeight: '700', color: D.primary, marginTop: 4 },
  ocDivider: { height: 1, backgroundColor: D.edge, marginVertical: 16 },
  ocTinyLabel: { fontSize: 9, color: D.sub, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  ocAddressTxt: { fontSize: 11, color: D.sub, marginTop: 2 },
  ocPinBoxMobile: {
    backgroundColor: D.lift,
    borderWidth: 1,
    borderColor: D.primary + '30',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  ocPinTxt: { color: D.primary, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  ocLockTxt: { color: D.gold, fontSize: 12, fontWeight: '600', marginLeft: 4 },
  ocBtnMobile: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ocBtnTxt: { color: D.ink, fontSize: 13, fontWeight: '700' },
  ocBtnMobileOutlined: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: D.edge,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ocBtnOutlinedTxtMobile: { color: D.sub, fontSize: 13, fontWeight: '600' },

  // Finance Hero
  financeHero: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 32,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.edge,
    marginBottom: 20,
  },
  balanceLabel: { fontSize: 12, fontFamily: Fonts.bold, color: D.sub, textTransform: 'uppercase' },
  balanceAmount: { fontSize: 36, fontFamily: Fonts.black, color: D.white, marginVertical: 8 },
  withdrawBtn: {
    backgroundColor: D.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  withdrawBtnText: { fontSize: 15, fontFamily: Fonts.black, color: D.ink },

  // Restaurant Specific (Menu Grid)
  menuGrid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuItemCard: {
    width: (width - 44) / 2,
    backgroundColor: D.surface,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: D.edge,
  },
  menuItemImage: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: 12,
    backgroundColor: D.lift,
    marginBottom: 8,
  },
  menuItemName: { fontSize: 14, fontFamily: Fonts.bold, color: D.white },
  menuItemPrice: { fontSize: 13, fontFamily: Fonts.black, color: D.primary, marginTop: 2 },

  // Shared UI
  iconButtonOutlined: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyText: { fontSize: 16, fontFamily: Fonts.bold, color: D.sub, marginTop: 16, textAlign: 'center' },
  
  // Legacy support for older components
  orderCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: D.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: D.edge,
    padding: 20,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  orderId: { fontSize: 14, fontFamily: Fonts.mono, color: D.sub },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 10, fontFamily: Fonts.black, textTransform: 'uppercase' },
  customerName: { fontSize: 16, fontFamily: Fonts.bold, color: D.white },
  orderMeta: { fontSize: 12, fontFamily: Fonts.regular, color: D.sub },

  // Table Grid
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  tableCard: {
    width: (width - 44) / 2,
    backgroundColor: D.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: D.edge,
    alignItems: 'center',
  },
  tableIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tableNumber: {
    fontSize: 18,
    fontFamily: Fonts.black,
    color: D.white,
  },
  tableStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 8,
  },
  tableStatusText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
  },

  // Hostess Management
  hostessSection: {
    marginTop: 32,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: D.edge,
  },
  hostessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.lift,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: D.edge,
  },
  hostessAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: D.rim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hostessInfo: {
    flex: 1,
  },
  hostessName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: D.white,
  },
  hostessAssignment: {
    fontSize: 12,
    color: D.primary,
    marginTop: 2,
  },
});

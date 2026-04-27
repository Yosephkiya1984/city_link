import { StyleSheet } from 'react-native';
import { DarkColors as T, Radius, Fonts } from '../../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink },

  // Navbar
  navBar: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: T.surface,
    paddingTop: 10,
  },
  brandBox: { flexDirection: 'row', alignItems: 'center' },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: '#F9731620',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brandName: { color: '#F97316', fontSize: 16, fontFamily: Fonts.black },
  brandSubtitle: { color: T.sub, fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1, marginTop: 2 },

  // Tabs
  tabScrollWrap: { borderBottomWidth: 1, borderBottomColor: T.edge, backgroundColor: T.surface },
  tabScroller: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: T.lift,
  },
  tabItemActive: { backgroundColor: '#F9731620' },
  tabItemTxt: { color: T.sub, fontSize: 13, fontFamily: Fonts.bold, marginLeft: 8 },
  tabItemTxtActive: { color: '#F97316', fontFamily: Fonts.black },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24, padding: 16 },
  statCard: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.edge,
    borderRadius: Radius.lg,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontFamily: Fonts.black, color: T.text },
  statLabel: {
    fontSize: 9,
    color: T.sub,
    fontFamily: Fonts.bold,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Listing Cards
  card: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.edge,
    borderRadius: Radius.card,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  propertyTitle: { color: T.text, fontSize: 16, fontFamily: Fonts.bold },
  propertyPrice: { color: '#F97316', fontSize: 15, fontFamily: Fonts.black, marginTop: 4 },
  propertyLoc: { color: T.sub, fontSize: 12, fontFamily: Fonts.regular, marginTop: 4 },

  // Badges
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, alignSelf: 'flex-start' },
  badgeTxt: { fontSize: 9, fontFamily: Fonts.black, textTransform: 'uppercase' },

  // Lead Cards
  leadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.lift,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 8,
  },
  leadInfo: { flex: 1, marginLeft: 12 },
  leadName: { color: T.text, fontSize: 14, fontFamily: Fonts.bold },
  leadSub: { color: T.sub, fontSize: 11, fontFamily: Fonts.regular, marginTop: 2 },

  // Forms
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center' },
  modalContent: {
    backgroundColor: T.surface,
    margin: 20,
    borderRadius: Radius.card,
    padding: 24,
    borderWidth: 1,
    borderColor: T.edge,
    maxHeight: '80%',
  },
  inputGroup: { marginBottom: 20 },
  label: {
    color: T.sub,
    fontSize: 11,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
});

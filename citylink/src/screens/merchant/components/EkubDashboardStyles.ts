import { StyleSheet } from 'react-native';
import { DarkColors as T } from '../../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink },

  // Navbar
  navBar: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: T.lift,
    paddingTop: 10,
  },
  brandBox: { flexDirection: 'row', alignItems: 'center' },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#00A86B20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brandName: { color: '#00A86B', fontSize: 16, fontWeight: '700' },
  brandSubtitle: { color: T.sub, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 2 },

  // Tabs
  tabScrollWrap: { borderBottomWidth: 1, borderBottomColor: T.edge, backgroundColor: T.lift },
  tabScroller: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: T.surface,
  },
  tabItemActive: { backgroundColor: '#00A86B20' },
  tabItemTxt: { color: T.sub, fontSize: 13, fontWeight: '600', marginLeft: 8 },
  tabItemTxtActive: { color: '#00A86B', fontWeight: '700' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24, padding: 16 },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: T.lift,
    borderWidth: 1,
    borderColor: T.edge,
    borderRadius: 16,
    padding: 16,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: T.text, marginBottom: 2 },
  statLabel: { fontSize: 11, color: T.sub, fontWeight: '600', textTransform: 'uppercase' },

  // Circle Cards
  card: {
    backgroundColor: T.lift,
    borderWidth: 1,
    borderColor: T.edge,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  circleName: { color: T.text, fontSize: 16, fontWeight: '700' },
  circleSub: { color: T.sub, fontSize: 12, marginTop: 2 },
  potLabel: {
    color: T.sub,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  potValue: { color: '#00A86B', fontSize: 18, fontWeight: '800' },

  // App Cards
  appHeader: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.rim },
  userName: { color: T.text, fontSize: 15, fontWeight: '700' },
  appReason: { color: T.sub, fontSize: 13, fontStyle: 'italic', marginTop: 4 },

  // Payout Cards
  winnerName: { color: '#00A86B', fontSize: 14, fontWeight: '700', marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
});

import { StyleSheet, Dimensions } from 'react-native';
import { Fonts, DarkColors as C, Radius } from '../../theme';

const { width: SW } = Dimensions.get('window');

const ADDIS_NOIR = {
  ink: '#0B0D11',
  surface: '#131720',
  lift: '#1B2030',
  rim: '#242B3D',
  gold: '#D4AF37',
  cyan: '#00F5FF',
  glass: 'rgba(255, 255, 255, 0.05)',
  edge: 'rgba(255, 255, 255, 0.08)',
};

export const foodStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADDIS_NOIR.ink },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: ADDIS_NOIR.surface,
    borderBottomWidth: 1,
    borderBottomColor: ADDIS_NOIR.edge,
  },
  headerMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontFamily: Fonts.headline, color: '#FFF', lineHeight: 34 },
  districtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  districtText: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.5 },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
    marginBottom: 10,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: ADDIS_NOIR.surface,
    borderWidth: 1,
    borderColor: ADDIS_NOIR.edge,
  },
  tabItemActive: {
    backgroundColor: ADDIS_NOIR.gold,
    borderColor: ADDIS_NOIR.gold,
  },
  tabText: { fontSize: 11, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 },
  tabTextActive: { color: ADDIS_NOIR.ink },

  listContent: { padding: 16, paddingBottom: 100 },
  restCard: {
    backgroundColor: ADDIS_NOIR.surface,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ADDIS_NOIR.edge,
  },
  cardCover: { height: 180, position: 'relative' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  cardBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: ADDIS_NOIR.gold, fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1 },
  cardBody: { padding: 20 },
  restName: { color: '#FFF', fontSize: 20, fontFamily: Fonts.bold },
  restRating: { color: ADDIS_NOIR.gold, fontSize: 14, fontFamily: Fonts.bold },
  restMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },

  nightCard: { height: 260, marginBottom: 20 },
  nightGradient: { flex: 1, justifyContent: 'flex-end' },
  liveBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: { color: '#FFF', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1 },
  nightName: { color: '#FFF', fontSize: 24, fontFamily: Fonts.bold },
  nightVibe: { color: ADDIS_NOIR.gold, fontSize: 14, fontFamily: Fonts.bold, marginTop: 4 },

  // Modal
  menuContent: {
    backgroundColor: ADDIS_NOIR.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '90%',
    marginTop: '10%',
    paddingBottom: 40,
  },
  menuHeader: {
    flexDirection: 'row',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: ADDIS_NOIR.edge,
    alignItems: 'center',
  },
  menuTitle: { fontSize: 24, fontFamily: Fonts.bold, color: '#FFF' },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: ADDIS_NOIR.edge,
  },
  itemInfo: { flex: 1, marginRight: 16 },
  itemName: { color: '#FFF', fontSize: 16, fontFamily: Fonts.bold },
  itemDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4, lineHeight: 18 },
  itemPrice: { color: ADDIS_NOIR.gold, fontSize: 16, fontFamily: Fonts.headline, marginTop: 8 },

  reserveForm: { padding: 24 },
  formLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: Fonts.bold, marginBottom: 16, letterSpacing: 1 },
});

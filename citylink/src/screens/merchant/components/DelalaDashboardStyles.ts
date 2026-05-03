import { StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';
import { D, Radius, Fonts } from './StitchTheme';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.ink },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 24) + 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: D.ink,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: D.gold,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: D.lift,
    borderWidth: 1,
    borderColor: D.edge,
  },
  tabItemActive: {
    backgroundColor: D.gold,
    borderColor: D.gold,
  },
  tabText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: D.sub,
  },
  tabTextActive: {
    color: D.ink,
  },

  // Bento Stats
  bentoContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: D.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: D.edge,
  },
  bentoLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: D.sub,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bentoValue: {
    fontSize: 22,
    fontFamily: Fonts.black,
    color: D.white,
    marginTop: 4,
  },

  // Listing Card (Premium)
  listingCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: D.surface,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: D.edge,
  },
  listingImage: {
    width: '100%',
    height: 180,
    backgroundColor: D.lift,
  },
  listingInfo: {
    padding: 20,
  },
  listingTitle: {
    fontSize: 18,
    fontFamily: Fonts.black,
    color: D.white,
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: D.gold,
    marginBottom: 12,
  },
  listingStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: D.edge,
  },
  listingStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listingStatText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: D.sub,
  },

  // Lead / Enquiry Card
  leadCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: D.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: D.edge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  leadAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: D.lift,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: D.white,
  },
  leadListing: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: D.sub,
    marginTop: 2,
  },
  leadTime: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: D.gold,
    textTransform: 'uppercase',
  },

  // Actions
  addBtn: {
    backgroundColor: D.gold,
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 30,
    right: 20,
    elevation: 8,
    shadowColor: D.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

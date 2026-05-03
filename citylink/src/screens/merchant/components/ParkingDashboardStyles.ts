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

  // Live Summary Cards
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

  // Parking Spot Grid (World Class View)
  spotGrid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  spotCard: {
    width: (width - 52) / 4,
    aspectRatio: 0.8,
    backgroundColor: D.surface,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: D.edge,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotOccupied: {
    backgroundColor: D.gold + '20',
    borderColor: D.gold,
  },
  spotReserved: {
    backgroundColor: D.primary + '20',
    borderColor: D.primary,
  },
  spotLabel: {
    fontSize: 14,
    fontFamily: Fonts.black,
    color: D.white,
  },
  spotStatus: {
    fontSize: 8,
    fontFamily: Fonts.black,
    textTransform: 'uppercase',
  },

  // Session Cards
  sessionCard: {
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
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: D.lift,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  plateNumber: {
    fontSize: 16,
    fontFamily: Fonts.black,
    color: D.white,
  },
  duration: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: D.sub,
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontFamily: Fonts.black,
    color: D.primary,
  },

  // Finance
  financeHero: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 32,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.edge,
    marginBottom: 20,
    alignItems: 'center',
  },
  financeTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: D.sub,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  financeValue: {
    fontSize: 42,
    fontFamily: Fonts.black,
    color: D.white,
    marginVertical: 12,
  },
  withdrawAction: {
    backgroundColor: D.gold,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 8,
  },
});

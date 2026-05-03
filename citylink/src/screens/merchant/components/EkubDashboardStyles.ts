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
    color: D.violet,
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
    backgroundColor: D.violet,
    borderColor: D.violet,
  },
  tabText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: D.sub,
  },
  tabTextActive: {
    color: D.white,
  },

  // Bento Summary
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
    fontSize: 20,
    fontFamily: Fonts.black,
    color: D.white,
    marginTop: 4,
  },

  // Circle Card (Premium)
  circleCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: D.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: D.edge,
  },
  circleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  circleTitle: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: D.white,
  },
  circleType: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: D.violet,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  circleProgress: {
    height: 6,
    backgroundColor: D.lift,
    borderRadius: 3,
    marginVertical: 16,
    overflow: 'hidden',
  },
  circleProgressFill: {
    height: '100%',
    backgroundColor: D.violet,
    borderRadius: 3,
  },
  circleStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleStatItem: {
    flex: 1,
  },
  circleStatLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: D.sub,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  circleStatValue: {
    fontSize: 15,
    fontFamily: Fonts.black,
    color: D.white,
  },

  // Members / Applications
  appCard: {
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
  appAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: D.lift,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: D.white,
  },
  appDetails: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: D.sub,
  },
  appActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: D.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: D.red + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Draw View
  drawHero: {
    marginHorizontal: 16,
    padding: 32,
    borderRadius: 32,
    backgroundColor: D.lift,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: D.violet + '40',
  },
  drawTitle: {
    fontSize: 18,
    fontFamily: Fonts.black,
    color: D.white,
    marginBottom: 8,
  },
  drawTimer: {
    fontSize: 48,
    fontFamily: Fonts.mono,
    color: D.violet,
    marginVertical: 20,
  },
  drawBtn: {
    backgroundColor: D.violet,
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 20,
  },
  drawBtnText: {
    fontSize: 16,
    fontFamily: Fonts.black,
    color: D.white,
  },
});

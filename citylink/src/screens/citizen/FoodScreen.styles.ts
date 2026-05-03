import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

export const NOIR = {
  bg: '#080A0F',
  card: '#111318',
  surface: '#15181F',
  edge: '#1E2330',
  text: '#F0F2F8',
  sub: '#8A92A8',
  hint: '#3D4560',
  gold: '#E8B84B',
  goldDim: 'rgba(232,184,75,0.10)',
  primary: '#3B82F6',
  ink: '#0A0C12',
};

export const foodStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NOIR.bg,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 42,
    paddingBottom: 4,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: NOIR.edge,
    backgroundColor: 'rgba(8,10,15,0.92)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerSub: {
    fontSize: 10,
    letterSpacing: 3,
    color: NOIR.sub,
    fontFamily: 'System',
    fontWeight: '700',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: NOIR.text,
    letterSpacing: -0.5,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NOIR.goldDim,
    overflow: 'hidden',
  },
  locationText: {
    color: NOIR.gold,
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Tab Strip ──────────────────────────────────────────────────────────────
  tabStrip: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 8,
    paddingRight: 20,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NOIR.edge,
    backgroundColor: NOIR.card,
  },
  tabBtnActive: {
    backgroundColor: NOIR.gold,
    borderColor: NOIR.gold,
  },
  tabBtnTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: NOIR.sub,
  },
  tabBtnTxtActive: {
    color: '#000',
  },

  // ── Venue Card ─────────────────────────────────────────────────────────────
  venueCard: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: NOIR.card,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  venueCover: {
    height: 200,
    width: '100%',
  },
  venueGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B98140',
    overflow: 'hidden',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 1,
  },
  venueInfo: {
    // bottom section
  },
  venueName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  venueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  venueCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  venueDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  venueRating: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },

  // ── Event Card ─────────────────────────────────────────────────────────────
  eventCard: {
    height: 220,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: NOIR.card,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  eventGradient: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    justifyContent: 'space-between',
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  eventDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  eventBadgeTxt: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eventFooter: {},
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  eventDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 2,
  },
  eventVenue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },

  // ── Empty States ───────────────────────────────────────────────────────────
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NOIR.sub,
  },
  emptyText: {
    fontSize: 14,
    color: NOIR.hint,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },

  // ── Bottom Sheet ───────────────────────────────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '88%',
    backgroundColor: NOIR.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: NOIR.edge,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: NOIR.edge,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: NOIR.edge,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NOIR.text,
    marginBottom: 3,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: NOIR.sub,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NOIR.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Mode Switcher ──────────────────────────────────────────────────────────
  modeRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: NOIR.edge,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NOIR.edge,
    backgroundColor: NOIR.surface,
  },
  modeChipActive: {
    backgroundColor: NOIR.gold,
    borderColor: NOIR.gold,
  },
  modeChipTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: NOIR.sub,
  },
  modeChipTxtActive: {
    color: '#000',
  },

  // ── Menu Items ─────────────────────────────────────────────────────────────
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: NOIR.edge,
    gap: 12,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: NOIR.text,
    marginBottom: 3,
  },
  menuItemDesc: {
    fontSize: 12,
    color: NOIR.sub,
    lineHeight: 18,
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: NOIR.gold,
  },
  qtyCtrl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NOIR.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NOIR.edge,
    overflow: 'hidden',
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  qtyVal: {
    fontSize: 14,
    fontWeight: '700',
    color: NOIR.text,
    paddingHorizontal: 4,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NOIR.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Cart Footer ────────────────────────────────────────────────────────────
  cartFooter: {
    margin: 20,
    backgroundColor: NOIR.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: NOIR.edge,
  },
  cartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartLabel: {
    fontSize: 14,
    color: NOIR.sub,
    fontWeight: '600',
  },
  cartTotal: {
    fontSize: 17,
    fontWeight: '800',
    color: NOIR.gold,
  },

  // ── Booking Form ───────────────────────────────────────────────────────────
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: NOIR.hint,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: NOIR.surface,
    borderWidth: 1,
    borderColor: NOIR.edge,
    borderRadius: 12,
    padding: 14,
    color: NOIR.text,
    fontSize: 14,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  guestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NOIR.edge,
    backgroundColor: NOIR.surface,
  },
  guestChipActive: {
    backgroundColor: NOIR.gold,
    borderColor: NOIR.gold,
  },
  guestChipTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: NOIR.sub,
  },
  depositBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    padding: 14,
  },
  depositText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
    flex: 1,
    lineHeight: 19,
  },

  // ── Event Info Grid ────────────────────────────────────────────────────────
  eventInfoRow: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: NOIR.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NOIR.edge,
    overflow: 'hidden',
  },
  infoCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 5,
    borderRightWidth: 1,
    borderRightColor: NOIR.edge,
  },
  infoCellLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: NOIR.hint,
  },
  infoCellVal: {
    fontSize: 13,
    fontWeight: '700',
    color: NOIR.text,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  eventDesc: {
    marginHorizontal: 20,
    fontSize: 14,
    color: NOIR.sub,
    lineHeight: 22,
  },

  // ── Live Table Grid ────────────────────────────────────────────────────────
  spotSelectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  spotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  spotButton: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  spotAvailable: {
    backgroundColor: 'rgba(89, 222, 155, 0.1)',
    borderColor: 'rgba(89, 222, 155, 0.3)',
  },
  spotOccupied: {
    backgroundColor: 'rgba(255, 90, 76, 0.1)',
    borderColor: 'rgba(255, 90, 76, 0.3)',
  },
  spotSelected: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)', // NOIR gold
    borderColor: '#D4AF37',
  },
  spotText: {
    fontSize: 14,
    fontWeight: '700',
  },
  spotTextAvailable: {
    color: '#59de9b',
  },
  spotTextOccupied: {
    color: '#ff5a4c',
  },
  spotTextSelected: {
    color: '#D4AF37',
  },
  spotLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  legendText: {
    color: '#A0A0A0',
    fontSize: 12,
  },
});

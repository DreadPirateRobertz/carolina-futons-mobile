/**
 * Carolina Futons Design Tokens
 * Blue Ridge Mountain palette - ported from web designTokens.js
 */

export const colors = {
  // Primary palette
  sandBase: '#E8D5B7',
  sandLight: '#F2E8D5',
  sandDark: '#D4BC96',
  espresso: '#3A2518',
  espressoLight: '#5C4033',
  mountainBlue: '#5B8FA8',
  mountainBlueDark: '#3D6B80',
  mountainBlueLight: '#A8CCD8',
  sunsetCoral: '#E8845C',
  sunsetCoralDark: '#C96B44',
  sunsetCoralLight: '#F2A882',
  mauve: '#C9A0A0',
  skyGradientTop: '#B8D4E3',
  skyGradientBottom: '#F0C87A',
  white: '#FFFFFF',
  overlay: 'rgba(58, 37, 24, 0.6)',
  // Semantic / status
  success: '#4A7C59',
  error: '#E8845C',
  muted: '#999999',
  mutedBrown: '#8B7355',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  section: 80,
  pagePadding: 24,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
  card: 12,
  button: 8,
  image: 8,
} as const;

export const shadows = {
  card: {
    shadowColor: '#3A2518',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#3A2518',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  nav: {
    shadowColor: '#3A2518',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: '#3A2518',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 48,
    elevation: 10,
  },
  button: {
    shadowColor: '#E8845C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

export const typography = {
  headingFamily: 'PlayfairDisplay_700Bold',
  headingFamilyRegular: 'PlayfairDisplay_400Regular',
  bodyFamily: 'SourceSans3_400Regular',
  bodyFamilySemiBold: 'SourceSans3_600SemiBold',
  bodyFamilyBold: 'SourceSans3_700Bold',

  // Mobile-adapted scale (RN unitless = dp)
  heroTitle: { fontSize: 36, fontWeight: '700' as const, lineHeight: 40 },
  h1: { fontSize: 30, fontWeight: '700' as const, lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 30 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  bodyLarge: { fontSize: 17, fontWeight: '400' as const, lineHeight: 26 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14, letterSpacing: 0.3 },
  navLink: { fontSize: 13, fontWeight: '600' as const, lineHeight: 13, letterSpacing: 0.5 },
  price: { fontSize: 20, fontWeight: '700' as const, lineHeight: 20 },
  priceStrike: { fontSize: 15, fontWeight: '400' as const, lineHeight: 15 },
  button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 15, letterSpacing: 0.5 },
} as const;

export const transitions = {
  fast: 150,
  medium: 250,
  slow: 400,
  cardHover: 300,
} as const;

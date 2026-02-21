/**
 * Carolina Futons Design Tokens
 * Blue Ridge Mountain palette - ported from web design system
 * Full implementation in cm-330
 */

export const colors = {
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
  success: '#4A7C59',
  error: '#E8845C',
  muted: '#999999',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  card: 12,
  button: 8,
  image: 8,
} as const;

export const typography = {
  heading: {
    fontFamily: 'PlayfairDisplay',
  },
  body: {
    fontFamily: 'SourceSans3',
  },
} as const;

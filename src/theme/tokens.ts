/**
 * Carolina Futons Design Tokens
 *
 * Single source of truth for all visual constants in the mobile app.
 * Mirrors the web's sharedTokens.js so that both platforms share the same
 * brand identity. Canonical values live in:
 *   - cfutons/src/public/sharedTokens.js (web)
 *   - brand-colors.md (design reference)
 *
 * The palette draws from the Blue Ridge Mountains of western North Carolina,
 * grounding the brand in the natural landscape surrounding the company's
 * Asheville headquarters.
 */

import { Easing } from 'react-native';

/**
 * Brand color palette.
 *
 * Naming rationale:
 * - **sandBase / sandLight / sandDark** — Warm sandy tones inspired by the exposed
 *   riverbank sand along the French Broad River. Used as the primary background and
 *   surface colors to evoke a natural, handcrafted feel.
 * - **espresso / espressoLight** — Deep, rich brown reminiscent of dark-stained
 *   hardwood frames. Functions as the primary text color; its warmth avoids the
 *   harshness of pure black.
 * - **mountainBlue** variants — Drawn from the blue haze of the Blue Ridge
 *   Mountains. Used for interactive elements, links, and informational status.
 * - **sunsetCoral** variants — Warm coral inspired by Appalachian sunsets. Serves
 *   as the primary Call To Action (CTA) color and accent.
 * - **mauve** — Soft pink-brown accent used sparingly for tertiary highlights
 *   (e.g., the Biltmore Loveseat product card).
 * - **skyGradient*** — Top-to-bottom gradient colors for decorative hero
 *   backgrounds, evoking a mountain-horizon sky.
 * - **offWhite** — Slightly warm white for card backgrounds; avoids the clinical
 *   feel of pure white against the sandy palette.
 */
export const colors = {
  // --- Primary palette (backgrounds and surfaces) ---
  sandBase: '#E8D5B7',
  sandLight: '#F2E8D5',
  sandDark: '#D4BC96',

  // --- Primary text (dark, warm browns) ---
  espresso: '#3A2518',
  espressoLight: '#5C4033',

  // --- Accent: blue (interactive, informational) ---
  mountainBlue: '#5B8FA8',
  mountainBlueDark: '#3D6B80',
  mountainBlueLight: '#A8CCD8',

  // --- Accent: coral (CTA = Call To Action, promotions) ---
  sunsetCoral: '#E8845C',
  sunsetCoralDark: '#C96B44',
  sunsetCoralLight: '#F2A882',

  // --- Tertiary ---
  mauve: '#C9A0A0',

  // --- Decorative gradients ---
  skyGradientTop: '#B8D4E3',
  skyGradientBottom: '#F0C87A',

  // --- Neutrals ---
  offWhite: '#FAF7F2',
  white: '#FFFFFF',
  /** Semi-transparent espresso overlay for modals and image scrims */
  overlay: 'rgba(58, 37, 24, 0.6)',

  // --- Semantic / status ---
  /** Forest-green success indicator (order delivered, form valid) */
  success: '#4A7C59',
  /** Re-uses sunsetCoral for error states to keep the palette tight */
  error: '#E8845C',
  /** Neutral gray for disabled or secondary text (WCAG AA: ≥4.5:1 on offWhite) */
  muted: '#666666',
  /** Warm muted brown for subtle captions and metadata (WCAG AA: ≥4.5:1 on offWhite) */
  mutedBrown: '#6B5740',
} as const;

/**
 * Editorial dark palette for the premium "browse" experience.
 *
 * Dark mode uses deep espresso-tinted backgrounds rather than pure black,
 * keeping the brand warmth intact. Glass tokens use transparency so the
 * tab bar and overlays blend with underlying content.
 */
export const darkPalette = {
  background: '#1C1410',
  surface: '#2A1F19',
  surfaceElevated: '#352A22',
  textPrimary: '#F5F0EB',
  textMuted: '#B8A99A',
  borderSubtle: 'rgba(245, 240, 235, 0.1)',
  glass: 'rgba(42, 31, 25, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
} as const;

/**
 * Spacing scale (in density-independent pixels).
 *
 * Based on a 4px grid. `pagePadding` is the standard horizontal inset for
 * screen content; `section` provides generous vertical breathing room between
 * major page sections.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  /** Vertical gap between major page sections (hero, product grid, etc.) */
  section: 80,
  /** Horizontal page padding — consistent left/right inset on all screens */
  pagePadding: 24,
} as const;

/**
 * Border radius scale.
 *
 * Semantic aliases (`card`, `button`, `image`) map to the numeric scale so
 * that component-level usage reads clearly while staying in sync if the
 * scale values change.
 */
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  /** Fully rounded — used for pill-shaped badges and tags */
  pill: 9999,
  card: 12,
  button: 8,
  image: 8,
} as const;

/**
 * Shadow presets for iOS (`shadow*`) and Android (`elevation`).
 *
 * Shadow colors use espresso (#3A2518) rather than black so that shadows
 * feel warm and cohesive with the brand palette. The `button` preset uses
 * sunsetCoral as its shadow color to create a subtle glow under CTA buttons.
 */
export const shadows = {
  /** Default resting shadow for product cards and containers */
  card: {
    shadowColor: '#3A2518',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  /** Elevated shadow applied on press/hover to give depth feedback */
  cardHover: {
    shadowColor: '#3A2518',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  /** Subtle shadow for the top navigation bar */
  nav: {
    shadowColor: '#3A2518',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  /** Heavy shadow for modals and bottom sheets */
  modal: {
    shadowColor: '#3A2518',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 48,
    elevation: 10,
  },
  /** CTA button glow — uses sunsetCoral shadow for a warm highlight */
  button: {
    shadowColor: '#E8845C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

/**
 * Typography scale.
 *
 * Font families:
 * - **Playfair Display** — Elegant serif for headings, evoking traditional
 *   Southern craftsmanship.
 * - **Source Sans 3** — Clean, highly legible sans-serif for body copy and UI.
 *
 * The mobile scale is proportionally smaller than the web scale defined in
 * designTokens.js: display sizes are approximately 75% of web, body sizes
 * approximately 94%, with matching line-height ratios to preserve vertical
 * rhythm across platforms.
 */
export const typography = {
  /** Playfair Display Bold — used for all headings */
  headingFamily: 'PlayfairDisplay_700Bold',
  /** Playfair Display Regular — used for decorative subtitle text */
  headingFamilyRegular: 'PlayfairDisplay_400Regular',
  /** Source Sans 3 Regular — primary body text */
  bodyFamily: 'SourceSans3_400Regular',
  /** Source Sans 3 SemiBold — emphasized body text and labels */
  bodyFamilySemiBold: 'SourceSans3_600SemiBold',
  /** Source Sans 3 Bold — strong emphasis, prices */
  bodyFamilyBold: 'SourceSans3_700Bold',

  // --- Type scale (mobile-adapted from web designTokens.js) ---
  /** Full-bleed hero headlines (e.g., home screen hero banner) */
  heroTitle: { fontSize: 42, fontWeight: '700' as const, lineHeight: 46, letterSpacing: -0.84 },
  /** Primary page headings */
  h1: { fontSize: 34, fontWeight: '700' as const, lineHeight: 39, letterSpacing: -0.34 },
  /** Section headings within a page */
  h2: { fontSize: 26, fontWeight: '700' as const, lineHeight: 31 },
  /** Subsection or card headings */
  h3: { fontSize: 21, fontWeight: '600' as const, lineHeight: 27 },
  /** Minor headings, form group labels */
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  /** Introductory paragraph text, slightly larger than body */
  bodyLarge: { fontSize: 17, fontWeight: '400' as const, lineHeight: 27 },
  /** Default body text */
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 24 },
  /** Secondary detail text (specs, metadata) */
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 20 },
  /** Small labels, timestamps, fine print */
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 17, letterSpacing: 0.24 },
  /** Tab bar and navigation link labels */
  navLink: { fontSize: 13, fontWeight: '600' as const, lineHeight: 13, letterSpacing: 0.52 },
  /** Product price display */
  price: { fontSize: 20, fontWeight: '700' as const, lineHeight: 20 },
  /** Struck-through original price (shown beside sale price) */
  priceStrike: { fontSize: 15, fontWeight: '400' as const, lineHeight: 15 },
  /** Button label text */
  button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 15, letterSpacing: 0.6 },
} as const;

/**
 * Easing curves for Animated / Reanimated transitions.
 *
 * These mirror the CSS `transition-timing-function` values used on the web
 * so that animations feel consistent across platforms.
 */
export const easing = {
  /** Standard ease — equivalent to CSS `ease` (default for most transitions) */
  ease: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  /** Material Design standard curve — used for card lift / hover effects */
  cardHover: Easing.bezier(0.4, 0, 0.2, 1),
  /** Accelerating start — equivalent to CSS `ease-in` */
  easeIn: Easing.bezier(0.42, 0, 1, 1),
  /** Decelerating end — equivalent to CSS `ease-out` */
  easeOut: Easing.bezier(0, 0, 0.58, 1),
};

/**
 * Pre-composed transition presets pairing a duration with an easing curve.
 *
 * Components pass these directly to Animated.timing() or Reanimated's
 * `withTiming()` for consistent motion across the app.
 */
export const transitions = {
  /** Quick micro-interactions: toggle, checkbox, icon swap (150ms) */
  fast: { duration: 150, easing: easing.ease },
  /** Standard UI transitions: fade, slide, expand (250ms) */
  medium: { duration: 250, easing: easing.ease },
  /** Larger or more deliberate transitions: modal entry, page fade (400ms) */
  slow: { duration: 400, easing: easing.ease },
  /** Card press/hover lift effect using the Material standard curve (300ms) */
  cardHover: { duration: 300, easing: easing.cardHover },
} as const;

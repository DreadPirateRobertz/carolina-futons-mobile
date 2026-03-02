# Premium UX Elevation — Design Document

**Date**: 2026-03-01
**Author**: cfutons_mobile/crew/dallas
**Status**: Approved by Overseer
**Sprint**: Next convoy (4 polecats)

---

## Direction

**Dark & Editorial** — RH meets Blue Ridge Mountains.

Dark espresso canvas (`#1C1410`), warm cream text (`#F5F0EB`), terra cotta CTAs. Product photography is the visual hero. Glassmorphism blur panels for overlays. Existing sand/coral/blue palette becomes accent, not background.

- **Dark screens**: Home, Shop, Product Detail, AR, Collections, Onboarding
- **Light screens**: Cart, Checkout, Account forms (data entry readability)

## Hero Feature

**AR Room Preview** — already 8.5/10, push to 10/10. Prominent on home screen, seamless shared-element transition from product pages, material swapping in AR, save/share screenshots.

## Photography

Source product images from carolinafutons.com. Real furniture photos flowing through Wix API once env vars are configured. Placeholder system uses brand-colored cards until real images load.

## Illustrations

Coordinated with cfutons/crew/melania:
- 8 empty state SVGs — **already on main** (`public/emptyStateIllustrations`)
- Mountain skyline SVG — incoming, dark-bg variant
- Comfort card SVGs — incoming, dark-bg variant
- Onboarding illustrations — 3 scenes requested (welcome, AR preview, shop with confidence)
- All programmatic SVGs using sharedTokens colors, no Figma file

---

## Screen Designs

### Home Screen
- Full-bleed hero: lifestyle photo from carolinafutons.com with parallax scroll
- "View in Your Room" AR CTA: primary, large, glassmorphism button overlaying hero
- Featured collection cards below hero with staggered entrance animations
- Mountain skyline SVG (from Melania) as section divider
- Bottom nav with glassmorphism background blur

### Shop Screen
- Dark background, product grid with larger cards
- Staggered fade-in on scroll (`FadeInDown.delay(index * 80)`)
- Category chips with glassmorphism pill treatment
- Product images edge-to-edge within cards
- Wishlist hearts: spring animation on tap + haptic feedback
- Skeleton shimmer loaders while images load

### Product Detail Screen (Scrollytelling)
- Shared element transition: product image morphs from Shop grid card to full-screen hero
- Full-screen hero image with parallax scroll (image at 0.5x, content at 1x)
- As user scrolls: price/title fade in, fabric swatches appear, AR CTA pulses
- Pinch-to-zoom on product images
- Fabric swatch selector updates product image in real-time
- "View in Your Room" AR button: glassmorphism, prominent
- Reviews section with photo gallery

### AR Screen
- Smoother transition from Product Detail (shared element on product image)
- Glassmorphism controls panel (bottom sheet with blur backdrop)
- Material/color swapping within AR view
- Save-to-gallery with branded watermark
- Share screenshot button

### Cart Screen (Light Mode)
- Light background for readability during purchase flow
- Product thumbnails on cart items
- Animated quantity stepper (spring bounce)
- Swipe-to-remove with haptic confirmation
- BNPL teaser card

### Account Screen (Light Mode)
- Light background for form readability
- Profile avatar with edit button
- Menu items with subtle right-chevron animations
- Order history with status badges

### Onboarding (3 slides, Dark)
1. **Welcome**: Lifestyle illustration (from Melania), "Welcome to Carolina Futons", "Handcrafted comfort from the Blue Ridge Mountains"
2. **AR Preview**: AR illustration, "See It In Your Space", "Preview any piece in your room with AR"
3. **Shop With Confidence**: Delivery illustration, "Free Shipping & Easy Returns", "Secure payment, hassle-free returns"
- Real lifestyle photography backgrounds from carolinafutons.com
- Animated text reveals between slides
- Page indicator dots with spring animation
- Final slide: prominent AR demo CTA

---

## Animation System

All implemented with React Native Reanimated v3 + react-native-gesture-handler.

| Pattern | Where | Implementation |
|---------|-------|----------------|
| Shared element transitions | Shop → Product Detail | `sharedTransitionTag` on product images |
| Parallax scroll | Product Detail hero, Home hero | `useAnimatedScrollHandler` + `interpolate` |
| Spring press feedback | All buttons, cards | `withSpring({damping: 15, stiffness: 150})` + `expo-haptics` |
| Staggered list entrance | Shop grid, cart items | `FadeInDown.delay(index * 80)` entering animations |
| Skeleton shimmer | All loading states | Custom shimmer with `LinearGradient` + Reanimated translateX |
| Glassmorphism | Nav bar, bottom sheets, AR controls | `expo-blur` BlurView + semi-transparent overlay |
| Fade-through transitions | Tab switches | Cross-fade with slight upward drift |
| Haptic punctuation | Favorite, add-to-cart, order placed | Light/medium/success via `expo-haptics` |

---

## New Components

| Component | Purpose |
|-----------|---------|
| `SkeletonLoader` | Shimmer placeholder matching card/list layouts |
| `ParallaxHeader` | Reusable scroll-driven parallax hero image |
| `GlassCard` | Frosted glass card with blur backdrop |
| `AnimatedProductCard` | Spring press feedback + shared element tag |
| `EditorialHero` | Full-bleed image with overlay text + glassmorphism CTA |
| `EmptyStateIllustration` | Wrapper for Melania's SVG scenes |
| `FabricSwatchSelector` | Animated swatch picker with spring selection |
| `AnimatedTabBar` | Glassmorphism bottom nav with active indicator animation |

---

## Theme Changes

### Dark Mode Tokens (add to tokens.ts)

```
dark: {
  background: '#1C1410'      // espresso dark
  surface: '#2A1F19'         // elevated surface
  surfaceGlass: 'rgba(42, 31, 25, 0.7)'  // glassmorphism
  text: '#F5F0EB'            // warm cream
  textMuted: '#B8A99A'       // muted sand
  border: 'rgba(245, 240, 235, 0.1)'  // subtle dividers
  // Accents unchanged: sunsetCoral, mountainBlue, etc.
}
```

### Glassmorphism Recipe
```
background: surfaceGlass
backdropFilter: blur(20px)
border: 1px solid rgba(255, 255, 255, 0.08)
borderRadius: tokens.radius.lg
```

---

## What We Reuse (No Changes)

- `sharedTokens.js` → add dark variants, don't modify existing light tokens
- AR system → polish transitions/controls, don't rebuild core
- All hooks (`useAuth`, `useCart`, `useProducts`, etc.) → untouched
- All services (`wixClient`, `wixAuth`, `tokenStorage`, etc.) → untouched
- Navigation structure → same stacks/tabs, just add transition configs
- Test suite → update snapshots, add animation smoke tests

## Dependencies from cfutons Crew

- Melania: onboarding illustrations (3 scenes), mountain skyline SVG, comfort card SVGs
- Timeline: SVGs landing on cfutons/main incrementally, we consume via sharedTokens

---

## Sprint Structure (4 Polecats)

### Stream 1: Theme + Tokens
- Dark mode token system
- Glassmorphism utilities
- AnimatedTabBar component
- Apply dark theme to Home, Shop, Product Detail

### Stream 2: Animation System
- Shared element transitions (Shop → Product Detail)
- ParallaxHeader component
- Spring press feedback (AnimatedProductCard)
- Staggered list entrance animations

### Stream 3: Screen Redesigns
- Home screen (editorial hero + parallax)
- Product Detail (scrollytelling layout)
- Onboarding (dark slides with illustrations)
- Shop screen (larger cards, shimmer loaders)

### Stream 4: New Components + Polish
- SkeletonLoader
- GlassCard
- EditorialHero
- EmptyStateIllustration wrapper
- FabricSwatchSelector
- AR screen glassmorphism controls

---

## Success Criteria

- App feels premium on first launch — dark, editorial, photography-forward
- AR is the star: prominent CTA, seamless transitions, polished controls
- Every tap has visible feedback (spring animation + haptic)
- No loading state shows blank screen (skeleton shimmers everywhere)
- Illustrations from cfutons crew integrated seamlessly
- Test suite remains green (102+ suites passing)
- Design quality score: target 8.5+/10 (up from 6.2/10)

# Carolina Futons Mobile - Architecture

## Overview

React Native mobile app for Carolina Futons (Hendersonville, NC) built with
Expo managed workflow and TypeScript. Blue Ridge Mountain illustrative aesthetic
ported from the web design system.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo (managed workflow) | SDK 52+ |
| Language | TypeScript | strict mode |
| Navigation | React Navigation v6 | @react-navigation/native |
| Animations | react-native-reanimated | v3 |
| Gestures | react-native-gesture-handler | v2 |
| State | React Context + useReducer | (upgrade to Zustand if needed) |
| API | REST / fetch | Wix Stores API |
| Testing | Jest + React Native Testing Library | |
| Linting | ESLint + Prettier | Expo config |

## Directory Structure

```
src/
├── components/          # Reusable UI components (cm-wi5)
│   ├── ProductCard.tsx
│   ├── CategoryCard.tsx
│   ├── Header.tsx
│   ├── Button.tsx
│   ├── LoadingSpinner.tsx
│   ├── EmptyState.tsx
│   └── index.ts
├── screens/             # Screen components
│   ├── HomeScreen.tsx
│   ├── ShopScreen.tsx
│   ├── ProductDetailScreen.tsx
│   ├── CategoryScreen.tsx
│   ├── CartScreen.tsx
│   └── AccountScreen.tsx
├── navigation/          # React Navigation setup (cm-5wg)
│   ├── RootNavigator.tsx
│   ├── TabNavigator.tsx
│   ├── HomeStack.tsx
│   ├── ShopStack.tsx
│   ├── CartStack.tsx
│   ├── AccountStack.tsx
│   ├── linking.ts       # Deep linking config
│   └── types.ts         # Navigation type definitions
├── theme/               # Design tokens & theme (cm-330)
│   ├── tokens.ts        # Color, spacing, typography, shadow values
│   ├── typography.ts    # Font loading + text style presets
│   ├── ThemeProvider.tsx # Context provider, light/dark mode
│   └── useTheme.ts      # Hook for consuming theme
├── hooks/               # Custom hooks
│   ├── useProducts.ts
│   ├── useCart.ts
│   └── useCategories.ts
├── services/            # API layer
│   ├── api.ts           # Base fetch wrapper
│   ├── products.ts
│   └── cart.ts
└── utils/               # Helpers
    ├── formatPrice.ts
    └── images.ts
```

## Design Tokens (Blue Ridge Mountain Palette)

Ported from `cfutons/mayor/rig/src/public/designTokens.js`:

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `sandBase` | #E8D5B7 | Screen backgrounds |
| `sandLight` | #F2E8D5 | Card backgrounds, alternating sections |
| `sandDark` | #D4BC96 | Borders, dividers |
| `espresso` | #3A2518 | Primary text, headings |
| `espressoLight` | #5C4033 | Secondary text, captions |
| `mountainBlue` | #5B8FA8 | Links, accents, secondary CTA |
| `mountainBlueDark` | #3D6B80 | Pressed/hover states |
| `mountainBlueLight` | #A8CCD8 | Tag backgrounds, subtle accents |
| `sunsetCoral` | #E8845C | Primary CTA, sale badges |
| `sunsetCoralDark` | #C96B44 | Pressed CTA state |
| `sunsetCoralLight` | #F2A882 | Subtle warm accents |
| `mauve` | #C9A0A0 | Tertiary accent |
| `success` | #4A7C59 | In stock, success states |
| `error` | #E8845C | Low stock, errors (reuses coral) |
| `muted` | #999999 | Disabled, inactive |

### Typography

- **Headings**: Playfair Display (warm serif, handcrafted feel)
- **Body**: Source Sans 3 (clean sans-serif for readability)
- Mobile scale adapted from web tokens (px to RN units, scaled down for mobile density)

### Spacing (4px grid)

xs=4, sm=8, md=16, lg=24, xl=32, xxl=48, xxxl=64

### Border Radii

sm=4, md=8, lg=12, xl=16, card=12, button=8, image=8

### Shadows

Espresso-tinted shadows (rgba(58,37,24,opacity)) matching the warm palette.

## Navigation Architecture (cm-5wg)

```
RootNavigator
└── TabNavigator (bottom tabs)
    ├── HomeStack
    │   ├── HomeScreen
    │   └── ProductDetailScreen
    ├── ShopStack
    │   ├── ShopScreen (categories)
    │   ├── CategoryScreen (product grid)
    │   └── ProductDetailScreen
    ├── CartStack
    │   ├── CartScreen
    │   └── CheckoutScreen (future)
    └── AccountStack
        └── AccountScreen
```

**Tab bar**: 4 tabs - Home, Shop, Cart (with badge count), Account.

**Deep linking**: `carolinafutons://product/{slug}`, `carolinafutons://category/{slug}`

**Native stack** (`@react-navigation/native-stack`) for iOS-native transitions
and gesture-based back navigation.

## Component Library (cm-wi5)

| Component | Props | Notes |
|-----------|-------|-------|
| `ProductCard` | image, name, price, badge?, onPress | Grid item, image aspect 4:3 |
| `CategoryCard` | heroImage, title, onPress | Large card with overlay text |
| `Header` | showSearch?, cartCount? | Logo centered, search + cart icons |
| `Button` | variant: primary/secondary/ghost, size, loading? | Coral primary, Blue secondary |
| `LoadingSpinner` | size?, color? | Animated, uses mountainBlue |
| `EmptyState` | icon, title, message, action? | For empty cart/search results |

All components consume theme via `useTheme()` hook. No hardcoded colors.

## Story Dependency Chain

```
cm-vx9 (Expo scaffold) ← furiosa working now
  ↓
cm-330 (Design tokens) + cm-5wg (Navigation) ← can parallelize
  ↓
cm-wi5 (Component library) ← needs tokens
  ↓
cm-w04 (Product grid) + cm-8u2 (Product detail) + cm-rsl (Category nav) + cm-t3b (Cart)
  ↓
cm-hv9 (EPIC: Core Shopping) → cm-821 (EPIC: Scaffold & Design)
```

## Key Decisions

1. **Expo managed** (not bare): Faster iteration, OTA updates, no native build config.
2. **React Navigation v6 native-stack**: iOS-native transitions, gesture handler integration.
3. **Context over Redux**: App state is modest (cart, auth). Zustand if it grows.
4. **No Storybook RN**: Component showcase is a dev-only screen with all variants rendered.
5. **Font loading**: Expo Google Fonts for Playfair Display + Source Sans 3.
6. **Image handling**: Expo Image (blurhash placeholders, caching).

## Immediate Next Steps

Once cm-vx9 lands (furiosa):
1. **cm-330**: Port design tokens to `src/theme/tokens.ts`, build ThemeProvider
2. **cm-5wg**: Wire up TabNavigator + 4 stack navigators with placeholder screens
3. **cm-wi5**: Build core components using theme tokens

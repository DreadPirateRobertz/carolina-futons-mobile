# Carolina Futons Mobile - Architecture

> Updated 2026-03-07 — Sprint 2 (Beta Launch)

## Overview

React Native mobile app for Carolina Futons (Hendersonville, NC) built with
Expo managed workflow and TypeScript strict. Blue Ridge Mountain editorial
dark theme ported from the web design system. 23 screens, 30+ components,
2699 tests passing.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo (managed workflow) | SDK 52 |
| Language | TypeScript | strict mode |
| Navigation | React Navigation v6 | @react-navigation/native-stack |
| Animations | react-native-reanimated | v3 |
| Gestures | react-native-gesture-handler | v2 |
| State | React Context + useReducer + SWR | |
| API | REST / fetch | Wix CMS Data API |
| Payments | Stripe React Native | PaymentSheet |
| Crash Reporting | Sentry | @sentry/react-native |
| Analytics | Firebase + Mixpanel | Multi-provider |
| Push | expo-notifications | APNs/FCM via Expo |
| AR | Platform-native (ARKit/ARCore/model-viewer) | |
| Testing | Jest + React Native Testing Library | RNTL v13 |
| E2E | Detox | |
| Build | EAS Build | dev/preview/production profiles |
| Linting | ESLint + Prettier | Expo config |

## Directory Structure

```
src/
├── components/          # 30+ reusable UI components
│   ├── AnimatedPressable.tsx    # Spring scale + haptic feedback button
│   ├── BrandedSpinner.tsx       # Pulsing dot spinner (replaces ActivityIndicator)
│   ├── ARControls.tsx           # AR toolbar (share, measure, compare, fabric)
│   ├── ARComparisonOverlay.tsx  # Side-by-side size comparison
│   ├── ARFutonOverlay.tsx       # 3D model overlay positioning
│   ├── ARMeasurementOverlay.tsx # Room measurement UI
│   ├── AROnboarding.tsx         # First-time AR tutorial
│   ├── ARProductPicker.tsx      # Model selector in AR view
│   ├── ModelLoadingOverlay.tsx  # Download progress for 3D models
│   ├── GlassCard.tsx            # Glassmorphism card (espresso tint)
│   ├── MountainSkyline.tsx      # SVG hero backdrop (sunrise/sunset)
│   ├── MountainRefreshControl.tsx # Pull-to-refresh with mountain animation
│   ├── EditorialHero.tsx        # Full-bleed editorial hero section
│   ├── ParallaxHeader.tsx       # Scroll-driven parallax effect
│   ├── PremiumBadge.tsx         # CF+ premium indicator
│   ├── OfflineBanner.tsx        # Network status indicator
│   ├── ProductCard.tsx          # Grid item, image aspect 4:3
│   ├── CategoryCard.tsx         # Large card with overlay text
│   ├── CollectionCard.tsx       # Collection grid card
│   ├── RecommendationCarousel.tsx # Horizontal product carousel
│   ├── Button.tsx               # Coral primary, Blue secondary
│   ├── EmptyState.tsx           # Empty state with illustration
│   ├── ErrorBoundary.tsx        # React error boundary
│   └── Header.tsx               # Logo centered, search + cart icons
├── screens/             # 23 screens
│   ├── HomeScreen.tsx
│   ├── ShopScreen.tsx
│   ├── ProductDetailScreen.tsx
│   ├── CategoryScreen.tsx
│   ├── CollectionsScreen.tsx
│   ├── CollectionDetailScreen.tsx
│   ├── CartScreen.tsx
│   ├── CheckoutScreen.tsx
│   ├── OrderConfirmationScreen.tsx
│   ├── OrderHistoryScreen.tsx
│   ├── OrderDetailScreen.tsx
│   ├── AccountScreen.tsx
│   ├── LoginScreen.tsx
│   ├── SignUpScreen.tsx
│   ├── ForgotPasswordScreen.tsx
│   ├── WishlistScreen.tsx
│   ├── ARScreen.tsx
│   ├── ARWebScreen.tsx
│   ├── OnboardingScreen.tsx
│   ├── NotificationPreferencesScreen.tsx
│   ├── PremiumScreen.tsx
│   ├── StoreLocatorScreen.tsx
│   └── StoreDetailScreen.tsx
├── navigation/          # React Navigation setup
│   ├── AppNavigator.tsx # Root navigator with lazy loading
│   ├── linking.ts       # Deep linking config (20+ routes)
│   └── types.ts         # Navigation type definitions
├── theme/               # Design tokens & theme
│   ├── tokens.ts        # Color, spacing, typography, shadow values
│   ├── typography.ts    # Font loading + text style presets
│   ├── ThemeProvider.tsx # Context provider
│   └── useTheme.ts      # Hook for consuming theme
├── hooks/               # Custom hooks
│   ├── useProducts.ts        # Product data with SWR
│   ├── useCollections.ts     # Wix CMS collections with SWR
│   ├── useCart.ts             # Cart state management
│   ├── usePayment.ts          # Stripe PaymentSheet flow
│   ├── useNotifications.tsx   # Push registration + token refresh
│   ├── useModelLoader.ts      # 3D model download with progress
│   ├── useStagedItems.ts      # Multi-product AR staging (max 5)
│   ├── useARMeasurement.ts    # Room measurement with fit check
│   ├── useOfflineSync.tsx     # Offline queue + replay
│   ├── useDataCache.ts        # SWR caching layer
│   └── useAnimatedCart.ts     # Cart bounce animation
├── services/            # API + business logic layer
│   ├── wix/             # Wix API client (products, collections, auth, orders)
│   ├── providers/       # Analytics + crash reporting providers
│   ├── payment.ts       # Stripe payment intent creation
│   ├── notifications.ts # Push token registration with retry
│   ├── offlineQueue.ts  # Mutation queue with exponential backoff
│   ├── modelLoader.ts   # 3D model download + LRU cache (200MB)
│   ├── analytics.ts     # Multi-provider analytics (48+ events)
│   └── crashReporting.ts # Sentry integration
├── data/                # Static data + type definitions
│   ├── futons.ts        # FutonModel + Fabric types
│   ├── models3d.ts      # 3D model catalog (GLB/USDZ URLs)
│   ├── productId.ts     # Branded types (FutonModelId, ProductId)
│   └── premium.ts       # CF+ feature gate definitions
└── utils/               # Helpers
    ├── openARViewer.ts   # Platform-specific AR launcher
    ├── formatPrice.ts
    └── images.ts
```

## Design Tokens (Blue Ridge Mountain Palette)

Source of truth: `src/public/sharedTokens.js` (cross-platform with web).

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `sandBase` | #E8D5B7 | Light backgrounds, splash |
| `espresso` | #3A2518 | Primary text, headings |
| `mountainBlue` | #5B8FA8 | Links, accents, secondary CTA |
| `sunsetCoral` | #E8845C | **Primary CTA (ALWAYS)**, sale badges |
| Dark BG | #1C1410 | App background (warm espresso, NOT black) |
| Dark Surface | #2A1F19 | Card/surface backgrounds |
| Glass | rgba(42,31,25,0.7) | Glassmorphism overlay |

### Typography

- **Headings**: Playfair Display (warm serif)
- **Body**: Source Sans 3 (clean sans-serif)

### Spacing (4px grid)

xs=4, sm=8, md=16, lg=24, xl=32, xxl=48, xxxl=64

### Shadows

Espresso-tinted shadows (rgba(58,37,24,opacity)) — warm brown, NOT gray.

## Navigation Architecture

```
AppNavigator (lazy-loaded screens)
├── Onboarding (first launch only)
├── TabNavigator (bottom tabs, glassmorphism blur)
│   ├── HomeStack
│   │   ├── HomeScreen (mountain hero + editorial CTAs)
│   │   └── ProductDetailScreen
│   ├── ShopStack
│   │   ├── ShopScreen (categories)
│   │   ├── CategoryScreen (product grid)
│   │   ├── CollectionsScreen
│   │   ├── CollectionDetailScreen
│   │   └── ProductDetailScreen
│   ├── CartStack
│   │   ├── CartScreen
│   │   ├── CheckoutScreen (Stripe PaymentSheet)
│   │   ├── OrderConfirmationScreen
│   │   ├── OrderHistoryScreen
│   │   └── OrderDetailScreen
│   └── AccountStack
│       ├── AccountScreen
│       ├── LoginScreen
│       ├── SignUpScreen
│       ├── ForgotPasswordScreen
│       ├── WishlistScreen
│       ├── PremiumScreen (CF+ membership)
│       ├── NotificationPreferencesScreen
│       ├── StoreLocatorScreen
│       └── StoreDetailScreen
├── ARScreen (full-screen AR view)
└── ARWebScreen (web 3D model viewer)
```

**Tab bar**: 4 tabs — Home, Shop, Cart (badge count), Account. Glassmorphism blur effect.

**Deep linking**: 20+ routes via `carolinafutons://` scheme + iOS universal links + Android app links.

## AR Architecture

Platform-native AR (no custom engine):

| Platform | Engine | Model Format |
|----------|--------|-------------|
| iOS | AR Quick Look (ARKit) | .usdz |
| Android | Scene Viewer (ARCore) | .glb |
| Web | model-viewer (Google) | .glb |

Features: room measurement with fit check, multi-product staging (up to 5), side-by-side comparison, fabric texture preview, model download progress with branded UI, share screenshot.

Models cached locally (200 MB LRU). Catalog: `src/data/models3d.ts` synced from `shared/catalog-3d.json`.

## Key Decisions

1. **Expo managed** (not bare): Faster iteration, OTA updates, EAS Build pipeline.
2. **React Navigation v6 native-stack**: iOS-native transitions, gesture handler integration.
3. **Context + SWR over Redux**: Stale-while-revalidate caching, offline-first reads.
4. **Branded types**: `FutonModelId` and `ProductId` use nominal typing (`__brand` field) for type safety.
5. **BrandedSpinner over ActivityIndicator**: All loading states use custom pulsing dot animation.
6. **AnimatedPressable**: All interactive elements use spring animation + configurable haptic feedback.
7. **Multi-provider analytics**: Single `analytics.track()` call fans out to Firebase + Mixpanel.
8. **Platform-native AR**: No custom AR engine — delegates to ARKit/ARCore/model-viewer per platform.

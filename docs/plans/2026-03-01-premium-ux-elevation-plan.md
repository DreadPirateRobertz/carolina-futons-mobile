# Premium UX Elevation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Carolina Futons mobile from functional (6.2/10) to premium luxury (8.5+/10) with dark editorial theme, AR-first hero, spring animations, and glassmorphism.

**Architecture:** Extend existing ThemeProvider dark mode with expanded editorial palette. Add Reanimated v3 animation primitives as reusable components. Redesign screens top-down (Home → Shop → Product Detail → Onboarding). All changes are visual layer — hooks, services, and navigation structure untouched.

**Tech Stack:** React Native 0.76, Expo SDK 52, Reanimated v3, expo-haptics, expo-blur, expo-image, existing sharedTokens design system.

**Design Doc:** `docs/plans/2026-03-01-premium-ux-elevation-design.md`

---

## Stream 1: Theme + Dark Mode Foundation

### Task 1.1: Expand Dark Color Tokens

**Files:**
- Modify: `src/theme/tokens.ts`
- Modify: `src/theme/ThemeProvider.tsx`
- Test: `src/theme/__tests__/tokens.test.ts`

**Context:** `ThemeProvider.tsx:9-19` already has `darkColors` but it's minimal — just inverts sandBase/espresso. We need the full editorial dark palette.

**Step 1: Write failing test for new dark tokens**

Add to `src/theme/__tests__/tokens.test.ts`:

```typescript
describe('dark theme colors', () => {
  it('defines editorial dark palette', () => {
    const { darkColors } = require('../tokens');
    expect(darkColors.background).toBe('#1C1410');
    expect(darkColors.surface).toBe('#2A1F19');
    expect(darkColors.surfaceElevated).toBe('#352A22');
    expect(darkColors.textPrimary).toBe('#F5F0EB');
    expect(darkColors.textMuted).toBe('#B8A99A');
    expect(darkColors.borderSubtle).toBe('rgba(245, 240, 235, 0.1)');
    expect(darkColors.glass).toBe('rgba(42, 31, 25, 0.7)');
    expect(darkColors.glassBorder).toBe('rgba(255, 255, 255, 0.08)');
  });
});
```

**Step 2: Run test — expect FAIL** (`darkColors.background` not defined)

Run: `npx jest src/theme/__tests__/tokens.test.ts --no-coverage -t "editorial dark"`

**Step 3: Implement dark tokens**

In `src/theme/tokens.ts`, export a new `darkPalette` object:

```typescript
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
```

Update `darkColors` in `ThemeProvider.tsx` to merge `darkPalette`:

```typescript
import { colors, darkPalette, spacing, ... } from './tokens';

const darkColors: Colors = {
  ...colors,
  sandBase: darkPalette.background,
  sandLight: darkPalette.surface,
  sandDark: darkPalette.surfaceElevated,
  espresso: darkPalette.textPrimary,
  espressoLight: darkPalette.textMuted,
  offWhite: darkPalette.surface,
  white: darkPalette.background,
  overlay: 'rgba(0, 0, 0, 0.7)',
};
```

Also export `darkPalette` from `src/theme/index.ts`.

**Step 4: Run test — expect PASS**

Run: `npx jest src/theme/__tests__/tokens.test.ts --no-coverage`

**Step 5: Run full test suite to check nothing broke**

Run: `npx jest --no-coverage`
Expected: All 102 suites pass (dark tokens are additive)

**Step 6: Commit**

```bash
git add src/theme/tokens.ts src/theme/ThemeProvider.tsx src/theme/index.ts src/theme/__tests__/tokens.test.ts
git commit -m "feat(theme): add editorial dark palette tokens (cm-ux-1.1)"
```

---

### Task 1.2: Force Dark Mode for Browse Screens

**Files:**
- Modify: `src/theme/ThemeProvider.tsx`
- Modify: `src/theme/__tests__/theme.test.tsx`

**Context:** The design calls for dark mode on browse screens (Home, Shop, Product Detail, AR, Onboarding) and light mode on utility screens (Cart, Checkout, Account). For this sprint, we default to dark mode app-wide. Per-screen overrides come in Task 3.x.

**Step 1: Write failing test**

```typescript
it('defaults to dark color mode', () => {
  // ThemeProvider with no initialColorMode should default to dark
  const { result } = renderHook(() => useTheme(), {
    wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
  });
  expect(result.current.colorMode).toBe('dark');
});
```

**Step 2: Run test — expect FAIL** (currently defaults to system scheme or 'light')

**Step 3: Change default in ThemeProvider**

In `ThemeProvider.tsx`, change the default:
```typescript
const [colorMode, setColorMode] = useState<ColorMode>(
  initialColorMode ?? 'dark',
);
```

**Step 4: Run test — expect PASS**

**Step 5: Update any existing tests that assume light mode**

Existing tests that render with `<ThemeProvider>` without `initialColorMode` will now get dark colors. Update assertions or add `initialColorMode="light"` where light mode is expected.

**Step 6: Commit**

```bash
git add src/theme/ThemeProvider.tsx src/theme/__tests__/theme.test.tsx
git commit -m "feat(theme): default to dark mode for editorial experience (cm-ux-1.2)"
```

---

### Task 1.3: GlassCard Component

**Files:**
- Create: `src/components/GlassCard.tsx`
- Create: `src/components/__tests__/GlassCard.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { GlassCard } from '../GlassCard';
import { ThemeProvider } from '@/theme';

describe('GlassCard', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider initialColorMode="dark">{children}</ThemeProvider>
  );

  it('renders children', () => {
    const { getByText } = render(<GlassCard><Text>Hello</Text></GlassCard>, { wrapper });
    expect(getByText('Hello')).toBeTruthy();
  });

  it('has glass background style', () => {
    const { getByTestId } = render(<GlassCard testID="glass">Content</GlassCard>, { wrapper });
    const card = getByTestId('glass');
    // Verify glass styling applied
    expect(card.props.style).toBeDefined();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement GlassCard**

```typescript
import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
  intensity?: 'light' | 'medium' | 'heavy';
}

export function GlassCard({ children, style, testID, intensity = 'medium' }: Props) {
  const { borderRadius } = useTheme();
  const opacity = intensity === 'light' ? 0.5 : intensity === 'heavy' ? 0.85 : 0.7;

  return (
    <View
      testID={testID}
      style={[
        styles.glass,
        {
          backgroundColor: `rgba(42, 31, 25, ${opacity})`,
          borderColor: darkPalette.glassBorder,
          borderRadius: borderRadius.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
```

> **Note:** Using `rgba` background instead of BlurView for broad compatibility. BlurView can be added as enhancement later if expo-blur is already installed.

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/GlassCard.tsx src/components/__tests__/GlassCard.test.tsx
git commit -m "feat(ui): add GlassCard component for glassmorphism panels (cm-ux-1.3)"
```

---

## Stream 2: Animation Primitives

### Task 2.1: AnimatedPressable — Spring Press Feedback

**Files:**
- Create: `src/components/AnimatedPressable.tsx`
- Create: `src/components/__tests__/AnimatedPressable.test.tsx`

**Context:** Every tappable element should scale down on press with spring physics and haptic feedback. This replaces `TouchableOpacity` with `activeOpacity={0.7}`.

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AnimatedPressable } from '../AnimatedPressable';

describe('AnimatedPressable', () => {
  it('renders children', () => {
    const { getByText } = render(
      <AnimatedPressable onPress={() => {}}><Text>Tap me</Text></AnimatedPressable>
    );
    expect(getByText('Tap me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AnimatedPressable onPress={onPress} testID="btn">Press</AnimatedPressable>
    );
    fireEvent.press(getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('accepts style prop', () => {
    const { getByTestId } = render(
      <AnimatedPressable testID="styled" style={{ padding: 10 }}>X</AnimatedPressable>
    );
    expect(getByTestId('styled')).toBeTruthy();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement AnimatedPressable**

```typescript
import React, { useCallback } from 'react';
import { Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPress = Animated.createAnimatedComponent(Pressable);

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
  scaleDown?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'tab';
  disabled?: boolean;
}

const SPRING_CONFIG = { damping: 15, stiffness: 150 };

export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  testID,
  haptic = 'light',
  scaleDown = 0.96,
  accessibilityLabel,
  accessibilityRole = 'button',
  disabled,
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleDown, SPRING_CONFIG);
  }, [scale, scaleDown]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (haptic !== 'none') {
      const style = haptic === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : haptic === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(style);
    }
    onPress?.();
  }, [haptic, onPress]);

  return (
    <AnimatedPress
      testID={testID}
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      disabled={disabled}
    >
      {children}
    </AnimatedPress>
  );
}
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/AnimatedPressable.tsx src/components/__tests__/AnimatedPressable.test.tsx
git commit -m "feat(ui): add AnimatedPressable with spring feedback + haptics (cm-ux-2.1)"
```

---

### Task 2.2: SkeletonLoader Component

**Files:**
- Create: `src/components/SkeletonLoader.tsx`
- Create: `src/components/__tests__/SkeletonLoader.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonLoader } from '../SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders with default dimensions', () => {
    const { getByTestId } = render(<SkeletonLoader testID="skel" />);
    expect(getByTestId('skel')).toBeTruthy();
  });

  it('accepts width and height', () => {
    const { getByTestId } = render(
      <SkeletonLoader testID="sized" width={200} height={100} />
    );
    expect(getByTestId('sized')).toBeTruthy();
  });

  it('renders circle variant', () => {
    const { getByTestId } = render(
      <SkeletonLoader testID="circle" variant="circle" width={48} />
    );
    expect(getByTestId('circle')).toBeTruthy();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement SkeletonLoader**

```typescript
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { darkPalette } from '@/theme/tokens';

interface Props {
  width?: number | string;
  height?: number;
  variant?: 'rect' | 'circle' | 'text';
  borderRadius?: number;
  style?: ViewStyle;
  testID?: string;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  variant = 'rect',
  borderRadius: customRadius,
  style,
  testID,
}: Props) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }));

  const radius =
    customRadius ??
    (variant === 'circle' ? (typeof width === 'number' ? width / 2 : 24) : 6);

  return (
    <Animated.View
      testID={testID}
      style={[
        {
          width,
          height: variant === 'circle' ? width : height,
          borderRadius: radius,
          backgroundColor: darkPalette.surfaceElevated,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/SkeletonLoader.tsx src/components/__tests__/SkeletonLoader.test.tsx
git commit -m "feat(ui): add SkeletonLoader with shimmer animation (cm-ux-2.2)"
```

---

### Task 2.3: ParallaxHeader Component

**Files:**
- Create: `src/components/ParallaxHeader.tsx`
- Create: `src/components/__tests__/ParallaxHeader.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { ParallaxHeader } from '../ParallaxHeader';
import Animated from 'react-native-reanimated';

describe('ParallaxHeader', () => {
  it('renders image and overlay content', () => {
    const scrollY = { value: 0 } as Animated.SharedValue<number>;
    const { getByTestId, getByText } = render(
      <ParallaxHeader
        imageUri="https://example.com/photo.jpg"
        height={400}
        scrollY={scrollY}
        testID="parallax"
      >
        <Text>Overlay Content</Text>
      </ParallaxHeader>
    );
    expect(getByTestId('parallax')).toBeTruthy();
    expect(getByText('Overlay Content')).toBeTruthy();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement ParallaxHeader**

```typescript
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedImage = Animated.createAnimatedComponent(Image);

interface Props {
  imageUri: string;
  height: number;
  scrollY: SharedValue<number>;
  children?: React.ReactNode;
  testID?: string;
  parallaxFactor?: number;
}

export function ParallaxHeader({
  imageUri,
  height,
  scrollY,
  children,
  testID,
  parallaxFactor = 0.5,
}: Props) {
  const imageStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-height, 0, height],
      [-height * parallaxFactor, 0, height * parallaxFactor],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [-height, 0],
      [2, 1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }, { scale }] };
  });

  const overlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, height * 0.6],
      [0, 0.6],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <View testID={testID} style={[styles.container, { height }]}>
      <AnimatedImage
        source={{ uri: imageUri }}
        style={[styles.image, { height: height * 1.3 }, imageStyle]}
        contentFit="cover"
      />
      <Animated.View style={[styles.darkenOverlay, overlayStyle]} />
      <View style={styles.overlay}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', width: SCREEN_WIDTH },
  image: { position: 'absolute', width: SCREEN_WIDTH, top: 0 },
  darkenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1C1410',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 24,
  },
});
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/ParallaxHeader.tsx src/components/__tests__/ParallaxHeader.test.tsx
git commit -m "feat(ui): add ParallaxHeader with scroll-driven parallax (cm-ux-2.3)"
```

---

### Task 2.4: Staggered List Entrance Animation

**Files:**
- Create: `src/components/AnimatedListItem.tsx`
- Create: `src/components/__tests__/AnimatedListItem.test.tsx`

**Step 1: Write failing test**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { AnimatedListItem } from '../AnimatedListItem';
import { Text } from 'react-native';

describe('AnimatedListItem', () => {
  it('renders children with index-based delay', () => {
    const { getByText } = render(
      <AnimatedListItem index={0}><Text>Item</Text></AnimatedListItem>
    );
    expect(getByText('Item')).toBeTruthy();
  });
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Implement AnimatedListItem**

```typescript
import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  index: number;
  delay?: number;
  style?: ViewStyle;
}

export function AnimatedListItem({ children, index, delay = 80, style }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * delay).duration(400).springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add src/components/AnimatedListItem.tsx src/components/__tests__/AnimatedListItem.test.tsx
git commit -m "feat(ui): add AnimatedListItem with staggered entrance (cm-ux-2.4)"
```

---

## Stream 3: Screen Redesigns

### Task 3.1: HomeScreen — Editorial Hero with Parallax

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/__tests__/HomeScreen.test.tsx`

**Context:** Current HomeScreen (`src/screens/HomeScreen.tsx`) is a flat View with two TouchableOpacity buttons. Redesign: full-bleed parallax hero image, glassmorphism AR CTA, editorial title typography.

**Step 1: Update HomeScreen test for new structure**

Update `src/screens/__tests__/HomeScreen.test.tsx` to expect:
- `testID="home-hero"` for parallax header
- `testID="ar-cta"` for the glass AR button
- `testID="shop-cta"` for browse button
- Title text "Carolina Futons" (shorter, editorial)
- Subtitle "Handcrafted in the Blue Ridge Mountains"

**Step 2: Run test — expect FAIL**

**Step 3: Rewrite HomeScreen**

Replace the flat layout with:
- `Animated.ScrollView` with `useAnimatedScrollHandler`
- `ParallaxHeader` with a placeholder hero image (or brand color gradient until real photos)
- `GlassCard` wrapping the AR CTA
- `AnimatedPressable` for both CTAs
- Dark background, cream text, editorial typography
- Mountain skyline SVG divider (placeholder View until Melania's SVG lands)

Keep the same `Props` interface and navigation logic. Only change the visual layer.

**Step 4: Run test — expect PASS**

**Step 5: Visual check on iOS sim + web**

Run: `npx expo start --ios --web`
Screenshot both platforms to verify dark theme renders correctly.

**Step 6: Commit**

```bash
git add src/screens/HomeScreen.tsx src/screens/__tests__/HomeScreen.test.tsx
git commit -m "feat(home): editorial dark hero with parallax + glassmorphism CTAs (cm-ux-3.1)"
```

---

### Task 3.2: ShopScreen — Dark Grid with Staggered Animation

**Files:**
- Modify: `src/screens/ShopScreen.tsx`
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/screens/__tests__/ShopScreen.test.tsx`

**Step 1: Update ProductCard to use AnimatedPressable**

Replace `TouchableOpacity` with `AnimatedPressable` in `ProductCard.tsx`. Keep all existing props and logic. Just swap the wrapper component and remove `activeOpacity={0.7}`.

**Step 2: Update ShopScreen for dark theme**

- Background: `colors.sandBase` (which is now `#1C1410` in dark mode)
- Product cards: wrap each in `AnimatedListItem` with staggered delay
- Category chips: glassmorphism pill style (dark surface, light border)
- Search bar: dark surface background, cream text

**Step 3: Run tests — expect PASS**

Run: `npx jest src/screens/__tests__/ShopScreen.test.tsx src/components/__tests__/ProductCard.test.tsx --no-coverage`

**Step 4: Commit**

```bash
git add src/screens/ShopScreen.tsx src/components/ProductCard.tsx src/screens/__tests__/ShopScreen.test.tsx
git commit -m "feat(shop): dark grid with spring press + staggered entrance (cm-ux-3.2)"
```

---

### Task 3.3: ProductDetailScreen — Scrollytelling

**Files:**
- Modify: `src/screens/ProductDetailScreen.tsx`
- Modify: `src/screens/__tests__/ProductDetailScreen.test.tsx`

**Step 1: Update ProductDetailScreen**

- Replace `ScrollView` with `Animated.ScrollView` + `useAnimatedScrollHandler`
- Add `ParallaxHeader` for hero product image
- Fade-in sections as user scrolls (price, description, swatches, reviews)
- AR CTA: `GlassCard` with `AnimatedPressable`, prominent position
- Fabric swatches: `AnimatedPressable` with spring selection indicator
- Dark background throughout

**Step 2: Run existing tests — update assertions**

Existing `ProductDetailScreen.test.tsx` tests should still find testIDs for product name, price, add-to-cart button, etc. Update any color/style assertions.

**Step 3: Run tests — expect PASS**

**Step 4: Commit**

```bash
git add src/screens/ProductDetailScreen.tsx src/screens/__tests__/ProductDetailScreen.test.tsx
git commit -m "feat(product): scrollytelling layout with parallax hero (cm-ux-3.3)"
```

---

### Task 3.4: OnboardingScreen — Dark Editorial with Illustrations

**Files:**
- Modify: `src/screens/OnboardingScreen.tsx`
- Modify: `src/screens/__tests__/OnboardingScreen.test.tsx`

**Step 1: Update OnboardingScreen**

- Dark background (`#1C1410`)
- 3 slides with animated text reveals (FadeInDown entering)
- Page dots with spring animation on active indicator
- "Skip" in top-right, cream color
- Final slide: prominent AR CTA with glassmorphism
- Placeholder illustration areas (will be populated with Melania's SVGs when they land via cf-a0a8)

**Step 2: Run tests — expect PASS**

**Step 3: Commit**

```bash
git add src/screens/OnboardingScreen.tsx src/screens/__tests__/OnboardingScreen.test.tsx
git commit -m "feat(onboarding): dark editorial slides with animation (cm-ux-3.4)"
```

---

### Task 3.5: CartScreen + AccountScreen — Light Mode Override

**Files:**
- Modify: `src/screens/CartScreen.tsx`
- Modify: `src/screens/AccountScreen.tsx`
- Modify: respective test files

**Context:** Cart and Account use light mode for readability during data entry/purchase. Override the dark theme locally.

**Step 1: Add light mode wrapper**

In each screen, wrap content in a View with explicit light-mode colors:
```typescript
const lightBg = '#F5F0EB'; // warm cream
const lightText = '#3A2518'; // espresso
```

Don't change ThemeProvider — just override the specific colors used in these screens.

**Step 2: Add swipe-to-remove on cart items**

Use `react-native-gesture-handler` Swipeable for cart item removal with haptic confirmation.

**Step 3: Run tests — expect PASS**

**Step 4: Commit**

```bash
git add src/screens/CartScreen.tsx src/screens/AccountScreen.tsx src/screens/__tests__/CartScreen.test.tsx src/screens/__tests__/AccountScreen.test.tsx
git commit -m "feat(cart,account): light mode overrides for utility screens (cm-ux-3.5)"
```

---

## Stream 4: Polish + Integration

### Task 4.1: AnimatedTabBar with Glassmorphism

**Files:**
- Modify: `src/navigation/TabNavigator.tsx`
- Modify: `src/navigation/__tests__/Navigation.test.tsx`

**Step 1: Update TabNavigator**

Replace default tab bar with custom `tabBar` prop:
- Glassmorphism background (dark glass surface + subtle border)
- Active tab: spring scale animation + cream color
- Inactive tab: muted color
- Haptic feedback on tab switch

**Step 2: Run nav tests — expect PASS**

**Step 3: Commit**

```bash
git add src/navigation/TabNavigator.tsx src/navigation/__tests__/Navigation.test.tsx
git commit -m "feat(nav): glassmorphism tab bar with spring animations (cm-ux-4.1)"
```

---

### Task 4.2: EditorialHero Component

**Files:**
- Create: `src/components/EditorialHero.tsx`
- Create: `src/components/__tests__/EditorialHero.test.tsx`

**Step 1: Write failing test**

```typescript
describe('EditorialHero', () => {
  it('renders title, subtitle, and CTA', () => {
    const { getByText } = render(
      <EditorialHero
        title="Carolina Futons"
        subtitle="Handcrafted comfort"
        ctaLabel="View in Your Room"
        onCtaPress={() => {}}
      />,
      { wrapper: ThemeWrapper },
    );
    expect(getByText('Carolina Futons')).toBeTruthy();
    expect(getByText('View in Your Room')).toBeTruthy();
  });
});
```

**Step 2: Implement** — Large Playfair Display title, muted subtitle, GlassCard CTA with AnimatedPressable.

**Step 3: Run test — expect PASS**

**Step 4: Commit**

```bash
git add src/components/EditorialHero.tsx src/components/__tests__/EditorialHero.test.tsx
git commit -m "feat(ui): add EditorialHero for full-bleed hero sections (cm-ux-4.2)"
```

---

### Task 4.3: EmptyStateIllustration Wrapper

**Files:**
- Create: `src/components/EmptyStateIllustration.tsx`
- Create: `src/components/__tests__/EmptyStateIllustration.test.tsx`

**Context:** Melania's 8 empty state SVGs are at `public/emptyStateIllustrations` on the cfutons web repo main branch. Create a wrapper component that renders them for React Native. For now, create the interface and placeholder — actual SVGs will be imported when they're ported to RN-compatible format.

**Step 1: Write test with known illustration names**

**Step 2: Implement wrapper** that accepts `name` prop and renders the corresponding SVG (or a themed placeholder until SVGs are ported).

**Step 3: Commit**

```bash
git add src/components/EmptyStateIllustration.tsx src/components/__tests__/EmptyStateIllustration.test.tsx
git commit -m "feat(ui): add EmptyStateIllustration wrapper for Melania's SVGs (cm-ux-4.3)"
```

---

### Task 4.4: Full Integration Test + Visual QA

**Files:**
- No new files — this is a verification task

**Step 1: Run full test suite**

Run: `npx jest --no-coverage`
Expected: All suites pass (102+)

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Run ESLint**

Run: `npx eslint src/ --ext .ts,.tsx`
Expected: No errors

**Step 4: Visual QA on iOS simulator**

Run: `npx expo start --ios`
Screenshot every screen. Verify:
- Dark background on Home, Shop, Product Detail, Onboarding
- Light background on Cart, Account
- Glassmorphism on tab bar, AR CTA, cards
- Spring animations on button press
- Staggered list entrance in Shop grid
- Parallax scroll on Home hero
- Skeleton loaders on image placeholders

**Step 5: Visual QA on Web**

Run: Open `http://localhost:8081`
Navigate all tabs, verify same dark editorial treatment.

**Step 6: Commit any test fixes**

```bash
git add -A
git commit -m "test: integration pass — all suites green, visual QA complete (cm-ux-4.4)"
```

**Step 7: Push to remote**

```bash
git push
```

---

## Task Dependency Graph

```
Stream 1 (Theme):     1.1 → 1.2 → 1.3
Stream 2 (Animation): 2.1 → 2.2 → 2.3 → 2.4
Stream 3 (Screens):   [depends on 1.2 + 2.1] → 3.1 → 3.2 → 3.3 → 3.4 → 3.5
Stream 4 (Polish):    [depends on 1.3 + 2.1] → 4.1 → 4.2 → 4.3 → 4.4

Parallelism:
- Stream 1 + Stream 2 can run simultaneously (no dependencies)
- Stream 3 starts after Tasks 1.2 and 2.1 complete
- Stream 4 starts after Tasks 1.3 and 2.1 complete
- Task 4.4 (integration) runs last after all other tasks
```

## Convoy Assignment (4 Polecats)

| Polecat | Stream | Tasks | Dependencies |
|---------|--------|-------|--------------|
| Alpha | Theme + Tokens | 1.1, 1.2, 1.3 | None — starts immediately |
| Bravo | Animation Primitives | 2.1, 2.2, 2.3, 2.4 | None — starts immediately |
| Charlie | Screen Redesigns | 3.1, 3.2, 3.3, 3.4, 3.5 | Waits for Alpha 1.2 + Bravo 2.1 |
| Delta | Polish + Integration | 4.1, 4.2, 4.3, 4.4 | Waits for Alpha 1.3 + Bravo 2.1 |

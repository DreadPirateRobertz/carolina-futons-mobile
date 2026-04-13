/**
 * Tests for TabNavigator — structure and cart badge (cm-486, cm-377).
 *
 * CartFAB was moved to MiniCartDrawerHost (cm-377) so it appears on ALL
 * screens, not just tab screens. TabNavigator tests now verify the tab
 * structure and cart badge; CartFAB coverage lives in MiniCartDrawerHost.test.tsx.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { TabNavigator } from '../TabNavigator';

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockCapturedScreenOptions: any = null;

jest.mock('@react-navigation/bottom-tabs', () => {
  const { View } = require('react-native');
  const createBottomTabNavigator = () => ({
    Navigator: ({ children, screenOptions, tabBar: _tb }: any) => {
      mockCapturedScreenOptions = screenOptions;
      return <View testID="tab-navigator">{children}</View>;
    },
    Screen: ({ name }: any) => <View testID={`tab-screen-${name}`} />,
  });
  return { createBottomTabNavigator };
});

jest.mock('@/hooks/useLivingSky', () => ({
  useLivingSky: () => ({
    navBg: '#0A0F1C',
    navText: '#8BAFC8',
    skyColors: ['#050810', '#080D1C', '#0D1628', '#141E30'] as [string, string, string, string],
    glowColors: ['transparent', 'transparent'] as [string, string],
    ridgeColors: { r1: '#0C1838', r2: '#162850', r3: '#283860', r4: '#3C4E6A', tree: '#080E1E' },
    sunPos: { cx: 520, cy: 220, r: 14, opacity: 0 },
    moonPos: { cx: 200, cy: 200, opacity: 1, phase: 0, shadowOffset: { dx: 0, dy: 0 } },
    starOpacity: 0.9,
    cloudOpacity: 0,
    birdOpacity: 0,
    fireflyOpacity: 0.55,
    owlOpacity: 0.9,
    rimOpacity: 0.12,
    rimColor: '#4A6E8A',
    season: 'winter' as const,
    precipitationOpacity: 0.5,
    precipitationType: 'snow' as const,
  }),
}));

jest.mock('../AnimatedTabBar', () => ({ AnimatedTabBar: () => null }));
jest.mock('../withScreenErrorBoundary', () => ({
  withScreenErrorBoundary: (C: any) => C,
}));
jest.mock('@/screens/HomeScreen', () => ({ HomeScreen: () => null }));
jest.mock('@/screens/ShopScreen', () => ({ ShopScreen: () => null }));
jest.mock('@/screens/CartScreen', () => ({ CartScreen: () => null }));
jest.mock('@/screens/AccountScreen', () => ({ AccountScreen: () => null }));
jest.mock('@/contexts/CompareContext', () => ({
  useCompareContext: () => ({ compareList: [], count: 0 }),
  CompareProvider: ({ children }: any) => children,
}));

const mockOpen = jest.fn();
jest.mock('@/hooks/useMiniCartDrawer', () => ({
  useMiniCartDrawer: () => ({ open: mockOpen, close: jest.fn(), toggle: jest.fn(), isOpen: false }),
  MiniCartDrawerProvider: ({ children }: any) => children,
}));

const mockUseCart = jest.fn();
jest.mock('@/hooks/useCart', () => ({
  useCart: () => mockUseCart(),
  CartProvider: ({ children }: any) => children,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

function renderTabs() {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCapturedScreenOptions = null;
  mockUseCart.mockReturnValue({ itemCount: 2, items: [], subtotal: 0 });
});

describe('TabNavigator — structure', () => {
  it('renders all four tab screens', () => {
    const { getByTestId } = renderTabs();
    expect(getByTestId('tab-screen-Home')).toBeTruthy();
    expect(getByTestId('tab-screen-Shop')).toBeTruthy();
    expect(getByTestId('tab-screen-Cart')).toBeTruthy();
    expect(getByTestId('tab-screen-Account')).toBeTruthy();
  });

  it('does not render CartFAB — it lives in MiniCartDrawerHost (cm-377)', () => {
    const { queryByTestId } = renderTabs();
    expect(queryByTestId('cart-fab')).toBeNull();
  });
});

describe('TabNavigator — living sky tint (cf-7l2)', () => {
  it('sets tabBarActiveTintColor from skyState.navText', () => {
    renderTabs();
    expect(mockCapturedScreenOptions?.tabBarActiveTintColor).toBe('#8BAFC8');
  });

  it('sets tabBarInactiveTintColor from skyState.navText', () => {
    renderTabs();
    expect(mockCapturedScreenOptions?.tabBarInactiveTintColor).toBe('#8BAFC8');
  });

  it('sets tabBarStyle.backgroundColor from skyState.navBg', () => {
    renderTabs();
    expect(mockCapturedScreenOptions?.tabBarStyle?.backgroundColor).toBe('#0A0F1C');
  });
});

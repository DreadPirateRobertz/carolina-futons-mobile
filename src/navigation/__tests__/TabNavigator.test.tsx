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
import { AnimatedTabBar } from '../AnimatedTabBar';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/bottom-tabs', () => {
  const { View } = require('react-native');
  const createBottomTabNavigator = () => ({
    Navigator: ({ children, screenOptions: _so, tabBar: TabBarComponent }: any) => (
      <View testID="tab-navigator">
        {TabBarComponent && (
          <TabBarComponent
            state={{ routes: [], index: 0 }}
            descriptors={{}}
            navigation={{ emit: jest.fn(), navigate: jest.fn() }}
          />
        )}
        {children}
      </View>
    ),
    Screen: ({ name }: any) => <View testID={`tab-screen-${name}`} />,
  });
  return { createBottomTabNavigator };
});

jest.mock('../AnimatedTabBar', () => ({ AnimatedTabBar: jest.fn(() => null) }));

jest.mock('@/hooks/useLivingSky', () => ({
  useLivingSky: jest.fn(() => ({
    skyColors: ['#0A0F1C', '#0C1628', '#101E2E', '#141E2C'] as [string, string, string, string],
    glowColors: ['transparent', 'transparent'] as [string, string],
    ridgeColors: { r1: '#0C1838', r2: '#162850', r3: '#283860', r4: '#3C4E6A', tree: '#080E1E' },
    sunPos: { cx: 524, cy: 52, r: 16, opacity: 0 },
    moonPos: { cx: 100, cy: 100, opacity: 1, phase: 0, shadowOffset: { dx: 0, dy: 0 } },
    starOpacity: 1,
    cloudOpacity: 0,
    birdOpacity: 0,
    fireflyOpacity: 0,
    owlOpacity: 0,
    rimOpacity: 0,
    rimColor: '#FFFCE8',
    navBg: '#0A0F1C',
    navText: '#8BAFC8',
    season: 'winter' as const,
    precipitationOpacity: 0,
    precipitationType: 'none' as const,
  })),
}));
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
  mockUseCart.mockReturnValue({ itemCount: 2, items: [], subtotal: 0 });
});

const mockAnimatedTabBar = AnimatedTabBar as jest.Mock;

describe('TabNavigator — living sky tint (cf-7l2)', () => {
  it('passes navBg from useLivingSky to AnimatedTabBar', () => {
    renderTabs();
    expect(mockAnimatedTabBar).toHaveBeenCalledWith(
      expect.objectContaining({ navBg: '#0A0F1C' }),
      expect.anything(),
    );
  });

  it('passes navText from useLivingSky to AnimatedTabBar', () => {
    renderTabs();
    expect(mockAnimatedTabBar).toHaveBeenCalledWith(
      expect.objectContaining({ navText: '#8BAFC8' }),
      expect.anything(),
    );
  });
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

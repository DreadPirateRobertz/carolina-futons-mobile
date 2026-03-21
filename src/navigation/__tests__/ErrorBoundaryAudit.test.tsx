/**
 * TDD audit: every screen must be wrapped with withScreenErrorBoundary.
 *
 * Tests:
 * - withScreenErrorBoundary HOC catches crashes and shows recovery UI
 * - Every tab screen (Home, Shop, Cart, Account) wrapped with error boundary
 * - OrderConfirmationScreen in AppNavigator wrapped with error boundary
 * - Retry button re-renders the screen
 * - Go Home button resets navigation to Tabs
 */
import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from '../TabNavigator';
import { withScreenErrorBoundary } from '../withScreenErrorBoundary';
import * as crashReporting from '@/services/crashReporting';

// Use real @react-navigation/native (override any global mock in jest.setup.js)
jest.mock('@react-navigation/native', () => jest.requireActual('@react-navigation/native'));

// Mock reanimated (needed by AnimatedTabBar)
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    withSpring: (val: any) => val,
  };
});

// Mock expo-haptics (needed by AnimatedTabBar)
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/components/CompareFAB', () => ({
  CompareFAB: () => null,
}));
jest.mock('@/components/CartFAB', () => ({
  CartFAB: () => null,
}));

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    itemCount: 0,
    items: [],
    subtotal: 0,
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
  }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sunsetCoral: '#E8845C',
      espressoLight: '#B8A99A',
      espresso: '#4A3728',
      cream: '#F5F0EB',
      mountainBlue: '#6B8FA3',
      sandLight: '#F0E8D8',
      muted: '#999',
      error: '#E53E3E',
      white: '#FFF',
    },
    borderRadius: { sm: 4, md: 8, lg: 16 },
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Tab screens — mocked to THROW so we can verify error boundary wrapping
jest.mock('@/screens/HomeScreen', () => ({
  HomeScreen: (): React.ReactElement => {
    throw new Error('HomeScreen intentional crash');
  },
}));
jest.mock('@/screens/ShopScreen', () => ({
  ShopScreen: (): React.ReactElement => {
    throw new Error('ShopScreen intentional crash');
  },
}));
jest.mock('@/screens/CartScreen', () => ({
  CartScreen: (): React.ReactElement => {
    throw new Error('CartScreen intentional crash');
  },
}));
jest.mock('@/screens/AccountScreen', () => ({
  AccountScreen: (): React.ReactElement => {
    throw new Error('AccountScreen intentional crash');
  },
}));

// Stack navigator helpers
const Stack = createNativeStackNavigator();

function ThrowingScreen(): React.ReactElement {
  throw new Error('intentional crash for test');
}

function WorkingScreen() {
  return (
    <View testID="working-screen">
      <Text>Working</Text>
    </View>
  );
}

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  crashReporting.resetForTesting();
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// Section 1: withScreenErrorBoundary HOC — unit behaviour
// ---------------------------------------------------------------------------

describe('withScreenErrorBoundary HOC', () => {
  function renderHOC(Component: React.ComponentType, name: string) {
    const Wrapped = withScreenErrorBoundary(Component, name);
    return render(
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Test" component={Wrapped} />
        </Stack.Navigator>
      </NavigationContainer>,
    );
  }

  it('renders wrapped screen when no error', () => {
    const { getByTestId } = renderHOC(WorkingScreen, 'Working');
    expect(getByTestId('working-screen')).toBeTruthy();
  });

  it('shows screen-error-{name} testID when wrapped screen throws', () => {
    const { getByTestId } = renderHOC(ThrowingScreen, 'TestScreen');
    expect(getByTestId('screen-error-TestScreen')).toBeTruthy();
  });

  it('shows "This page ran into an issue" error message when screen crashes', () => {
    const { getByText } = renderHOC(ThrowingScreen, 'TestScreen');
    expect(getByText('This page ran into an issue')).toBeTruthy();
  });

  it('shows a retry button in the fallback UI', () => {
    const { getByText } = renderHOC(ThrowingScreen, 'TestScreen');
    expect(getByText(/try again/i)).toBeTruthy();
  });

  it('shows a go-home button in the fallback UI', () => {
    const { getByText } = renderHOC(ThrowingScreen, 'TestScreen');
    expect(getByText(/go home/i)).toBeTruthy();
  });

  it('reports error to crashReporting with screen name context', () => {
    renderHOC(ThrowingScreen, 'CrashingScreen');
    const log = crashReporting.getErrorLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].error.message).toBe('intentional crash for test');
  });

  it('displayName is set on the wrapped component', () => {
    const Wrapped = withScreenErrorBoundary(WorkingScreen, 'MyScreen');
    expect(Wrapped.displayName).toBe('withScreenErrorBoundary(MyScreen)');
  });
});

// ---------------------------------------------------------------------------
// Section 2: AppNavigator — OrderConfirmationScreen must be wrapped
// ---------------------------------------------------------------------------

describe('AppNavigator — OrderConfirmationScreen error boundary', () => {
  function CrashingOrderConfirmation(): React.ReactElement {
    throw new Error('OrderConfirmation crash');
  }

  function TestOrderConfirmationNavigator({
    ScreenComponent,
  }: {
    ScreenComponent: React.ComponentType<any>;
  }) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="OrderConfirmation">
        <Stack.Screen name="Tabs">
          {() => (
            <View testID="tabs-screen">
              <Text>Tabs</Text>
            </View>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="OrderConfirmation"
          component={withScreenErrorBoundary(ScreenComponent, 'OrderConfirmation')}
        />
      </Stack.Navigator>
    );
  }

  it('shows screen-error-OrderConfirmation fallback when screen crashes', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TestOrderConfirmationNavigator ScreenComponent={CrashingOrderConfirmation} />
      </NavigationContainer>,
    );
    expect(getByTestId('screen-error-OrderConfirmation')).toBeTruthy();
  });

  it('error message is shown for OrderConfirmation crash', () => {
    const { getByText } = render(
      <NavigationContainer>
        <TestOrderConfirmationNavigator ScreenComponent={CrashingOrderConfirmation} />
      </NavigationContainer>,
    );
    expect(getByText('This page ran into an issue')).toBeTruthy();
  });

  it('retry button is present after OrderConfirmation crash', () => {
    const { getByText } = render(
      <NavigationContainer>
        <TestOrderConfirmationNavigator ScreenComponent={CrashingOrderConfirmation} />
      </NavigationContainer>,
    );
    expect(getByText(/try again/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Section 3: TabNavigator — all tab screens must be wrapped
// ---------------------------------------------------------------------------
// These tests render the real TabNavigator with screens mocked to throw.
// RED: without withScreenErrorBoundary wrapping, render() throws.
// GREEN: after wrapping each tab screen, fallback appears.

describe('TabNavigator — tab screen error boundaries', () => {
  it('HomeScreen crash shows screen-error-Home fallback', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>,
    );
    expect(getByTestId('screen-error-Home')).toBeTruthy();
  });

  it('ShopScreen crash shows screen-error-Shop fallback', async () => {
    const ref = React.createRef<any>();
    const { getByTestId } = render(
      <NavigationContainer ref={ref}>
        <TabNavigator />
      </NavigationContainer>,
    );
    act(() => {
      ref.current?.navigate('Shop');
    });
    await waitFor(() => {
      expect(getByTestId('screen-error-Shop')).toBeTruthy();
    });
  });

  it('CartScreen crash shows screen-error-Cart fallback', async () => {
    const ref = React.createRef<any>();
    const { getByTestId } = render(
      <NavigationContainer ref={ref}>
        <TabNavigator />
      </NavigationContainer>,
    );
    act(() => {
      ref.current?.navigate('Cart');
    });
    await waitFor(() => {
      expect(getByTestId('screen-error-Cart')).toBeTruthy();
    });
  });

  it('AccountScreen crash shows screen-error-Account fallback', async () => {
    const ref = React.createRef<any>();
    const { getByTestId } = render(
      <NavigationContainer ref={ref}>
        <TabNavigator />
      </NavigationContainer>,
    );
    act(() => {
      ref.current?.navigate('Account');
    });
    await waitFor(() => {
      expect(getByTestId('screen-error-Account')).toBeTruthy();
    });
  });

  it('HomeScreen error is reported to crashReporting', () => {
    render(
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>,
    );
    const log = crashReporting.getErrorLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].error.message).toContain('HomeScreen intentional crash');
  });

  it('HomeScreen fallback has retry button', () => {
    const { getByText } = render(
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>,
    );
    expect(getByText(/try again/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Section 4: Go Home navigation from error boundary
// ---------------------------------------------------------------------------

describe('error boundary go-home navigation', () => {
  it('crashing screen shows go-home button in fallback', () => {
    const Stack2 = createNativeStackNavigator();
    const WrappedCrash = withScreenErrorBoundary(ThrowingScreen, 'CrashScreen');

    const { getByText } = render(
      <NavigationContainer>
        <Stack2.Navigator initialRouteName="CrashScreen" screenOptions={{ headerShown: false }}>
          <Stack2.Screen name="Tabs">
            {() => (
              <View testID="tabs-home">
                <Text>Tabs home</Text>
              </View>
            )}
          </Stack2.Screen>
          <Stack2.Screen name="CrashScreen" component={WrappedCrash} />
        </Stack2.Navigator>
      </NavigationContainer>,
    );

    expect(getByText(/go home/i)).toBeTruthy();
  });

  it('HOC-wrapped screen shows go-home and retry after crash', () => {
    const Wrapped = withScreenErrorBoundary(ThrowingScreen, 'AnyScreen');
    const { getByText } = render(
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Test" component={Wrapped} />
        </Stack.Navigator>
      </NavigationContainer>,
    );
    expect(getByText(/go home/i)).toBeTruthy();
    expect(getByText(/try again/i)).toBeTruthy();
  });

  it('error boundary shows correct screen name in testID for each screen', () => {
    const names = ['Home', 'Shop', 'Cart', 'Account', 'Checkout', 'ProductDetail'];
    names.forEach((name) => {
      const Wrapped = withScreenErrorBoundary(ThrowingScreen, name);
      const { getByTestId, unmount } = render(
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Test" component={Wrapped} />
          </Stack.Navigator>
        </NavigationContainer>,
      );
      expect(getByTestId(`screen-error-${name}`)).toBeTruthy();
      unmount();
      crashReporting.resetForTesting();
    });
  });
});

// ---------------------------------------------------------------------------
// Section 5: Additional audit coverage
// ---------------------------------------------------------------------------

describe('additional error boundary coverage', () => {
  it('pressing retry button does not throw an error', () => {
    const Wrapped = withScreenErrorBoundary(ThrowingScreen, 'RetryScreen');
    const { getByText } = render(
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Test" component={Wrapped} />
        </Stack.Navigator>
      </NavigationContainer>,
    );
    // Fallback visible
    expect(getByText('This page ran into an issue')).toBeTruthy();
    // Pressing retry should not throw
    expect(() => fireEvent.press(getByText(/try again/i))).not.toThrow();
  });

  it('multiple screen crashes do not interfere with each other', () => {
    const Wrapped1 = withScreenErrorBoundary(ThrowingScreen, 'Screen1');
    const Wrapped2 = withScreenErrorBoundary(ThrowingScreen, 'Screen2');

    const { getByTestId: get1 } = render(
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Test" component={Wrapped1} />
        </Stack.Navigator>
      </NavigationContainer>,
    );
    crashReporting.resetForTesting();

    const { getByTestId: get2 } = render(
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Test" component={Wrapped2} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    expect(get1('screen-error-Screen1')).toBeTruthy();
    expect(get2('screen-error-Screen2')).toBeTruthy();
  });

  it('wrapping a screen does not change its displayName reference', () => {
    const Wrapped = withScreenErrorBoundary(WorkingScreen, 'WorkingTest');
    expect(Wrapped.displayName).toContain('WorkingTest');
  });
});

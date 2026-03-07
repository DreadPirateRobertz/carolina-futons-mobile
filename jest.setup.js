// Jest setup for React Native Testing Library
// Built-in matchers from @testing-library/react-native v12.4+
// No need for deprecated @testing-library/jest-native

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const SafeAreaContext = React.createContext({ insets: inset, frame });
  return {
    SafeAreaContext,
    SafeAreaProvider: ({ children }) =>
      React.createElement(SafeAreaContext.Provider, { value: { insets: inset, frame } }, children),
    SafeAreaView: ({ children }) => children,
    SafeAreaInsetsContext: SafeAreaContext,
    SafeAreaFrameContext: SafeAreaContext,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets: inset, frame },
  };
});

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  cacheDirectory: '/mock-cache/',
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('{}')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(() =>
      Promise.resolve({ uri: '/mock-cache/models3d/model.glb', status: 200 })
    ),
  })),
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const mockComponent = (name) => {
    const component = ({ children, ...props }) =>
      React.createElement(name, props, children);
    component.displayName = name;
    return component;
  };
  const namedExports = [
    'Circle', 'Ellipse', 'G', 'Text', 'TSpan', 'TextPath', 'Path',
    'Polygon', 'Polyline', 'Line', 'Rect', 'Use', 'Image', 'Symbol',
    'Defs', 'LinearGradient', 'RadialGradient', 'Stop', 'ClipPath', 'Pattern',
    'Mask',
  ];
  const mock = { __esModule: true, default: mockComponent('Svg') };
  namedExports.forEach((el) => { mock[el] = mockComponent(el); });
  return mock;
});

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-purchases (RevenueCat)
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getOfferings: jest.fn(() => Promise.resolve({ current: null })),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(() =>
      Promise.resolve({ entitlements: { active: {} } }),
    ),
    setLogLevel: jest.fn(),
    LOG_LEVEL: { DEBUG: 'DEBUG' },
  },
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

// Mock shared transition tags — reanimated's native shared transition layer
// (registerEventHandler, ProgressTransitionRegister) is not available in Jest.
// Return undefined so the sharedTransitionTag prop is omitted in tests.
jest.mock('./src/utils/sharedTransitionTag', () => ({
  sharedTransitionTag: () => undefined,
}));

// Mock @react-navigation/native for components that use useNavigation
// outside of a NavigationContainer (e.g. ShopScreen in unit tests)
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
  };
});

// Silence the warning about animated values
// NativeAnimatedHelper path changed in RN 0.76+ new architecture
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch {
  // Module path does not exist in this RN version — safe to ignore
}

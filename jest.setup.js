// Jest setup for React Native Testing Library
// Built-in matchers from @testing-library/react-native v12.4+
// No need for deprecated @testing-library/jest-native

// Mock expo-video — uses __mocks__/expo-video.js (manual mock file)
jest.mock('expo-video');

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
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('{}')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(() =>
      Promise.resolve({ uri: '/mock-cache/models3d/model.glb', status: 200 }),
    ),
  })),
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const mockComponent = (name) => {
    const component = ({ children, ...props }) => React.createElement(name, props, children);
    component.displayName = name;
    return component;
  };
  const namedExports = [
    'Circle',
    'Ellipse',
    'G',
    'Text',
    'TSpan',
    'TextPath',
    'Path',
    'Polygon',
    'Polyline',
    'Line',
    'Rect',
    'Use',
    'Image',
    'Symbol',
    'Defs',
    'LinearGradient',
    'RadialGradient',
    'Stop',
    'ClipPath',
    'Pattern',
    'Mask',
  ];
  const mock = { __esModule: true, default: mockComponent('Svg') };
  namedExports.forEach((el) => {
    mock[el] = mockComponent(el);
  });
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
    getCustomerInfo: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
    setLogLevel: jest.fn(),
    LOG_LEVEL: { DEBUG: 'DEBUG' },
  },
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

// Mock react-native-worklets (v4) — native module not available in Jest
jest.mock('react-native-worklets', () => ({
  NativeWorklets: {},
  WorkletsModule: { isAvailable: false },
  createSerializable: (fn) => fn,
}));

// Mock react-native-reanimated (v4) — depends on worklets
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: { View, Text: View, Image: View, ScrollView: View, FlatList: View, createAnimatedComponent: (comp) => comp, call: () => {} },
    useSharedValue: (init) => ({ value: init }),
    useAnimatedStyle: (fn) => fn(),
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedScrollHandler: () => ({}),
    useAnimatedRef: () => ({ current: null }),
    useEvent: () => () => {},
    withTiming: (v) => v,
    withSpring: (v) => v,
    withDelay: (_, v) => v,
    withSequence: (...args) => args[args.length - 1],
    withRepeat: (v) => v,
    Easing: {
      linear: (v) => v,
      ease: (v) => v,
      bezier: () => (v) => v,
      in: (easing) => easing || ((v) => v),
      out: (easing) => easing || ((v) => v),
      inOut: (easing) => easing || ((v) => v),
      circle: (v) => v,
      back: () => (v) => v,
      elastic: () => (v) => v,
      bounce: (v) => v,
      poly: () => (v) => v,
      sin: (v) => v,
      exp: (v) => v,
      quad: (v) => v,
      cubic: (v) => v,
    },
    FadeIn: { duration: () => ({ delay: () => ({}) }), delay: () => ({ duration: () => ({}) }) },
    FadeOut: { duration: () => ({ delay: () => ({}) }), delay: () => ({ duration: () => ({}) }) },
    FadeInDown: { duration: () => ({ delay: () => ({}) }), delay: () => ({ duration: () => ({}) }) },
    FadeInUp: { duration: () => ({ delay: () => ({}) }), delay: () => ({ duration: () => ({}) }) },
    SlideInRight: { duration: () => ({ delay: () => ({}) }), delay: () => ({ duration: () => ({}) }) },
    SlideOutRight: { duration: () => ({ delay: () => ({}) }), delay: () => ({ duration: () => ({}) }) },
    SlideInUp: { duration: () => ({ delay: () => ({}) }), delay: () => ({ duration: () => ({}) }) },
    SlideOutUp: { duration: () => ({ delay: () => ({}) }), delay: () => ({ duration: () => ({}) }) },
    SlideInDown: { duration: () => ({ delay: () => ({}) }), delay: () => ({ duration: () => ({}) }) },
    SlideOutDown: { duration: () => ({ delay: () => ({}) }), delay: () => ({ duration: () => ({}) }) },
    Layout: { duration: () => ({ delay: () => ({}) }), delay: () => ({ duration: () => ({}) }) },
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    createAnimatedComponent: (comp) => comp,
    interpolate: (v) => v,
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend' },
  };
});

// Mock shared transition tags — reanimated's native shared transition layer
// (registerEventHandler, ProgressTransitionRegister) is not available in Jest.
// Return undefined so the sharedTransitionTag prop is omitted in tests.
jest.mock('./src/utils/sharedTransitionTag', () => ({
  sharedTransitionTag: () => undefined,
}));

// Mock @react-navigation/native for components that use useNavigation
// outside of a NavigationContainer (e.g. ShopScreen in unit tests).
// Also mock useNavigationState so MiniCartDrawerHost (rendered inside App)
// does not subscribe to real navigation state and hang async tests.
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
    useNavigationState: (selector) => {
      const state = { routes: [{ name: 'Home', key: 'Home-mock' }], index: 0 };
      return selector(state);
    },
  };
});

// Mock expo-auth-session Google provider
jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: jest.fn(() => [null, null, jest.fn()]),
}));

// Mock expo-web-browser maybeCompleteAuthSession (called at module level in useAuth)
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

// Mock expo-crypto (required by expo-auth-session)
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytes: jest.fn(() => new Uint8Array(32)),
}));

// Mock expo-store-review (used by useRatingPrompt)
jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  requestReview: jest.fn(() => Promise.resolve()),
}));

// Silence the warning about animated values
// NativeAnimatedHelper path changed in RN 0.76+ new architecture
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch {
  // Module path does not exist in this RN version — safe to ignore
}

// Global mock for useGamificationEvents — prevents AuthProvider/WixClient dependency chain
// from propagating into every test that uses CartProvider or WishlistProvider.
// Tests that specifically verify gamification call-site behavior supply their own spies.
jest.mock('@/hooks/useGamificationEvents', () => ({
  useGamificationEvents: () => ({
    addToCart: jest.fn().mockResolvedValue({ success: true }),
    submitReview: jest.fn().mockResolvedValue({ success: true }),
    referralShared: jest.fn().mockResolvedValue({ success: true }),
    arUsed: jest.fn().mockResolvedValue({ success: true }),
    wishlistAdd: jest.fn().mockResolvedValue({ success: true }),
    orderPlaced: jest.fn().mockResolvedValue({ success: true }),
  }),
}));

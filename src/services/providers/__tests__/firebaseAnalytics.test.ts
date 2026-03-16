const mockLogEvent = jest.fn().mockResolvedValue(undefined);
const mockLogScreenView = jest.fn().mockResolvedValue(undefined);
const mockSetUserId = jest.fn().mockResolvedValue(undefined);
const mockSetUserProperties = jest.fn().mockResolvedValue(undefined);
const mockResetAnalyticsData = jest.fn().mockResolvedValue(undefined);
const mockSetAnalyticsCollectionEnabled = jest.fn().mockResolvedValue(undefined);

jest.mock(
  '@react-native-firebase/analytics',
  () => ({
    __esModule: true,
    default: () => ({
      logEvent: mockLogEvent,
      logScreenView: mockLogScreenView,
      setUserId: mockSetUserId,
      setUserProperties: mockSetUserProperties,
      resetAnalyticsData: mockResetAnalyticsData,
      setAnalyticsCollectionEnabled: mockSetAnalyticsCollectionEnabled,
    }),
  }),
  { virtual: true },
);

// Import after mock setup so require('@react-native-firebase/analytics') resolves
const { FirebaseAnalyticsProvider } =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../firebaseAnalytics') as typeof import('../firebaseAnalytics');

describe('FirebaseAnalyticsProvider', () => {
  let provider: InstanceType<typeof FirebaseAnalyticsProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new FirebaseAnalyticsProvider();
  });

  it('tracks events via Firebase logEvent', () => {
    provider.trackEvent('add_to_cart', { product_id: 'abc' });
    expect(mockLogEvent).toHaveBeenCalledWith('add_to_cart', { product_id: 'abc' });
  });

  it('tracks screen views via logScreenView', () => {
    provider.trackScreenView('ProductDetail', { product_id: 'abc' });
    expect(mockLogScreenView).toHaveBeenCalledWith({
      screen_name: 'ProductDetail',
      screen_class: 'ProductDetail',
      product_id: 'abc',
    });
  });

  it('identifies user via setUserId and setUserProperties', () => {
    provider.identify('user-123', { email: 'test@example.com', name: 'Test' });
    expect(mockSetUserId).toHaveBeenCalledWith('user-123');
    expect(mockSetUserProperties).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: 'Test',
    });
  });

  it('resets user data', () => {
    provider.reset();
    expect(mockSetUserId).toHaveBeenCalledWith(null);
    expect(mockResetAnalyticsData).toHaveBeenCalled();
  });

  it('does not track when disabled', () => {
    provider.setEnabled(false);
    provider.trackEvent('add_to_cart');
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  it('resumes tracking when re-enabled', () => {
    provider.setEnabled(false);
    provider.setEnabled(true);
    provider.trackEvent('search', { query: 'futon' });
    expect(mockLogEvent).toHaveBeenCalledWith('search', { query: 'futon' });
  });

  it('calls setAnalyticsCollectionEnabled on setEnabled', () => {
    provider.setEnabled(false);
    expect(mockSetAnalyticsCollectionEnabled).toHaveBeenCalledWith(false);
  });

  it('calls setAnalyticsCollectionEnabled(true) when re-enabled', () => {
    provider.setEnabled(true);
    expect(mockSetAnalyticsCollectionEnabled).toHaveBeenCalledWith(true);
  });

  // --- trackEvent edge cases ---

  it('passes empty object when trackEvent called without properties', () => {
    provider.trackEvent('search');
    expect(mockLogEvent).toHaveBeenCalledWith('search', {});
  });

  it('does not track screen views when disabled', () => {
    provider.setEnabled(false);
    provider.trackScreenView('Home');
    expect(mockLogScreenView).not.toHaveBeenCalled();
  });

  it('tracks screen views without extra properties', () => {
    provider.trackScreenView('Home');
    expect(mockLogScreenView).toHaveBeenCalledWith({
      screen_name: 'Home',
      screen_class: 'Home',
    });
  });

  // --- identify edge cases ---

  it('does not identify when disabled', () => {
    provider.setEnabled(false);
    provider.identify('user-1');
    expect(mockSetUserId).not.toHaveBeenCalled();
  });

  it('sets userId without calling setUserProperties when no properties given', () => {
    provider.identify('user-456');
    expect(mockSetUserId).toHaveBeenCalledWith('user-456');
    expect(mockSetUserProperties).not.toHaveBeenCalled();
  });

  it('converts numeric property values to strings in identify', () => {
    provider.identify('user-789', { totalOrders: 5 });
    expect(mockSetUserProperties).toHaveBeenCalledWith({ totalOrders: '5' });
  });

  it('converts boolean property values to strings in identify', () => {
    provider.identify('user-bool', { isPremium: true } as Record<string, unknown> as import('../../analytics').UserProperties);
    expect(mockSetUserProperties).toHaveBeenCalledWith({ isPremium: 'true' });
  });

  it('converts undefined property values to null in identify', () => {
    provider.identify('user-undef', { email: undefined });
    expect(mockSetUserProperties).toHaveBeenCalledWith({ email: null });
  });

  it('passes null for null property values in identify', () => {
    provider.identify('user-null', { name: null } as unknown as import('../../analytics').UserProperties);
    expect(mockSetUserProperties).toHaveBeenCalledWith({ name: null });
  });

  // --- Promise rejection handling ---

  it('swallows logEvent rejection without throwing', async () => {
    mockLogEvent.mockRejectedValueOnce(new Error('Firebase error'));
    expect(() => provider.trackEvent('add_to_cart', { id: '1' })).not.toThrow();
    // Let the microtask queue flush to ensure .catch handles it
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('swallows logScreenView rejection without throwing', async () => {
    mockLogScreenView.mockRejectedValueOnce(new Error('Firebase error'));
    expect(() => provider.trackScreenView('Home')).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('swallows setUserId rejection without throwing', async () => {
    mockSetUserId.mockRejectedValueOnce(new Error('Firebase error'));
    expect(() => provider.identify('user-err')).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('swallows setUserProperties rejection without throwing', async () => {
    mockSetUserProperties.mockRejectedValueOnce(new Error('Firebase error'));
    expect(() => provider.identify('user-err', { email: 'a@b.com' })).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('swallows resetAnalyticsData rejection without throwing', async () => {
    mockResetAnalyticsData.mockRejectedValueOnce(new Error('Firebase error'));
    expect(() => provider.reset()).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('swallows setUserId rejection on reset without throwing', async () => {
    mockSetUserId.mockRejectedValueOnce(new Error('Firebase error'));
    expect(() => provider.reset()).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('swallows setAnalyticsCollectionEnabled rejection without throwing', async () => {
    mockSetAnalyticsCollectionEnabled.mockRejectedValueOnce(new Error('Firebase error'));
    expect(() => provider.setEnabled(false)).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));
  });
});

/**
 * Separate describe block that loads the module WITHOUT the Firebase mock,
 * exercising the catch branch at module level (firebaseAnalytics = null).
 */
describe('FirebaseAnalyticsProvider — native module unavailable', () => {
  let ProviderNoFirebase: typeof import('../firebaseAnalytics').FirebaseAnalyticsProvider;

  beforeAll(() => {
    // Isolate a fresh module registry where @react-native-firebase/analytics throws
    jest.resetModules();
    jest.mock(
      '@react-native-firebase/analytics',
      () => {
        throw new Error('Native module not available');
      },
      { virtual: true },
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ProviderNoFirebase = (require('../firebaseAnalytics') as typeof import('../firebaseAnalytics'))
      .FirebaseAnalyticsProvider;
  });

  afterAll(() => {
    jest.resetModules();
  });

  it('trackEvent no-ops without throwing when firebase is null', () => {
    const provider = new ProviderNoFirebase();
    expect(() => provider.trackEvent('add_to_cart', { id: '1' })).not.toThrow();
  });

  it('trackScreenView no-ops without throwing when firebase is null', () => {
    const provider = new ProviderNoFirebase();
    expect(() => provider.trackScreenView('Home')).not.toThrow();
  });

  it('identify no-ops without throwing when firebase is null', () => {
    const provider = new ProviderNoFirebase();
    expect(() => provider.identify('user-1', { email: 'a@b.com' })).not.toThrow();
  });

  it('reset no-ops without throwing when firebase is null', () => {
    const provider = new ProviderNoFirebase();
    expect(() => provider.reset()).not.toThrow();
  });

  it('setEnabled no-ops without throwing when firebase is null', () => {
    const provider = new ProviderNoFirebase();
    expect(() => provider.setEnabled(false)).not.toThrow();
  });

  it('setEnabled still updates internal enabled flag when firebase is null', () => {
    const provider = new ProviderNoFirebase();
    provider.setEnabled(false);
    // After re-enabling, trackEvent still no-ops (firebase is null) but should not throw
    provider.setEnabled(true);
    expect(() => provider.trackEvent('search')).not.toThrow();
  });
});

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
});

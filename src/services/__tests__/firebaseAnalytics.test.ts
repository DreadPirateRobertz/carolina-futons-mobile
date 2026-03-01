import { createFirebaseProvider } from '../providers/firebaseAnalytics';

// Mock @react-native-firebase/analytics
const mockLogEvent = jest.fn();
const mockLogScreenView = jest.fn();
const mockSetUserId = jest.fn();
const mockSetUserProperty = jest.fn();
const mockSetAnalyticsCollectionEnabled = jest.fn();

jest.mock('@react-native-firebase/analytics', () => {
  return {
    __esModule: true,
    default: () => ({
      logEvent: mockLogEvent,
      logScreenView: mockLogScreenView,
      setUserId: mockSetUserId,
      setUserProperty: mockSetUserProperty,
      setAnalyticsCollectionEnabled: mockSetAnalyticsCollectionEnabled,
    }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('firebaseAnalytics provider', () => {
  it('tracks events via Firebase logEvent', () => {
    const provider = createFirebaseProvider();
    provider.trackEvent('add_to_cart', { product_id: 'abc', price: 349 });
    expect(mockLogEvent).toHaveBeenCalledWith('add_to_cart', { product_id: 'abc', price: 349 });
  });

  it('tracks screen views via Firebase logScreenView', () => {
    const provider = createFirebaseProvider();
    provider.trackScreenView('ProductDetail', { product_id: 'abc' });
    expect(mockLogScreenView).toHaveBeenCalledWith({
      screen_name: 'ProductDetail',
      screen_class: 'ProductDetail',
      product_id: 'abc',
    });
  });

  it('identifies user via setUserId and setUserProperty', () => {
    const provider = createFirebaseProvider();
    provider.identify('user-123', { email: 'test@test.com', name: 'Test' });
    expect(mockSetUserId).toHaveBeenCalledWith('user-123');
    expect(mockSetUserProperty).toHaveBeenCalledWith('email', 'test@test.com');
    expect(mockSetUserProperty).toHaveBeenCalledWith('name', 'Test');
  });

  it('resets user via setUserId(null)', () => {
    const provider = createFirebaseProvider();
    provider.reset();
    expect(mockSetUserId).toHaveBeenCalledWith(null);
  });

  it('sets analytics collection enabled', () => {
    const provider = createFirebaseProvider();
    provider.setEnabled(false);
    expect(mockSetAnalyticsCollectionEnabled).toHaveBeenCalledWith(false);
  });

  it('does not track events when disabled', () => {
    const provider = createFirebaseProvider();
    provider.setEnabled(false);
    provider.trackEvent('search', { query: 'futon' });
    expect(mockLogEvent).not.toHaveBeenCalled();
  });
});

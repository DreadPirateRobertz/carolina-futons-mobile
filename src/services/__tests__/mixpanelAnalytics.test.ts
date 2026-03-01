import { createMixpanelProvider, flushMixpanel } from '../providers/mixpanelAnalytics';

// Mock mixpanel-react-native
const mockTrack = jest.fn();
const mockIdentify = jest.fn();
const mockReset = jest.fn();
const mockFlush = jest.fn();
const mockInit = jest.fn(() => Promise.resolve());
const mockOptOut = jest.fn();
const mockOptIn = jest.fn();
const mockPeopleSet = jest.fn();

jest.mock('mixpanel-react-native', () => ({
  Mixpanel: jest.fn().mockImplementation(() => ({
    init: mockInit,
    track: mockTrack,
    identify: mockIdentify,
    reset: mockReset,
    flush: mockFlush,
    optOutTracking: mockOptOut,
    optInTracking: mockOptIn,
    getPeople: () => ({ set: mockPeopleSet }),
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('mixpanelAnalytics provider', () => {
  it('tracks events via Mixpanel track', () => {
    const provider = createMixpanelProvider({ token: 'test-token' });
    provider.trackEvent('add_to_cart', { product_id: 'abc' });
    expect(mockTrack).toHaveBeenCalledWith('add_to_cart', { product_id: 'abc' });
  });

  it('tracks screen views as screen_view events', () => {
    const provider = createMixpanelProvider({ token: 'test-token' });
    provider.trackScreenView('Home', { tab: 'featured' });
    expect(mockTrack).toHaveBeenCalledWith('screen_view', {
      screen_name: 'Home',
      tab: 'featured',
    });
  });

  it('identifies user and sets people properties', () => {
    const provider = createMixpanelProvider({ token: 'test-token' });
    provider.identify('user-123', { email: 'test@test.com', totalOrders: 5 });
    expect(mockIdentify).toHaveBeenCalledWith('user-123');
    expect(mockPeopleSet).toHaveBeenCalledWith({ email: 'test@test.com', totalOrders: 5 });
  });

  it('resets Mixpanel state', () => {
    const provider = createMixpanelProvider({ token: 'test-token' });
    provider.reset();
    expect(mockReset).toHaveBeenCalled();
  });

  it('opts out of tracking when disabled', () => {
    const provider = createMixpanelProvider({ token: 'test-token' });
    provider.setEnabled(false);
    expect(mockOptOut).toHaveBeenCalled();
  });

  it('opts in to tracking when enabled', () => {
    const provider = createMixpanelProvider({ token: 'test-token' });
    provider.setEnabled(true);
    expect(mockOptIn).toHaveBeenCalled();
  });

  it('does not track when disabled', () => {
    const provider = createMixpanelProvider({ token: 'test-token' });
    provider.setEnabled(false);
    provider.trackEvent('search', { query: 'futon' });
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('flushMixpanel calls flush', () => {
    // Create provider to initialize instance
    createMixpanelProvider({ token: 'test-token' });
    flushMixpanel();
    expect(mockFlush).toHaveBeenCalled();
  });
});

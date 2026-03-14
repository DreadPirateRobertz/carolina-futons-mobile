export {}; // Ensure this file is treated as a module

const mockTrack = jest.fn();
const mockIdentify = jest.fn();
const mockReset = jest.fn();
const mockOptIn = jest.fn();
const mockOptOut = jest.fn();
const mockInit = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn();
const mockGetPeople = jest.fn(() => ({ set: mockSet }));

jest.mock(
  'mixpanel-react-native',
  () => ({
    Mixpanel: jest.fn().mockImplementation(() => ({
      init: mockInit,
      track: mockTrack,
      identify: mockIdentify,
      reset: mockReset,
      optInTracking: mockOptIn,
      optOutTracking: mockOptOut,
      getPeople: mockGetPeople,
    })),
  }),
  { virtual: true },
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MixpanelAnalyticsProvider, initMixpanel } =
  require('../mixpanelAnalytics') as typeof import('../mixpanelAnalytics');

describe('MixpanelAnalyticsProvider', () => {
  let provider: InstanceType<typeof MixpanelAnalyticsProvider>;

  beforeEach(async () => {
    jest.clearAllMocks();
    await initMixpanel('test-token');
    provider = new MixpanelAnalyticsProvider();
  });

  it('tracks events via Mixpanel track', () => {
    provider.trackEvent('add_to_cart', { product_id: 'abc' });
    expect(mockTrack).toHaveBeenCalledWith('add_to_cart', { product_id: 'abc' });
  });

  it('tracks screen views as screen_view events', () => {
    provider.trackScreenView('Home', { tab: 'shop' });
    expect(mockTrack).toHaveBeenCalledWith('screen_view', {
      screen_name: 'Home',
      tab: 'shop',
    });
  });

  it('identifies users and sets people properties', () => {
    provider.identify('user-456', { email: 'test@example.com' });
    expect(mockIdentify).toHaveBeenCalledWith('user-456');
    expect(mockGetPeople).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({ email: 'test@example.com' });
  });

  it('resets Mixpanel state', () => {
    provider.reset();
    expect(mockReset).toHaveBeenCalled();
  });

  it('does not track when disabled', () => {
    provider.setEnabled(false);
    provider.trackEvent('search');
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('opts out/in on setEnabled', () => {
    provider.setEnabled(false);
    expect(mockOptOut).toHaveBeenCalled();
    provider.setEnabled(true);
    expect(mockOptIn).toHaveBeenCalled();
  });
});

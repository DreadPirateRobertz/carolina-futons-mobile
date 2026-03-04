jest.mock('../providers/firebaseAnalytics', () => ({
  FirebaseAnalyticsProvider: jest.fn().mockImplementation(() => ({
    trackEvent: jest.fn(),
    trackScreenView: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    setEnabled: jest.fn(),
  })),
}));

jest.mock('../providers/mixpanelAnalytics', () => ({
  initMixpanel: jest.fn().mockResolvedValue(undefined),
  MixpanelAnalyticsProvider: jest.fn().mockImplementation(() => ({
    trackEvent: jest.fn(),
    trackScreenView: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    setEnabled: jest.fn(),
  })),
}));

jest.mock('../providers/multiProvider', () => ({
  MultiProvider: jest.fn().mockImplementation((providers: unknown[]) => ({
    _providers: providers,
    trackEvent: jest.fn(),
    trackScreenView: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    setEnabled: jest.fn(),
  })),
}));

jest.mock('../analytics', () => ({
  registerProvider: jest.fn(),
}));

import { initAnalytics, resetAnalyticsInit } from '../analyticsInit';
import { registerProvider } from '../analytics';
import { FirebaseAnalyticsProvider } from '../providers/firebaseAnalytics';
import { MixpanelAnalyticsProvider, initMixpanel } from '../providers/mixpanelAnalytics';
import { MultiProvider } from '../providers/multiProvider';

describe('initAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAnalyticsInit();
  });

  it('registers a MultiProvider with Firebase when no Mixpanel token', async () => {
    await initAnalytics({ enableFirebase: true, enableMixpanel: true });
    expect(FirebaseAnalyticsProvider).toHaveBeenCalled();
    expect(initMixpanel).not.toHaveBeenCalled();
    expect(MultiProvider).toHaveBeenCalledWith([expect.any(Object)]);
    expect(registerProvider).toHaveBeenCalled();
  });

  it('registers both providers when Mixpanel token is provided', async () => {
    await initAnalytics({ enableFirebase: true, enableMixpanel: true, mixpanelToken: 'tok' });
    expect(FirebaseAnalyticsProvider).toHaveBeenCalled();
    expect(initMixpanel).toHaveBeenCalledWith('tok');
    expect(MixpanelAnalyticsProvider).toHaveBeenCalled();
    expect(MultiProvider).toHaveBeenCalledWith([expect.any(Object), expect.any(Object)]);
    expect(registerProvider).toHaveBeenCalled();
  });

  it('skips Firebase when enableFirebase is false', async () => {
    await initAnalytics({ enableFirebase: false, enableMixpanel: true, mixpanelToken: 'tok' });
    expect(FirebaseAnalyticsProvider).not.toHaveBeenCalled();
    expect(MixpanelAnalyticsProvider).toHaveBeenCalled();
    expect(MultiProvider).toHaveBeenCalledWith([expect.any(Object)]);
  });

  it('skips Mixpanel when enableMixpanel is false', async () => {
    await initAnalytics({ enableFirebase: true, enableMixpanel: false });
    expect(MixpanelAnalyticsProvider).not.toHaveBeenCalled();
  });

  it('does not register if no providers enabled', async () => {
    await initAnalytics({ enableFirebase: false, enableMixpanel: false });
    expect(registerProvider).not.toHaveBeenCalled();
  });

  it('only initializes once (idempotent)', async () => {
    await initAnalytics({ enableFirebase: true });
    await initAnalytics({ enableFirebase: true });
    expect(FirebaseAnalyticsProvider).toHaveBeenCalledTimes(1);
  });
});

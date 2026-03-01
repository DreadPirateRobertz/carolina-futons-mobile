import { initAnalytics } from '../analyticsInit';
import { registerProvider, trackEvent, getEventBuffer, clearEventBuffer, setEnabled } from '../analytics';
import type { AnalyticsProvider } from '../analytics';

// Mock the provider modules
jest.mock('../providers/firebaseAnalytics', () => ({
  createFirebaseProvider: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackScreenView: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    setEnabled: jest.fn(),
  })),
}));

jest.mock('../providers/mixpanelAnalytics', () => ({
  createMixpanelProvider: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackScreenView: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    setEnabled: jest.fn(),
  })),
}));

beforeEach(() => {
  clearEventBuffer();
  setEnabled(true);
  registerProvider(null as unknown as AnalyticsProvider);
  jest.clearAllMocks();
});

describe('analyticsInit', () => {
  it('creates firebase provider by default', () => {
    const { createFirebaseProvider } = require('../providers/firebaseAnalytics');
    initAnalytics({ firebase: true });
    expect(createFirebaseProvider).toHaveBeenCalled();
  });

  it('creates mixpanel provider when token provided', () => {
    const { createMixpanelProvider } = require('../providers/mixpanelAnalytics');
    initAnalytics({ mixpanel: { token: 'test-token' } });
    expect(createMixpanelProvider).toHaveBeenCalledWith({ token: 'test-token' });
  });

  it('creates multi-provider when both are configured', () => {
    const { createFirebaseProvider } = require('../providers/firebaseAnalytics');
    const { createMixpanelProvider } = require('../providers/mixpanelAnalytics');
    initAnalytics({ firebase: true, mixpanel: { token: 'test-token' } });
    expect(createFirebaseProvider).toHaveBeenCalled();
    expect(createMixpanelProvider).toHaveBeenCalled();
  });

  it('does not register provider when firebase is explicitly disabled and no mixpanel', () => {
    initAnalytics({ firebase: false });
    // Events should still buffer (no provider = dev mode)
    trackEvent('search', { query: 'futon' });
    expect(getEventBuffer()).toHaveLength(1);
  });
});

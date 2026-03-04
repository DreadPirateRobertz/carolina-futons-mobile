import { SentryCrashReportingProvider } from '../sentryCrashReporting';

// @sentry/react-native is not installed, so the provider should no-op gracefully
describe('SentryCrashReportingProvider', () => {
  const provider = new SentryCrashReportingProvider({
    dsn: 'https://fake@sentry.io/123',
  });

  it('initializes without throwing when Sentry unavailable', () => {
    expect(() => provider.init()).not.toThrow();
  });

  it('captureException no-ops when Sentry unavailable', () => {
    expect(() =>
      provider.captureException(new Error('test'), 'error', { screen: 'Home' }),
    ).not.toThrow();
  });

  it('captureMessage no-ops when Sentry unavailable', () => {
    expect(() => provider.captureMessage('test message', 'warning')).not.toThrow();
  });

  it('setUser no-ops when Sentry unavailable', () => {
    expect(() => provider.setUser({ id: '123', email: 'test@test.com' })).not.toThrow();
    expect(() => provider.setUser(null)).not.toThrow();
  });

  it('addBreadcrumb no-ops when Sentry unavailable', () => {
    expect(() =>
      provider.addBreadcrumb('test', 'ui', { target: 'button' }),
    ).not.toThrow();
  });
});

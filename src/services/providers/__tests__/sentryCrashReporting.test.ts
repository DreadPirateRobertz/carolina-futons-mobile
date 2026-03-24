// Mock @sentry/react-native as null to simulate the module being unavailable.
// This also prevents the real SDK from loading and registering async timers
// (reactnavigation.ts setTimeout) that outlive the Jest environment and pollute
// subsequent test files running in the same worker.
jest.mock('@sentry/react-native', () => null);

import { SentryCrashReportingProvider } from '../sentryCrashReporting';


// With the null mock above, sentryCrashReporting.ts sets Sentry = null → no-op path
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
    expect(() => provider.addBreadcrumb('test', 'ui', { target: 'button' })).not.toThrow();
  });
});

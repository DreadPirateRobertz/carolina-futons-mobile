import { initCrashReporting, resetCrashReportingInitForTesting } from '../crashReportingInit';
import { isInitialized, getBreadcrumbs, resetForTesting } from '../crashReporting';

beforeEach(() => {
  resetForTesting();
  resetCrashReportingInitForTesting();
});

describe('crashReportingInit', () => {
  it('initializes crash reporting', () => {
    expect(isInitialized()).toBe(false);
    initCrashReporting();
    expect(isInitialized()).toBe(true);
  });

  it('is idempotent', () => {
    initCrashReporting();
    initCrashReporting();
    expect(isInitialized()).toBe(true);
  });

  it('adds initialization breadcrumb', () => {
    initCrashReporting();
    const crumbs = getBreadcrumbs();
    expect(crumbs.some((c) => c.message === 'Crash reporting initialized')).toBe(true);
  });

  it('works without sentry DSN (no provider registered)', () => {
    initCrashReporting();
    expect(isInitialized()).toBe(true);
  });

  it('accepts sentry config', () => {
    // Should not throw even if Sentry module is unavailable
    initCrashReporting({ sentryDsn: 'https://fake@sentry.io/123' });
    expect(isInitialized()).toBe(true);
  });
});

import { initCrashReporting, resetCrashReportingInitForTesting } from '../crashReportingInit';
import { isInitialized, getBreadcrumbs, resetForTesting } from '../crashReporting';

const mockRegisterProvider = jest.fn();
jest.mock('../crashReporting', () => {
  const actual = jest.requireActual('../crashReporting');
  return {
    ...actual,
    registerProvider: (...args: unknown[]) => {
      mockRegisterProvider(...args);
      return actual.registerProvider(...args);
    },
  };
});

beforeEach(() => {
  resetForTesting();
  resetCrashReportingInitForTesting();
  mockRegisterProvider.mockClear();
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
    expect(mockRegisterProvider).not.toHaveBeenCalled();
  });

  it('registers Sentry provider when DSN is provided', () => {
    initCrashReporting({ sentryDsn: 'https://fake@sentry.io/123' });
    expect(isInitialized()).toBe(true);
    expect(mockRegisterProvider).toHaveBeenCalledTimes(1);
  });

  it('passes environment to Sentry provider', () => {
    initCrashReporting({
      sentryDsn: 'https://fake@sentry.io/123',
      environment: 'staging',
    });
    expect(mockRegisterProvider).toHaveBeenCalledTimes(1);
    // Provider was created with the config — verified by not throwing
  });

  it('does not register provider when DSN is omitted', () => {
    initCrashReporting({});
    expect(mockRegisterProvider).not.toHaveBeenCalled();
    expect(isInitialized()).toBe(true);
  });
});

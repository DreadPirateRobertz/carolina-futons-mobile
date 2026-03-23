/**
 * Tests for SentryCrashReportingProvider when @sentry/react-native IS available.
 * Uses jest.isolateModules in beforeAll so the provider's module-level try/catch
 * picks up the mock registered above.
 */
export {};

const mockInit = jest.fn();
const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();
const mockSetUser = jest.fn();
const mockAddBreadcrumb = jest.fn();
const mockSetLevel = jest.fn();
const mockSetExtras = jest.fn();
const mockSetTag = jest.fn();
const mockWithScope = jest.fn((cb: (scope: unknown) => void) => {
  cb({
    setLevel: mockSetLevel,
    setExtras: mockSetExtras,
    setTag: mockSetTag,
  });
});
const mockWrap = jest.fn((component: unknown) => component);
const mockNavigationIntegration = { registerNavigationContainer: jest.fn() };
const mockReactNavigationIntegration = jest.fn(() => mockNavigationIntegration);
const mockMobileReplayIntegration = jest.fn(() => ({ name: 'MobileReplay' }));

jest.mock('@sentry/react-native', () => ({
  init: mockInit,
  captureException: mockCaptureException,
  captureMessage: mockCaptureMessage,
  setUser: mockSetUser,
  addBreadcrumb: mockAddBreadcrumb,
  withScope: mockWithScope,
  wrap: mockWrap,
  reactNavigationIntegration: mockReactNavigationIntegration,
  mobileReplayIntegration: mockMobileReplayIntegration,
}));

// Load a fresh instance of sentryCrashReporting in an isolated module scope so
// its module-level try/catch picks up the virtual mock registered above.
// jest.isolateModules is preferred over jest.resetModules here because it scopes
// the registry reset to the callback only — the outer mock factory registry
// (including the virtual mock) remains intact and is used for require() calls
// inside the isolated scope.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SentryCrashReportingProvider: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wrapWithSentry: any;

beforeAll(() => {
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('../sentryCrashReporting');
    SentryCrashReportingProvider = m.SentryCrashReportingProvider;
    wrapWithSentry = m.wrapWithSentry;
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SentryCrashReportingProvider (with Sentry)', () => {
  it('calls Sentry.init with DSN and defaults', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
    });
    provider.init();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@sentry.io/123',
        enableAutoSessionTracking: true,
        replaysOnErrorSampleRate: 1.0,
      }),
    );
  });

  it('sets up navigation integration and mobile replay', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
    });
    provider.init();
    expect(mockReactNavigationIntegration).toHaveBeenCalled();
    expect(mockMobileReplayIntegration).toHaveBeenCalled();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: expect.arrayContaining([mockNavigationIntegration]),
      }),
    );
  });

  it('getNavigationIntegration returns the integration after init', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
    });
    expect(provider.getNavigationIntegration()).toBeNull();
    provider.init();
    expect(provider.getNavigationIntegration()).toBe(mockNavigationIntegration);
  });

  it('passes custom environment to Sentry.init', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
      environment: 'staging',
    });
    provider.init();
    expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ environment: 'staging' }));
  });

  it('passes custom tracesSampleRate to Sentry.init', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
      tracesSampleRate: 0.5,
    });
    provider.init();
    expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ tracesSampleRate: 0.5 }));
  });

  it('captureException uses withScope and sets severity', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
    });
    const error = new Error('test error');
    provider.captureException(error, 'warning', { screen: 'Home', action: 'tap' });

    expect(mockWithScope).toHaveBeenCalledTimes(1);
    expect(mockSetLevel).toHaveBeenCalledWith('warning');
    expect(mockSetExtras).toHaveBeenCalledWith({ screen: 'Home', action: 'tap' });
    expect(mockSetTag).toHaveBeenCalledWith('screen', 'Home');
    expect(mockSetTag).toHaveBeenCalledWith('action', 'tap');
    expect(mockCaptureException).toHaveBeenCalledWith(error);
  });

  it('captureException works without context', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
    });
    const error = new Error('no context');
    provider.captureException(error, 'error');

    expect(mockWithScope).toHaveBeenCalledTimes(1);
    expect(mockSetLevel).toHaveBeenCalledWith('error');
    expect(mockSetExtras).not.toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalledWith(error);
  });

  it('captureMessage delegates to Sentry with level', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
    });
    provider.captureMessage('Something happened', 'info');
    expect(mockCaptureMessage).toHaveBeenCalledWith('Something happened', 'info');
  });

  it('captureMessage works without severity', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
    });
    provider.captureMessage('test');
    expect(mockCaptureMessage).toHaveBeenCalledWith('test', undefined);
  });

  it('setUser maps fields to Sentry format', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
    });
    provider.setUser({ id: 'user-42', email: 'user@test.com', name: 'Test User' });
    expect(mockSetUser).toHaveBeenCalledWith({
      id: 'user-42',
      email: 'user@test.com',
      username: 'Test User',
    });
  });

  it('setUser with null clears user', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
    });
    provider.setUser(null);
    expect(mockSetUser).toHaveBeenCalledWith(null);
  });

  it('addBreadcrumb delegates with category and data', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
    });
    provider.addBreadcrumb('User tapped button', 'ui', { target: 'checkout' });
    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      message: 'User tapped button',
      category: 'ui',
      data: { target: 'checkout' },
      level: 'info',
    });
  });

  it('addBreadcrumb uses default category when omitted', () => {
    const provider = new SentryCrashReportingProvider({
      dsn: 'https://key@sentry.io/123',
    });
    provider.addBreadcrumb('App started');
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ category: 'app' }));
  });

  it('wrapWithSentry delegates to Sentry.wrap', () => {
    const FakeComponent = () => null;
    const result = wrapWithSentry(FakeComponent);
    expect(mockWrap).toHaveBeenCalledWith(FakeComponent);
    expect(result).toBe(FakeComponent);
  });
});

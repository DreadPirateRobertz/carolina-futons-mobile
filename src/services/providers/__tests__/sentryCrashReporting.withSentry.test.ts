/**
 * Tests for SentryCrashReportingProvider when @sentry/react-native IS available.
 * Uses jest.mock with virtual:true since the package isn't installed,
 * then re-requires the provider so its try/catch picks up the mock.
 */

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

jest.mock(
  '@sentry/react-native',
  () => ({
    init: mockInit,
    captureException: mockCaptureException,
    captureMessage: mockCaptureMessage,
    setUser: mockSetUser,
    addBreadcrumb: mockAddBreadcrumb,
    withScope: mockWithScope,
  }),
  { virtual: true },
);

// Re-require the provider so the module-level try/catch picks up our mock
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SentryCrashReportingProvider } = require('../sentryCrashReporting');

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
      }),
    );
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
});

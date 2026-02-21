import {
  init,
  captureException,
  captureMessage,
  setUser,
  getUser,
  addBreadcrumb,
  getBreadcrumbs,
  getErrorLog,
  isInitialized,
  resetForTesting,
  registerProvider,
  type CrashReportingProvider,
} from '../crashReporting';

beforeEach(() => {
  resetForTesting();
});

describe('crashReporting', () => {
  describe('init', () => {
    it('initializes crash reporting', () => {
      expect(isInitialized()).toBe(false);
      init();
      expect(isInitialized()).toBe(true);
    });

    it('is idempotent', () => {
      init();
      init(); // should not throw
      expect(isInitialized()).toBe(true);
    });
  });

  describe('captureException', () => {
    it('logs error to error log', () => {
      const error = new Error('test error');
      captureException(error);
      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].error.message).toBe('test error');
      expect(log[0].severity).toBe('error');
      expect(log[0].handled).toBe(true);
    });

    it('accepts severity parameter', () => {
      captureException(new Error('warning'), 'warning');
      expect(getErrorLog()[0].severity).toBe('warning');
    });

    it('accepts context', () => {
      captureException(new Error('oops'), 'error', { screen: 'ProductDetail' });
      expect(getErrorLog()[0].context).toEqual({ screen: 'ProductDetail' });
    });

    it('tracks handled vs unhandled', () => {
      captureException(new Error('handled'), 'error', undefined, true);
      captureException(new Error('unhandled'), 'fatal', undefined, false);
      const log = getErrorLog();
      expect(log[0].handled).toBe(true);
      expect(log[1].handled).toBe(false);
    });

    it('includes timestamp', () => {
      const before = Date.now();
      captureException(new Error('timed'));
      const after = Date.now();
      const entry = getErrorLog()[0];
      expect(entry.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp).toBeLessThanOrEqual(after);
    });

    it('caps log at 100 entries', () => {
      for (let i = 0; i < 110; i++) {
        captureException(new Error(`error-${i}`));
      }
      expect(getErrorLog()).toHaveLength(100);
    });
  });

  describe('captureMessage', () => {
    it('delegates to provider when registered', () => {
      const provider: CrashReportingProvider = {
        init: jest.fn(),
        captureException: jest.fn(),
        captureMessage: jest.fn(),
        setUser: jest.fn(),
        addBreadcrumb: jest.fn(),
      };
      registerProvider(provider);
      captureMessage('Something happened', 'info');
      expect(provider.captureMessage).toHaveBeenCalledWith('Something happened', 'info');
    });
  });

  describe('setUser / getUser', () => {
    it('sets and gets user', () => {
      setUser({ id: 'user-123', email: 'test@example.com' });
      expect(getUser()).toEqual({ id: 'user-123', email: 'test@example.com' });
    });

    it('clears user with null', () => {
      setUser({ id: 'user-123' });
      setUser(null);
      expect(getUser()).toBeNull();
    });

    it('starts with null user', () => {
      expect(getUser()).toBeNull();
    });
  });

  describe('breadcrumbs', () => {
    it('adds breadcrumbs', () => {
      addBreadcrumb('User tapped button', 'ui');
      addBreadcrumb('API call started', 'network', { url: '/products' });
      const crumbs = getBreadcrumbs();
      expect(crumbs).toHaveLength(2);
      expect(crumbs[0].message).toBe('User tapped button');
      expect(crumbs[0].category).toBe('ui');
      expect(crumbs[1].data).toEqual({ url: '/products' });
    });

    it('includes timestamps', () => {
      addBreadcrumb('test');
      expect(getBreadcrumbs()[0].timestamp).toBeGreaterThan(0);
    });

    it('caps at 50 breadcrumbs', () => {
      for (let i = 0; i < 60; i++) {
        addBreadcrumb(`crumb-${i}`);
      }
      expect(getBreadcrumbs()).toHaveLength(50);
    });
  });

  describe('provider delegation', () => {
    it('delegates captureException to provider', () => {
      const provider: CrashReportingProvider = {
        init: jest.fn(),
        captureException: jest.fn(),
        captureMessage: jest.fn(),
        setUser: jest.fn(),
        addBreadcrumb: jest.fn(),
      };
      registerProvider(provider);
      const error = new Error('provider test');
      captureException(error, 'warning', { screen: 'Home' });
      expect(provider.captureException).toHaveBeenCalledWith(error, 'warning', { screen: 'Home' });
    });

    it('delegates setUser to provider', () => {
      const provider: CrashReportingProvider = {
        init: jest.fn(),
        captureException: jest.fn(),
        captureMessage: jest.fn(),
        setUser: jest.fn(),
        addBreadcrumb: jest.fn(),
      };
      registerProvider(provider);
      setUser({ id: '123' });
      expect(provider.setUser).toHaveBeenCalledWith({ id: '123' });
    });

    it('delegates addBreadcrumb to provider', () => {
      const provider: CrashReportingProvider = {
        init: jest.fn(),
        captureException: jest.fn(),
        captureMessage: jest.fn(),
        setUser: jest.fn(),
        addBreadcrumb: jest.fn(),
      };
      registerProvider(provider);
      addBreadcrumb('click', 'ui', { target: 'btn' });
      expect(provider.addBreadcrumb).toHaveBeenCalledWith('click', 'ui', { target: 'btn' });
    });

    it('delegates init to provider', () => {
      const provider: CrashReportingProvider = {
        init: jest.fn(),
        captureException: jest.fn(),
        captureMessage: jest.fn(),
        setUser: jest.fn(),
        addBreadcrumb: jest.fn(),
      };
      registerProvider(provider);
      init();
      expect(provider.init).toHaveBeenCalled();
    });
  });

  describe('resetForTesting', () => {
    it('clears all state', () => {
      init();
      captureException(new Error('test'));
      addBreadcrumb('test');
      setUser({ id: '123' });
      resetForTesting();
      expect(isInitialized()).toBe(false);
      expect(getErrorLog()).toHaveLength(0);
      expect(getBreadcrumbs()).toHaveLength(0);
      expect(getUser()).toBeNull();
    });
  });
});

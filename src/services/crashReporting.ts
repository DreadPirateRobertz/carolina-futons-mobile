/**
 * Crash reporting service for capturing JS errors and unhandled rejections.
 *
 * Provides an abstraction over crash reporting SDKs (Sentry, Bugsnag, etc.).
 * In development, logs to console. In production, delegates to registered provider.
 *
 * Usage:
 *   crashReporting.init();
 *   crashReporting.captureException(error);
 *   crashReporting.setUser({ id: '123', email: 'user@example.com' });
 */

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

export interface CrashContext {
  screen?: string;
  action?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface CrashUser {
  id: string;
  email?: string;
  name?: string;
}

export interface CapturedError {
  error: Error;
  severity: ErrorSeverity;
  context?: CrashContext;
  timestamp: number;
  handled: boolean;
}

export interface CrashReportingProvider {
  init(): void;
  captureException(error: Error, severity?: ErrorSeverity, context?: CrashContext): void;
  captureMessage(message: string, severity?: ErrorSeverity): void;
  setUser(user: CrashUser | null): void;
  addBreadcrumb(message: string, category?: string, data?: Record<string, string>): void;
}

/** In-memory error log for dev/testing */
const errorLog: CapturedError[] = [];
const MAX_LOG_SIZE = 100;

/** Breadcrumb trail for debugging */
interface Breadcrumb {
  message: string;
  category?: string;
  data?: Record<string, string>;
  timestamp: number;
}

const breadcrumbs: Breadcrumb[] = [];
const MAX_BREADCRUMBS = 50;

let _initialized = false;
let _provider: CrashReportingProvider | null = null;
let _user: CrashUser | null = null;

/** Register a real crash reporting provider (e.g., Sentry) */
export function registerProvider(provider: CrashReportingProvider): void {
  _provider = provider;
}

/** Initialize crash reporting — sets up global error handlers */
export function init(): void {
  if (_initialized) return;
  _initialized = true;

  if (_provider) {
    _provider.init();
  }

  // Global JS error handler
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    captureException(error, isFatal ? 'fatal' : 'error', undefined, false);
    originalHandler(error, isFatal);
  });
}

/** Capture an exception */
export function captureException(
  error: Error,
  severity: ErrorSeverity = 'error',
  context?: CrashContext,
  handled = true,
): void {
  const entry: CapturedError = {
    error,
    severity,
    context,
    timestamp: Date.now(),
    handled,
  };

  errorLog.push(entry);
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.shift();
  }

  if (_provider) {
    _provider.captureException(error, severity, context);
  } else if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      `[CrashReporting] ${severity}: ${error.message}`,
      context ?? '',
    );
  }
}

/** Capture a message (non-exception) */
export function captureMessage(
  message: string,
  severity: ErrorSeverity = 'info',
): void {
  if (_provider) {
    _provider.captureMessage(message, severity);
  } else if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[CrashReporting] ${severity}: ${message}`);
  }
}

/** Set user context for crash reports */
export function setUser(user: CrashUser | null): void {
  _user = user;
  if (_provider) {
    _provider.setUser(user);
  }
}

/** Get current user */
export function getUser(): CrashUser | null {
  return _user;
}

/** Add a breadcrumb for debugging context */
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, string>,
): void {
  breadcrumbs.push({ message, category, data, timestamp: Date.now() });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }

  if (_provider) {
    _provider.addBreadcrumb(message, category, data);
  }
}

/** Check if crash reporting is initialized */
export function isInitialized(): boolean {
  return _initialized;
}

/** Get the error log (for testing/debugging) */
export function getErrorLog(): readonly CapturedError[] {
  return errorLog;
}

/** Get breadcrumbs (for testing/debugging) */
export function getBreadcrumbs(): readonly Breadcrumb[] {
  return breadcrumbs;
}

/** Clear all state (for testing) */
export function resetForTesting(): void {
  errorLog.length = 0;
  breadcrumbs.length = 0;
  _initialized = false;
  _provider = null;
  _user = null;
}

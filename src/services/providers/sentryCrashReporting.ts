/**
 * Sentry crash reporting provider implementing the CrashReportingProvider interface.
 *
 * Wraps @sentry/react-native for production crash reporting.
 * Gracefully degrades to no-ops if the native module is unavailable.
 */
import type { CrashReportingProvider, ErrorSeverity, CrashContext, CrashUser } from '../crashReporting';

interface SentryModule {
  init(options: Record<string, unknown>): void;
  captureException(error: Error, context?: Record<string, unknown>): void;
  captureMessage(message: string, level?: string): void;
  setUser(user: Record<string, string | undefined> | null): void;
  addBreadcrumb(breadcrumb: Record<string, unknown>): void;
  withScope(callback: (scope: SentryScope) => void): void;
}

interface SentryScope {
  setLevel(level: string): void;
  setExtras(extras: Record<string, unknown>): void;
  setTag(key: string, value: string): void;
}

let Sentry: SentryModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Sentry = require('@sentry/react-native');
} catch {
  // Native module not available — provider methods will no-op
}

const SEVERITY_MAP: Record<ErrorSeverity, string> = {
  fatal: 'fatal',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

export interface SentryConfig {
  dsn: string;
  environment?: string;
  tracesSampleRate?: number;
  enableAutoSessionTracking?: boolean;
}

export class SentryCrashReportingProvider implements CrashReportingProvider {
  private config: SentryConfig;

  constructor(config: SentryConfig) {
    this.config = config;
  }

  init(): void {
    if (!Sentry) return;

    Sentry.init({
      dsn: this.config.dsn,
      environment: this.config.environment ?? (__DEV__ ? 'development' : 'production'),
      tracesSampleRate: this.config.tracesSampleRate ?? (__DEV__ ? 1.0 : 0.2),
      enableAutoSessionTracking: this.config.enableAutoSessionTracking ?? true,
      debug: __DEV__,
    });
  }

  captureException(error: Error, severity?: ErrorSeverity, context?: CrashContext): void {
    if (!Sentry) return;

    Sentry.withScope((scope) => {
      if (severity) {
        scope.setLevel(SEVERITY_MAP[severity]);
      }
      if (context) {
        scope.setExtras(context);
        if (context.screen) {
          scope.setTag('screen', String(context.screen));
        }
        if (context.action) {
          scope.setTag('action', String(context.action));
        }
      }
      Sentry!.captureException(error);
    });
  }

  captureMessage(message: string, severity?: ErrorSeverity): void {
    if (!Sentry) return;
    Sentry.captureMessage(message, severity ? SEVERITY_MAP[severity] : undefined);
  }

  setUser(user: CrashUser | null): void {
    if (!Sentry) return;
    Sentry.setUser(
      user
        ? { id: user.id, email: user.email, username: user.name }
        : null,
    );
  }

  addBreadcrumb(message: string, category?: string, data?: Record<string, string>): void {
    if (!Sentry) return;
    Sentry.addBreadcrumb({
      message,
      category: category ?? 'app',
      data,
      level: 'info',
    });
  }
}

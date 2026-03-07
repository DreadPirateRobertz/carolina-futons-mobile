/**
 * Crash reporting initialization.
 *
 * Sets up the crash reporting provider (Sentry) and initializes
 * global error handlers including unhandled promise rejections.
 */
import { registerProvider, init, addBreadcrumb } from './crashReporting';
import { SentryCrashReportingProvider } from './providers/sentryCrashReporting';

export interface CrashReportingConfig {
  sentryDsn?: string;
  environment?: string;
}

let _initialized = false;

/**
 * Bootstrap crash reporting on app launch. Idempotent — safe to call multiple times.
 * Registers the Sentry provider (if a DSN is supplied), installs the global JS
 * error handler, and hooks into Hermes unhandled-promise-rejection tracking.
 */
export function initCrashReporting(config?: CrashReportingConfig): void {
  if (_initialized) return;
  _initialized = true;

  // Register Sentry provider if DSN is available
  const dsn = config?.sentryDsn;
  if (dsn) {
    const sentryProvider = new SentryCrashReportingProvider({
      dsn,
      environment: config?.environment,
    });
    registerProvider(sentryProvider);
  }

  // Initialize crash reporting (sets up global JS error handler)
  init();

  // Set up unhandled promise rejection tracking
  setupPromiseRejectionHandler();

  addBreadcrumb('Crash reporting initialized', 'app');
}

function setupPromiseRejectionHandler(): void {
  // React Native exposes a global tracking queue for unhandled rejections
  // This is the standard RN approach — no polyfill needed
  if (typeof global !== 'undefined') {
    const tracking = (global as Record<string, unknown>).HermesInternal as
      | { enablePromiseRejectionTracker?: (options: Record<string, unknown>) => void }
      | undefined;

    // On Hermes, use the built-in tracker if available
    if (tracking?.enablePromiseRejectionTracker) {
      tracking.enablePromiseRejectionTracker({
        allRejections: true,
        onUnhandled: (id: number, rejection: unknown) => {
          const error =
            rejection instanceof Error
              ? rejection
              : new Error(String(rejection));

          // Import dynamically to avoid circular dependency
          const { captureException } = require('./crashReporting');
          captureException(error, 'error', { action: 'unhandled_promise_rejection', rejectionId: String(id) }, false);
        },
      });
    }
  }
}

/** Reset state for testing */
export function resetCrashReportingInitForTesting(): void {
  _initialized = false;
}

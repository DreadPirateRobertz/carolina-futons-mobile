/**
 * Firebase Analytics provider implementing the AnalyticsProvider interface.
 *
 * Wraps @react-native-firebase/analytics for production use.
 * Gracefully degrades to no-ops if the native module is unavailable.
 */
import type { AnalyticsProvider, AnalyticsEventName, UserProperties } from '../analytics';
import { captureException } from '../crashReporting';

interface FirebaseAnalyticsModule {
  logEvent(name: string, params: Record<string, unknown>): Promise<void>;
  logScreenView(params: Record<string, unknown>): Promise<void>;
  setUserId(id: string | null): Promise<void>;
  setUserProperties(props: Record<string, string | null>): Promise<void>;
  resetAnalyticsData(): Promise<void>;
  setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>;
}

let firebaseAnalytics: FirebaseAnalyticsModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const analytics = require('@react-native-firebase/analytics').default;
  firebaseAnalytics = analytics();
} catch {
  // Native module not available — provider methods will no-op
}

/**
 * Bridges the app's vendor-neutral analytics API to Firebase Analytics.
 * All methods silently no-op when the Firebase native module is missing
 * (e.g., during Expo Go development or on web).
 */
export class FirebaseAnalyticsProvider implements AnalyticsProvider {
  private enabled = true;

  trackEvent(name: AnalyticsEventName, properties?: Record<string, string | number | boolean>): void {
    if (!this.enabled || !firebaseAnalytics) return;
    firebaseAnalytics.logEvent(name, properties ?? {}).catch((err) => {
      captureException(err instanceof Error ? err : new Error(String(err)), 'warning', { action: 'firebase_logEvent' });
    });
  }

  trackScreenView(screenName: string, properties?: Record<string, string | number | boolean>): void {
    if (!this.enabled || !firebaseAnalytics) return;
    firebaseAnalytics
      .logScreenView({ screen_name: screenName, screen_class: screenName, ...properties })
      .catch((err) => {
        captureException(err instanceof Error ? err : new Error(String(err)), 'warning', { action: 'firebase_logScreenView' });
      });
  }

  identify(userId: string, _properties?: UserProperties): void {
    if (!this.enabled || !firebaseAnalytics) return;
    firebaseAnalytics.setUserId(userId).catch((err) => {
      captureException(err instanceof Error ? err : new Error(String(err)), 'warning', { action: 'firebase_setUserId' });
    });
    if (_properties) {
      const userProps: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(_properties)) {
        userProps[key] = value != null ? String(value) : null;
      }
      firebaseAnalytics.setUserProperties(userProps).catch((err) => {
        captureException(err instanceof Error ? err : new Error(String(err)), 'warning', { action: 'firebase_setUserProperties' });
      });
    }
  }

  reset(): void {
    if (!firebaseAnalytics) return;
    firebaseAnalytics.setUserId(null).catch((err) => {
      captureException(err instanceof Error ? err : new Error(String(err)), 'warning', { action: 'firebase_resetUserId' });
    });
    firebaseAnalytics.resetAnalyticsData().catch((err) => {
      captureException(err instanceof Error ? err : new Error(String(err)), 'warning', { action: 'firebase_resetAnalyticsData' });
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (firebaseAnalytics) {
      firebaseAnalytics.setAnalyticsCollectionEnabled(enabled).catch((err) => {
        captureException(err instanceof Error ? err : new Error(String(err)), 'warning', { action: 'firebase_setAnalyticsCollectionEnabled' });
      });
    }
  }
}

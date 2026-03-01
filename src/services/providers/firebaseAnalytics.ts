/**
 * Firebase Analytics provider implementation.
 *
 * Wraps @react-native-firebase/analytics to conform to the app's
 * AnalyticsProvider interface. In production, events flow through Firebase;
 * in tests or when the module is unavailable, operations are no-ops.
 */

import type { AnalyticsProvider, AnalyticsEventName, UserProperties } from '../analytics';

let firebaseAnalytics: ReturnType<typeof tryLoadFirebase>;

function tryLoadFirebase() {
  try {
    // Dynamic require — firebase may not be installed in all environments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-firebase/analytics').default;
  } catch {
    return null;
  }
}

function getFirebase() {
  if (firebaseAnalytics === undefined) {
    firebaseAnalytics = tryLoadFirebase();
  }
  return firebaseAnalytics;
}

export function createFirebaseProvider(): AnalyticsProvider {
  let enabled = true;

  return {
    trackEvent(name: AnalyticsEventName, properties?: Record<string, string | number | boolean>) {
      if (!enabled) return;
      const fb = getFirebase();
      if (!fb) return;
      fb().logEvent(name, properties ?? {});
    },

    trackScreenView(screenName: string, properties?: Record<string, string | number | boolean>) {
      if (!enabled) return;
      const fb = getFirebase();
      if (!fb) return;
      fb().logScreenView({
        screen_name: screenName,
        screen_class: screenName,
        ...properties,
      });
    },

    identify(userId: string, properties?: UserProperties) {
      const fb = getFirebase();
      if (!fb) return;
      fb().setUserId(userId);
      if (properties) {
        // Firebase user properties must be string values
        const stringProps: Record<string, string> = {};
        for (const [key, value] of Object.entries(properties)) {
          if (value !== undefined) {
            stringProps[key] = String(value);
          }
        }
        for (const [key, value] of Object.entries(stringProps)) {
          fb().setUserProperty(key, value);
        }
      }
    },

    reset() {
      const fb = getFirebase();
      if (!fb) return;
      fb().setUserId(null);
    },

    setEnabled(value: boolean) {
      enabled = value;
      const fb = getFirebase();
      if (!fb) return;
      fb().setAnalyticsCollectionEnabled(value);
    },
  };
}

/**
 * Multi-provider analytics adapter.
 *
 * Fans out analytics calls to multiple providers simultaneously.
 * Used when both Firebase and Mixpanel (or other providers) are active.
 */

import type { AnalyticsProvider, AnalyticsEventName, UserProperties } from '../analytics';

export function createMultiProvider(providers: AnalyticsProvider[]): AnalyticsProvider {
  return {
    trackEvent(name: AnalyticsEventName, properties?: Record<string, string | number | boolean>) {
      for (const p of providers) {
        try {
          p.trackEvent(name, properties);
        } catch {
          // Don't let one provider's failure affect others
        }
      }
    },

    trackScreenView(screenName: string, properties?: Record<string, string | number | boolean>) {
      for (const p of providers) {
        try {
          p.trackScreenView(screenName, properties);
        } catch {
          // Silent — each provider independent
        }
      }
    },

    identify(userId: string, properties?: UserProperties) {
      for (const p of providers) {
        try {
          p.identify(userId, properties);
        } catch {
          // Silent
        }
      }
    },

    reset() {
      for (const p of providers) {
        try {
          p.reset();
        } catch {
          // Silent
        }
      }
    },

    setEnabled(enabled: boolean) {
      for (const p of providers) {
        try {
          p.setEnabled(enabled);
        } catch {
          // Silent
        }
      }
    },
  };
}

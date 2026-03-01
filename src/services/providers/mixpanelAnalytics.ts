/**
 * Mixpanel analytics provider implementation.
 *
 * Wraps the Mixpanel React Native SDK to conform to the app's
 * AnalyticsProvider interface. Mixpanel excels at funnel analysis and
 * user-level behavioral tracking. Falls back to no-ops when unavailable.
 */

import type { AnalyticsProvider, AnalyticsEventName, UserProperties } from '../analytics';

export interface MixpanelConfig {
  token: string;
  trackAutomaticEvents?: boolean;
  serverURL?: string;
}

let mixpanelInstance: MixpanelInstance | null = null;

interface MixpanelInstance {
  init(): Promise<void>;
  track(eventName: string, properties?: Record<string, unknown>): void;
  identify(userId: string): void;
  getPeople(): {
    set(properties: Record<string, unknown>): void;
  };
  reset(): void;
  flush(): void;
  optOutTracking(): void;
  optInTracking(): void;
}

function tryLoadMixpanel(config: MixpanelConfig): MixpanelInstance | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Mixpanel } = require('mixpanel-react-native');
    return new Mixpanel(config.token, config.trackAutomaticEvents ?? true);
  } catch {
    return null;
  }
}

export function createMixpanelProvider(config: MixpanelConfig): AnalyticsProvider {
  let enabled = true;
  let initialized = false;

  async function ensureInit() {
    if (initialized || !mixpanelInstance) return;
    try {
      await mixpanelInstance.init();
      initialized = true;
    } catch {
      // Init failed — log in dev, silent in prod
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[Mixpanel] initialization failed');
      }
    }
  }

  // Attempt to load on creation
  mixpanelInstance = tryLoadMixpanel(config);
  if (mixpanelInstance) {
    ensureInit();
  }

  return {
    trackEvent(name: AnalyticsEventName, properties?: Record<string, string | number | boolean>) {
      if (!enabled || !mixpanelInstance) return;
      mixpanelInstance.track(name, properties);
    },

    trackScreenView(screenName: string, properties?: Record<string, string | number | boolean>) {
      if (!enabled || !mixpanelInstance) return;
      mixpanelInstance.track('screen_view', {
        screen_name: screenName,
        ...properties,
      });
    },

    identify(userId: string, properties?: UserProperties) {
      if (!mixpanelInstance) return;
      mixpanelInstance.identify(userId);
      if (properties) {
        const cleanProps: Record<string, string | number | boolean> = {};
        for (const [key, value] of Object.entries(properties)) {
          if (value !== undefined) {
            cleanProps[key] = value;
          }
        }
        mixpanelInstance.getPeople().set(cleanProps);
      }
    },

    reset() {
      if (!mixpanelInstance) return;
      mixpanelInstance.reset();
    },

    setEnabled(value: boolean) {
      enabled = value;
      if (!mixpanelInstance) return;
      if (value) {
        mixpanelInstance.optInTracking();
      } else {
        mixpanelInstance.optOutTracking();
      }
    },
  };
}

/** Flush pending events (call before app background) */
export function flushMixpanel(): void {
  mixpanelInstance?.flush();
}

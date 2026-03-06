/**
 * Mixpanel Analytics provider implementing the AnalyticsProvider interface.
 *
 * Wraps mixpanel-react-native for production use.
 * Gracefully degrades to no-ops if the native module is unavailable.
 */
import type { AnalyticsProvider, AnalyticsEventName, UserProperties } from '../analytics';

interface MixpanelInstance {
  init(): Promise<void>;
  track(name: string, properties?: Record<string, unknown>): void;
  identify(userId: string): void;
  reset(): void;
  optInTracking(): void;
  optOutTracking(): void;
  getPeople(): { set(props: Record<string, string | number | boolean>): void };
}

let mixpanelInstance: MixpanelInstance | null = null;

export async function initMixpanel(token: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Mixpanel } = require('mixpanel-react-native');
    mixpanelInstance = new Mixpanel(token, true);
    await mixpanelInstance!.init();
  } catch {
    // Native module not available
  }
}

/**
 * Bridges the app's vendor-neutral analytics API to Mixpanel.
 * All methods silently no-op when the native module is missing.
 */
export class MixpanelAnalyticsProvider implements AnalyticsProvider {
  private enabled = true;

  trackEvent(name: AnalyticsEventName, properties?: Record<string, string | number | boolean>): void {
    if (!this.enabled || !mixpanelInstance) return;
    mixpanelInstance.track(name, properties);
  }

  trackScreenView(screenName: string, properties?: Record<string, string | number | boolean>): void {
    if (!this.enabled || !mixpanelInstance) return;
    mixpanelInstance.track('screen_view', { screen_name: screenName, ...properties });
  }

  identify(userId: string, properties?: UserProperties): void {
    if (!this.enabled || !mixpanelInstance) return;
    mixpanelInstance.identify(userId);
    if (properties) {
      const people = mixpanelInstance.getPeople();
      people.set(properties as Record<string, string | number | boolean>);
    }
  }

  reset(): void {
    if (!mixpanelInstance) return;
    mixpanelInstance.reset();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (mixpanelInstance) {
      if (enabled) {
        mixpanelInstance.optInTracking();
      } else {
        mixpanelInstance.optOutTracking();
      }
    }
  }
}

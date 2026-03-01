/**
 * Analytics initialization — configures and registers providers.
 *
 * Call initAnalytics() once at app startup (in App.tsx) to wire up
 * Firebase Analytics, Mixpanel, or both depending on available config.
 *
 * Environment variables / config:
 *   MIXPANEL_TOKEN — Mixpanel project token (optional)
 *   Firebase — auto-configured via google-services.json / GoogleService-Info.plist
 */

import { registerProvider } from './analytics';
import { createFirebaseProvider } from './providers/firebaseAnalytics';
import { createMixpanelProvider, type MixpanelConfig } from './providers/mixpanelAnalytics';
import { createMultiProvider } from './providers/multiProvider';
import type { AnalyticsProvider } from './analytics';

export interface AnalyticsInitConfig {
  /** Enable Firebase Analytics (requires @react-native-firebase/analytics) */
  firebase?: boolean;
  /** Mixpanel configuration (requires mixpanel-react-native) */
  mixpanel?: MixpanelConfig;
}

/**
 * Initialize analytics with the given configuration.
 * Registers a multi-provider that fans events to all active backends.
 */
export function initAnalytics(config: AnalyticsInitConfig = {}): void {
  const providers: AnalyticsProvider[] = [];

  if (config.firebase !== false) {
    // Firebase is enabled by default if the module is available
    const fbProvider = createFirebaseProvider();
    providers.push(fbProvider);
  }

  if (config.mixpanel?.token) {
    const mpProvider = createMixpanelProvider(config.mixpanel);
    providers.push(mpProvider);
  }

  if (providers.length === 0) {
    // No providers available — analytics stays in dev/buffer-only mode
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Analytics] No providers configured — using dev buffer only');
    }
    return;
  }

  if (providers.length === 1) {
    registerProvider(providers[0]);
  } else {
    registerProvider(createMultiProvider(providers));
  }
}

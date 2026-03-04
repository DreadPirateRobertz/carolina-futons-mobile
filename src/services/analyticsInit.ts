/**
 * Analytics initialization — wires Firebase and Mixpanel providers
 * into the analytics service via the MultiProvider adapter.
 *
 * Call `initAnalytics()` once at app startup (before any tracking calls).
 */
import { registerProvider } from './analytics';
import { FirebaseAnalyticsProvider } from './providers/firebaseAnalytics';
import { MixpanelAnalyticsProvider, initMixpanel } from './providers/mixpanelAnalytics';
import { MultiProvider } from './providers/multiProvider';

export interface AnalyticsConfig {
  mixpanelToken?: string;
  enableFirebase?: boolean;
  enableMixpanel?: boolean;
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  enableFirebase: true,
  enableMixpanel: true,
};

let initialized = false;

export async function initAnalytics(config: AnalyticsConfig = DEFAULT_CONFIG): Promise<void> {
  if (initialized) return;
  initialized = true;

  const providers = [];

  if (config.enableFirebase !== false) {
    providers.push(new FirebaseAnalyticsProvider());
  }

  if (config.enableMixpanel !== false && config.mixpanelToken) {
    await initMixpanel(config.mixpanelToken);
    providers.push(new MixpanelAnalyticsProvider());
  }

  if (providers.length > 0) {
    registerProvider(new MultiProvider(providers));
  }
}

/** Reset init state (for testing) */
export function resetAnalyticsInit(): void {
  initialized = false;
}

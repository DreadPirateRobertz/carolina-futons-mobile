/**
 * Multi-provider adapter that fans out analytics calls to multiple providers.
 *
 * Errors in individual providers are caught and logged so one failing
 * provider doesn't break the others.
 */
import type { AnalyticsProvider, AnalyticsEventName, UserProperties } from '../analytics';

export class MultiProvider implements AnalyticsProvider {
  private providers: AnalyticsProvider[];

  constructor(providers: AnalyticsProvider[]) {
    this.providers = providers;
  }

  trackEvent(name: AnalyticsEventName, properties?: Record<string, string | number | boolean>): void {
    for (const p of this.providers) {
      try {
        p.trackEvent(name, properties);
      } catch (e) {
        if (__DEV__) console.warn('[MultiProvider] trackEvent error:', e);
      }
    }
  }

  trackScreenView(screenName: string, properties?: Record<string, string | number | boolean>): void {
    for (const p of this.providers) {
      try {
        p.trackScreenView(screenName, properties);
      } catch (e) {
        if (__DEV__) console.warn('[MultiProvider] trackScreenView error:', e);
      }
    }
  }

  identify(userId: string, properties?: UserProperties): void {
    for (const p of this.providers) {
      try {
        p.identify(userId, properties);
      } catch (e) {
        if (__DEV__) console.warn('[MultiProvider] identify error:', e);
      }
    }
  }

  reset(): void {
    for (const p of this.providers) {
      try {
        p.reset();
      } catch (e) {
        if (__DEV__) console.warn('[MultiProvider] reset error:', e);
      }
    }
  }

  setEnabled(enabled: boolean): void {
    for (const p of this.providers) {
      try {
        p.setEnabled(enabled);
      } catch (e) {
        if (__DEV__) console.warn('[MultiProvider] setEnabled error:', e);
      }
    }
  }
}

/**
 * Multi-provider adapter that fans out analytics calls to multiple providers.
 *
 * Errors in individual providers are caught and logged so one failing
 * provider doesn't break the others.
 */
import type { AnalyticsProvider, AnalyticsEventName, UserProperties } from '../analytics';
import { captureException } from '../crashReporting';

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
        captureException(e instanceof Error ? e : new Error(String(e)), 'warning', { action: 'MultiProvider.trackEvent' });
      }
    }
  }

  trackScreenView(screenName: string, properties?: Record<string, string | number | boolean>): void {
    for (const p of this.providers) {
      try {
        p.trackScreenView(screenName, properties);
      } catch (e) {
        captureException(e instanceof Error ? e : new Error(String(e)), 'warning', { action: 'MultiProvider.trackScreenView' });
      }
    }
  }

  identify(userId: string, properties?: UserProperties): void {
    for (const p of this.providers) {
      try {
        p.identify(userId, properties);
      } catch (e) {
        captureException(e instanceof Error ? e : new Error(String(e)), 'warning', { action: 'MultiProvider.identify' });
      }
    }
  }

  reset(): void {
    for (const p of this.providers) {
      try {
        p.reset();
      } catch (e) {
        captureException(e instanceof Error ? e : new Error(String(e)), 'warning', { action: 'MultiProvider.reset' });
      }
    }
  }

  setEnabled(enabled: boolean): void {
    for (const p of this.providers) {
      try {
        p.setEnabled(enabled);
      } catch (e) {
        captureException(e instanceof Error ? e : new Error(String(e)), 'warning', { action: 'MultiProvider.setEnabled' });
      }
    }
  }
}

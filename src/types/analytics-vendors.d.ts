/**
 * Ambient type declarations for analytics SDK modules.
 *
 * These provide minimal type coverage for the native SDKs used by our
 * analytics providers. The actual implementations come from the native modules
 * at runtime; these declarations just satisfy the TypeScript compiler.
 */

declare module '@react-native-firebase/analytics' {
  interface FirebaseAnalyticsModule {
    logEvent(name: string, params?: Record<string, unknown>): Promise<void>;
    logScreenView(params: { screen_name: string; screen_class: string; [key: string]: unknown }): Promise<void>;
    setUserId(id: string | null): Promise<void>;
    setUserProperties(properties: Record<string, string | null>): Promise<void>;
    resetAnalyticsData(): Promise<void>;
    setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>;
  }

  function analytics(): FirebaseAnalyticsModule;
  export default analytics;
}

declare module 'mixpanel-react-native' {
  interface MixpanelPeople {
    set(properties: Record<string, string | number | boolean>): void;
  }

  export class Mixpanel {
    constructor(token: string, trackAutomaticEvents?: boolean);
    init(): Promise<void>;
    track(eventName: string, properties?: Record<string, unknown>): void;
    identify(userId: string): void;
    reset(): void;
    optInTracking(): void;
    optOutTracking(): void;
    getPeople(): MixpanelPeople;
  }
}

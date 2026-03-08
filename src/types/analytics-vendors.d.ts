/**
 * Ambient type declarations for analytics SDK modules.
 *
 * These provide minimal type coverage for the native SDKs used by our
 * analytics providers. The actual implementations come from the native modules
 * at runtime; these declarations exist solely to satisfy the TypeScript
 * compiler and enable type-safe usage in our analytics service layer.
 *
 * If either SDK publishes its own `@types/*` package in the future, these
 * declarations should be removed in favor of the official types.
 */

declare module '@react-native-firebase/analytics' {
  /** Subset of the Firebase Analytics API surface that we actually use. */
  interface FirebaseAnalyticsModule {
    /**
     * Log a custom analytics event.
     * @param name - Event name (must conform to Firebase naming rules).
     * @param params - Optional key-value payload attached to the event.
     */
    logEvent(name: string, params?: Record<string, unknown>): Promise<void>;

    /**
     * Log a screen view event for automatic screen tracking.
     * @param params - Must include `screen_name` and `screen_class`; extra keys are forwarded.
     */
    logScreenView(params: {
      screen_name: string;
      screen_class: string;
      [key: string]: unknown;
    }): Promise<void>;

    /**
     * Associate future events with a user ID (or `null` to clear).
     * @param id - Unique user identifier or `null` to de-identify.
     */
    setUserId(id: string | null): Promise<void>;

    /**
     * Set user-scoped properties for audience segmentation.
     * @param properties - Key-value map; pass `null` values to clear individual properties.
     */
    setUserProperties(properties: Record<string, string | null>): Promise<void>;

    /** Delete all locally stored analytics data and reset the app instance ID. */
    resetAnalyticsData(): Promise<void>;

    /**
     * Enable or disable analytics collection (respects user consent).
     * @param enabled - `true` to allow collection, `false` to suspend it.
     */
    setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>;
  }

  /** Factory function that returns the singleton analytics module. */
  function analytics(): FirebaseAnalyticsModule;
  export default analytics;
}

declare module 'mixpanel-react-native' {
  /** Interface for setting user profile properties in Mixpanel People. */
  interface MixpanelPeople {
    /**
     * Set properties on the identified user's profile.
     * @param properties - Key-value map of profile properties.
     */
    set(properties: Record<string, string | number | boolean>): void;
  }

  /** Mixpanel client for event tracking and user identification. */
  export class Mixpanel {
    /**
     * @param token - Mixpanel project token.
     * @param trackAutomaticEvents - Whether to track lifecycle events automatically.
     */
    constructor(token: string, trackAutomaticEvents?: boolean);

    /** Initialize the Mixpanel SDK. Must be called before any other method. */
    init(): Promise<void>;

    /**
     * Track a named event.
     * @param eventName - Human-readable event name.
     * @param properties - Optional key-value payload.
     */
    track(eventName: string, properties?: Record<string, unknown>): void;

    /**
     * Associate this device with a known user ID.
     * @param userId - Unique user identifier.
     */
    identify(userId: string): void;

    /** Clear the identified user and generate a new anonymous ID. */
    reset(): void;

    /** Opt the current user in to tracking (GDPR / consent flow). */
    optInTracking(): void;

    /** Opt the current user out of tracking (GDPR / consent flow). */
    optOutTracking(): void;

    /**
     * Access the People API for setting user profile properties.
     * @returns The MixpanelPeople interface for the current user.
     */
    getPeople(): MixpanelPeople;
  }
}

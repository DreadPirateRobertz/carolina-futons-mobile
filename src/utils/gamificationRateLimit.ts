/**
 * @module gamificationRateLimit
 *
 * Client-side guard that complements the server-side 20/min rate limit on
 * POST /_functions/gamificationEvent (hq-825vi).
 *
 * Two mechanisms:
 *   1. Rolling window cap — drops events when ≥20 have fired in the last 60s.
 *   2. Per-event debounce — collapses rapid identical calls (e.g. fast wishlist taps)
 *      into a single emission after a configurable quiet period.
 *
 * Usage:
 *   const limiter = createGamificationRateLimiter();
 *   if (limiter.canEmit()) {
 *     limiter.recordEmission();
 *     await callGamificationApi(...);
 *   }
 *   // OR for debounced events:
 *   limiter.debounce('wishlist_add', () => callGamificationApi(...), 300);
 *
 * hq-74nry
 */

const WINDOW_MS = 60_000; // 60 seconds
const MAX_PER_WINDOW = 20;

export interface GamificationRateLimiter {
  /** Returns true if an emission is permitted under the rolling cap. */
  canEmit(): boolean;
  /** Record that an event was emitted (call immediately before/after firing). */
  recordEmission(): void;
  /**
   * Debounce an event by key. Collapses rapid calls — only the last fn in
   * the quiet period fires, after `delayMs` of silence.
   */
  debounce(key: string, fn: () => void, delayMs: number): void;
  /** Clear all state — useful on logout or in tests. */
  reset(): void;
}

export function createGamificationRateLimiter(): GamificationRateLimiter {
  // Timestamps of recent emissions (epoch ms)
  let emissions: number[] = [];
  // Per-key debounce timer handles
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function pruneWindow(): void {
    const cutoff = Date.now() - WINDOW_MS;
    emissions = emissions.filter((t) => t > cutoff);
  }

  return {
    canEmit(): boolean {
      pruneWindow();
      return emissions.length < MAX_PER_WINDOW;
    },

    recordEmission(): void {
      pruneWindow();
      emissions.push(Date.now());
    },

    debounce(key: string, fn: () => void, delayMs: number): void {
      const existing = timers.get(key);
      if (existing !== undefined) {
        clearTimeout(existing);
      }
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          fn();
        }, delayMs),
      );
    },

    reset(): void {
      emissions = [];
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    },
  };
}

/** Shared singleton for use across gamification.ts call sites. */
export const gamificationRateLimiter = createGamificationRateLimiter();

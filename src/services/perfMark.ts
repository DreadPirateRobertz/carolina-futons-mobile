/**
 * @module perfMark
 *
 * Lightweight performance telemetry wrapper around `performance.mark()` /
 * `performance.measure()`.
 *
 * In dev (`__DEV__`): records marks + measures and logs elapsed ms to console.
 * In prod: pure no-ops — zero overhead, zero bundle impact for callers.
 *
 * Usage:
 *   markStart('HomeScreen.mount');
 *   // … work …
 *   markEnd('HomeScreen.mount');  // logs: [Perf] HomeScreen.mount 42ms
 */

declare const __DEV__: boolean;

const startKey = (name: string) => `${name}:start`;
const endKey = (name: string) => `${name}:end`;

/**
 * Record the start of a named performance interval.
 * No-op in production or when `performance` is unavailable.
 */
export function markStart(name: string): void {
  if (!__DEV__) return;
  try {
    if (typeof global.performance?.mark !== 'function') return;
    global.performance.mark(startKey(name));
  } catch {
    // Never let instrumentation crash the app
  }
}

/**
 * Record the end of a named performance interval, measure elapsed time,
 * and log the result. No-op in production or when `performance` is unavailable.
 */
export function markEnd(name: string): void {
  if (!__DEV__) return;
  try {
    if (typeof global.performance?.mark !== 'function') return;
    global.performance.mark(endKey(name));
    const measure = global.performance.measure(name, startKey(name), endKey(name));
    const ms = measure?.duration ?? 0;
    console.log('[Perf]', name, `${ms.toFixed(1)}ms`);
  } catch {
    // markEnd without a prior markStart will throw — swallow gracefully
  }
}

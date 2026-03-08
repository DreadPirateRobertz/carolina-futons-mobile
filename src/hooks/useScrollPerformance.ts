/**
 * Hook to monitor FlatList scroll performance and detect jank.
 *
 * Tracks frame timing during active scrolling via requestAnimationFrame.
 * Reports dropped frames and FPS to the performance service.
 *
 * Usage:
 *   const { onScrollBeginDrag, onScrollEndDrag, onMomentumScrollEnd } =
 *     useScrollPerformance('ShopScreen');
 *
 *   <FlatList
 *     onScrollBeginDrag={onScrollBeginDrag}
 *     onScrollEndDrag={onScrollEndDrag}
 *     onMomentumScrollEnd={onMomentumScrollEnd}
 *     ...
 *   />
 */
import { useCallback, useRef } from 'react';
import { perf, type ScrollSession } from '@/services/performance';

/** FPS threshold below which we consider a frame "slow" */
const LOW_FPS_THRESHOLD_MS = 1000 / 55; // ~18.18ms per frame = below 55fps
/** Number of consecutive slow frames before logging a warning */
const CONSECUTIVE_SLOW_FRAMES_WARN = 3;

/**
 * Returns FlatList scroll event handlers that measure per-frame timing via
 * requestAnimationFrame and report dropped frames / FPS (Frames Per Second)
 * to the performance service.
 */
export function useScrollPerformance(screenName: string) {
  const sessionRef = useRef<ScrollSession | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const consecutiveSlowFrames = useRef<number>(0);

  const startTracking = useCallback(() => {
    lastFrameTimeRef.current = performance.now();

    const tick = () => {
      const now = performance.now();
      const frameDuration = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      if (sessionRef.current && frameDuration > 0 && frameDuration < 500) {
        perf.recordFrame(sessionRef.current, frameDuration);

        // Track consecutive slow frames (below 55fps)
        if (frameDuration > LOW_FPS_THRESHOLD_MS) {
          consecutiveSlowFrames.current++;
          if (consecutiveSlowFrames.current >= CONSECUTIVE_SLOW_FRAMES_WARN && __DEV__) {
            // eslint-disable-next-line no-console
            console.warn(
              `[Perf] ${screenName}: FPS below 55 for ${consecutiveSlowFrames.current} consecutive frames (${Math.round(1000 / frameDuration)}fps)`,
            );
          }
        } else {
          consecutiveSlowFrames.current = 0;
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTracking = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const onScrollBeginDrag = useCallback(() => {
    consecutiveSlowFrames.current = 0;
    sessionRef.current = perf.startScrollSession(screenName);
    startTracking();
  }, [screenName, startTracking]);

  const onScrollEndDrag = useCallback(() => {
    // Don't end session yet — momentum may continue
  }, []);

  const onMomentumScrollEnd = useCallback(() => {
    stopTracking();
    if (sessionRef.current) {
      perf.endScrollSession(sessionRef.current);
      sessionRef.current = null;
    }
  }, [stopTracking]);

  /** Call this if the scroll ends without momentum (e.g., user lifts finger slowly) */
  const onScrollEnd = useCallback(() => {
    stopTracking();
    if (sessionRef.current) {
      perf.endScrollSession(sessionRef.current);
      sessionRef.current = null;
    }
  }, [stopTracking]);

  return {
    onScrollBeginDrag,
    onScrollEndDrag,
    onMomentumScrollEnd,
    onScrollEnd,
  };
}

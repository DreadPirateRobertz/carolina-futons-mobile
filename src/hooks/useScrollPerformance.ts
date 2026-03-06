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

/**
 * Returns FlatList scroll event handlers that measure per-frame timing via
 * requestAnimationFrame and report dropped frames / FPS (Frames Per Second)
 * to the performance service.
 */
export function useScrollPerformance(screenName: string) {
  const sessionRef = useRef<ScrollSession | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const startTracking = useCallback(() => {
    lastFrameTimeRef.current = performance.now();

    const tick = () => {
      const now = performance.now();
      const frameDuration = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      if (sessionRef.current && frameDuration > 0 && frameDuration < 500) {
        perf.recordFrame(sessionRef.current, frameDuration);
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

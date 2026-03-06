/**
 * Hook to track scroll depth on a screen for heatmap analytics.
 *
 * Returns a scroll event handler that reports scroll depth as a fraction (0–1).
 * Throttles reports to avoid excessive event tracking.
 *
 * Usage:
 *   const onScroll = useScrollDepth('ProductDetail');
 *   <ScrollView onScroll={onScroll} scrollEventThrottle={16}>
 */
import { useCallback, useRef } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { trackScrollDepth } from '@/services/heatmap';

const DEPTH_REPORT_INTERVAL = 500; // ms between depth reports

/**
 * Returns a throttled onScroll handler that tracks the maximum scroll depth
 * reached and reports it to the heatmap analytics service.
 */
export function useScrollDepth(screenName: string) {
  const lastReportRef = useRef(0);
  const maxDepthRef = useRef(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const scrollableHeight = contentSize.height - layoutMeasurement.height;
      if (scrollableHeight <= 0) return;

      const depth = contentOffset.y / scrollableHeight;
      if (depth <= maxDepthRef.current) return;

      maxDepthRef.current = depth;

      const now = Date.now();
      if (now - lastReportRef.current < DEPTH_REPORT_INTERVAL) return;
      lastReportRef.current = now;

      trackScrollDepth(screenName, depth);
    },
    [screenName],
  );

  return onScroll;
}

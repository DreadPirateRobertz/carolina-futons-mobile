/**
 * Hook to track component render durations for performance profiling.
 *
 * Uses React.Profiler callback pattern to measure actual render time.
 * Reports slow renders (> 16.67ms) to the performance service.
 *
 * Usage:
 *   const onRender = useRenderTracking('ProductCard');
 *
 *   <Profiler id="ProductCard" onRender={onRender}>
 *     <ProductCard ... />
 *   </Profiler>
 */
import { useCallback } from 'react';
import { perf } from '@/services/performance';

type ProfilerOnRenderCallback = (
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
) => void;

/**
 * Returns a React Profiler onRender callback that feeds render durations
 * into the performance service for jank detection and reporting.
 */
export function useRenderTracking(componentName: string): ProfilerOnRenderCallback {
  return useCallback(
    (_id: string, _phase: string, actualDuration: number) => {
      perf.recordRender(componentName, actualDuration);
    },
    [componentName],
  );
}

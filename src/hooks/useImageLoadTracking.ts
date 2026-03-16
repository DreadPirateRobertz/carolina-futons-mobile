/**
 * Hook for tracking image load performance via the perf service.
 * Measures time between onLoadStart and onLoad events from expo-image.
 */
import { useCallback, useRef, useState } from 'react';
import { perf } from '@/services/performance';

interface ImageLoadTracking {
  onLoadStart: () => void;
  onLoad: () => void;
  isLoading: boolean;
  loadDurationMs: number | null;
}

export function useImageLoadTracking(label: string): ImageLoadTracking {
  const startTimeRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadDurationMs, setLoadDurationMs] = useState<number | null>(null);

  const onLoadStart = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsLoading(true);
  }, []);

  const onLoad = useCallback(() => {
    setIsLoading(false);
    if (startTimeRef.current == null) return;

    const duration = Date.now() - startTimeRef.current;
    startTimeRef.current = null;
    setLoadDurationMs(duration);
    perf.recordRender(`image_load:${label}`, duration);
  }, [label]);

  return { onLoadStart, onLoad, isLoading, loadDurationMs };
}

/**
 * @module usePendingSyncCount
 *
 * Returns the number of offline writes queued for replay as a plain number.
 * Thin wrapper over useQueueStatus for callers that need just the count.
 */
import { useQueueStatus } from '@/hooks/useQueueStatus';

export function usePendingSyncCount(): number {
  const { pendingCount } = useQueueStatus();
  return pendingCount;
}

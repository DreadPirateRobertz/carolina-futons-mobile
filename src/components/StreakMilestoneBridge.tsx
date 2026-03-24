/**
 * Bridge component that connects streak state with the Day-7 milestone push
 * notification hook.
 *
 * Rendered inside both StreakProvider context and NotificationProvider to
 * access both. Mirrors the CartAbandonmentBridge pattern.
 *
 * cfutons_mobile-tl9
 */
import { useStreak } from '@/hooks/useStreak';
import { useNotifications } from '@/hooks/useNotifications';
import { useStreakMilestonePush } from '@/hooks/useStreakMilestonePush';

export function StreakMilestoneBridge() {
  const { streak, loading: streakLoading } = useStreak();
  const { preferences, permissionStatus } = useNotifications();

  useStreakMilestonePush({
    streak,
    streakLoading,
    streakMilestoneEnabled: preferences.streakMilestone,
    permissionGranted: permissionStatus === 'granted',
  });

  return null;
}

/**
 * @module deepLinkHandlers
 *
 * Gamification notification type guard and route resolver.
 *
 * Maps streak_milestone / quest_complete / spin_reminder notification
 * payloads to the correct Loyalty screen tab, so tapping a gamification
 * push notification lands the user in the right view.
 *
 * Each type navigates to the Loyalty screen with an initialTab param:
 *   streak_milestone → initialTab: 'streak'  (streak progress panel)
 *   quest_complete   → initialTab: 'quests'  (daily quests list)
 *   spin_reminder    → initialTab: 'spin'    (spin-the-wheel panel)
 *
 * Bead: cm-cf-m1c
 */

import type { LoyaltyInitialTab } from '@/screens/LoyaltyScreen';
export type GamificationNotificationType = 'streak_milestone' | 'quest_complete' | 'spin_reminder';

export type { LoyaltyInitialTab as GamificationInitialTab } from '@/screens/LoyaltyScreen';

export type GamificationRoute = {
  screen: 'Loyalty';
  params: { initialTab: LoyaltyInitialTab };
};

/** Type guard — true only for the three gamification notification types. */
export function isGamificationType(type: string): type is GamificationNotificationType {
  return type === 'streak_milestone' || type === 'quest_complete' || type === 'spin_reminder';
}

/** Map a gamification notification type to its Loyalty screen tab. */
export function resolveGamificationRoute(type: GamificationNotificationType): GamificationRoute {
  const tabMap: Record<GamificationNotificationType, LoyaltyInitialTab> = {
    streak_milestone: 'streak',
    quest_complete: 'quests',
    spin_reminder: 'spin',
  };

  return { screen: 'Loyalty', params: { initialTab: tabMap[type] } };
}

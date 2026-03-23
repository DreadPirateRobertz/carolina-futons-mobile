/**
 * TDD tests for deepLinkHandlers — gamification notification type routing.
 *
 * Covers:
 *  - isGamificationType: identifies streak_milestone / quest_complete / spin_reminder
 *  - resolveGamificationRoute: maps each type to the correct Loyalty initialTab
 *
 * Bead: cm-cf-m1c
 */
import {
  isGamificationType,
  resolveGamificationRoute,
  type GamificationNotificationType,
} from '../deepLinkHandlers';

// ── isGamificationType ────────────────────────────────────────────────────────

describe('isGamificationType', () => {
  it.each<GamificationNotificationType>([
    'streak_milestone',
    'quest_complete',
    'spin_reminder',
  ])('returns true for "%s"', (type) => {
    expect(isGamificationType(type)).toBe(true);
  });

  it.each([
    'order_update',
    'promotion',
    'back_in_stock',
    'cart_reminder',
    'streak',
    '',
    'STREAK_MILESTONE',
  ])('returns false for non-gamification type "%s"', (type) => {
    expect(isGamificationType(type)).toBe(false);
  });
});

// ── resolveGamificationRoute ──────────────────────────────────────────────────

describe('resolveGamificationRoute', () => {
  it('routes streak_milestone to Loyalty with initialTab=streak', () => {
    expect(resolveGamificationRoute('streak_milestone')).toEqual({
      screen: 'Loyalty',
      params: { initialTab: 'streak' },
    });
  });

  it('routes quest_complete to Loyalty with initialTab=quests', () => {
    expect(resolveGamificationRoute('quest_complete')).toEqual({
      screen: 'Loyalty',
      params: { initialTab: 'quests' },
    });
  });

  it('routes spin_reminder to Loyalty with initialTab=spin', () => {
    expect(resolveGamificationRoute('spin_reminder')).toEqual({
      screen: 'Loyalty',
      params: { initialTab: 'spin' },
    });
  });
});

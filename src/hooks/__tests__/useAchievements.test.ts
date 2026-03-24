/**
 * @module useAchievements.test
 * TDD tests for the useAchievements hook — cm-707.
 *
 * Covers: not-loading state, no-error state, correct achievement count,
 * required shape on each item, earned achievements have earnedAt set,
 * locked achievements have earnedAt null.
 */
import { renderHook } from '@testing-library/react-native';
import { useAchievements } from '../useAchievements';

describe('useAchievements', () => {
  it('is not loading', () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.loading).toBe(false);
  });

  it('has no error', () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.error).toBeNull();
  });

  it('returns exactly 6 achievement milestones', () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.achievements).toHaveLength(6);
  });

  it('each achievement has the required shape', () => {
    const { result } = renderHook(() => useAchievements());
    for (const a of result.current.achievements) {
      expect(typeof a.milestone).toBe('number');
      expect(typeof a.streakDays).toBe('number');
      expect(typeof a.badgeLabel).toBe('string');
      expect(a.badgeLabel.length).toBeGreaterThan(0);
      // earnedAt is either an ISO string or null
      expect(a.earnedAt === null || typeof a.earnedAt === 'string').toBe(true);
    }
  });

  it('earned achievements have a non-null earnedAt', () => {
    const { result } = renderHook(() => useAchievements());
    const earned = result.current.achievements.filter((a) => a.earnedAt !== null);
    expect(earned.length).toBeGreaterThan(0);
    for (const a of earned) {
      expect(a.earnedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('locked achievements have earnedAt null', () => {
    const { result } = renderHook(() => useAchievements());
    const locked = result.current.achievements.filter((a) => a.earnedAt === null);
    expect(locked.length).toBeGreaterThan(0);
    for (const a of locked) {
      expect(a.earnedAt).toBeNull();
    }
  });
});

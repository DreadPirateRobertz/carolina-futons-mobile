/**
 * TDD tests for useConfidenceFilter hook.
 *
 * Covers:
 *  Initial state
 *    - default threshold is 0.60
 *    - returns all matches when none are below threshold
 *    - filters out matches with score < 0.60
 *    - passes through matches with score >= 0.60
 *    - score exactly at threshold (0.60) is included
 *
 *  setThreshold
 *    - updates the threshold
 *    - re-filters matches against the new threshold
 *    - clamped: threshold cannot be < 0
 *    - clamped: threshold cannot be > 1
 *
 *  hiddenCount
 *    - equals number of matches below threshold
 *    - is 0 when no matches are filtered out
 *    - updates when threshold changes
 *
 *  Edge cases
 *    - empty input array → filteredMatches is empty, hiddenCount is 0
 *    - all matches below threshold → filteredMatches is empty
 *    - all matches above threshold → all returned, hiddenCount 0
 *    - score of 0.0 is filtered when threshold > 0
 *    - score of 1.0 always passes
 *
 * hq-ghe: visual search UX — confidence threshold filter.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useConfidenceFilter } from '../useConfidenceFilter';
import type { VisualSearchMatch } from '@/services/visualSearchEmbedding';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMatch(score: number, id = `product-${score}`): VisualSearchMatch {
  return {
    score,
    product: {
      id,
      name: `Product ${id}`,
      price: 100,
      imageUrl: `https://example.com/${id}.jpg`,
      category: 'Sofas',
    },
  };
}

const MATCH_HIGH = makeMatch(0.95, 'high');
const MATCH_MID = makeMatch(0.75, 'mid');
const MATCH_AT_THRESHOLD = makeMatch(0.6, 'at-threshold');
const MATCH_JUST_BELOW = makeMatch(0.599, 'just-below');
const MATCH_LOW = makeMatch(0.3, 'low');
const MATCH_ZERO = makeMatch(0.0, 'zero');
const MATCH_PERFECT = makeMatch(1.0, 'perfect');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useConfidenceFilter', () => {
  // ── Initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('defaults threshold to 0.60', () => {
      const { result } = renderHook(() => useConfidenceFilter([]));
      expect(result.current.threshold).toBe(0.6);
    });

    it('returns empty filteredMatches for empty input', () => {
      const { result } = renderHook(() => useConfidenceFilter([]));
      expect(result.current.filteredMatches).toEqual([]);
    });

    it('returns all matches when all scores >= 0.60', () => {
      const matches = [MATCH_HIGH, MATCH_MID, MATCH_AT_THRESHOLD];
      const { result } = renderHook(() => useConfidenceFilter(matches));
      expect(result.current.filteredMatches).toHaveLength(3);
    });

    it('filters out matches with score < 0.60', () => {
      const matches = [MATCH_HIGH, MATCH_JUST_BELOW, MATCH_LOW];
      const { result } = renderHook(() => useConfidenceFilter(matches));
      expect(result.current.filteredMatches).toHaveLength(1);
      expect(result.current.filteredMatches[0].product.id).toBe('high');
    });

    it('includes match with score exactly equal to threshold (0.60)', () => {
      const { result } = renderHook(() => useConfidenceFilter([MATCH_AT_THRESHOLD]));
      expect(result.current.filteredMatches).toHaveLength(1);
    });

    it('excludes match with score just below threshold (0.599)', () => {
      const { result } = renderHook(() => useConfidenceFilter([MATCH_JUST_BELOW]));
      expect(result.current.filteredMatches).toHaveLength(0);
    });

    it('passes score of 1.0 through', () => {
      const { result } = renderHook(() => useConfidenceFilter([MATCH_PERFECT]));
      expect(result.current.filteredMatches).toHaveLength(1);
    });

    it('filters score of 0.0 with default threshold', () => {
      const { result } = renderHook(() => useConfidenceFilter([MATCH_ZERO]));
      expect(result.current.filteredMatches).toHaveLength(0);
    });

    it('preserves order of passing matches', () => {
      const matches = [MATCH_PERFECT, MATCH_HIGH, MATCH_MID, MATCH_AT_THRESHOLD];
      const { result } = renderHook(() => useConfidenceFilter(matches));
      const ids = result.current.filteredMatches.map((m) => m.product.id);
      expect(ids).toEqual(['perfect', 'high', 'mid', 'at-threshold']);
    });
  });

  // ── hiddenCount ──────────────────────────────────────────────────────────

  describe('hiddenCount', () => {
    it('is 0 when no matches filtered', () => {
      const { result } = renderHook(() => useConfidenceFilter([MATCH_HIGH, MATCH_MID]));
      expect(result.current.hiddenCount).toBe(0);
    });

    it('equals number of matches below threshold', () => {
      const matches = [MATCH_HIGH, MATCH_JUST_BELOW, MATCH_LOW, MATCH_ZERO];
      const { result } = renderHook(() => useConfidenceFilter(matches));
      expect(result.current.hiddenCount).toBe(3);
    });

    it('equals total when all matches below threshold', () => {
      const matches = [MATCH_LOW, MATCH_ZERO, MATCH_JUST_BELOW];
      const { result } = renderHook(() => useConfidenceFilter(matches));
      expect(result.current.hiddenCount).toBe(3);
    });

    it('is 0 for empty input', () => {
      const { result } = renderHook(() => useConfidenceFilter([]));
      expect(result.current.hiddenCount).toBe(0);
    });
  });

  // ── setThreshold ─────────────────────────────────────────────────────────

  describe('setThreshold', () => {
    it('updates the threshold value', () => {
      const { result } = renderHook(() => useConfidenceFilter([]));
      act(() => result.current.setThreshold(0.8));
      expect(result.current.threshold).toBe(0.8);
    });

    it('re-filters matches against new threshold', () => {
      const matches = [MATCH_HIGH, MATCH_MID, MATCH_AT_THRESHOLD];
      const { result } = renderHook(() => useConfidenceFilter(matches));
      // Default: all 3 pass (>= 0.60)
      expect(result.current.filteredMatches).toHaveLength(3);

      // Raise threshold — only MATCH_HIGH (0.95) should pass
      act(() => result.current.setThreshold(0.9));
      expect(result.current.filteredMatches).toHaveLength(1);
      expect(result.current.filteredMatches[0].product.id).toBe('high');
    });

    it('updates hiddenCount when threshold changes', () => {
      const matches = [MATCH_HIGH, MATCH_MID, MATCH_AT_THRESHOLD, MATCH_LOW];
      const { result } = renderHook(() => useConfidenceFilter(matches));
      expect(result.current.hiddenCount).toBe(1); // MATCH_LOW filtered

      act(() => result.current.setThreshold(0.8));
      // Now MATCH_MID (0.75), MATCH_AT_THRESHOLD (0.60), and MATCH_LOW (0.30) filtered
      expect(result.current.hiddenCount).toBe(3);
    });

    it('allows lowering threshold to 0 (passes everything)', () => {
      const matches = [MATCH_ZERO, MATCH_LOW, MATCH_JUST_BELOW];
      const { result } = renderHook(() => useConfidenceFilter(matches));
      act(() => result.current.setThreshold(0));
      expect(result.current.filteredMatches).toHaveLength(3);
      expect(result.current.hiddenCount).toBe(0);
    });

    it('clamps threshold at 0 (minimum)', () => {
      const { result } = renderHook(() => useConfidenceFilter([]));
      act(() => result.current.setThreshold(-0.1));
      expect(result.current.threshold).toBe(0);
    });

    it('clamps threshold at 1 (maximum)', () => {
      const { result } = renderHook(() => useConfidenceFilter([]));
      act(() => result.current.setThreshold(1.5));
      expect(result.current.threshold).toBe(1);
    });

    it('threshold of 1.0 only passes perfect score', () => {
      const matches = [MATCH_PERFECT, MATCH_HIGH, MATCH_MID];
      const { result } = renderHook(() => useConfidenceFilter(matches));
      act(() => result.current.setThreshold(1.0));
      expect(result.current.filteredMatches).toHaveLength(1);
      expect(result.current.filteredMatches[0].product.id).toBe('perfect');
    });
  });

  // ── reactivity ───────────────────────────────────────────────────────────

  describe('reactivity to input changes', () => {
    it('re-filters when matches prop changes', () => {
      let matches = [MATCH_HIGH];
      const { result, rerender } = renderHook(
        ({ m }: { m: VisualSearchMatch[] }) => useConfidenceFilter(m),
        { initialProps: { m: matches } },
      );
      expect(result.current.filteredMatches).toHaveLength(1);

      matches = [MATCH_HIGH, MATCH_LOW];
      rerender({ m: matches });
      expect(result.current.filteredMatches).toHaveLength(1); // MATCH_LOW filtered
      expect(result.current.hiddenCount).toBe(1);
    });

    it('hiddenCount updates when matches prop changes', () => {
      const { result, rerender } = renderHook(
        ({ m }: { m: VisualSearchMatch[] }) => useConfidenceFilter(m),
        { initialProps: { m: [MATCH_HIGH] } },
      );
      expect(result.current.hiddenCount).toBe(0);

      rerender({ m: [MATCH_HIGH, MATCH_LOW, MATCH_ZERO] });
      expect(result.current.hiddenCount).toBe(2);
    });
  });
});

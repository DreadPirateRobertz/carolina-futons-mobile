/**
 * @module useConfidenceFilter
 *
 * Confidence threshold filter for visual search results — hq-ghe.
 *
 * Filters a VisualSearchMatch[] to only include matches with score >= threshold.
 * Default threshold is 0.60 (60% confidence).
 *
 * hiddenCount reflects the number of matches that were filtered out.
 * setThreshold clamps input to [0, 1].
 */

import { useState, useMemo } from 'react';
import type { VisualSearchMatch } from '@/services/visualSearchEmbedding';

const DEFAULT_THRESHOLD = 0.6;

export interface UseConfidenceFilterResult {
  /** Matches with score >= threshold, in original order. */
  filteredMatches: VisualSearchMatch[];
  /** Number of matches excluded by the threshold. */
  hiddenCount: number;
  /** Current threshold value (0–1). */
  threshold: number;
  /** Update the threshold. Value is clamped to [0, 1]. */
  setThreshold: (value: number) => void;
}

export function useConfidenceFilter(
  matches: VisualSearchMatch[],
  initialThreshold = DEFAULT_THRESHOLD,
): UseConfidenceFilterResult {
  const [threshold, setThresholdRaw] = useState(Math.max(0, Math.min(1, initialThreshold)));

  const setThreshold = (value: number) => {
    setThresholdRaw(Math.max(0, Math.min(1, value)));
  };

  const filteredMatches = useMemo(
    () => matches.filter((m) => m.score >= threshold),
    [matches, threshold],
  );

  const hiddenCount = matches.length - filteredMatches.length;

  return { filteredMatches, hiddenCount, threshold, setThreshold };
}

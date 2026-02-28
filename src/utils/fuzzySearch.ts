/**
 * Lightweight fuzzy search for product catalog.
 *
 * Scores matches by:
 * - Exact substring match → highest score
 * - Word-start matches (typing "ash" matches "Asheville") → high score
 * - Character-sequence match with gaps → lower score
 * - No match → 0
 *
 * Designed for small catalogs (<100 items). For larger catalogs,
 * replace with Fuse.js or server-side search.
 */

export interface FuzzyResult<T> {
  item: T;
  score: number;
}

/**
 * Score how well `query` fuzzy-matches `text`.
 * Returns 0 for no match, higher is better (max ~1.0).
 */
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();

  if (!q || !t) return 0;

  // Exact match
  if (t === q) return 1.0;

  // Exact substring — strongest partial match
  if (t.includes(q)) {
    // Bonus for matching at word boundary
    const idx = t.indexOf(q);
    const atStart = idx === 0;
    const atWordStart = idx > 0 && /\s/.test(t[idx - 1]);
    if (atStart) return 0.95;
    if (atWordStart) return 0.9;
    return 0.8;
  }

  // Word-start matching: each query char matches start of successive words
  const words = t.split(/\s+/);
  let wi = 0;
  let qi = 0;
  while (qi < q.length && wi < words.length) {
    if (words[wi].startsWith(q[qi])) {
      qi++;
    }
    wi++;
  }
  if (qi === q.length && q.length > 1) {
    return 0.6 + (q.length / t.length) * 0.1;
  }

  // Character-sequence match with gaps (classic fuzzy)
  let ti = 0;
  let matched = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -2;

  for (let i = 0; i < q.length; i++) {
    let found = false;
    while (ti < t.length) {
      if (t[ti] === q[i]) {
        matched++;
        if (ti === lastMatchIdx + 1) consecutiveBonus += 0.05;
        lastMatchIdx = ti;
        ti++;
        found = true;
        break;
      }
      ti++;
    }
    if (!found) return 0; // Character not found — no match
  }

  // Base score from character coverage + consecutive bonus
  const coverage = matched / q.length; // Always 1.0 if we got here
  const density = matched / t.length;
  return Math.min(0.5, 0.3 * coverage + 0.15 * density + consecutiveBonus);
}

/**
 * Fuzzy-search an array of items.
 * Returns items with score > threshold, sorted by score descending.
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  getText: (item: T) => string[],
  threshold = 0.1,
): FuzzyResult<T>[] {
  if (!query.trim()) return items.map((item) => ({ item, score: 1 }));

  const results: FuzzyResult<T>[] = [];

  for (const item of items) {
    const texts = getText(item);
    let bestScore = 0;
    for (const text of texts) {
      const score = fuzzyScore(query, text);
      if (score > bestScore) bestScore = score;
    }
    if (bestScore >= threshold) {
      results.push({ item, score: bestScore });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Generate autocomplete suggestions from product names.
 * Returns unique suggestions sorted by relevance.
 */
export function getSuggestions(query: string, names: string[], maxResults = 5): string[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();
  const scored: { name: string; score: number }[] = [];

  for (const name of names) {
    const score = fuzzyScore(q, name);
    if (score > 0.1) {
      scored.push({ name, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((s) => s.name);
}

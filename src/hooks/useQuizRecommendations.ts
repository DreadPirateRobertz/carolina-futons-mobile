/**
 * @module useQuizRecommendations
 *
 * Style-quiz-driven product recommendations — cm-36j (Phase 2.2).
 *
 * Loads the user's saved quiz preferences from AsyncStorage, then queries
 * Wix for products matching their budget range. Falls back to the static
 * PRODUCTS catalog filtered by budget when Wix is unavailable.
 *
 * Results are cached for 1 hour. After the first load, a module-level key
 * allows subsequent renders to skip AsyncStorage entirely if the cache is
 * still valid.
 */
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRODUCTS, type Product } from '@/data/products';
import { getRecommendation, type StylePreferences } from '@/hooks/useStyleQuiz';
import { useOptionalWixClient } from '@/services/wix/wixProvider';

const STORAGE_KEY = '@carolina_futons_style_preferences';

/** Cache TTL: 1 hour. */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Maximum recommendations to return. */
const MAX_RESULTS = 8;

interface CacheEntry {
  data: Product[];
  label: string;
  expiresAt: number;
}

/** Module-level cache keyed by serialised preferences. */
const quizRecsCache = new Map<string, CacheEntry>();

/**
 * Last cache key that was populated, so subsequent renders can skip
 * the AsyncStorage read if the cache is still valid.
 */
let lastCacheKey: string | null = null;

/** Clears the in-memory cache. Intended for use in tests. */
export function clearQuizRecommendationsCache(): void {
  quizRecsCache.clear();
  lastCacheKey = null;
}

/** Budget price ranges matching BudgetRange enum values in useStyleQuiz. */
const BUDGET_RANGES: Record<string, { min: number; max: number }> = {
  'under-500': { min: 0, max: 500 },
  '500-1000': { min: 500, max: 1000 },
  '1000-2000': { min: 1000, max: 2000 },
  'over-2000': { min: 2000, max: Infinity },
};

/** Filter products from catalog by budget range. */
function getStaticRecsForBudget(budgetRange: string | null | undefined): Product[] {
  const range = budgetRange ? BUDGET_RANGES[budgetRange] : null;
  if (!range) return PRODUCTS.slice(0, MAX_RESULTS);
  return PRODUCTS.filter((p) => p.price >= range.min && p.price <= range.max).slice(0, MAX_RESULTS);
}

export interface QuizRecommendationsResult {
  recommendations: Product[];
  label: string;
  isLoading: boolean;
  error: string | null;
  /** true when valid preferences were found in storage */
  quizTaken: boolean;
}

/**
 * Fetches personalized product recommendations based on the user's stored
 * style quiz preferences. Uses a 1hr in-memory cache keyed by serialised prefs.
 * After the first load, skips AsyncStorage on subsequent renders within TTL.
 */
export function useQuizRecommendations(): QuizRecommendationsResult {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [label, setLabel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizTaken, setQuizTaken] = useState(false);

  const wixClient = useOptionalWixClient();
  const wixClientRef = useRef(wixClient);
  wixClientRef.current = wixClient;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      // Fast path: if we already know the last cache key, try to serve from cache
      // without calling AsyncStorage
      if (lastCacheKey) {
        const cached = quizRecsCache.get(lastCacheKey);
        if (cached && Date.now() < cached.expiresAt) {
          if (mountedRef.current) {
            setRecommendations(cached.data);
            setLabel(cached.label);
            setQuizTaken(true);
            setIsLoading(false);
            setError(null);
          }
          return;
        }
      }

      // Slow path: read preferences from AsyncStorage
      let prefs: StylePreferences | null = null;
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          prefs = JSON.parse(stored) as StylePreferences;
        }
      } catch {
        // AsyncStorage unavailable — treat as no quiz taken
        console.error('[useQuizRecommendations] AsyncStorage read failed');
        if (mountedRef.current) {
          setQuizTaken(false);
          setRecommendations([]);
          setLabel('');
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      const hasAnyPref =
        prefs && (prefs.stylePreference || prefs.sizeNeeds || prefs.budgetRange || prefs.roomType);

      if (!hasAnyPref) {
        if (mountedRef.current) {
          setQuizTaken(false);
          setRecommendations([]);
          setLabel('');
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      const cacheKey = JSON.stringify(prefs);
      const rec = getRecommendation(prefs!.stylePreference, prefs!.sizeNeeds);

      // Check cache by this key
      const cached = quizRecsCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        lastCacheKey = cacheKey;
        if (mountedRef.current) {
          setRecommendations(cached.data);
          setLabel(cached.label);
          setQuizTaken(true);
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      const client = wixClientRef.current;
      let recs: Product[];
      let fetchError: string | null = null;

      try {
        if (client) {
          const { products } = await client.queryProducts({ limit: 100 });
          const budgetRange = prefs!.budgetRange ? BUDGET_RANGES[prefs!.budgetRange] : null;
          recs = products
            .filter((p) => {
              if (!budgetRange) return true;
              return p.price >= budgetRange.min && p.price <= budgetRange.max;
            })
            .slice(0, MAX_RESULTS);
        } else {
          recs = getStaticRecsForBudget(prefs!.budgetRange);
        }
      } catch {
        console.error('[useQuizRecommendations] Wix fetch failed — falling back to local recs');
        recs = getStaticRecsForBudget(prefs!.budgetRange);
        fetchError = '[useQuizRecommendations] Wix fetch failed — showing local recommendations';
      }

      const entry: CacheEntry = {
        data: recs,
        label: rec.label,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      quizRecsCache.set(cacheKey, entry);
      lastCacheKey = cacheKey;

      if (mountedRef.current) {
        setRecommendations(recs);
        setLabel(rec.label);
        setQuizTaken(true);
        setIsLoading(false);
        setError(fetchError);
      }
    })();
    // wixClient intentionally omitted — accessed via ref to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { recommendations, label, isLoading, error, quizTaken };
}

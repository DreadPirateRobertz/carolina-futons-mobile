/**
 * @module useProductQA
 *
 * Product Q&A hook — cm-wf3 / deacon-qbl.
 *
 * Fetches approved questions for a product from the Wix CF-0b22 collection
 * and exposes a submitQuestion action with:
 *   - Input validation (empty, max length)
 *   - XSS sanitization (HTML tag stripping before submit)
 *   - Rate limiting (3 questions / hr, backed by AsyncStorage)
 *   - Optimistic UI insert
 *   - Error handling
 *
 * Clock injection via `options.getNow` enables deterministic rate-limit tests.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOptionalWixClient } from '@/services/wix';
import { useAuth } from '@/hooks/useAuth';

const COLLECTION_ID = 'CF-0b22';
const MAX_QUESTION_LENGTH = 500;
const RATE_LIMIT_KEY = '@cfutons/qa-rl';
const RATE_LIMIT_MAX = 3;
const ONE_HOUR_MS = 60 * 60 * 1000;

export interface ProductQuestion {
  id?: string;
  productId: string;
  question: string;
  answer: string;
  authorName: string;
  createdDate: string;
  answered: boolean;
  status?: 'approved' | 'pending' | 'rejected';
}

export interface UseProductQAResult {
  questions: ProductQuestion[];
  loading: boolean;
  fetchError: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
  submitQuestion: (text: string) => Promise<void>;
  clearSubmitStatus: () => void;
}

export interface UseProductQAOptions {
  /** Injectable clock for rate-limit tests. Defaults to Date.now. */
  getNow?: () => number;
}

/** Strip HTML tags (including script/style block content) and trim. */
function sanitizeText(raw: string): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // strip script blocks + content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // strip style blocks + content
    .replace(/<[^>]*>/g, '') // strip remaining tags
    .trim();
}

/**
 * Check rate limit. Returns `null` if allowed, or an error message string
 * (with retry hint) if the user has hit the 3/hr cap.
 */
async function checkRateLimit(getNow: () => number): Promise<string | null> {
  const now = getNow();
  let timestamps: number[] = [];

  try {
    const stored = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as number[];
      timestamps = Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // If storage read fails, don't block the user
    return null;
  }

  const recent = timestamps.filter((t) => t > now - ONE_HOUR_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    // Oldest of the recent 3 — when it ages out the user gets a slot back
    const oldestRecent = Math.min(...recent);
    const msUntilSlot = ONE_HOUR_MS - (now - oldestRecent);
    const minutesLeft = Math.ceil(msUntilSlot / 60_000);
    return `You've asked 3 questions this hour. Try again in ${minutesLeft} min.`;
  }

  return null;
}

async function recordSubmitTimestamp(getNow: () => number): Promise<void> {
  const now = getNow();
  let timestamps: number[] = [];

  try {
    const stored = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as number[];
      timestamps = Array.isArray(parsed) ? parsed : [];
    }
    // Prune old entries to keep storage tidy
    const recent = timestamps.filter((t) => t > now - ONE_HOUR_MS);
    await AsyncStorage.setItem(RATE_LIMIT_KEY, JSON.stringify([...recent, now]));
  } catch {
    // Non-fatal — rate limit tracking is best-effort
  }
}

export function useProductQA(productId: string, options?: UseProductQAOptions): UseProductQAResult {
  const getNow = options?.getNow ?? Date.now;

  const wixClient = useOptionalWixClient() as {
    queryData: <T>(
      collectionId: string,
      options?: { filter?: Record<string, unknown>; limit?: number },
    ) => Promise<{ items: T[]; totalResults: number }>;
    insertDataItem: (
      collectionId: string,
      data: Record<string, unknown>,
    ) => Promise<{ id: string; data: Record<string, unknown> }>;
  } | null;

  const { user } = useAuth();

  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!wixClient) {
      setFetchError('Q&A service unavailable');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await wixClient.queryData<ProductQuestion>(COLLECTION_ID, {
          filter: { productId, status: 'approved' },
          limit: 50,
        });
        if (!cancelled) {
          setQuestions(result.items);
          setFetchError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : 'Failed to load questions');
          console.warn('[useProductQA] fetch failed:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, wixClient]);

  const submitQuestion = useCallback(
    async (text: string) => {
      // Sanitize first, then validate
      const sanitized = sanitizeText(text ?? '');

      if (!sanitized) {
        setSubmitError('Question is required — please enter your question');
        return;
      }
      if (sanitized.length > MAX_QUESTION_LENGTH) {
        setSubmitError(`Question must be 500 characters or fewer (too long)`);
        return;
      }

      // Rate limit check
      const rateLimitError = await checkRateLimit(getNow);
      if (rateLimitError) {
        setSubmitError(rateLimitError);
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      const newQuestion: ProductQuestion = {
        productId,
        question: sanitized,
        answer: '',
        authorName: user?.displayName ?? 'Anonymous',
        createdDate: new Date().toISOString(),
        answered: false,
      };

      // Optimistic insert
      setQuestions((prev) => [newQuestion, ...prev]);

      try {
        if (!wixClient) throw new Error('Q&A service unavailable');
        await wixClient.insertDataItem(COLLECTION_ID, {
          productId,
          question: sanitized,
          answer: '',
          authorName: newQuestion.authorName,
          createdDate: newQuestion.createdDate,
          answered: false,
        });
        await recordSubmitTimestamp(getNow);
        setSubmitSuccess(true);
      } catch (err) {
        // Roll back optimistic insert
        setQuestions((prev) => prev.filter((q) => q !== newQuestion));
        setSubmitError(err instanceof Error ? err.message : 'Failed to submit question');
        console.warn('[useProductQA] submit failed:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [productId, user, wixClient, getNow],
  );

  const clearSubmitStatus = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(false);
  }, []);

  return {
    questions,
    loading,
    fetchError,
    isSubmitting,
    submitError,
    submitSuccess,
    submitQuestion,
    clearSubmitStatus,
  };
}

/**
 * @module useProductQA
 *
 * Product Q&A hook — cm-wf3.
 *
 * Fetches questions for a product from the Wix CF-0b22 Questions collection
 * and exposes a submitQuestion action with optimistic UI, input validation,
 * and error handling.
 */
import { useState, useEffect, useCallback } from 'react';
import { useOptionalWixClient } from '@/services/wix';
import { useAuth } from '@/hooks/useAuth';

const COLLECTION_ID = 'CF-0b22';
const MAX_QUESTION_LENGTH = 500;

export interface ProductQuestion {
  id?: string;
  productId: string;
  question: string;
  answer: string;
  authorName: string;
  createdDate: string;
  answered: boolean;
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

export function useProductQA(productId: string): UseProductQAResult {
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
          filter: { productId },
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
      const trimmed = text?.trim() ?? '';

      if (!trimmed) {
        setSubmitError('Question is required — please enter your question');
        return;
      }
      if (trimmed.length > MAX_QUESTION_LENGTH) {
        setSubmitError(`Question must be 500 characters or fewer (too long)`);
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      const newQuestion: ProductQuestion = {
        productId,
        question: trimmed,
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
          question: trimmed,
          answer: '',
          authorName: newQuestion.authorName,
          createdDate: newQuestion.createdDate,
          answered: false,
        });
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
    [productId, user, wixClient],
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

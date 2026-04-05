/**
 * @module useQAAnswers
 *
 * Q&A Phase 2 hook — cm-gey.
 *
 * Fetches threaded answers for a product question from the Wix
 * CF-0b22-answers collection. Exposes:
 *   - upvoteAnswer: optimistic upvote with dedup guard (AsyncStorage)
 *     and rollback on API failure
 *   - submitReply: threaded reply with validation, XSS sanitization,
 *     optimistic insert, and rollback on API failure
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOptionalWixClient } from '@/services/wix';
import { useAuth } from '@/hooks/useAuth';

const COLLECTION_ID = 'CF-0b22-answers';
const UPVOTE_KEY = '@cfutons/qa-upvotes';
const MAX_REPLY_LENGTH = 500;

export interface QAAnswer {
  id: string;
  questionId: string;
  parentAnswerId: string | null;
  text: string;
  authorName: string;
  createdDate: string;
  upvoteCount: number;
  hasUserUpvoted: boolean;
  status: 'approved' | 'pending' | 'rejected';
}

interface RawAnswer {
  id?: string;
  questionId?: string;
  parentAnswerId?: string | null;
  text?: string;
  authorName?: string;
  createdDate?: string;
  upvoteCount?: number;
  status?: 'approved' | 'pending' | 'rejected';
}

export interface UseQAAnswersResult {
  answers: QAAnswer[];
  loading: boolean;
  fetchError: string | null;
  upvoteError: string | null;
  replyError: string | null;
  replySuccess: boolean;
  upvoteAnswer: (answerId: string) => Promise<void>;
  submitReply: (parentAnswerId: string, text: string) => Promise<void>;
  clearReplyStatus: () => void;
}

/** Strip HTML tags (including script/style content) and trim. */
function sanitizeText(raw: string): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

async function loadUpvotedIds(): Promise<Set<string>> {
  try {
    const stored = await AsyncStorage.getItem(UPVOTE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {
    // non-fatal
  }
  return new Set();
}

async function persistUpvotedId(answerId: string): Promise<void> {
  try {
    const ids = await loadUpvotedIds();
    ids.add(answerId);
    await AsyncStorage.setItem(UPVOTE_KEY, JSON.stringify([...ids]));
  } catch {
    // non-fatal
  }
}

export function useQAAnswers(questionId: string): UseQAAnswersResult {
  const wixClient = useOptionalWixClient() as {
    queryData: <T>(
      collectionId: string,
      options?: { filter?: Record<string, unknown>; limit?: number },
    ) => Promise<{ items: T[]; totalResults: number }>;
    insertDataItem: (
      collectionId: string,
      data: Record<string, unknown>,
    ) => Promise<{ id: string; data: Record<string, unknown> }>;
    updateDataItem: (
      collectionId: string,
      itemId: string,
      data: Record<string, unknown>,
    ) => Promise<{ id: string; data: Record<string, unknown> }>;
  } | null;

  const { user } = useAuth();

  const [answers, setAnswers] = useState<QAAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [upvoteError, setUpvoteError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState(false);

  useEffect(() => {
    if (!wixClient) {
      setFetchError('Q&A answers service unavailable');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [result, upvotedIds] = await Promise.all([
          wixClient.queryData<RawAnswer>(COLLECTION_ID, {
            filter: { questionId, status: 'approved' },
            limit: 100,
          }),
          loadUpvotedIds(),
        ]);

        if (!cancelled) {
          const mapped: QAAnswer[] = result.items.map((raw) => ({
            id: raw.id ?? '',
            questionId: raw.questionId ?? questionId,
            parentAnswerId: raw.parentAnswerId ?? null,
            text: raw.text ?? '',
            authorName: raw.authorName ?? '',
            createdDate: raw.createdDate ?? '',
            upvoteCount: raw.upvoteCount ?? 0,
            hasUserUpvoted: upvotedIds.has(raw.id ?? ''),
            status: raw.status ?? 'approved',
          }));
          setAnswers(mapped);
          setFetchError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : 'Failed to load answers');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [questionId, wixClient]);

  const upvoteAnswer = useCallback(
    async (answerId: string) => {
      // Dedup guard — check current state + storage
      const alreadyUpvoted = answers.find((a) => a.id === answerId)?.hasUserUpvoted ?? false;
      if (alreadyUpvoted) return;

      if (!wixClient) return;

      // Optimistic update
      const prevAnswers = answers;
      setAnswers((prev) =>
        prev.map((a) =>
          a.id === answerId ? { ...a, upvoteCount: a.upvoteCount + 1, hasUserUpvoted: true } : a,
        ),
      );
      setUpvoteError(null);

      try {
        const target = prevAnswers.find((a) => a.id === answerId);
        await wixClient.updateDataItem(COLLECTION_ID, answerId, {
          upvoteCount: (target?.upvoteCount ?? 0) + 1,
        });
        await persistUpvotedId(answerId);
      } catch (err) {
        // Rollback
        setAnswers(prevAnswers);
        setUpvoteError(err instanceof Error ? err.message : 'Failed to upvote');
      }
    },
    [answers, wixClient],
  );

  const submitReply = useCallback(
    async (parentAnswerId: string, text: string) => {
      const sanitized = sanitizeText(text ?? '');

      if (!sanitized) {
        setReplyError('Reply is required — please enter your reply');
        return;
      }
      if (sanitized.length > MAX_REPLY_LENGTH) {
        setReplyError(`Reply must be 500 characters or fewer (too long)`);
        return;
      }

      setReplyError(null);
      setReplySuccess(false);

      const newReply: QAAnswer = {
        id: `optimistic-${Date.now()}`,
        questionId,
        parentAnswerId,
        text: sanitized,
        authorName: user?.displayName ?? 'Anonymous',
        createdDate: new Date().toISOString(),
        upvoteCount: 0,
        hasUserUpvoted: false,
        status: 'approved',
      };

      // Optimistic insert
      setAnswers((prev) => [...prev, newReply]);

      try {
        if (!wixClient) throw new Error('Q&A answers service unavailable');
        await wixClient.insertDataItem(COLLECTION_ID, {
          questionId,
          parentAnswerId,
          text: sanitized,
          authorName: newReply.authorName,
          createdDate: newReply.createdDate,
          answered: false,
          upvoteCount: 0,
        });
        setReplySuccess(true);
      } catch (err) {
        // Rollback
        setAnswers((prev) => prev.filter((a) => a !== newReply));
        setReplyError(err instanceof Error ? err.message : 'Failed to submit reply');
      }
    },
    [questionId, user, wixClient],
  );

  const clearReplyStatus = useCallback(() => {
    setReplyError(null);
    setReplySuccess(false);
  }, []);

  return {
    answers,
    loading,
    fetchError,
    upvoteError,
    replyError,
    replySuccess,
    upvoteAnswer,
    submitReply,
    clearReplyStatus,
  };
}

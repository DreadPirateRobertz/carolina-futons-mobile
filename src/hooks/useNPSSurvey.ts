/**
 * @module useNPSSurvey
 *
 * Post-purchase NPS survey trigger hook — cm-5cp.
 *
 * Determines when to show the NPS survey modal:
 *  - At least 3 days must have passed since delivery (deliveredAt)
 *  - Never re-prompt within 90 days (keyed to @cfutons/nps_last_prompted)
 *
 * Exposes dismiss() and submit() which both start the 90-day suppression
 * window on their respective success paths. On Wix submit failure the
 * window is NOT started so the user can retry.
 *
 * Writes to the Wix NPSResponses collection via submitNpsSurvey.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { submitNpsSurvey, type WixClientLike } from '@/services/npsSurvey';
import { captureException } from '@/services/crashReporting';

// ── Constants ─────────────────────────────────────────────────────────────────

export const STORAGE_KEY = '@cfutons/nps_last_prompted';
export const DELIVERY_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
export const SUPPRESS_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export interface UseNPSSurveyOptions {
  /** ID of the most recent delivered order. */
  orderId: string | null;
  /** When the order was delivered. Used for the 3-day trigger gate. */
  deliveredAt: Date | null;
  /** Optional member ID to record in the Wix response. */
  memberId?: string;
  /** Wix client for writing to NPSResponses collection. */
  wixClient?: WixClientLike | null;
  /** Injected storage adapter — defaults to AsyncStorage. Pass a mock in tests. */
  storage?: StorageAdapter;
}

export interface UseNPSSurveyResult {
  /** True when all gate conditions are met and the survey should be displayed. */
  shouldShow: boolean;
  isSubmitting: boolean;
  submitSuccess: boolean;
  submitError: string | null;
  /** Skip the survey. Records the current time to start the 90-day suppress window. */
  dismiss: () => Promise<void>;
  /** Submit a score + optional comment to Wix NPSResponses. */
  submit: (score: number, comment?: string) => Promise<void>;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

async function resolveStorage(injected?: StorageAdapter): Promise<StorageAdapter | null> {
  if (injected) return injected;
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    return mod.default ?? null;
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
      action: 'useNPSSurvey/resolveStorage',
    });
    return null;
  }
}

async function readLastPrompted(storage: StorageAdapter | null): Promise<Date | null> {
  if (!storage) return null;
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
      action: 'useNPSSurvey/readLastPrompted',
    });
    throw err; // re-throw so caller sets storageError
  }
}

async function writeLastPrompted(storage: StorageAdapter | null, now: Date): Promise<void> {
  if (!storage) return;
  try {
    await storage.setItem(STORAGE_KEY, now.toISOString());
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), 'warning', {
      action: 'useNPSSurvey/writeLastPrompted',
    });
    // swallow — best-effort persistence
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNPSSurvey({
  orderId,
  deliveredAt,
  memberId,
  wixClient,
  storage,
}: UseNPSSurveyOptions): UseNPSSurveyResult {
  // null = still loading, Date = loaded value (may be null from storage)
  const [lastPromptedAt, setLastPromptedAt] = useState<Date | null | undefined>(undefined);
  const [storageError, setStorageError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  // Load last-prompted timestamp from storage on mount
  useEffect(() => {
    cancelledRef.current = false;

    (async () => {
      try {
        const s = await resolveStorage(storage);
        const date = await readLastPrompted(s);
        if (!cancelledRef.current) {
          setLastPromptedAt(date);
          setStorageError(false);
        }
      } catch {
        if (!cancelledRef.current) {
          setStorageError(true);
          setLastPromptedAt(null);
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [storage]);

  const shouldShow = useMemo(() => {
    // Still loading storage
    if (lastPromptedAt === undefined) return false;
    // Storage had a read error — conservative: don't show
    if (storageError) return false;
    // Required inputs missing
    if (!orderId || !deliveredAt) return false;
    // Not yet 3 days since delivery
    if (Date.now() - deliveredAt.getTime() < DELIVERY_DELAY_MS) return false;
    // Within 90-day suppress window
    if (lastPromptedAt && Date.now() - lastPromptedAt.getTime() < SUPPRESS_MS) return false;
    return true;
  }, [orderId, deliveredAt, lastPromptedAt, storageError]);

  const suppress = useCallback(async () => {
    const now = new Date();
    setLastPromptedAt(now);
    const s = await resolveStorage(storage);
    await writeLastPrompted(s, now);
  }, [storage]);

  const dismiss = useCallback(async () => {
    await suppress();
  }, [suppress]);

  const submit = useCallback(
    async (score: number, comment?: string) => {
      setIsSubmitting(true);
      setSubmitError(null);

      const trimmed = comment?.trim() ?? '';
      const now = new Date();
      const data = {
        orderId: orderId ?? '',
        score,
        createdAt: now.toISOString(),
        suppressedUntil: new Date(now.getTime() + SUPPRESS_MS).toISOString(),
        ...(trimmed.length > 0 ? { comment: trimmed } : {}),
        ...(memberId !== undefined ? { memberId } : {}),
      };

      try {
        const result = await submitNpsSurvey(wixClient ?? null, data);

        if (!result.success) {
          setSubmitError(result.error ?? 'Submission failed');
          return;
        }

        // Persist suppress window and close modal
        await suppress();
        setSubmitSuccess(true);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        captureException(error, 'error', { action: 'useNPSSurvey/submit', orderId });
        setSubmitError(error.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [orderId, memberId, wixClient, suppress],
  );

  return { shouldShow, isSubmitting, submitSuccess, submitError, dismiss, submit };
}

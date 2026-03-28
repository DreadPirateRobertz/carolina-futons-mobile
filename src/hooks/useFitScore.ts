import { useState, useEffect } from 'react';
import { useWixClient } from '@/services/wix/wixProvider';
import { getCachedFitScore, setCachedFitScore } from '@/services/personalizationCache';
import { captureException } from '@/services/crashReporting';

export interface FitScoreResult {
  score: number | null;
  reasons: string[];
  isLoading: boolean;
  error: string | null;
}

export function useFitScore(productId: string, memberId: string | null): FitScoreResult {
  const client = useWixClient();
  const [score, setScore] = useState<number | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fitScoreEnabled = process.env.EXPO_PUBLIC_FIT_SCORE_ENABLED === 'true';

  useEffect(() => {
    if (!memberId || !fitScoreEnabled || !client) return;

    let cancelled = false;
    setIsLoading(true);

    async function load() {
      try {
        const cached = await getCachedFitScore(productId, memberId!);
        if (cached && !cancelled) {
          setScore(cached.score);
          setReasons(cached.reasons);
          return;
        }
        const result = (await client!.callFunction(
          `/_functions/getFitScore?productId=${encodeURIComponent(productId)}&memberId=${encodeURIComponent(memberId!)}`,
          'GET',
        )) as { score: number; reasons: string[] };
        if (!cancelled) {
          setScore(result.score);
          setReasons(result.reasons);
          await setCachedFitScore(productId, memberId!, {
            score: result.score,
            reasons: result.reasons,
          });
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'fit_score_error';
          setError(msg);
          captureException(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // client intentionally omitted: it comes from stable context and
    // including it causes infinite re-renders when the mock returns a new
    // object on every render call during tests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, memberId, fitScoreEnabled]);

  return { score, reasons, isLoading, error };
}

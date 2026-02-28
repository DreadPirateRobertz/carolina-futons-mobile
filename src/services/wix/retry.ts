/**
 * Retry with exponential backoff for Wix API calls.
 * Mobile networks are unreliable — transient failures should not surface to users.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    shouldRetry = () => true,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt >= maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }

      // Exponential backoff: base * 2^attempt, with random jitter up to +base
      const jitter = Math.random() * baseDelayMs;
      const backoff = baseDelayMs * Math.pow(2, attempt) + jitter;
      await delay(backoff);
    }
  }

  throw lastError!;
}

export type PollResult = 'success' | 'failed' | 'timeout';

export async function pollPaymentConfirmation(
  check: () => Promise<boolean | null>,
  options: { timeoutMs: number; intervalMs: number },
): Promise<PollResult> {
  const { timeoutMs, intervalMs } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result === true) return 'success';
      if (result === false) return 'failed';
    } catch {
      // poll error is non-fatal — continue polling until timeout
    }
    // null = still pending — wait and retry
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  }

  return 'timeout';
}

import { withRetry } from '../retry';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds eventually', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after max retries exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));

    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry when maxRetries is 0', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));

    await expect(withRetry(fn, { maxRetries: 0 })).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respects shouldRetry predicate — stops on non-retryable error', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('permanent'));

    const shouldRetry = (err: Error) => err.message === 'transient';

    await expect(withRetry(fn, { maxRetries: 3, baseDelayMs: 10, shouldRetry })).rejects.toThrow(
      'permanent',
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('respects shouldRetry predicate — retries retryable errors', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('recovered');

    const shouldRetry = (err: Error) => err.message === 'transient';

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10, shouldRetry });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('backoff increases between retries', async () => {
    jest.useFakeTimers();
    const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 20 });

    // attempt 0 fails → backoff = 20 * 2^0 + 0 = 20ms
    await jest.advanceTimersByTimeAsync(20);
    // attempt 1 fails → backoff = 20 * 2^1 + 0 = 40ms
    await jest.advanceTimersByTimeAsync(40);

    await promise;

    expect(fn).toHaveBeenCalledTimes(3);

    mathRandomSpy.mockRestore();
    jest.useRealTimers();
  });

  it('wraps non-Error throws into Error', async () => {
    const fn = jest.fn().mockRejectedValue('string error');

    await expect(withRetry(fn, { maxRetries: 0 })).rejects.toThrow('string error');
  });
});

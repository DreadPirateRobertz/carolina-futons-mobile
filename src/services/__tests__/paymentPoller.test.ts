import { pollPaymentConfirmation } from '../paymentPoller';

jest.useFakeTimers();

const mockCheck = jest.fn();

beforeEach(() => jest.clearAllMocks());
afterAll(() => jest.useRealTimers());

it('returns success when check resolves true immediately', async () => {
  mockCheck.mockResolvedValue(true);
  const resultPromise = pollPaymentConfirmation(mockCheck, { timeoutMs: 5000, intervalMs: 500 });
  await jest.runAllTimersAsync();
  expect(await resultPromise).toBe('success');
});

it('returns failed when check resolves false immediately', async () => {
  mockCheck.mockResolvedValue(false);
  const resultPromise = pollPaymentConfirmation(mockCheck, { timeoutMs: 5000, intervalMs: 500 });
  await jest.runAllTimersAsync();
  expect(await resultPromise).toBe('failed');
});

it('returns timeout when check returns null past deadline', async () => {
  mockCheck.mockResolvedValue(null);
  const resultPromise = pollPaymentConfirmation(mockCheck, { timeoutMs: 1000, intervalMs: 200 });
  await jest.runAllTimersAsync();
  expect(await resultPromise).toBe('timeout');
});

it('stops polling after first success', async () => {
  mockCheck.mockResolvedValueOnce(null).mockResolvedValueOnce(true);
  const resultPromise = pollPaymentConfirmation(mockCheck, { timeoutMs: 5000, intervalMs: 200 });
  await jest.runAllTimersAsync();
  await resultPromise;
  expect(mockCheck).toHaveBeenCalledTimes(2);
});

it('does not throw when check function throws', async () => {
  mockCheck.mockRejectedValue(new Error('network'));
  const resultPromise = pollPaymentConfirmation(mockCheck, { timeoutMs: 1000, intervalMs: 200 });
  await jest.runAllTimersAsync();
  await expect(resultPromise).resolves.toBe('timeout');
});

import { registerPushToken } from '../notifications';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

describe('registerPushToken', () => {
  it('sends token to backend via POST', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await registerPushToken('ExponentPushToken[abc123]');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/push-tokens'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('ExponentPushToken[abc123]'),
      }),
    );
  });

  it('retries on network failure', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true });
    await registerPushToken('ExponentPushToken[abc123]');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries exhausted', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network'))
      .mockRejectedValueOnce(new Error('Network'))
      .mockRejectedValueOnce(new Error('Network'));
    await expect(registerPushToken('ExponentPushToken[abc123]')).rejects.toThrow();
  });

  it('does not retry on 4xx client errors', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(registerPushToken('ExponentPushToken[abc123]')).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

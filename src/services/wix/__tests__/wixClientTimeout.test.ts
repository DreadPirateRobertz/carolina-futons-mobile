import { WixClient, type WixClientConfig, WixApiError } from '../wixClient';

// --- Mock fetch globally ---
const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEST_CONFIG: WixClientConfig = {
  apiKey: 'test-api-key-12345',
  siteId: 'test-site-id-67890',
};

afterEach(() => {
  mockFetch.mockReset();
});

describe('WixClient request timeout', () => {
  it('aborts request after default timeout (10s)', async () => {
    // Mock fetch that rejects when signal is aborted
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );

    // Use a very short timeout to avoid slow tests
    const client = new WixClient({ ...TEST_CONFIG, timeoutMs: 50 });
    await expect(client.queryProducts({})).rejects.toThrow(/timeout/i);
  }, 10_000);

  it('succeeds when response arrives before timeout', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ products: [], totalResults: 0 }),
    });

    const client = new WixClient(TEST_CONFIG);
    const result = await client.queryProducts({});
    expect(result).toBeDefined();
  });

  it('passes AbortSignal to fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ products: [], totalResults: 0 }),
    });

    const client = new WixClient(TEST_CONFIG);
    await client.queryProducts({});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('wraps abort error as WixApiError with timeout message', async () => {
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );

    const client = new WixClient({ ...TEST_CONFIG, timeoutMs: 50 });

    try {
      await client.queryProducts({});
      fail('Expected WixApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(WixApiError);
      expect((err as WixApiError).message).toMatch(/timeout/i);
    }
  }, 10_000);

  it('allows custom timeout via config', async () => {
    const callTimes: number[] = [];

    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          callTimes.push(Date.now());
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );

    // 100ms should time out quickly
    const client = new WixClient({ ...TEST_CONFIG, timeoutMs: 100 });
    const start = Date.now();

    await expect(client.queryProducts({})).rejects.toThrow(/timeout/i);

    const elapsed = Date.now() - start;
    // Should timeout around 100ms, not 10s
    expect(elapsed).toBeLessThan(2_000);
  }, 10_000);

  it('does not retry timeout errors', async () => {
    let fetchCallCount = 0;

    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          fetchCallCount++;
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );

    const client = new WixClient({ ...TEST_CONFIG, timeoutMs: 50 });
    await expect(client.queryProducts({})).rejects.toThrow(/timeout/i);

    // Should only be called once — no retries for timeouts
    expect(fetchCallCount).toBe(1);
  }, 10_000);

  it('cleans up timer on successful response', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ products: [], totalResults: 0 }),
    });

    const client = new WixClient(TEST_CONFIG);
    await client.queryProducts({});

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});

/**
 * TDD tests for cm-006 — Channel A dual-write
 *
 * sendCrossRigEvent must fire two concurrent legs:
 *   1. Wix leg  — wixClient.callFunction('crossRigEventReceiver', ...)
 *   2. CFW leg  — fetch POST to CFW_API_URL/api/cross-rig
 *
 * Failure model: single-leg failure logs, aggregate error only when BOTH fail.
 * Secret missing: CFW leg skipped + console.warn, Wix leg fires normally.
 */

import { sendCrossRigEvent, CROSS_RIG_SOURCE, type CrossRigEventType } from '../crossRigSync';

// ── Helper ────────────────────────────────────────────────────────────────────

interface MockWixClient {
  callFunction: jest.Mock;
}

function makeMockWixClient(callFunctionImpl?: jest.Mock): MockWixClient {
  return {
    callFunction:
      callFunctionImpl ??
      jest.fn().mockResolvedValue({ success: true, alreadyAwarded: false, pointsAwarded: 75 }),
  };
}

function mockFetchOk(): jest.SpyInstance {
  return jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(new Response('ok', { status: 200 }) as unknown as Response);
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

const ORIG_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIG_ENV };
  process.env.CROSS_RIG_SECRET = 'test-secret';
  process.env.CFW_API_URL = 'https://api.carolinafutons.com';
});

afterEach(() => {
  process.env = ORIG_ENV;
  jest.restoreAllMocks();
});

// ── §3.1 Both Calls Fire on a Valid Event ─────────────────────────────────────

describe('D — both legs fire on a valid event', () => {
  it('D1: Wix leg fires (callFunction called)', async () => {
    const wixClient = makeMockWixClient();
    mockFetchOk();

    await sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', { score: 90 });

    expect(wixClient.callFunction).toHaveBeenCalledWith(
      'crossRigEventReceiver',
      'POST',
      expect.any(Object),
    );
  });

  it('D2: CFW leg fires (fetch called)', async () => {
    const wixClient = makeMockWixClient();
    const mockFetch = mockFetchOk();

    await sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', { score: 90 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('D3: both legs called exactly once', async () => {
    const wixClient = makeMockWixClient();
    const mockFetch = mockFetchOk();

    await sendCrossRigEvent(wixClient, 'member-1', 'badge_earned', { badgeId: 'vip' });

    expect(wixClient.callFunction).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('D4: function resolves (returns void) when both succeed', async () => {
    const wixClient = makeMockWixClient();
    mockFetchOk();

    await expect(
      sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {}),
    ).resolves.toBeUndefined();
  });
});

// ── §3.2 CFW Call Uses Correct Header ────────────────────────────────────────

describe('H — CFW request shape', () => {
  it('H1: X-Cross-Rig-Secret header is present', async () => {
    const mockFetch = mockFetchOk();
    await sendCrossRigEvent(makeMockWixClient(), 'member-1', 'badge_earned', { badgeId: 'vip' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Cross-Rig-Secret']).toBeDefined();
  });

  it('H2: X-Cross-Rig-Secret value matches CROSS_RIG_SECRET env var', async () => {
    process.env.CROSS_RIG_SECRET = 'my-secret-value';
    const mockFetch = mockFetchOk();

    await sendCrossRigEvent(makeMockWixClient(), 'member-1', 'badge_earned', { badgeId: 'vip' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Cross-Rig-Secret']).toBe('my-secret-value');
  });

  it('H3: request method is POST', async () => {
    const mockFetch = mockFetchOk();
    await sendCrossRigEvent(makeMockWixClient(), 'member-1', 'quiz_completed', {});

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
  });

  it('H4: Content-Type is application/json', async () => {
    const mockFetch = mockFetchOk();
    await sendCrossRigEvent(makeMockWixClient(), 'member-1', 'quiz_completed', {});

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('H5: request body contains memberId, event, payload, sourceRig', async () => {
    const mockFetch = mockFetchOk();
    await sendCrossRigEvent(makeMockWixClient(), 'member-1', 'tier_changed', { tier: 'gold' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.memberId).toBe('member-1');
    expect(body.event).toBe('tier_changed');
    expect(body.payload).toEqual({ tier: 'gold' });
    expect(body.sourceRig).toBe(CROSS_RIG_SOURCE);
  });

  it('CFW URL targets CFW_API_URL/api/cross-rig', async () => {
    process.env.CFW_API_URL = 'https://api.carolinafutons.com';
    const mockFetch = mockFetchOk();

    await sendCrossRigEvent(makeMockWixClient(), 'member-1', 'quiz_completed', {});

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.carolinafutons.com/api/cross-rig');
  });
});

// ── §3.3 Wix Failure Does Not Block CFW ───────────────────────────────────────

describe('W — Wix leg failure is isolated', () => {
  it('W1: CFW leg fires even when Wix leg throws', async () => {
    const wixClient = makeMockWixClient(jest.fn().mockRejectedValue(new Error('wix down')));
    const mockFetch = mockFetchOk();

    await sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {});

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('W2: function does not throw on Wix-only failure', async () => {
    const wixClient = makeMockWixClient(jest.fn().mockRejectedValue(new Error('wix down')));
    mockFetchOk();

    await expect(
      sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {}),
    ).resolves.toBeUndefined();
  });

  it('W3: Wix leg error is logged via console.error', async () => {
    const wixError = new Error('wix down');
    const wixClient = makeMockWixClient(jest.fn().mockRejectedValue(wixError));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchOk();

    await sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {});

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[crossRigSync] Wix leg failed'),
      expect.anything(),
    );
  });
});

// ── §3.4 CFW Failure Does Not Block Wix ──────────────────────────────────────

describe('C — CFW leg failure is isolated', () => {
  it('C1: Wix leg fires even when CFW leg throws', async () => {
    const wixClient = makeMockWixClient();
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('cfw down'));

    await sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {});

    expect(wixClient.callFunction).toHaveBeenCalledWith(
      'crossRigEventReceiver',
      'POST',
      expect.any(Object),
    );
  });

  it('C2: function does not throw on CFW-only failure', async () => {
    const wixClient = makeMockWixClient();
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('cfw down'));

    await expect(
      sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {}),
    ).resolves.toBeUndefined();
  });

  it('C3: CFW leg error is logged via console.error', async () => {
    const wixClient = makeMockWixClient();
    const cfwError = new Error('cfw down');
    jest.spyOn(global, 'fetch').mockRejectedValue(cfwError);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {});

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[crossRigSync] CFW leg failed'),
      expect.anything(),
    );
  });
});

// ── §3.5 Secret Missing from Env ─────────────────────────────────────────────

describe('S — secret missing guard', () => {
  it('S1: CFW leg is skipped when CROSS_RIG_SECRET is not set', async () => {
    delete process.env.CROSS_RIG_SECRET;
    const mockFetch = jest.spyOn(global, 'fetch');

    await sendCrossRigEvent(makeMockWixClient(), 'member-1', 'quiz_completed', {});

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('S2: Wix leg still fires when CROSS_RIG_SECRET is not set', async () => {
    delete process.env.CROSS_RIG_SECRET;
    jest.spyOn(global, 'fetch');
    const wixClient = makeMockWixClient();

    await sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {});

    expect(wixClient.callFunction).toHaveBeenCalledWith(
      'crossRigEventReceiver',
      'POST',
      expect.any(Object),
    );
  });

  it('S3: console.warn called with message including CROSS_RIG_SECRET', async () => {
    delete process.env.CROSS_RIG_SECRET;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch');

    await sendCrossRigEvent(makeMockWixClient(), 'member-1', 'quiz_completed', {});

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('CROSS_RIG_SECRET'));
  });

  it('S4: function resolves when secret missing and Wix succeeds', async () => {
    delete process.env.CROSS_RIG_SECRET;
    jest.spyOn(global, 'fetch');

    await expect(
      sendCrossRigEvent(makeMockWixClient(), 'member-1', 'quiz_completed', {}),
    ).resolves.toBeUndefined();
  });

  it('S5: empty string treated same as missing — CFW leg skipped', async () => {
    process.env.CROSS_RIG_SECRET = '';
    const mockFetch = jest.spyOn(global, 'fetch');

    await sendCrossRigEvent(makeMockWixClient(), 'member-1', 'quiz_completed', {});

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── §3.6 Both Legs Fail — Aggregate Error ────────────────────────────────────

describe('A — aggregate error when both legs fail', () => {
  it('A1: throws when both Wix and CFW legs fail', async () => {
    const wixClient = makeMockWixClient(jest.fn().mockRejectedValue(new Error('wix down')));
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('cfw down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {})).rejects.toThrow(
      '[crossRigSync] dual-write: both legs failed',
    );
  });

  it('A2: thrown error message references both failures', async () => {
    const wixClient = makeMockWixClient(jest.fn().mockRejectedValue(new Error('wix down')));
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('cfw down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {})).rejects.toThrow(
      '[crossRigSync] dual-write: both legs failed',
    );
  });

  it('A3: both errors logged before aggregate throw', async () => {
    const wixClient = makeMockWixClient(jest.fn().mockRejectedValue(new Error('wix down')));
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('cfw down'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {})).rejects.toThrow();

    expect(errorSpy).toHaveBeenCalledTimes(2);
  });
});

// ── §3.7 All 5 Channel A Event Types ─────────────────────────────────────────

const ALL_EVENTS: CrossRigEventType[] = [
  'quiz_completed',
  'ar_discovery_completed',
  'social_share_completed',
  'badge_earned',
  'tier_changed',
];

describe('E — all 5 Channel A event types route to both legs', () => {
  for (const event of ALL_EVENTS) {
    it(`fires both legs for ${event}`, async () => {
      const wixClient = makeMockWixClient();
      const mockFetch = mockFetchOk();

      await sendCrossRigEvent(wixClient, 'member-1', event, {});

      expect(wixClient.callFunction).toHaveBeenCalledWith(
        'crossRigEventReceiver',
        'POST',
        expect.objectContaining({ event }),
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  }
});

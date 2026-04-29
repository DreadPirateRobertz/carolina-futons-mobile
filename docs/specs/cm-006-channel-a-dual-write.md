# TDD Spec: cm-006 — Channel A Dual-Write

**Bead**: cm-006  
**Author**: bishop  
**Date**: 2026-04-28  
**Status**: READY — implementor to write tests first, then implementation  
**Implementor**: (TBD — assign before starting)  

---

## Purpose

`sendCrossRigEvent` in `src/services/crossRigSync.ts` currently calls only the Wix backend
function `crossRigEventReceiver`. After cm-006 it must fire **two** calls on every event:

1. **Wix leg** — `wixClient.callFunction('crossRigEventReceiver', ...)` (existing)
2. **CFW leg** — `fetch(CFW_API_URL + '/api/cross-rig', { method: 'POST', headers: { 'X-Cross-Rig-Secret': secret } })` (new)

Both calls fire concurrently. Failure of either is logged but does not block the other.
If both fail, an aggregate error is thrown. If the secret is missing from env, the CFW leg
is skipped with a warning and the Wix leg fires normally.

---

## 1. Regression Guard — Existing Tests Must Not Break

The current test suite in `src/services/__tests__/crossRigSync.test.ts` covers `sendCrossRigEvent`
with the cases below. **All must continue to pass after cm-006.**

| # | Test | Must still hold |
|---|------|----------------|
| R1 | Resolves for each of the 5 event types | ✓ — dual-write must not change return value (void) |
| R2 | Calls crossRigEventReceiver with correct body | ✓ — Wix leg shape unchanged |
| R3 | Includes payload in call body | ✓ |
| R4 | Throws on empty memberId | ✓ — guard fires before either leg |
| R5 | Throws on whitespace memberId | ✓ |
| R6 | Propagates wixClient rejection | ✗ — CHANGES: single Wix failure no longer throws; see §3 below |

> **Note on R6**: The current behavior propagates any Wix rejection. After cm-006, a single-leg
> failure is logged-not-thrown (unless both fail). The existing R6 test must be updated to
> assert logging instead of throwing. The implementor must update this test explicitly.

---

## 2. Implementation Shape

### 2.1 Signature — no change to public API

```ts
export async function sendCrossRigEvent(
  wixClient: WixClientLike,
  memberId: string,
  event: CrossRigEventType,
  payload: Record<string, unknown>,
): Promise<void>
```

The function reads env vars internally. No new parameters required.

### 2.2 Env Vars Required

| Var | Purpose |
|-----|---------|
| `CROSS_RIG_SECRET` | Value sent as `X-Cross-Rig-Secret` header |
| `CFW_API_URL` | Base URL of the CFW API (e.g. `https://api.carolinafutons.com`) |

Both are read at call time (not module load time), so tests can set/unset them per case.

### 2.3 Concurrency Model

```ts
const [wixResult, cfwResult] = await Promise.allSettled([wixLeg, cfwLeg]);

if (wixResult.status === 'rejected') console.error('[crossRigSync] Wix leg failed', wixResult.reason);
if (cfwResult.status === 'rejected') console.error('[crossRigSync] CFW leg failed', cfwResult.reason);

if (wixResult.status === 'rejected' && cfwResult.status === 'rejected') {
  throw new Error('[crossRigSync] dual-write: both legs failed');
}
```

### 2.4 Secret-Missing Guard

```ts
const secret = process.env.CROSS_RIG_SECRET;
if (!secret) {
  console.warn('[crossRigSync] CROSS_RIG_SECRET not set — CFW leg skipped');
  // only fire Wix leg
}
```

### 2.5 CFW Request Shape

```ts
fetch(`${process.env.CFW_API_URL}/api/cross-rig`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Cross-Rig-Secret': secret,
  },
  body: JSON.stringify({ memberId, event, payload, sourceRig: CROSS_RIG_SOURCE }),
})
```

---

## 3. Test Cases — sendCrossRigEvent Dual-Write

All tests mock:
- `wixClient` via `makeMockWixClient()` (existing helper)
- `global.fetch` via `jest.spyOn(global, 'fetch')` or `jest.fn()`
- Env vars via `process.env.CROSS_RIG_SECRET = 'test-secret'` in `beforeEach`

### 3.1 Both Calls Fire on a Valid Event

| # | Description | Setup | Assert |
|---|-------------|-------|--------|
| D1 | Wix leg fires | valid event, both mocks resolve | `wixClient.callFunction` called with 'crossRigEventReceiver' |
| D2 | CFW leg fires | valid event, both mocks resolve | `fetch` called with CFW URL |
| D3 | Both fire concurrently | valid event | both called exactly once |
| D4 | Function resolves (returns void) | valid event, both succeed | `await sendCrossRigEvent(...)` resolves |

```ts
it('fires both Wix and CFW legs on a valid event', async () => {
  const wixClient = makeMockWixClient();
  const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
  process.env.CROSS_RIG_SECRET = 'test-secret';

  await sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', { score: 90 });

  expect(wixClient.callFunction).toHaveBeenCalledWith('crossRigEventReceiver', 'POST', expect.any(Object));
  expect(mockFetch).toHaveBeenCalledTimes(1);
  mockFetch.mockRestore();
});
```

### 3.2 CFW Call Uses Correct Header

| # | Description | Assert |
|---|-------------|--------|
| H1 | X-Cross-Rig-Secret header is present | fetch called with headers containing 'X-Cross-Rig-Secret' |
| H2 | Header value matches CROSS_RIG_SECRET env var | header value === process.env.CROSS_RIG_SECRET |
| H3 | Request method is POST | fetch called with `method: 'POST'` |
| H4 | Content-Type is application/json | fetch called with `Content-Type: application/json` |
| H5 | Request body contains memberId, event, payload, sourceRig | body JSON parsed correctly |

```ts
it('sends X-Cross-Rig-Secret header with the correct value', async () => {
  process.env.CROSS_RIG_SECRET = 'my-secret-value';
  const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

  await sendCrossRigEvent(makeMockWixClient(), 'member-1', 'badge_earned', { badgeId: 'vip' });

  const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect((init.headers as Record<string, string>)['X-Cross-Rig-Secret']).toBe('my-secret-value');
  mockFetch.mockRestore();
});
```

### 3.3 Wix Failure Does Not Block CFW Call

| # | Description | Setup | Assert |
|---|-------------|-------|--------|
| W1 | CFW leg fires even when Wix leg throws | wixClient rejects, fetch resolves | `fetch` was called |
| W2 | Function does not throw on Wix-only failure | wixClient rejects, fetch resolves | `await` resolves (no throw) |
| W3 | Wix error is logged | wixClient rejects | `console.error` called with Wix error |

```ts
it('still calls CFW when Wix leg rejects', async () => {
  const wixClient = makeMockWixClient(jest.fn().mockRejectedValue(new Error('wix down')));
  const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
  process.env.CROSS_RIG_SECRET = 'test-secret';

  await sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {});

  expect(mockFetch).toHaveBeenCalledTimes(1);
  mockFetch.mockRestore();
});
```

### 3.4 CFW Failure Does Not Block Wix Call

| # | Description | Setup | Assert |
|---|-------------|-------|--------|
| C1 | Wix leg fires even when CFW leg throws | fetch rejects, wixClient resolves | `wixClient.callFunction` was called |
| C2 | Function does not throw on CFW-only failure | fetch rejects, wixClient resolves | `await` resolves (no throw) |
| C3 | CFW error is logged | fetch rejects | `console.error` called with CFW error |

```ts
it('still calls Wix when CFW leg rejects', async () => {
  const wixClient = makeMockWixClient();
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('cfw down'));
  process.env.CROSS_RIG_SECRET = 'test-secret';

  await sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {});

  expect(wixClient.callFunction).toHaveBeenCalledWith('crossRigEventReceiver', 'POST', expect.any(Object));
});
```

### 3.5 Secret Missing from Env

| # | Description | Setup | Assert |
|---|-------------|-------|--------|
| S1 | CFW leg is skipped | CROSS_RIG_SECRET = undefined | `fetch` NOT called |
| S2 | Wix leg still fires | CROSS_RIG_SECRET = undefined | `wixClient.callFunction` called |
| S3 | console.warn is called | CROSS_RIG_SECRET = undefined | `console.warn` called with message including 'CROSS_RIG_SECRET' |
| S4 | Function resolves (no throw) | CROSS_RIG_SECRET = undefined, Wix resolves | `await` resolves |
| S5 | Empty string treated same as missing | CROSS_RIG_SECRET = '' | same as S1–S4 |

```ts
it('skips CFW leg and warns when CROSS_RIG_SECRET is not set', async () => {
  delete process.env.CROSS_RIG_SECRET;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const mockFetch = jest.spyOn(global, 'fetch');

  await sendCrossRigEvent(makeMockWixClient(), 'member-1', 'quiz_completed', {});

  expect(mockFetch).not.toHaveBeenCalled();
  expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('CROSS_RIG_SECRET'));
  warnSpy.mockRestore();
  mockFetch.mockRestore();
});
```

### 3.6 Both Calls Fail — Aggregate Error

| # | Description | Setup | Assert |
|---|-------------|-------|--------|
| A1 | Function throws when both legs fail | wixClient rejects + fetch rejects | `await` rejects |
| A2 | Error message references both failures | wixClient rejects + fetch rejects | thrown error message indicates dual failure |
| A3 | Both errors are logged before throw | wixClient rejects + fetch rejects | `console.error` called twice |

```ts
it('throws aggregate error when both Wix and CFW legs fail', async () => {
  const wixClient = makeMockWixClient(jest.fn().mockRejectedValue(new Error('wix down')));
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('cfw down'));
  process.env.CROSS_RIG_SECRET = 'test-secret';

  await expect(
    sendCrossRigEvent(wixClient, 'member-1', 'quiz_completed', {}),
  ).rejects.toThrow('[crossRigSync] dual-write: both legs failed');
});
```

### 3.7 All 5 Channel A Event Types Pass Through

All 5 `CrossRigEventType` values must be accepted and route both legs correctly.

| # | Event | Assert both legs fire |
|---|-------|----------------------|
| E1 | quiz_completed | ✓ |
| E2 | ar_discovery_completed | ✓ |
| E3 | social_share_completed | ✓ |
| E4 | badge_earned | ✓ |
| E5 | tier_changed | ✓ |

```ts
const ALL_EVENTS: CrossRigEventType[] = [
  'quiz_completed',
  'ar_discovery_completed',
  'social_share_completed',
  'badge_earned',
  'tier_changed',
];

describe('all 5 Channel A event types route to both legs', () => {
  for (const event of ALL_EVENTS) {
    it(`fires both legs for ${event}`, async () => {
      const wixClient = makeMockWixClient();
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
      process.env.CROSS_RIG_SECRET = 'test-secret';

      await sendCrossRigEvent(wixClient, 'member-1', event, {});

      expect(wixClient.callFunction).toHaveBeenCalledWith('crossRigEventReceiver', 'POST', expect.objectContaining({ event }));
      expect(mockFetch).toHaveBeenCalledTimes(1);
      mockFetch.mockRestore();
    });
  }
});
```

---

## 4. Wix Leg Body — Unchanged Shape

The Wix leg must send the same body as today. Existing tests assert this (R1–R5 above).

```ts
{
  memberId: string,
  event: CrossRigEventType,
  payload: Record<string, unknown>,
  sourceRig: 'cfutons_mobile',
}
```

---

## 5. CFW Leg Body — New

```ts
{
  memberId: string,
  event: CrossRigEventType,
  payload: Record<string, unknown>,
  sourceRig: 'cfutons_mobile',
}
```

Same shape as Wix. The CFW endpoint mirrors the contract (cf-eihx).

---

## 6. Logging Contract

| Situation | Log level | Message must include |
|-----------|-----------|---------------------|
| Wix leg fails (not both) | `console.error` | '[crossRigSync] Wix leg failed' + error |
| CFW leg fails (not both) | `console.error` | '[crossRigSync] CFW leg failed' + error |
| Secret missing | `console.warn` | '[crossRigSync] CROSS_RIG_SECRET not set' |
| Both legs fail | `console.error` × 2, then throw | Both errors logged before aggregate throw |

No empty catch blocks. Every failure path logs before continuing or throwing.

---

## 7. Functions Not Affected by cm-006

Only `sendCrossRigEvent` changes. These functions are untouched:

- `syncMobilePoints` — Wix-only, no CFW dual-write
- `completeMobileChallenge` — Wix-only
- `getMobileChallengeProgress` — Wix-only
- `sendPushToMember` — Wix-only

Their existing tests must not be modified.

---

## 8. Implementor Checklist (TDD — write tests first)

- [ ] Write all test cases in §3 BEFORE touching implementation
- [ ] Update R6 (Wix rejection propagation) to assert log-not-throw
- [ ] Implement `sendCrossRigEvent` with `Promise.allSettled` dual-write
- [ ] Add secret-missing guard with `console.warn`
- [ ] Add per-leg `console.error` on failure
- [ ] Throw aggregate error when both legs fail
- [ ] All 5 event types pass E1–E5
- [ ] All existing crossRigSync tests still pass (R1–R5, all other describe blocks)
- [ ] No empty catch blocks

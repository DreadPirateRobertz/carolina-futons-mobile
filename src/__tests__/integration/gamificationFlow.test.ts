/**
 * @jest-environment node
 *
 * @file gamificationFlow.test.ts
 *
 * Integration tests — gamification event + challenge progress roundtrip.
 * Uses MSW to intercept WixClient HTTP calls against documented API contracts
 * (cf-blf: activeChallenges, cf-3hv: challengeProgress, hq-825vi: gamificationEvent).
 *
 * cf-alv
 *
 * Blockers:
 *   - POST /_functions/gamificationEvent client wrapper — PR #278 (gamificationApi.ts)
 *   - POST /_functions/challengeProgress client wrapper — cf-3hv (radahn)
 *   Tests that depend on those wrappers are marked it.todo until those PRs merge.
 *   The HTTP contract tests run today via WixClient.callFunction directly.
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { WixClient, WixApiError } from '@/services/wix/wixClient';

// ── Constants ─────────────────────────────────────────────────────────────

const BASE = 'https://www.wixapis.com';

const PATHS = {
  gamificationEvent: `${BASE}/_functions/gamificationEvent`,
  activeChallenges: `${BASE}/_functions/getActiveChallenges`,
  challengeProgress: `${BASE}/_functions/challengeProgress`,
};

// ── Shared client ─────────────────────────────────────────────────────────

// Uses real HTTP via MSW interception — no fetch mock needed.
const client = new WixClient({
  apiKey: 'test-api-key',
  siteId: 'test-site-id',
  timeoutMs: 5_000,
});

// ── Fixtures ──────────────────────────────────────────────────────────────

const MEMBER_ID = 'mbr-001';

const CHALLENGE_PARTIAL: ApiChallenge = {
  challengeId: 'ch-review-5',
  title: '5 Reviews',
  description: 'Submit 5 product reviews to earn points.',
  conditionType: 'review_count',
  targetCount: 5,
  rewardPoints: 500,
  rewardBadgeId: null,
  expiresAt: '2026-06-01T00:00:00.000Z',
  progress: { progressValue: 3, completedAt: null },
};

const CHALLENGE_COMPLETED: ApiChallenge = {
  ...CHALLENGE_PARTIAL,
  progress: { progressValue: 5, completedAt: '2026-03-23T12:00:00.000Z' },
};

// Match the ApiChallenge shape from useActiveChallenges
interface ApiChallengeProgress {
  progressValue: number;
  completedAt: string | null;
}
interface ApiChallenge {
  challengeId: string;
  title: string;
  description: string;
  conditionType: string;
  targetCount: number;
  rewardPoints: number;
  rewardBadgeId: string | null;
  expiresAt: string;
  progress: ApiChallengeProgress;
}

// ── MSW server setup ──────────────────────────────────────────────────────

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ── POST /_functions/gamificationEvent ───────────────────────────────────

describe('POST /_functions/gamificationEvent', () => {
  it('returns 200 and records the event', async () => {
    let receivedBody: unknown;
    server.use(
      http.post(PATHS.gamificationEvent, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ success: true, eventId: 'evt-abc' });
      }),
    );

    const result = await client.callFunction<{ success: boolean; eventId: string }>(
      '/_functions/gamificationEvent',
      'POST',
      {
        memberId: MEMBER_ID,
        eventType: 'gamification_add_to_cart',
        properties: { product_id: 'p1', price: 349 },
      },
    );

    expect(result.success).toBe(true);
    expect(result.eventId).toBe('evt-abc');
    expect(receivedBody).toMatchObject({
      memberId: MEMBER_ID,
      eventType: 'gamification_add_to_cart',
    });
  });

  it('throws WixApiError(403) on IDOR — member calling for another member', async () => {
    server.use(
      http.post(PATHS.gamificationEvent, () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
      ),
    );

    await expect(
      client.callFunction('/_functions/gamificationEvent', 'POST', {
        memberId: 'other-member',
        eventType: 'gamification_add_to_cart',
      }),
    ).rejects.toMatchObject({ statusCode: 403, name: 'WixApiError' });
  });

  it('throws WixApiError(429) on rate limit exceeded', async () => {
    server.use(
      http.post(PATHS.gamificationEvent, () =>
        HttpResponse.json({ message: 'Too Many Requests' }, { status: 429 }),
      ),
    );

    await expect(
      client.callFunction('/_functions/gamificationEvent', 'POST', {
        memberId: MEMBER_ID,
        eventType: 'gamification_add_to_cart',
      }),
    ).rejects.toMatchObject({ statusCode: 429 });
  });

  // 5xx triggers retry — use fake timers to advance past backoff delays.
  // Attach the rejection assertion BEFORE running timers so the rejection
  // handler is registered before the promise settles (avoids PromiseRejectionHandledWarning).
  it('throws WixApiError(500) after exhausting retries on server error', async () => {
    jest.useFakeTimers();
    let callCount = 0;
    server.use(
      http.post(PATHS.gamificationEvent, () => {
        callCount++;
        return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
      }),
    );

    const promise = client.callFunction('/_functions/gamificationEvent', 'POST', {
      memberId: MEMBER_ID,
      eventType: 'gamification_add_to_cart',
    });
    // Register rejection handler first, THEN advance timers, THEN await assertion
    const assertion = expect(promise).rejects.toMatchObject({
      statusCode: 500,
      name: 'WixApiError',
    });
    await jest.runAllTimersAsync();
    await assertion;

    // withRetry retries twice → 3 total attempts
    expect(callCount).toBe(3);
    jest.useRealTimers();
  });

  it.todo('client wrapper (gamificationApi.ts, PR #278): emits event via exported function');
});

// ── POST /_functions/getActiveChallenges ─────────────────────────────────

describe('POST /_functions/getActiveChallenges (useActiveChallenges contract)', () => {
  it('returns challenges array with progress data', async () => {
    server.use(
      http.post(PATHS.activeChallenges, () =>
        HttpResponse.json({ challenges: [CHALLENGE_PARTIAL] }),
      ),
    );

    const result = await client.callFunction<{ challenges: ApiChallenge[] }>(
      '/_functions/getActiveChallenges',
      'POST',
      {},
    );

    expect(result.challenges).toHaveLength(1);
    expect(result.challenges[0]).toMatchObject({
      challengeId: 'ch-review-5',
      title: '5 Reviews',
      rewardPoints: 500,
      progress: { progressValue: 3, completedAt: null },
    });
  });

  it('returns empty array when member has no active challenges', async () => {
    server.use(http.post(PATHS.activeChallenges, () => HttpResponse.json({ challenges: [] })));

    const result = await client.callFunction<{ challenges: ApiChallenge[] }>(
      '/_functions/getActiveChallenges',
      'POST',
      {},
    );

    expect(result.challenges).toEqual([]);
  });

  it('returns challenges with completed progress (completedAt is set)', async () => {
    server.use(
      http.post(PATHS.activeChallenges, () =>
        HttpResponse.json({ challenges: [CHALLENGE_COMPLETED] }),
      ),
    );

    const result = await client.callFunction<{ challenges: ApiChallenge[] }>(
      '/_functions/getActiveChallenges',
      'POST',
      {},
    );

    const ch = result.challenges[0];
    expect(ch.progress.progressValue).toBe(5);
    expect(ch.progress.completedAt).not.toBeNull();
  });

  it('throws WixApiError(429) on rate limit', async () => {
    server.use(
      http.post(PATHS.activeChallenges, () =>
        HttpResponse.json({ message: 'Too Many Requests' }, { status: 429 }),
      ),
    );

    await expect(
      client.callFunction('/_functions/getActiveChallenges', 'POST', {}),
    ).rejects.toMatchObject({ statusCode: 429 });
  });

  it('throws WixApiError on non-ok response (401 unauthorized)', async () => {
    server.use(
      http.post(PATHS.activeChallenges, () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
    );

    await expect(
      client.callFunction('/_functions/getActiveChallenges', 'POST', {}),
    ).rejects.toBeInstanceOf(WixApiError);
  });
});

// ── POST /_functions/challengeProgress ───────────────────────────────────
// cf-3hv: endpoint implemented by radahn. Tests run once that PR merges.

describe('POST /_functions/challengeProgress', () => {
  it('records incremental progress (not yet completed)', async () => {
    server.use(
      http.post(PATHS.challengeProgress, async ({ request }) => {
        const body = (await request.json()) as { increment?: number };
        const increment = body.increment ?? 1;
        return HttpResponse.json({
          success: true,
          newProgress: 3 + increment,
          completed: false,
          pointsAwarded: 0,
        });
      }),
    );

    const result = await client.callFunction<{
      success: boolean;
      newProgress: number;
      completed: boolean;
      pointsAwarded: number;
    }>('/_functions/challengeProgress', 'POST', {
      memberId: MEMBER_ID,
      challengeId: 'ch-review-5',
      increment: 1,
    });

    expect(result.success).toBe(true);
    expect(result.completed).toBe(false);
    expect(result.newProgress).toBe(4);
    expect(result.pointsAwarded).toBe(0);
  });

  it('marks completed and awards points when progress reaches targetCount', async () => {
    server.use(
      http.post(PATHS.challengeProgress, () =>
        HttpResponse.json({
          success: true,
          newProgress: 5,
          completed: true,
          pointsAwarded: 500,
        }),
      ),
    );

    const result = await client.callFunction<{
      success: boolean;
      newProgress: number;
      completed: boolean;
      pointsAwarded: number;
    }>('/_functions/challengeProgress', 'POST', {
      memberId: MEMBER_ID,
      challengeId: 'ch-review-5',
      increment: 2,
    });

    expect(result.completed).toBe(true);
    expect(result.pointsAwarded).toBe(500);
    expect(result.newProgress).toBe(5);
  });

  it("throws WixApiError(403) when member tries to update another member's progress", async () => {
    server.use(
      http.post(PATHS.challengeProgress, () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
      ),
    );

    await expect(
      client.callFunction('/_functions/challengeProgress', 'POST', {
        memberId: 'other-member',
        challengeId: 'ch-review-5',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws WixApiError(429) on rate limit', async () => {
    server.use(
      http.post(PATHS.challengeProgress, () =>
        HttpResponse.json({ message: 'Too Many Requests' }, { status: 429 }),
      ),
    );

    await expect(
      client.callFunction('/_functions/challengeProgress', 'POST', {
        memberId: MEMBER_ID,
        challengeId: 'ch-review-5',
      }),
    ).rejects.toMatchObject({ statusCode: 429 });
  });

  it('throws WixApiError(500) after exhausting retries on server error', async () => {
    jest.useFakeTimers();
    let callCount = 0;
    server.use(
      http.post(PATHS.challengeProgress, () => {
        callCount++;
        return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
      }),
    );

    const promise = client.callFunction('/_functions/challengeProgress', 'POST', {
      memberId: MEMBER_ID,
      challengeId: 'ch-review-5',
    });
    const assertion = expect(promise).rejects.toMatchObject({
      statusCode: 500,
      name: 'WixApiError',
    });
    await jest.runAllTimersAsync();
    await assertion;

    expect(callCount).toBe(3);
    jest.useRealTimers();
  });

  it.todo('client wrapper (cf-3hv): recordChallengeProgress() exported function');
});

// ── Full roundtrip ────────────────────────────────────────────────────────
// Event → check challenges → record progress → re-check (completed=true)

describe('Full gamification roundtrip', () => {
  it('event fires, progress increments, challenge completes on re-fetch', async () => {
    // State: challenge starts at 4/5, one more event completes it
    let challengeCallCount = 0;

    server.use(
      // 1. gamificationEvent: 200
      http.post(PATHS.gamificationEvent, () =>
        HttpResponse.json({ success: true, eventId: 'evt-roundtrip' }),
      ),

      // 2+4. activeChallenges: first call returns in-progress, second returns completed
      http.post(PATHS.activeChallenges, () => {
        challengeCallCount++;
        const challenge =
          challengeCallCount === 1
            ? { ...CHALLENGE_PARTIAL, progress: { progressValue: 4, completedAt: null } }
            : CHALLENGE_COMPLETED;
        return HttpResponse.json({ challenges: [challenge] });
      }),

      // 3. challengeProgress: returns completed
      http.post(PATHS.challengeProgress, () =>
        HttpResponse.json({
          success: true,
          newProgress: 5,
          completed: true,
          pointsAwarded: 500,
        }),
      ),
    );

    // Step 1: fire gamification event
    const eventResult = await client.callFunction<{ success: boolean }>(
      '/_functions/gamificationEvent',
      'POST',
      { memberId: MEMBER_ID, eventType: 'gamification_submit_review' },
    );
    expect(eventResult.success).toBe(true);

    // Step 2: fetch challenges — progress should be 4/5 (not yet complete)
    const challengesBeforeResult = await client.callFunction<{ challenges: ApiChallenge[] }>(
      '/_functions/getActiveChallenges',
      'POST',
      {},
    );
    const challengeBefore = challengesBeforeResult.challenges[0];
    expect(challengeBefore.progress.progressValue).toBe(4);
    expect(challengeBefore.progress.completedAt).toBeNull();

    // Step 3: record challenge progress
    const progressResult = await client.callFunction<{
      success: boolean;
      completed: boolean;
      pointsAwarded: number;
    }>('/_functions/challengeProgress', 'POST', {
      memberId: MEMBER_ID,
      challengeId: 'ch-review-5',
      increment: 1,
    });
    expect(progressResult.completed).toBe(true);
    expect(progressResult.pointsAwarded).toBe(500);

    // Step 4: re-fetch challenges — should now show completed
    const challengesAfterResult = await client.callFunction<{ challenges: ApiChallenge[] }>(
      '/_functions/getActiveChallenges',
      'POST',
      {},
    );
    const challengeAfter = challengesAfterResult.challenges[0];
    expect(challengeAfter.progress.progressValue).toBe(5);
    expect(challengeAfter.progress.completedAt).not.toBeNull();

    // Verify both challenge-fetch calls were made
    expect(challengeCallCount).toBe(2);
  });

  it.todo(
    'roundtrip via high-level API wrappers (gamificationApi + recordChallengeProgress, PRs #278 + cf-3hv)',
  );
});

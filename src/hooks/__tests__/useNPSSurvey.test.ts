/**
 * TDD tests for useNPSSurvey hook — cm-5cp.
 *
 * Covers:
 *  - shouldShow gates: null orderId, null deliveredAt, < 3 days since delivery,
 *    >= 3 days since delivery, 90-day suppress (within / at boundary / beyond),
 *    no prior prompt record, storage read error
 *  - dismiss: saves timestamp, suppresses shouldShow, handles write error
 *  - submit: calls submitNpsSurvey, saves timestamp on success,
 *    isSubmitting flag, submitSuccess, submitError, comment handling,
 *    does not suppress on Wix error, handles null wixClient
 *  - shouldShow false after dismiss / after successful submit
 *
 * @bead cm-5cp
 */

import { renderHook, act } from '@testing-library/react-native';
import { useNPSSurvey, STORAGE_KEY, DELIVERY_DELAY_MS, SUPPRESS_MS } from '../useNPSSurvey';
import { submitNpsSurvey } from '@/services/npsSurvey';
import type { StorageAdapter } from '../useNPSSurvey';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/services/npsSurvey', () => ({
  submitNpsSurvey: jest.fn(),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

const mockSubmitNpsSurvey = submitNpsSurvey as jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStorage(lastPromptedIso?: string): {
  storage: StorageAdapter;
  getItem: jest.Mock;
  setItem: jest.Mock;
} {
  const getItem = jest.fn().mockResolvedValue(lastPromptedIso ?? null);
  const setItem = jest.fn().mockResolvedValue(undefined);
  return { storage: { getItem, setItem }, getItem, setItem };
}

/** Date that is `days` days ago from now. */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const BASE_ORDER_ID = 'order-abc123';
const DELIVERED_4_DAYS_AGO = daysAgo(4);

/** Render hook and flush mount effects. */
async function renderLoaded(
  opts: Parameters<typeof useNPSSurvey>[0],
) {
  const hook = renderHook(() => useNPSSurvey(opts));
  await act(async () => {});
  return hook;
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmitNpsSurvey.mockResolvedValue({ success: true, id: 'nps-resp-001' });
});

// ── shouldShow: input gates ───────────────────────────────────────────────────

describe('useNPSSurvey — shouldShow input gates', () => {
  it('is false when orderId is null', async () => {
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: null,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });
    expect(result.current.shouldShow).toBe(false);
  });

  it('is false when deliveredAt is null', async () => {
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: null,
      storage,
    });
    expect(result.current.shouldShow).toBe(false);
  });

  it('is false when deliveredAt is less than 3 days ago', async () => {
    const { storage } = makeStorage();
    const almostThreeDays = new Date(Date.now() - DELIVERY_DELAY_MS + 60_000); // 1 min short
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: almostThreeDays,
      storage,
    });
    expect(result.current.shouldShow).toBe(false);
  });

  it('is true when deliveredAt is exactly 3 days ago and no prior prompt', async () => {
    const { storage } = makeStorage();
    const exactlyThreeDays = new Date(Date.now() - DELIVERY_DELAY_MS);
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: exactlyThreeDays,
      storage,
    });
    expect(result.current.shouldShow).toBe(true);
  });

  it('is true when deliveredAt is 4 days ago and no prior prompt', async () => {
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });
    expect(result.current.shouldShow).toBe(true);
  });
});

// ── shouldShow: 90-day suppression gate ──────────────────────────────────────

describe('useNPSSurvey — 90-day suppression', () => {
  it('is false when last prompted less than 90 days ago', async () => {
    const lastPrompted = new Date(Date.now() - SUPPRESS_MS + 60_000); // 1 min short of 90d
    const { storage } = makeStorage(lastPrompted.toISOString());
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });
    expect(result.current.shouldShow).toBe(false);
  });

  it('is true when last prompted exactly 90 days ago', async () => {
    const lastPrompted = new Date(Date.now() - SUPPRESS_MS);
    const { storage } = makeStorage(lastPrompted.toISOString());
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });
    expect(result.current.shouldShow).toBe(true);
  });

  it('is true when last prompted more than 90 days ago', async () => {
    const { storage } = makeStorage(daysAgo(91).toISOString());
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });
    expect(result.current.shouldShow).toBe(true);
  });

  it('is true when no prior prompt record in storage', async () => {
    const { storage } = makeStorage(undefined);
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });
    expect(result.current.shouldShow).toBe(true);
  });

  it('reads from the correct storage key', async () => {
    const { storage, getItem } = makeStorage();
    await renderLoaded({ orderId: BASE_ORDER_ID, deliveredAt: DELIVERED_4_DAYS_AGO, storage });
    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('is false when storage read throws (conservative default)', async () => {
    const getItem = jest.fn().mockRejectedValue(new Error('storage unavailable'));
    const setItem = jest.fn().mockResolvedValue(undefined);
    const storage: StorageAdapter = { getItem, setItem };
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });
    expect(result.current.shouldShow).toBe(false);
  });
});

// ── dismiss ───────────────────────────────────────────────────────────────────

describe('useNPSSurvey — dismiss', () => {
  it('saves current timestamp to storage key on dismiss', async () => {
    const { storage, setItem } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.dismiss();
    });

    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    const savedValue = setItem.mock.calls[0][1];
    expect(new Date(savedValue).getTime()).toBeCloseTo(Date.now(), -3); // within ~1s
  });

  it('sets shouldShow to false after dismiss', async () => {
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });
    expect(result.current.shouldShow).toBe(true);

    await act(async () => {
      await result.current.dismiss();
    });

    expect(result.current.shouldShow).toBe(false);
  });

  it('handles storage write error gracefully — does not throw', async () => {
    const getItem = jest.fn().mockResolvedValue(null);
    const setItem = jest.fn().mockRejectedValue(new Error('write failed'));
    const storage: StorageAdapter = { getItem, setItem };
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await expect(
      act(async () => {
        await result.current.dismiss();
      }),
    ).resolves.not.toThrow();
  });

  it('still sets shouldShow false even when storage write fails on dismiss', async () => {
    const getItem = jest.fn().mockResolvedValue(null);
    const setItem = jest.fn().mockRejectedValue(new Error('write failed'));
    const storage: StorageAdapter = { getItem, setItem };
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.dismiss();
    });

    expect(result.current.shouldShow).toBe(false);
  });
});

// ── submit ────────────────────────────────────────────────────────────────────

describe('useNPSSurvey — submit', () => {
  it('calls submitNpsSurvey with orderId and score', async () => {
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.submit(8);
    });

    expect(mockSubmitNpsSurvey).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ orderId: BASE_ORDER_ID, score: 8 }),
    );
  });

  it('passes wixClient to submitNpsSurvey', async () => {
    const { storage } = makeStorage();
    const fakeClient = { insertDataItem: jest.fn() };
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      wixClient: fakeClient,
      storage,
    });

    await act(async () => {
      await result.current.submit(9);
    });

    expect(mockSubmitNpsSurvey).toHaveBeenCalledWith(fakeClient, expect.any(Object));
  });

  it('includes comment when provided', async () => {
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.submit(9, 'Great service!');
    });

    expect(mockSubmitNpsSurvey).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ comment: 'Great service!' }),
    );
  });

  it('omits comment when empty string', async () => {
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.submit(7, '');
    });

    const [, data] = mockSubmitNpsSurvey.mock.calls[0];
    expect('comment' in data).toBe(false);
  });

  it('omits comment when whitespace-only', async () => {
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.submit(6, '   ');
    });

    const [, data] = mockSubmitNpsSurvey.mock.calls[0];
    expect('comment' in data).toBe(false);
  });

  it('includes createdAt ISO timestamp in the payload', async () => {
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.submit(8);
    });

    const [, data] = mockSubmitNpsSurvey.mock.calls[0];
    expect(data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sets submitSuccess to true after successful submit', async () => {
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.submit(10);
    });

    expect(result.current.submitSuccess).toBe(true);
  });

  it('sets shouldShow to false after successful submit', async () => {
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.submit(10);
    });

    expect(result.current.shouldShow).toBe(false);
  });

  it('saves timestamp to storage after successful submit', async () => {
    const { storage, setItem } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.submit(9);
    });

    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
  });

  it('sets submitError and keeps submitSuccess false when Wix returns failure', async () => {
    mockSubmitNpsSurvey.mockResolvedValue({ success: false, error: 'Network timeout' });
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.submit(5);
    });

    expect(result.current.submitError).toBe('Network timeout');
    expect(result.current.submitSuccess).toBe(false);
  });

  it('does not save timestamp when Wix call fails', async () => {
    mockSubmitNpsSurvey.mockResolvedValue({ success: false, error: 'Server error' });
    const { storage, setItem } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    await act(async () => {
      await result.current.submit(3);
    });

    expect(setItem).not.toHaveBeenCalled();
  });

  it('does not set shouldShow false when Wix call fails (user can retry)', async () => {
    mockSubmitNpsSurvey.mockResolvedValue({ success: false, error: 'Timeout' });
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });
    expect(result.current.shouldShow).toBe(true);

    await act(async () => {
      await result.current.submit(2);
    });

    expect(result.current.shouldShow).toBe(true);
  });

  it('sets isSubmitting true during flight, false after', async () => {
    let resolve!: (v: { success: boolean; id: string }) => void;
    mockSubmitNpsSurvey.mockImplementation(
      () => new Promise((res) => { resolve = res; }),
    );
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      storage,
    });

    // Start submit without awaiting — check in-flight state
    act(() => {
      void result.current.submit(7);
    });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolve({ success: true, id: 'x' });
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it('handles null wixClient — returns submitError without throwing', async () => {
    mockSubmitNpsSurvey.mockResolvedValue({ success: false, error: 'Wix client unavailable' });
    const { storage } = makeStorage();
    const { result } = await renderLoaded({
      orderId: BASE_ORDER_ID,
      deliveredAt: DELIVERED_4_DAYS_AGO,
      wixClient: null,
      storage,
    });

    await act(async () => {
      await result.current.submit(5);
    });

    expect(result.current.submitError).toBeTruthy();
    expect(result.current.submitSuccess).toBe(false);
  });
});

/**
 * TDD tests for useFirstSessionPoints — first-session gamification bonus hook.
 *
 * Covers:
 *  - First session: fires event, writes done flag, writes AFTER event fires,
 *    returns isFirstSession: true
 *  - Subsequent sessions: no event, isFirstSession false, no storage write
 *  - Storage read failure: no event, captureException, isFirstSession false
 *  - Storage write failure: no crash, event still fires
 *  - Gamification event failure: no crash, captureException, still writes done flag
 *  - Idempotency: fires exactly once even on re-renders
 *
 * Bead: cfutons_mobile-b0z
 */
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFirstSessionPoints } from '../useFirstSessionPoints';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/gamification', () => ({
  firstSessionBonus: jest.fn(),
}));

jest.mock('@/services/crashReporting', () => ({
  captureException: jest.fn(),
}));

const mockGetItem = jest.mocked(AsyncStorage.getItem);
const mockSetItem = jest.mocked(AsyncStorage.setItem);
const mockFirstSessionBonus = jest.mocked(
  require('@/services/gamification').firstSessionBonus,
);
const mockCaptureException = jest.mocked(
  require('@/services/crashReporting').captureException,
);

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockFirstSessionBonus.mockImplementation(() => {});
});

// ── First session ─────────────────────────────────────────────────────────────

describe('first session (storage returns null)', () => {
  it('fires firstSessionBonus on first session', async () => {
    renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockFirstSessionBonus).toHaveBeenCalledTimes(1);
  });

  it('returns isFirstSession: true on first session', async () => {
    const { result } = renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isFirstSession).toBe(true);
  });

  it('writes the done flag to AsyncStorage', async () => {
    renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockSetItem).toHaveBeenCalledWith('@cf_first_session_done', 'done');
  });

  it('writes the done flag AFTER firing the event', async () => {
    const callOrder: string[] = [];
    mockFirstSessionBonus.mockImplementation(() => {
      callOrder.push('event');
    });
    mockSetItem.mockImplementation(async () => {
      callOrder.push('write');
    });

    renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(callOrder).toEqual(['event', 'write']);
  });
});

// ── Subsequent sessions ────────────────────────────────────────────────────────

describe('subsequent sessions (storage returns "done")', () => {
  beforeEach(() => {
    mockGetItem.mockResolvedValue('done');
  });

  it('does not fire firstSessionBonus', async () => {
    renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockFirstSessionBonus).not.toHaveBeenCalled();
  });

  it('returns isFirstSession: false', async () => {
    const { result } = renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isFirstSession).toBe(false);
  });

  it('does not write to AsyncStorage again', async () => {
    renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

// ── Storage read failure ───────────────────────────────────────────────────────

describe('storage read failure', () => {
  it('does not fire event when getItem throws', async () => {
    mockGetItem.mockRejectedValue(new Error('read error'));

    renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockFirstSessionBonus).not.toHaveBeenCalled();
  });

  it('calls captureException when getItem throws', async () => {
    mockGetItem.mockRejectedValue(new Error('read error'));

    renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns isFirstSession: false when getItem throws', async () => {
    mockGetItem.mockRejectedValue(new Error('read error'));

    const { result } = renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isFirstSession).toBe(false);
  });
});

// ── Storage write failure ─────────────────────────────────────────────────────

describe('storage write failure', () => {
  it('does not crash when setItem throws', async () => {
    mockSetItem.mockRejectedValue(new Error('write error'));

    expect(() => {
      renderHook(() => useFirstSessionPoints());
    }).not.toThrow();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it('still fires the event even if setItem throws', async () => {
    mockSetItem.mockRejectedValue(new Error('write error'));

    renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockFirstSessionBonus).toHaveBeenCalledTimes(1);
  });
});

// ── Gamification event failure ────────────────────────────────────────────────

describe('gamification event failure', () => {
  it('does not crash when firstSessionBonus throws', async () => {
    mockFirstSessionBonus.mockImplementation(() => {
      throw new Error('event error');
    });

    expect(() => {
      renderHook(() => useFirstSessionPoints());
    }).not.toThrow();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it('calls captureException when firstSessionBonus throws', async () => {
    mockFirstSessionBonus.mockImplementation(() => {
      throw new Error('event error');
    });

    renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });

  it('still writes the done flag even if firstSessionBonus throws', async () => {
    mockFirstSessionBonus.mockImplementation(() => {
      throw new Error('event error');
    });

    renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockSetItem).toHaveBeenCalledWith('@cf_first_session_done', 'done');
  });
});

// ── Idempotency ───────────────────────────────────────────────────────────────

describe('idempotency', () => {
  it('fires the event exactly once even if hook re-renders', async () => {
    const { rerender } = renderHook(() => useFirstSessionPoints());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    rerender({});
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    rerender({});
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockFirstSessionBonus).toHaveBeenCalledTimes(1);
  });
});

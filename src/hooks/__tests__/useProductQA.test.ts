/**
 * Tests for useProductQA hook — cm-wf3.
 *
 * Covers: fetch by productId, loading/empty/error states, submit form
 * (validation, success, error, no-auth guard).
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProductQA } from '../useProductQA';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockInsertDataItem = jest.fn();
const mockUseOptionalWixClient = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PRODUCT_ID = 'asheville-full';

const Q_ANSWERED = {
  productId: PRODUCT_ID,
  question: 'What size is best for a small room?',
  answer: 'We recommend the Twin for rooms under 10 feet.',
  authorName: 'Jane D.',
  createdDate: '2026-03-01T10:00:00Z',
  answered: true,
};

const Q_UNANSWERED = {
  productId: PRODUCT_ID,
  question: 'Is delivery free?',
  answer: '',
  authorName: 'Bob S.',
  createdDate: '2026-03-10T08:00:00Z',
  answered: false,
};

function makeClient() {
  return { queryData: mockQueryData, insertDataItem: mockInsertDataItem };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOptionalWixClient.mockReturnValue(makeClient());
  mockUseAuth.mockReturnValue({ user: { id: 'member-1', displayName: 'Test User' } });
  mockQueryData.mockResolvedValue({ items: [Q_ANSWERED, Q_UNANSWERED], totalResults: 2 });
  mockInsertDataItem.mockResolvedValue({ id: 'new-id', data: {} });
});

// ── Section 1: Loading ────────────────────────────────────────────────────────

describe('loading state', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    expect(result.current.loading).toBe(true);
  });

  it('sets loading to false after fetch resolves', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

// ── Section 2: Successful fetch ───────────────────────────────────────────────

describe('successful fetch', () => {
  it('returns questions array', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.questions).toHaveLength(2);
  });

  it('queries CF-0b22 collection filtered by productId', async () => {
    renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData).toHaveBeenCalledWith(
      'CF-0b22',
      expect.objectContaining({ filter: expect.objectContaining({ productId: PRODUCT_ID }) }),
    );
  });

  it('exposes answered and unanswered questions', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const answered = result.current.questions.filter((q) => q.answered);
    const unanswered = result.current.questions.filter((q) => !q.answered);
    expect(answered).toHaveLength(1);
    expect(unanswered).toHaveLength(1);
  });

  it('has null fetchError on success', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBeNull();
  });
});

// ── Section 3: Empty state ────────────────────────────────────────────────────

describe('empty state', () => {
  beforeEach(() => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
  });

  it('returns empty questions array', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.questions).toHaveLength(0);
  });

  it('has no fetchError on empty result', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBeNull();
  });
});

// ── Section 4: Fetch error ────────────────────────────────────────────────────

describe('fetch error', () => {
  beforeEach(() => {
    mockQueryData.mockRejectedValue(new Error('Network error'));
  });

  it('sets fetchError on API failure', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBeTruthy();
  });

  it('returns empty questions on failure', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.questions).toHaveLength(0);
  });
});

// ── Section 5: No wix client ──────────────────────────────────────────────────

describe('no wix client', () => {
  beforeEach(() => {
    mockUseOptionalWixClient.mockReturnValue(null);
  });

  it('sets fetchError when client unavailable', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBeTruthy();
  });
});

// ── Section 6: Submit question ────────────────────────────────────────────────

describe('submitQuestion', () => {
  it('inserts into CF-0b22 with productId and question text', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('Is this machine washable?');
    });

    expect(mockInsertDataItem).toHaveBeenCalledWith(
      'CF-0b22',
      expect.objectContaining({
        productId: PRODUCT_ID,
        question: 'Is this machine washable?',
        answered: false,
      }),
    );
  });

  it('sets submitSuccess to true on success', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('Is this machine washable?');
    });

    expect(result.current.submitSuccess).toBe(true);
  });

  it('adds submitted question optimistically to list', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('New question here?');
    });

    expect(result.current.questions.some((q) => q.question === 'New question here?')).toBe(true);
  });

  it('sets submitError on API failure', async () => {
    mockInsertDataItem.mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('Will this break?');
    });

    expect(result.current.submitError).toBeTruthy();
    expect(result.current.submitSuccess).toBe(false);
  });

  it('rejects empty question', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('');
    });

    expect(mockInsertDataItem).not.toHaveBeenCalled();
    expect(result.current.submitError).toMatch(/empty|required/i);
  });

  it('rejects whitespace-only question', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('   ');
    });

    expect(mockInsertDataItem).not.toHaveBeenCalled();
  });

  it('rejects question over 500 characters', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('a'.repeat(501));
    });

    expect(mockInsertDataItem).not.toHaveBeenCalled();
    expect(result.current.submitError).toMatch(/500|too long/i);
  });

  it('sets isSubmitting true during submit', async () => {
    let resolveInsert!: () => void;
    mockInsertDataItem.mockReturnValue(
      new Promise<{ id: string; data: Record<string, unknown> }>((res) => {
        resolveInsert = () => res({ id: 'x', data: {} });
      }),
    );
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.submitQuestion('What fabric is this?');
    });
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    await act(async () => {
      resolveInsert();
    });
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
  });
});

// ── Section 7: XSS sanitization ─────────────────────────────────────────────

describe('XSS sanitization', () => {
  it('strips HTML script tags before submitting', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('<script>alert("xss")</script>Is it washable?');
    });

    const submitted = mockInsertDataItem.mock.calls[0][1] as Record<string, unknown>;
    expect(submitted.question as string).not.toContain('<script>');
    expect(submitted.question as string).not.toContain('</script>');
    expect(submitted.question as string).toContain('Is it washable?');
  });

  it('strips inline HTML event handlers', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('<img onload="evil()" src="x">Does this ship free?');
    });

    const submitted = mockInsertDataItem.mock.calls[0][1] as Record<string, unknown>;
    expect(submitted.question as string).not.toContain('<img');
    expect(submitted.question as string).not.toContain('onload');
    expect(submitted.question as string).toContain('Does this ship free?');
  });

  it('rejects question that is empty after stripping HTML', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('<script>evil()</script>   ');
    });

    expect(mockInsertDataItem).not.toHaveBeenCalled();
    expect(result.current.submitError).toMatch(/empty|required/i);
  });

  it('trims whitespace before submitting', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('   Is it comfortable?   ');
    });

    const submitted = mockInsertDataItem.mock.calls[0][1] as Record<string, unknown>;
    expect(submitted.question as string).toBe('Is it comfortable?');
  });
});

// ── Section 8: Rate limiting (3/hr) ─────────────────────────────────────────

describe('rate limiting', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const RATE_LIMIT_KEY = '@cfutons/qa-rl';
  const ONE_HOUR_MS = 60 * 60 * 1000;

  it('blocks submission when 3 questions sent in the past hour', async () => {
    const now = 1_700_000_000_000;
    const recentTimestamps = [now - 100, now - 200, now - 300];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(recentTimestamps));

    const { result } = renderHook(() => useProductQA(PRODUCT_ID, { getNow: () => now }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('What is the weight limit?');
    });

    expect(mockInsertDataItem).not.toHaveBeenCalled();
    expect(result.current.submitError).toMatch(/3 questions|limit/i);
  });

  it('allows submission when only 2 questions sent in the past hour', async () => {
    const now = 1_700_000_000_000;
    const recentTimestamps = [now - 100, now - 200];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(recentTimestamps));

    const { result } = renderHook(() => useProductQA(PRODUCT_ID, { getNow: () => now }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('Is the frame solid wood?');
    });

    expect(mockInsertDataItem).toHaveBeenCalled();
    expect(result.current.submitSuccess).toBe(true);
  });

  it('ignores timestamps older than 1 hour when computing rate limit', async () => {
    const now = 1_700_000_000_000;
    // 3 timestamps, all more than 1 hour ago — should NOT be rate-limited
    const oldTimestamps = [now - ONE_HOUR_MS - 1, now - ONE_HOUR_MS - 2, now - ONE_HOUR_MS - 3];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(oldTimestamps));

    const { result } = renderHook(() => useProductQA(PRODUCT_ID, { getNow: () => now }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('Can I get a fabric swatch?');
    });

    expect(mockInsertDataItem).toHaveBeenCalled();
    expect(result.current.submitSuccess).toBe(true);
  });

  it('persists timestamp to AsyncStorage after successful submit', async () => {
    const now = 1_700_000_000_000;
    AsyncStorage.getItem.mockResolvedValue(null);

    const { result } = renderHook(() => useProductQA(PRODUCT_ID, { getNow: () => now }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('Any warranty?');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      RATE_LIMIT_KEY,
      expect.stringContaining(String(now)),
    );
  });

  it('rate limit error includes a retry timing hint', async () => {
    const now = 1_700_000_000_000;
    // Oldest timestamp is 30 min ago → user must wait ~30 more min
    const timestamps = [now - ONE_HOUR_MS / 2, now - 200, now - 100];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(timestamps));

    const { result } = renderHook(() => useProductQA(PRODUCT_ID, { getNow: () => now }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('What are the dimensions?');
    });

    expect(result.current.submitError).toMatch(/\d+\s*min/i);
  });
});

// ── Section 9: Approved questions filter ────────────────────────────────────

describe('approved questions filter', () => {
  it('queries with status: approved filter to exclude pending/rejected', async () => {
    renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData).toHaveBeenCalledWith(
      'CF-0b22',
      expect.objectContaining({
        filter: expect.objectContaining({ productId: PRODUCT_ID, status: 'approved' }),
      }),
    );
  });
});

// ── Section 10: clearSubmitStatus ─────────────────────────────────────────────

describe('clearSubmitStatus', () => {
  it('resets submitSuccess and submitError', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('Test?');
    });
    expect(result.current.submitSuccess).toBe(true);

    await act(async () => {
      result.current.clearSubmitStatus();
    });

    expect(result.current.submitSuccess).toBe(false);
    expect(result.current.submitError).toBeNull();
  });
});

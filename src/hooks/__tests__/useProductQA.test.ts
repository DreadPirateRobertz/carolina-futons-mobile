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

    act(() => {
      result.current.submitQuestion('What fabric is this?');
    });
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));
    await act(async () => {
      resolveInsert();
    });
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
  });
});

// ── Section 7: clearSubmitStatus ─────────────────────────────────────────────

describe('clearSubmitStatus', () => {
  it('resets submitSuccess and submitError', async () => {
    const { result } = renderHook(() => useProductQA(PRODUCT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitQuestion('Test?');
    });
    expect(result.current.submitSuccess).toBe(true);

    act(() => {
      result.current.clearSubmitStatus();
    });

    expect(result.current.submitSuccess).toBe(false);
    expect(result.current.submitError).toBeNull();
  });
});

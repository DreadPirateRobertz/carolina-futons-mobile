/**
 * Tests for useQAAnswers hook — cm-gey (Q&A Phase 2).
 *
 * Covers: fetch by questionId, loading/empty/error states,
 * upvote (optimistic, dedup guard, rollback), submit reply
 * (validation, XSS, optimistic, rollback).
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useQAAnswers } from '../useQAAnswers';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockQueryData = jest.fn();
const mockInsertDataItem = jest.fn();
const mockUpdateDataItem = jest.fn();
const mockUseOptionalWixClient = jest.fn();
jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => mockUseOptionalWixClient(),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const QUESTION_ID = 'q-abc123';

const ANSWER_1 = {
  id: 'ans-001',
  questionId: QUESTION_ID,
  parentAnswerId: null,
  text: 'The Twin fits rooms under 10 ft.',
  authorName: 'Staff',
  createdDate: '2026-03-05T10:00:00Z',
  upvoteCount: 3,
  status: 'approved' as const,
};

const ANSWER_2 = {
  id: 'ans-002',
  questionId: QUESTION_ID,
  parentAnswerId: null,
  text: 'We also offer the Full size for slightly larger rooms.',
  authorName: 'Jane D.',
  createdDate: '2026-03-06T08:00:00Z',
  upvoteCount: 1,
  status: 'approved' as const,
};

const REPLY_1 = {
  id: 'ans-003',
  questionId: QUESTION_ID,
  parentAnswerId: 'ans-001',
  text: 'Thanks, that helped!',
  authorName: 'Bob S.',
  createdDate: '2026-03-07T09:00:00Z',
  upvoteCount: 0,
  status: 'approved' as const,
};

function makeClient() {
  return {
    queryData: mockQueryData,
    insertDataItem: mockInsertDataItem,
    updateDataItem: mockUpdateDataItem,
  };
}

const UPVOTE_KEY = '@cfutons/qa-upvotes';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOptionalWixClient.mockReturnValue(makeClient());
  mockUseAuth.mockReturnValue({ user: { id: 'member-1', displayName: 'Test User' } });
  mockQueryData.mockResolvedValue({
    items: [ANSWER_1, ANSWER_2, REPLY_1],
    totalResults: 3,
  });
  mockInsertDataItem.mockResolvedValue({ id: 'new-id', data: {} });
  mockUpdateDataItem.mockResolvedValue({ id: ANSWER_1.id, data: {} });
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  AsyncStorage.getItem.mockResolvedValue(null);
  AsyncStorage.setItem.mockResolvedValue(undefined);
});

// ── Section 1: Loading ────────────────────────────────────────────────────────

describe('loading state', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    expect(result.current.loading).toBe(true);
  });

  it('sets loading false after fetch resolves', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

// ── Section 2: Successful fetch ───────────────────────────────────────────────

describe('successful fetch', () => {
  it('returns answers array', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.answers.length).toBeGreaterThan(0);
  });

  it('queries CF-0b22-answers collection filtered by questionId', async () => {
    renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData).toHaveBeenCalledWith(
      'CF-0b22-answers',
      expect.objectContaining({
        filter: expect.objectContaining({ questionId: QUESTION_ID }),
      }),
    );
  });

  it('filters to approved answers only', async () => {
    renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(mockQueryData).toHaveBeenCalled());
    expect(mockQueryData).toHaveBeenCalledWith(
      'CF-0b22-answers',
      expect.objectContaining({
        filter: expect.objectContaining({ status: 'approved' }),
      }),
    );
  });

  it('separates top-level answers from replies', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const topLevel = result.current.answers.filter((a) => !a.parentAnswerId);
    const replies = result.current.answers.filter((a) => !!a.parentAnswerId);
    expect(topLevel).toHaveLength(2);
    expect(replies).toHaveLength(1);
  });

  it('has null fetchError on success', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBeNull();
  });

  it('annotates answers with hasUserUpvoted=false when nothing stored', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const ans = result.current.answers.find((a) => a.id === 'ans-001');
    expect(ans?.hasUserUpvoted).toBe(false);
  });

  it('annotates answer with hasUserUpvoted=true when id is in AsyncStorage', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(['ans-001']));
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const ans = result.current.answers.find((a) => a.id === 'ans-001');
    expect(ans?.hasUserUpvoted).toBe(true);
  });
});

// ── Section 3: Empty state ────────────────────────────────────────────────────

describe('empty state', () => {
  beforeEach(() => {
    mockQueryData.mockResolvedValue({ items: [], totalResults: 0 });
  });

  it('returns empty answers array', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.answers).toHaveLength(0);
  });

  it('has null fetchError on empty result', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBeNull();
  });
});

// ── Section 4: Fetch error ────────────────────────────────────────────────────

describe('fetch error', () => {
  beforeEach(() => {
    mockQueryData.mockRejectedValue(new Error('Network timeout'));
  });

  it('sets fetchError on API failure', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBeTruthy();
  });

  it('returns empty answers on failure', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.answers).toHaveLength(0);
  });
});

// ── Section 5: No wix client ──────────────────────────────────────────────────

describe('no wix client', () => {
  beforeEach(() => {
    mockUseOptionalWixClient.mockReturnValue(null);
  });

  it('sets fetchError when client unavailable', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBeTruthy();
  });
});

// ── Section 6: Upvote ─────────────────────────────────────────────────────────

describe('upvoteAnswer', () => {
  it('optimistically increments upvoteCount', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = result.current.answers.find((a) => a.id === 'ans-001')!.upvoteCount;

    await act(async () => {
      await result.current.upvoteAnswer('ans-001');
    });

    const after = result.current.answers.find((a) => a.id === 'ans-001')!.upvoteCount;
    expect(after).toBe(before + 1);
  });

  it('optimistically sets hasUserUpvoted=true', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.upvoteAnswer('ans-001');
    });

    const ans = result.current.answers.find((a) => a.id === 'ans-001');
    expect(ans?.hasUserUpvoted).toBe(true);
  });

  it('calls updateDataItem on CF-0b22-answers', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.upvoteAnswer('ans-001');
    });

    expect(mockUpdateDataItem).toHaveBeenCalledWith(
      'CF-0b22-answers',
      'ans-001',
      expect.objectContaining({ upvoteCount: expect.any(Number) }),
    );
  });

  it('persists upvoted answerId to AsyncStorage', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.upvoteAnswer('ans-001');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      UPVOTE_KEY,
      expect.stringContaining('ans-001'),
    );
  });

  it('rolls back optimistic upvote on API error', async () => {
    mockUpdateDataItem.mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = result.current.answers.find((a) => a.id === 'ans-001')!.upvoteCount;

    await act(async () => {
      await result.current.upvoteAnswer('ans-001');
    });

    const after = result.current.answers.find((a) => a.id === 'ans-001')!.upvoteCount;
    expect(after).toBe(before);
  });

  it('rolls back hasUserUpvoted on API error', async () => {
    mockUpdateDataItem.mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.upvoteAnswer('ans-001');
    });

    const ans = result.current.answers.find((a) => a.id === 'ans-001');
    expect(ans?.hasUserUpvoted).toBe(false);
  });

  it('does not upvote if already upvoted (dedup guard)', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(['ans-001']));
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = result.current.answers.find((a) => a.id === 'ans-001')!.upvoteCount;

    await act(async () => {
      await result.current.upvoteAnswer('ans-001');
    });

    expect(mockUpdateDataItem).not.toHaveBeenCalled();
    const after = result.current.answers.find((a) => a.id === 'ans-001')!.upvoteCount;
    expect(after).toBe(before);
  });

  it('sets upvoteError on API failure', async () => {
    mockUpdateDataItem.mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.upvoteAnswer('ans-001');
    });

    expect(result.current.upvoteError).toBeTruthy();
  });

  it('does not call updateDataItem when wix client unavailable', async () => {
    mockUseOptionalWixClient.mockReturnValue(null);
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.upvoteAnswer('ans-001');
    });

    expect(mockUpdateDataItem).not.toHaveBeenCalled();
  });
});

// ── Section 7: Submit reply ───────────────────────────────────────────────────

describe('submitReply', () => {
  it('inserts reply into CF-0b22-answers with parentAnswerId', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReply('ans-001', 'Great answer, thanks!');
    });

    expect(mockInsertDataItem).toHaveBeenCalledWith(
      'CF-0b22-answers',
      expect.objectContaining({
        questionId: QUESTION_ID,
        parentAnswerId: 'ans-001',
        text: 'Great answer, thanks!',
        answered: false,
      }),
    );
  });

  it('adds reply optimistically to answers list', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReply('ans-001', 'Very helpful!');
    });

    const replies = result.current.answers.filter((a) => a.parentAnswerId === 'ans-001');
    expect(replies.some((r) => r.text === 'Very helpful!')).toBe(true);
  });

  it('sets replySuccess to true on success', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReply('ans-001', 'Thanks!');
    });

    expect(result.current.replySuccess).toBe(true);
  });

  it('sets replyError on API failure', async () => {
    mockInsertDataItem.mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReply('ans-001', 'Hello?');
    });

    expect(result.current.replyError).toBeTruthy();
    expect(result.current.replySuccess).toBe(false);
  });

  it('rolls back optimistic reply on API error', async () => {
    mockInsertDataItem.mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const countBefore = result.current.answers.filter(
      (a) => a.parentAnswerId === 'ans-001',
    ).length;

    await act(async () => {
      await result.current.submitReply('ans-001', 'Will this rollback?');
    });

    const countAfter = result.current.answers.filter(
      (a) => a.parentAnswerId === 'ans-001',
    ).length;
    expect(countAfter).toBe(countBefore);
  });

  it('rejects empty reply text', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReply('ans-001', '');
    });

    expect(mockInsertDataItem).not.toHaveBeenCalled();
    expect(result.current.replyError).toMatch(/empty|required/i);
  });

  it('rejects whitespace-only reply', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReply('ans-001', '   ');
    });

    expect(mockInsertDataItem).not.toHaveBeenCalled();
  });

  it('rejects reply over 500 characters', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReply('ans-001', 'a'.repeat(501));
    });

    expect(mockInsertDataItem).not.toHaveBeenCalled();
    expect(result.current.replyError).toMatch(/500|too long/i);
  });

  it('strips HTML from reply before inserting', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReply('ans-001', '<script>evil()</script>Nice answer!');
    });

    const inserted = mockInsertDataItem.mock.calls[0][1] as Record<string, unknown>;
    expect(inserted.text as string).not.toContain('<script>');
    expect(inserted.text as string).toContain('Nice answer!');
  });

  it('rejects reply that is empty after HTML stripping', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReply('ans-001', '<script>evil()</script>   ');
    });

    expect(mockInsertDataItem).not.toHaveBeenCalled();
    expect(result.current.replyError).toMatch(/empty|required/i);
  });

  it('trims whitespace from reply before inserting', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReply('ans-001', '   Very helpful reply!   ');
    });

    const inserted = mockInsertDataItem.mock.calls[0][1] as Record<string, unknown>;
    expect(inserted.text as string).toBe('Very helpful reply!');
  });
});

// ── Section 8: clearReplyStatus ───────────────────────────────────────────────

describe('clearReplyStatus', () => {
  it('resets replySuccess and replyError', async () => {
    const { result } = renderHook(() => useQAAnswers(QUESTION_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReply('ans-001', 'Test reply');
    });
    expect(result.current.replySuccess).toBe(true);

    await act(async () => {
      result.current.clearReplyStatus();
    });

    expect(result.current.replySuccess).toBe(false);
    expect(result.current.replyError).toBeNull();
  });
});

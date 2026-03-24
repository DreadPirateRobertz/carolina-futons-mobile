/**
 * @module useChatbot.test
 *
 * TDD tests for useChatbot error states — hq-5yu4w.
 * Covers: network fail, retry logic, empty response, happy path.
 *
 * Tests are written BEFORE implementation per cm mandate.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock wixClientSingleton before importing the hook
const mockSendMessage = jest.fn();
jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: jest.fn(() => ({
    chatbotMessage: mockSendMessage,
  })),
}));

import { useChatbot } from '../useChatbot';

// ── Helpers ────────────────────────────────────────────────────────

const networkError = new TypeError('Network request failed');
const serverError = Object.assign(new Error('Internal Server Error'), { status: 500 });

function makeSuccessResponse(text: string) {
  return { response: text };
}

// ── Happy Path ─────────────────────────────────────────────────────

describe('useChatbot — happy path', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts idle with empty messages', () => {
    const { result } = renderHook(() => useChatbot());
    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('appends user message and bot response on success', async () => {
    mockSendMessage.mockResolvedValueOnce(makeSuccessResponse('Hello! How can I help?'));

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({ role: 'user', text: 'Hi' });
    expect(result.current.messages[1]).toMatchObject({
      role: 'bot',
      text: 'Hello! How can I help?',
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('sets status to "sending" while request is in-flight', async () => {
    let resolveRequest!: (v: unknown) => void;
    mockSendMessage.mockReturnValueOnce(new Promise((r) => (resolveRequest = r)));

    const { result } = renderHook(() => useChatbot());

    act(() => {
      void result.current.sendMessage('test');
    });

    await waitFor(() => expect(result.current.status).toBe('sending'));

    await act(async () => {
      resolveRequest(makeSuccessResponse('done'));
    });

    expect(result.current.status).toBe('idle');
  });
});

// ── Network Fail ───────────────────────────────────────────────────

describe('useChatbot — network fail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets error state on network failure', async () => {
    mockSendMessage.mockRejectedValueOnce(networkError);

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('network');
    // User message still appears; no bot message appended
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ role: 'user', text: 'Hello' });
  });

  it('sets error state on server error (5xx)', async () => {
    mockSendMessage.mockRejectedValueOnce(serverError);

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('server');
  });

  it('does not send another message while status is "sending"', async () => {
    let resolveRequest!: (v: unknown) => void;
    mockSendMessage.mockReturnValueOnce(new Promise((r) => (resolveRequest = r)));

    const { result } = renderHook(() => useChatbot());

    act(() => {
      void result.current.sendMessage('first');
    });

    await waitFor(() => expect(result.current.status).toBe('sending'));

    // Attempt second send while first is in-flight — should be ignored
    await act(async () => {
      await result.current.sendMessage('second');
    });

    expect(mockSendMessage).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest(makeSuccessResponse('ok'));
    });
  });
});

// ── Retry ──────────────────────────────────────────────────────────

describe('useChatbot — retry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retryLastMessage resends the last user message', async () => {
    mockSendMessage.mockRejectedValueOnce(networkError);
    mockSendMessage.mockResolvedValueOnce(makeSuccessResponse('Got it!'));

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('Retry me');
    });

    expect(result.current.status).toBe('error');

    await act(async () => {
      await result.current.retryLastMessage();
    });

    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({ role: 'bot', text: 'Got it!' });
  });

  it('retryLastMessage is a no-op when there is no error', async () => {
    mockSendMessage.mockResolvedValueOnce(makeSuccessResponse('Fine'));

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    await act(async () => {
      await result.current.retryLastMessage();
    });

    // Only one call — the original
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });

  it('retryLastMessage is a no-op when messages list is empty', async () => {
    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.retryLastMessage();
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('clears error state when retry succeeds', async () => {
    mockSendMessage
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(makeSuccessResponse('All good'));

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('help');
    });

    expect(result.current.error).toBe('network');

    await act(async () => {
      await result.current.retryLastMessage();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('idle');
  });
});

// ── Empty Response ─────────────────────────────────────────────────

describe('useChatbot — empty response', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets error state when response text is empty string', async () => {
    mockSendMessage.mockResolvedValueOnce(makeSuccessResponse(''));

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('empty_response');
    // No bot message appended for empty response
    expect(result.current.messages).toHaveLength(1);
  });

  it('sets error state when response text is whitespace only', async () => {
    mockSendMessage.mockResolvedValueOnce(makeSuccessResponse('   \n  '));

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('empty_response');
  });

  it('sets error state when response object is missing text field', async () => {
    mockSendMessage.mockResolvedValueOnce({});

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('empty_response');
  });

  it('retries successfully after empty response error', async () => {
    mockSendMessage
      .mockResolvedValueOnce(makeSuccessResponse(''))
      .mockResolvedValueOnce(makeSuccessResponse('Here is a real answer'));

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(result.current.error).toBe('empty_response');

    await act(async () => {
      await result.current.retryLastMessage();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.messages[1]).toMatchObject({ text: 'Here is a real answer' });
  });
});

// ── clearMessages ──────────────────────────────────────────────────

describe('useChatbot — clearMessages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resets all state', async () => {
    mockSendMessage.mockResolvedValueOnce(makeSuccessResponse('Hi!'));

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});

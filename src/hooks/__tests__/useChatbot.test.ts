/**
 * @file useChatbot.test.ts
 * @description TDD tests for Phase 3 ChatbotUI — useChatbot hook.
 * cfutons_mobile-6hb
 *
 * Covers:
 *  - Initial state: empty messages, not sending, no error
 *  - sendMessage: appends user message optimistically
 *  - sendMessage: appends assistant reply on success
 *  - sendMessage: sets error on 'assistant_unavailable'
 *  - sendMessage: sets error on 'rate_limit_exceeded'
 *  - sendMessage: sets error on 'auth_required'
 *  - sendMessage: sets error on 'feature_disabled'
 *  - sendMessage: ignores empty/whitespace input
 *  - sendMessage: clears previous error on new send
 *  - clearMessages: resets messages and error
 *  - sending flag: true while request in flight, false after
 *  - Wix client unavailable: sets error gracefully
 */

import { renderHook, act } from '@testing-library/react-native';
import { useChatbot } from '../useChatbot';

const mockCallFunction = jest.fn();
const mockGetTokens = jest.fn();
const mockGetWixClientSingleton = jest.fn();

jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: (...args: unknown[]) => mockGetWixClientSingleton(...args),
  resetWixClientSingleton: jest.fn(),
}));

jest.mock('@/services/wix/wixSdkClient', () => ({
  getWixSdkClient: () => ({
    auth: { getTokens: mockGetTokens },
  }),
}));

const CHATBOT_PATH = '/_functions/gamificationChatbot/chatWithAssistant';

describe('useChatbot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTokens.mockReturnValue({ accessToken: { value: 'mock-token' } });
    mockGetWixClientSingleton.mockReturnValue({ callFunction: mockCallFunction });
  });

  it('initial state: empty messages, not sending, no error', () => {
    const { result } = renderHook(() => useChatbot());
    expect(result.current.messages).toEqual([]);
    expect(result.current.sending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sendMessage appends user message optimistically before response', async () => {
    let resolveCall!: (val: unknown) => void;
    mockCallFunction.mockReturnValue(new Promise((res) => { resolveCall = res; }));

    const { result } = renderHook(() => useChatbot());

    act(() => {
      result.current.sendMessage('hello');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      text: 'hello',
    });
    expect(result.current.sending).toBe(true);

    await act(async () => {
      resolveCall({ reply: 'Hi there!' });
    });
  });

  it('sendMessage appends assistant reply on success', async () => {
    mockCallFunction.mockResolvedValue({ reply: 'How can I help?' });

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      text: 'How can I help?',
    });
    expect(result.current.sending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sendMessage calls the correct endpoint with message and token', async () => {
    mockCallFunction.mockResolvedValue({ reply: 'ok' });

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('what are your hours?');
    });

    expect(mockCallFunction).toHaveBeenCalledWith(
      CHATBOT_PATH,
      'POST',
      expect.objectContaining({ message: 'what are your hours?', memberToken: 'mock-token' }),
    );
  });

  it('sendMessage sets error on assistant_unavailable', async () => {
    mockCallFunction.mockResolvedValue({ error: 'assistant_unavailable' });

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(result.current.error).toBe('assistant_unavailable');
    // User message is still in history; no assistant reply added
    expect(result.current.messages).toHaveLength(1);
  });

  it('sendMessage sets error on rate_limit_exceeded', async () => {
    mockCallFunction.mockResolvedValue({ error: 'rate_limit_exceeded', retryAfterMs: 60000 });

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(result.current.error).toBe('rate_limit_exceeded');
  });

  it('sendMessage sets error on auth_required', async () => {
    mockCallFunction.mockResolvedValue({ error: 'auth_required' });

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(result.current.error).toBe('auth_required');
  });

  it('sendMessage sets error on feature_disabled', async () => {
    mockCallFunction.mockResolvedValue({ error: 'feature_disabled' });

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(result.current.error).toBe('feature_disabled');
  });

  it('sendMessage ignores empty string (no API call)', async () => {
    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('   ');
    });

    expect(mockCallFunction).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it('sendMessage clears previous error on new send', async () => {
    mockCallFunction
      .mockResolvedValueOnce({ error: 'assistant_unavailable' })
      .mockResolvedValueOnce({ reply: 'ok' });

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('first');
    });

    expect(result.current.error).toBe('assistant_unavailable');

    await act(async () => {
      await result.current.sendMessage('second');
    });

    expect(result.current.error).toBeNull();
  });

  it('clearMessages resets messages and error', async () => {
    mockCallFunction.mockResolvedValue({ error: 'assistant_unavailable' });

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('sending is false after response completes', async () => {
    mockCallFunction.mockResolvedValue({ reply: 'done' });

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(result.current.sending).toBe(false);
  });

  it('sending is false after error response', async () => {
    mockCallFunction.mockResolvedValue({ error: 'assistant_unavailable' });

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(result.current.sending).toBe(false);
  });

  it('handles network throw gracefully', async () => {
    mockCallFunction.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(result.current.error).toBe('assistant_unavailable');
    expect(result.current.sending).toBe(false);
  });

  it('handles missing wix client gracefully (returns error)', async () => {
    mockGetWixClientSingleton.mockReturnValue(null);

    const { result } = renderHook(() => useChatbot());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(result.current.error).toBe('assistant_unavailable');
    expect(result.current.sending).toBe(false);
  });
});

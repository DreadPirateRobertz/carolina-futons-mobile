/**
 * @module useChatbot
 *
 * Chat session hook for the Carolina Futons AI assistant — hq-5yu4w.
 *
 * Manages message history, in-flight status, and all three error states:
 *   - 'network'        — fetch failed (no connectivity, DNS, timeout)
 *   - 'server'         — HTTP 5xx or unexpected backend error
 *   - 'empty_response' — response arrived but contained no text
 *
 * Callers use `retryLastMessage()` to re-send the last user message after
 * any error state without duplicating the user turn in the history.
 */

import { useState, useCallback } from 'react';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';

// ── Types ──────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'bot';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: number;
}

export type ChatStatus = 'idle' | 'sending' | 'error';

export type ChatErrorType = 'network' | 'server' | 'empty_response' | null;

export interface UseChatbotResult {
  messages: ChatMessage[];
  status: ChatStatus;
  error: ChatErrorType;
  sendMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  clearMessages: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function classifyError(err: unknown): Exclude<ChatErrorType, null> {
  if (err instanceof TypeError && err.message.includes('Network request failed')) {
    return 'network';
  }
  if (err instanceof Error && ((err as { status?: number }).status ?? 0) >= 500) {
    return 'server';
  }
  // Any other thrown error (e.g. auth, unexpected shape) treated as server error
  return 'server';
}

function extractResponseText(raw: unknown): string | null {
  if (
    raw != null &&
    typeof raw === 'object' &&
    'response' in raw &&
    typeof (raw as { response: unknown }).response === 'string'
  ) {
    return (raw as { response: string }).response;
  }
  return null;
}

// ── Hook ───────────────────────────────────────────────────────────

export function useChatbot(): UseChatbotResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<ChatErrorType>(null);

  const dispatch = useCallback(async (userText: string): Promise<void> => {
    setStatus('sending');
    setError(null);

    let raw: unknown;
    try {
      const client = getWixClientSingleton();
      if (!client) throw new TypeError('Network request failed');
      raw = await client.chatbotMessage(userText);
    } catch (err) {
      setStatus('error');
      setError(classifyError(err));
      return;
    }

    const responseText = extractResponseText(raw);
    if (responseText === null || responseText.trim() === '') {
      setStatus('error');
      setError('empty_response');
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        role: 'bot',
        text: responseText,
        timestamp: Date.now(),
      },
    ]);
    setStatus('idle');
  }, []);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (status === 'sending') return;

      const userMessage: ChatMessage = {
        id: makeId(),
        role: 'user',
        text,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      await dispatch(text);
    },
    [status, dispatch],
  );

  const retryLastMessage = useCallback(async (): Promise<void> => {
    if (status !== 'error') return;

    // Find the last user message to resend
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    await dispatch(lastUserMsg.text);
  }, [status, messages, dispatch]);

  const clearMessages = useCallback((): void => {
    setMessages([]);
    setStatus('idle');
    setError(null);
  }, []);

  return { messages, status, error, sendMessage, retryLastMessage, clearMessages };
}

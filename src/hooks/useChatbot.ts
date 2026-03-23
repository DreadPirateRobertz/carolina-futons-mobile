/**
 * @module useChatbot
 *
 * Phase 3 ChatbotUI — manages chat state and sends messages to the
 * gamificationChatbot webMethod (/_functions/gamificationChatbot/chatWithAssistant).
 *
 * Member auth token is read from the Wix SDK session and passed in the request
 * body. The backend resolves identity server-side (no IDOR risk).
 *
 * cfutons_mobile-6hb
 */

import { useState, useCallback } from 'react';
import { getWixClientSingleton } from '@/services/wix/wixClientSingleton';
import { getWixSdkClient } from '@/services/wix/wixSdkClient';

const CHATBOT_PATH = '/_functions/gamificationChatbot/chatWithAssistant';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

type ChatbotError =
  | 'assistant_unavailable'
  | 'rate_limit_exceeded'
  | 'auth_required'
  | 'feature_disabled'
  | null;

interface ChatbotResponse {
  reply?: string;
  error?: string;
  retryAfterMs?: number;
}

export interface UseChatbotResult {
  messages: ChatMessage[];
  sending: boolean;
  error: ChatbotError;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

let nextId = 0;
function makeId(): string {
  return String(++nextId);
}

export function useChatbot(): UseChatbotResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ChatbotError>(null);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = { id: makeId(), role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setError(null);

    try {
      let memberToken: string | undefined;
      try {
        const tokens = getWixSdkClient().auth.getTokens();
        memberToken = tokens.accessToken?.value;
      } catch {
        // SDK not initialized — send without token; backend will return auth_required
      }

      const wixClient = getWixClientSingleton();
      if (!wixClient) {
        setError('assistant_unavailable');
        return;
      }

      const response = await wixClient.callFunction<ChatbotResponse>(CHATBOT_PATH, 'POST', {
        message: trimmed,
        memberToken,
      });

      if (response.error) {
        setError(response.error as ChatbotError);
        return;
      }

      if (response.reply) {
        const assistantMsg: ChatMessage = {
          id: makeId(),
          role: 'assistant',
          text: response.reply,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      setError('assistant_unavailable');
    } finally {
      setSending(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, sending, error, sendMessage, clearMessages };
}

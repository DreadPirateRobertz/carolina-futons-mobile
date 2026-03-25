/**
 * @module questRefreshBus
 *
 * Lightweight in-app event bus that signals DailyQuestsCard to re-fetch
 * when a quest-relevant gamification action completes mid-session.
 *
 * Usage:
 *   - Producers (useGamificationEvents): call emitQuestRefresh() after
 *     addToCart / submitReview / arUsed / etc.
 *   - Consumers (useDailyQuests): subscribe via onQuestRefresh(callback)
 *     and call refresh() when notified.
 *
 * cf-ma6v
 */

type Listener = () => void;

class QuestRefreshBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export const questRefreshBus = new QuestRefreshBus();

export function onQuestRefresh(listener: Listener): () => void {
  return questRefreshBus.subscribe(listener);
}

export function emitQuestRefresh(): void {
  questRefreshBus.emit();
}

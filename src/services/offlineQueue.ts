/**
 * Offline action queue.
 *
 * Queues cart/wishlist mutations when offline, persists to AsyncStorage,
 * and replays them when connectivity is restored.
 */

export interface QueuedAction {
  id: string;
  timestamp: number;
  domain: 'cart' | 'wishlist';
  action: string; // action type string (e.g. 'ADD_ITEM', 'REMOVE')
  payload: Record<string, unknown>;
}

const QUEUE_KEY = 'cfutons_offline_queue';

let queue: QueuedAction[] = [];
let nextId = 1;

/** Generate a unique action id */
function generateId(): string {
  return `oq-${Date.now()}-${nextId++}`;
}

/** Enqueue an action for later replay */
export function enqueue(
  domain: QueuedAction['domain'],
  action: string,
  payload: Record<string, unknown>,
): QueuedAction {
  const entry: QueuedAction = {
    id: generateId(),
    timestamp: Date.now(),
    domain,
    action,
    payload,
  };
  queue.push(entry);
  persistQueue();
  return entry;
}

/** Get all queued actions (optionally filtered by domain) */
export function getQueue(domain?: QueuedAction['domain']): QueuedAction[] {
  if (domain) return queue.filter((a) => a.domain === domain);
  return [...queue];
}

/** Get queue length */
export function getQueueLength(): number {
  return queue.length;
}

/** Remove a specific action from the queue */
export function dequeue(id: string): boolean {
  const before = queue.length;
  queue = queue.filter((a) => a.id !== id);
  if (queue.length !== before) {
    persistQueue();
    return true;
  }
  return false;
}

/** Drain all actions (optionally by domain), removing them from the queue */
export function drain(domain?: QueuedAction['domain']): QueuedAction[] {
  let drained: QueuedAction[];
  if (domain) {
    drained = queue.filter((a) => a.domain === domain);
    queue = queue.filter((a) => a.domain !== domain);
  } else {
    drained = [...queue];
    queue = [];
  }
  persistQueue();
  return drained;
}

/** Re-enqueue actions that failed to sync, preserving original order */
export function reEnqueue(actions: QueuedAction[]): void {
  queue = [...actions, ...queue];
  persistQueue();
}

/** Clear the entire queue */
export function clearQueue(): void {
  queue = [];
  persistQueue();
}

/** Load queue from AsyncStorage (call on app start) */
export async function loadQueue(): Promise<QueuedAction[]> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
      (m) => m.default,
    );
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        queue = parsed;
      }
    }
  } catch {
    // AsyncStorage not available — operate in-memory only
  }
  return [...queue];
}

/** Persist queue to AsyncStorage */
async function persistQueue(): Promise<void> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then(
      (m) => m.default,
    );
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // no-op
  }
}

/** Reset internal state (for testing) */
export function _resetForTesting(): void {
  queue = [];
  nextId = 1;
}

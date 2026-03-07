/**
 * Offline action queue.
 *
 * Queues cart/wishlist mutations when offline, persists to AsyncStorage,
 * and replays them when connectivity is restored.
 */

import { captureException } from './crashReporting';

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
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        queue = parsed.filter(
          (item): item is QueuedAction =>
            item != null &&
            typeof item === 'object' &&
            typeof (item as QueuedAction).id === 'string' &&
            typeof (item as QueuedAction).timestamp === 'number' &&
            typeof (item as QueuedAction).domain === 'string' &&
            typeof (item as QueuedAction).action === 'string',
        );
      }
    }
  } catch (err) {
    captureException(
      err instanceof Error ? err : new Error('Failed to load offline queue from AsyncStorage'),
      'warning',
      { action: 'offlineQueue.loadQueue' },
    );
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
  } catch (err) {
    captureException(
      err instanceof Error ? err : new Error('Failed to persist offline queue to AsyncStorage'),
      'error',
      { action: 'offlineQueue.persistQueue', queueLength: queue.length },
    );
  }
}

// ── Executor registry ───────────────────────────────────────

export type ActionExecutor = (payload: Record<string, unknown>) => Promise<void>;

const executors: Map<string, ActionExecutor> = new Map();

/** Register an executor function for a given action type (e.g. 'ADD_ITEM'). */
export function registerExecutor(actionType: string, executor: ActionExecutor): void {
  executors.set(actionType, executor);
}

/** Get a registered executor by action type. */
export function getExecutor(actionType: string): ActionExecutor | undefined {
  return executors.get(actionType);
}

/** Remove all registered executors. */
export function clearExecutors(): void {
  executors.clear();
}

// ── Replay with exponential backoff ─────────────────────────

export interface ReplayOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface ReplayResult {
  succeeded: number;
  failed: number;
  errors: { actionId: string; error: Error }[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Replay all queued actions by calling their registered executors.
 *
 * Each action is retried with exponential backoff on failure.
 * Successfully replayed actions are removed from the queue.
 * Failed actions (after all retries exhausted) remain in the queue
 * for the next replay cycle.
 */
export async function replay(options: ReplayOptions = {}): Promise<ReplayResult> {
  const { maxRetries = 3, baseDelayMs = 1000 } = options;
  const actions = [...queue];
  const result: ReplayResult = { succeeded: 0, failed: 0, errors: [] };

  for (const action of actions) {
    const executor = executors.get(action.action);
    if (!executor) {
      // No executor registered — skip, leave in queue
      result.failed++;
      result.errors.push({
        actionId: action.id,
        error: new Error(`No executor registered for action: ${action.action}`),
      });
      continue;
    }

    let success = false;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await executor(action.payload);
        success = true;
        break;
      } catch (err) {
        if (attempt < maxRetries) {
          const jitter = Math.random() * baseDelayMs * 0.5;
          const backoff = baseDelayMs * Math.pow(2, attempt) + jitter;
          await delay(backoff);
        } else {
          result.errors.push({
            actionId: action.id,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    }

    if (success) {
      dequeue(action.id);
      result.succeeded++;
    } else {
      result.failed++;
    }
  }

  return result;
}

// ── LWW conflict resolution ─────────────────────────────────

/**
 * Compact queued actions for a domain using Last-Write-Wins.
 *
 * Groups actions by a key extracted from their payload (default: `productId`),
 * then keeps only the most recent action per key. Other domains are untouched.
 * This prevents contradictory add/remove pairs from being replayed.
 */
export function compactByLWW(
  domain: QueuedAction['domain'],
  keyField: string = 'productId',
): number {
  const domainActions = queue.filter((a) => a.domain === domain);
  const otherActions = queue.filter((a) => a.domain !== domain);

  const latest = new Map<string, QueuedAction>();
  for (const action of domainActions) {
    const key = String(action.payload[keyField] ?? '');
    const existing = latest.get(key);
    if (!existing || action.timestamp >= existing.timestamp) {
      latest.set(key, action);
    }
  }

  const compacted = Array.from(latest.values());
  const removed = domainActions.length - compacted.length;
  queue = [...otherActions, ...compacted].sort((a, b) => a.timestamp - b.timestamp);
  if (removed > 0) persistQueue();
  return removed;
}

/** Reset internal state (for testing) */
export function _resetForTesting(): void {
  queue = [];
  nextId = 1;
  executors.clear();
}

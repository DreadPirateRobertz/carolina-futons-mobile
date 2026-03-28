/**
 * @module questRefreshBus.test
 *
 * TDD tests for questRefreshBus — lightweight in-app event emitter
 * that signals DailyQuestsCard to refresh when a quest-relevant
 * gamification action completes (e.g. addToCart, submitReview, arUsed).
 *
 * cf-ma6v
 */

import { questRefreshBus, onQuestRefresh, emitQuestRefresh } from '../questRefreshBus';

describe('questRefreshBus', () => {
  afterEach(() => {
    // Clean up all listeners between tests
    questRefreshBus.removeAllListeners();
  });

  it('emitQuestRefresh notifies all subscribers', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    onQuestRefresh(listener1);
    onQuestRefresh(listener2);

    emitQuestRefresh();

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('returns unsubscribe function that removes only that listener', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    const unsub = onQuestRefresh(listener1);
    onQuestRefresh(listener2);

    unsub();
    emitQuestRefresh();

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('does not throw when emitting with no listeners', () => {
    expect(() => emitQuestRefresh()).not.toThrow();
  });

  it('listener is not called after unsubscribe even if emitted multiple times', () => {
    const listener = jest.fn();
    const unsub = onQuestRefresh(listener);

    emitQuestRefresh();
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    emitQuestRefresh();
    emitQuestRefresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('double unsubscribe is safe (no-op)', () => {
    const listener = jest.fn();
    const unsub = onQuestRefresh(listener);

    unsub();
    expect(() => unsub()).not.toThrow();
  });

  it('removeAllListeners clears everything', () => {
    const listener = jest.fn();
    onQuestRefresh(listener);
    onQuestRefresh(listener);

    questRefreshBus.removeAllListeners();
    emitQuestRefresh();

    expect(listener).not.toHaveBeenCalled();
  });
});

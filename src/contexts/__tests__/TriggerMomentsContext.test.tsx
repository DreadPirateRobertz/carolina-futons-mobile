/**
 * Tests for TriggerMomentsContext — hq-1e63
 */
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import {
  TriggerMomentsProvider,
  useTriggerMomentsContext,
} from '../TriggerMomentsContext';
import type { UseTriggerMomentsResult } from '@/hooks/useTriggerMoments';

const stubValue: UseTriggerMomentsResult = {
  triggers: {
    tierChanged: null,
    streakDanger: false,
    challengeCompleted: null,
    badgeUnlocked: null,
    milestoneUnlocked: false,
  },
  dismiss: jest.fn(),
  reportChallengesCompleted: jest.fn(),
  reportTriggers: jest.fn(),
  reportTierChanged: jest.fn(),
};

describe('TriggerMomentsContext', () => {
  it('provides the value to consumers', () => {
    const { result } = renderHook(() => useTriggerMomentsContext(), {
      wrapper: ({ children }) => (
        <TriggerMomentsProvider value={stubValue}>
          {children}
        </TriggerMomentsProvider>
      ),
    });

    expect(result.current.triggers).toBe(stubValue.triggers);
    expect(result.current.dismiss).toBe(stubValue.dismiss);
    expect(result.current.reportTierChanged).toBe(stubValue.reportTierChanged);
    expect(result.current.reportChallengesCompleted).toBe(
      stubValue.reportChallengesCompleted,
    );
    expect(result.current.reportTriggers).toBe(stubValue.reportTriggers);
  });

  it('throws when used outside TriggerMomentsProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTriggerMomentsContext())).toThrow(
      'useTriggerMomentsContext must be used within a TriggerMomentsProvider',
    );
    spy.mockRestore();
  });
});

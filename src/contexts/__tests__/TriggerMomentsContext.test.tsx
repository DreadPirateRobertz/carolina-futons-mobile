/**
 * TriggerMomentsContext tests — hq-qrjk2
 *
 * TDD spec for the global TriggerMomentsProvider that hosts useTriggerMoments
 * at the App root and renders ChallengeCompletedToast as a floating overlay.
 */
import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { TriggerMomentsProvider, useTriggerMomentsContext } from '../TriggerMomentsContext';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { ChallengeCompletedItem } from '@/hooks/useTriggerMoments';

// Mock reanimated — animation mechanics not under test
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: React.ComponentType) => c,
    },
    useSharedValue: (init: number) => ({ value: init }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (val: number) => val,
    withSequence: (...vals: number[]) => vals[vals.length - 1],
    withDelay: (_delay: number, val: number) => val,
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
  };
});

// Controllable mock for the underlying hook
const mockDismiss = jest.fn();
const mockReportChallengesCompleted = jest.fn();
let mockTriggers = {
  tierChanged: null as null,
  streakDanger: false,
  challengeCompleted: null as ChallengeCompletedItem | null,
};

jest.mock('@/hooks/useTriggerMoments', () => ({
  useTriggerMoments: () => ({
    triggers: mockTriggers,
    dismiss: mockDismiss,
    reportChallengesCompleted: mockReportChallengesCompleted,
  }),
}));

jest.useFakeTimers();

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TriggerMomentsProvider>{children}</TriggerMomentsProvider>
    </ThemeProvider>
  );
}

/** Consumer that reads triggers from context */
function TriggersDisplay() {
  const { triggers } = useTriggerMomentsContext();
  return <Text testID="triggers-display">{JSON.stringify(triggers)}</Text>;
}

/** Consumer that calls dismiss */
function DismissButton() {
  const { dismiss } = useTriggerMomentsContext();
  return (
    <TouchableOpacity onPress={() => dismiss('challengeCompleted')} testID="dismiss-btn">
      <Text>Dismiss</Text>
    </TouchableOpacity>
  );
}

/** Consumer that calls reportChallengesCompleted */
function ReportButton({ items }: { items: ChallengeCompletedItem[] }) {
  const { reportChallengesCompleted } = useTriggerMomentsContext();
  return (
    <TouchableOpacity onPress={() => reportChallengesCompleted(items)} testID="report-btn">
      <Text>Report</Text>
    </TouchableOpacity>
  );
}

describe('TriggerMomentsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTriggers = { tierChanged: null, streakDanger: false, challengeCompleted: null };
  });

  // ── Provider renders ──────────────────────────────────────────────────────

  it('renders children without crashing', () => {
    const { getByText } = render(
      <Wrapper>
        <Text>hello</Text>
      </Wrapper>,
    );
    expect(getByText('hello')).toBeTruthy();
  });

  it('renders the challenge toast overlay (initially hidden) inside the provider', () => {
    const { getByTestId } = render(
      <Wrapper>
        <Text>child</Text>
      </Wrapper>,
    );
    expect(getByTestId('challenge-completed-toast', { includeHiddenElements: true })).toBeTruthy();
  });

  // ── Context values ─────────────────────────────────────────────────────────

  it('exposes triggers from useTriggerMoments', () => {
    const { getByTestId } = render(
      <Wrapper>
        <TriggersDisplay />
      </Wrapper>,
    );
    const text = getByTestId('triggers-display').props.children;
    expect(text).toContain('"streakDanger":false');
    expect(text).toContain('"tierChanged":null');
  });

  it('exposes dismiss from useTriggerMoments', () => {
    const { getByTestId } = render(
      <Wrapper>
        <DismissButton />
      </Wrapper>,
    );
    fireEvent.press(getByTestId('dismiss-btn'));
    expect(mockDismiss).toHaveBeenCalledWith('challengeCompleted');
  });

  it('exposes reportChallengesCompleted from useTriggerMoments', () => {
    const items: ChallengeCompletedItem[] = [
      { challengeId: 'c1', title: 'Spring Refresh', rewardPoints: 500 },
    ];
    const { getByTestId } = render(
      <Wrapper>
        <ReportButton items={items} />
      </Wrapper>,
    );
    fireEvent.press(getByTestId('report-btn'));
    expect(mockReportChallengesCompleted).toHaveBeenCalledWith(items);
  });

  // ── Toast visibility ───────────────────────────────────────────────────────

  it('toast is hidden (accessibilityElementsHidden=true) when no challenge completed', () => {
    const { getByTestId } = render(
      <Wrapper>
        <Text>child</Text>
      </Wrapper>,
    );
    const toast = getByTestId('challenge-completed-toast', { includeHiddenElements: true });
    expect(toast.props.accessibilityElementsHidden).toBe(true);
  });

  it('toast is visible when challengeCompleted is non-null', () => {
    mockTriggers = {
      tierChanged: null,
      streakDanger: false,
      challengeCompleted: { challengeId: 'c1', title: 'Spring Refresh', rewardPoints: 500 },
    };
    const { getByTestId } = render(
      <Wrapper>
        <Text>child</Text>
      </Wrapper>,
    );
    const toast = getByTestId('challenge-completed-toast');
    expect(toast.props.accessibilityElementsHidden).toBe(false);
  });

  it('toast displays the challenge title when visible', () => {
    mockTriggers = {
      tierChanged: null,
      streakDanger: false,
      challengeCompleted: { challengeId: 'c1', title: 'Trail Blazer', rewardPoints: 250 },
    };
    const { getByText } = render(
      <Wrapper>
        <Text>child</Text>
      </Wrapper>,
    );
    expect(getByText(/Trail Blazer/)).toBeTruthy();
  });

  it('toast displays rewardPoints when visible', () => {
    mockTriggers = {
      tierChanged: null,
      streakDanger: false,
      challengeCompleted: { challengeId: 'c1', title: 'Explorer', rewardPoints: 1000 },
    };
    const { getByText } = render(
      <Wrapper>
        <Text>child</Text>
      </Wrapper>,
    );
    expect(getByText(/\+1000/)).toBeTruthy();
  });

  // ── Auto-dismiss ───────────────────────────────────────────────────────────

  it('calls dismiss after animation completes (1900ms)', () => {
    mockTriggers = {
      tierChanged: null,
      streakDanger: false,
      challengeCompleted: { challengeId: 'c1', title: 'Spring Refresh', rewardPoints: 500 },
    };
    render(
      <Wrapper>
        <Text>child</Text>
      </Wrapper>,
    );
    expect(mockDismiss).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1900);
    });
    expect(mockDismiss).toHaveBeenCalledWith('challengeCompleted');
  });

  it('does not call dismiss when challengeCompleted is null', () => {
    render(
      <Wrapper>
        <Text>child</Text>
      </Wrapper>,
    );
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockDismiss).not.toHaveBeenCalled();
  });

  // ── Error boundary ─────────────────────────────────────────────────────────

  it('useTriggerMomentsContext throws when used outside provider', () => {
    const Bad = () => {
      useTriggerMomentsContext();
      return null;
    };
    expect(() => render(<Bad />)).toThrow(/TriggerMomentsProvider/);
  });
});

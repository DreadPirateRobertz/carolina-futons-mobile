/**
 * DailyQuestsCard tests — cf-mz3
 *
 * TDD spec for the HomeScreen daily quests widget.
 * Shows 3 daily quests with checkbox UI, header count, and midnight refresh.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DailyQuestsCard } from '../DailyQuestsCard';
import { ThemeProvider } from '@/theme/ThemeProvider';

// ── Mocks ─────────────────────────────────────────────────────────────────

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
    withSpring: (val: number) => val,
    withSequence: (...vals: number[]) => vals[vals.length - 1],
    withTiming: (val: number) => val,
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
  };
});

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Controllable mock for useDailyQuests
const mockUseDailyQuests = jest.fn();
jest.mock('@/hooks/useDailyQuests', () => ({
  useDailyQuests: () => mockUseDailyQuests(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────

import type { DailyQuest } from '@/hooks/useDailyQuests';

const QUEST_PURCHASE: DailyQuest = {
  id: 'q-purchase',
  title: 'Browse 3 products',
  action: 'purchase',
  pointReward: 25,
  completed: false,
};

const QUEST_REVIEW: DailyQuest = {
  id: 'q-review',
  title: 'Write a review',
  action: 'review',
  pointReward: 100,
  completed: false,
};

const QUEST_AR: DailyQuest = {
  id: 'q-ar',
  title: 'Try AR on a product',
  action: 'ar',
  pointReward: 50,
  completed: false,
};

const ALL_QUESTS = [QUEST_PURCHASE, QUEST_REVIEW, QUEST_AR];

function renderCard(props: React.ComponentProps<typeof DailyQuestsCard> = {}) {
  return render(
    <ThemeProvider>
      <DailyQuestsCard {...props} />
    </ThemeProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('DailyQuestsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDailyQuests.mockReturnValue({
      quests: ALL_QUESTS,
      loading: false,
      refresh: jest.fn(),
    });
  });

  // ── Identification ──────────────────────────────────────────────────────

  it('has testID daily-quests-card', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('daily-quests-card')).toBeTruthy();
  });

  // ── Header ─────────────────────────────────────────────────────────────

  it('renders header text "Daily Quests"', () => {
    const { getByText } = renderCard();
    expect(getByText('Daily Quests')).toBeTruthy();
  });

  it('shows "0 of 3 complete" when no quests are done', () => {
    mockUseDailyQuests.mockReturnValue({
      quests: ALL_QUESTS.map((q) => ({ ...q, completed: false })),
      loading: false,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCard();
    expect(getByTestId('daily-quests-count').props.children).toBe('0 of 3 complete');
  });

  it('shows "1 of 3 complete" when one quest is done', () => {
    mockUseDailyQuests.mockReturnValue({
      quests: [
        { ...QUEST_PURCHASE, completed: true },
        QUEST_REVIEW,
        QUEST_AR,
      ],
      loading: false,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCard();
    expect(getByTestId('daily-quests-count').props.children).toBe('1 of 3 complete');
  });

  it('shows "3 of 3 complete" when all quests are done', () => {
    mockUseDailyQuests.mockReturnValue({
      quests: ALL_QUESTS.map((q) => ({ ...q, completed: true })),
      loading: false,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCard();
    expect(getByTestId('daily-quests-count').props.children).toBe('3 of 3 complete');
  });

  // ── Quest rows ──────────────────────────────────────────────────────────

  it('renders all 3 quest rows', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('daily-quest-row-q-purchase')).toBeTruthy();
    expect(getByTestId('daily-quest-row-q-review')).toBeTruthy();
    expect(getByTestId('daily-quest-row-q-ar')).toBeTruthy();
  });

  it('renders quest titles', () => {
    const { getByText } = renderCard();
    expect(getByText('Browse 3 products')).toBeTruthy();
    expect(getByText('Write a review')).toBeTruthy();
    expect(getByText('Try AR on a product')).toBeTruthy();
  });

  it('renders point reward badge for each quest', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('daily-quest-reward-q-purchase')).toBeTruthy();
    expect(getByTestId('daily-quest-reward-q-review')).toBeTruthy();
    expect(getByTestId('daily-quest-reward-q-ar')).toBeTruthy();
  });

  it('renders correct reward values', () => {
    const { getByText } = renderCard();
    expect(getByText('+25 pts')).toBeTruthy();
    expect(getByText('+100 pts')).toBeTruthy();
    expect(getByText('+50 pts')).toBeTruthy();
  });

  // ── Checkbox state ──────────────────────────────────────────────────────

  it('shows open circle for incomplete quests', () => {
    const { getByTestId } = renderCard();
    const checkbox = getByTestId('daily-quest-checkbox-q-purchase');
    expect(checkbox.props.accessibilityState?.checked).toBe(false);
  });

  it('shows filled checkmark for completed quests', () => {
    mockUseDailyQuests.mockReturnValue({
      quests: [{ ...QUEST_PURCHASE, completed: true }, QUEST_REVIEW, QUEST_AR],
      loading: false,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCard();
    const checkbox = getByTestId('daily-quest-checkbox-q-purchase');
    expect(checkbox.props.accessibilityState?.checked).toBe(true);
  });

  it('completed quest row has testID daily-quest-complete-q-id', () => {
    mockUseDailyQuests.mockReturnValue({
      quests: [{ ...QUEST_REVIEW, completed: true }, QUEST_PURCHASE, QUEST_AR],
      loading: false,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCard();
    expect(getByTestId('daily-quest-complete-q-review')).toBeTruthy();
  });

  it('incomplete quest row does not have the complete testID', () => {
    const { queryByTestId } = renderCard();
    expect(queryByTestId('daily-quest-complete-q-purchase')).toBeNull();
  });

  // ── Tap: incomplete row navigates ───────────────────────────────────────

  it('tapping purchase quest navigates to Tabs/Shop', () => {
    const { getByTestId } = renderCard();
    fireEvent.press(getByTestId('daily-quest-row-q-purchase'));
    expect(mockNavigate).toHaveBeenCalledWith('Tabs', { screen: 'Shop' });
  });

  it('tapping review quest navigates to OrderHistory', () => {
    const { getByTestId } = renderCard();
    fireEvent.press(getByTestId('daily-quest-row-q-review'));
    expect(mockNavigate).toHaveBeenCalledWith('OrderHistory');
  });

  it('tapping ar quest navigates to AR screen', () => {
    const { getByTestId } = renderCard();
    fireEvent.press(getByTestId('daily-quest-row-q-ar'));
    expect(mockNavigate).toHaveBeenCalledWith('AR');
  });

  it('onNavigate prop overrides default navigation for incomplete row', () => {
    const onNavigate = jest.fn();
    const { getByTestId } = renderCard({ onNavigate });
    fireEvent.press(getByTestId('daily-quest-row-q-purchase'));
    expect(onNavigate).toHaveBeenCalledWith('purchase');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ── Tap: completed row shows toast ──────────────────────────────────────

  it('tapping completed row shows "Quest complete!" toast', () => {
    mockUseDailyQuests.mockReturnValue({
      quests: [{ ...QUEST_PURCHASE, completed: true }, QUEST_REVIEW, QUEST_AR],
      loading: false,
      refresh: jest.fn(),
    });
    const { getByTestId, getByText } = renderCard();
    fireEvent.press(getByTestId('daily-quest-row-q-purchase'));
    expect(getByText('Quest complete!')).toBeTruthy();
    expect(getByTestId('daily-quests-toast')).toBeTruthy();
  });

  it('tapping completed row does not navigate', () => {
    mockUseDailyQuests.mockReturnValue({
      quests: [{ ...QUEST_PURCHASE, completed: true }, QUEST_REVIEW, QUEST_AR],
      loading: false,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCard();
    fireEvent.press(getByTestId('daily-quest-row-q-purchase'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('toast is not shown initially', () => {
    const { queryByTestId } = renderCard();
    expect(queryByTestId('daily-quests-toast')).toBeNull();
  });

  // ── Loading state ───────────────────────────────────────────────────────

  it('shows skeleton/loading state when loading=true', () => {
    mockUseDailyQuests.mockReturnValue({ quests: [], loading: true, refresh: jest.fn() });
    const { getByTestId } = renderCard();
    expect(getByTestId('daily-quests-loading')).toBeTruthy();
  });

  it('does not render quest rows while loading', () => {
    mockUseDailyQuests.mockReturnValue({ quests: [], loading: true, refresh: jest.fn() });
    const { queryByTestId } = renderCard();
    expect(queryByTestId('daily-quest-row-q-purchase')).toBeNull();
  });

  // ── Empty state ─────────────────────────────────────────────────────────

  it('renders no quest rows when quests array is empty (non-loading)', () => {
    mockUseDailyQuests.mockReturnValue({ quests: [], loading: false, refresh: jest.fn() });
    const { queryByTestId } = renderCard();
    expect(queryByTestId('daily-quest-row-q-purchase')).toBeNull();
  });

  // ── Accessibility ───────────────────────────────────────────────────────

  it('quest rows have accessibilityRole="button"', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('daily-quest-row-q-purchase').props.accessibilityRole).toBe('button');
  });

  it('incomplete row has accessibilityLabel describing quest + reward', () => {
    const { getByTestId } = renderCard();
    const row = getByTestId('daily-quest-row-q-purchase');
    expect(row.props.accessibilityLabel).toContain('Browse 3 products');
    expect(row.props.accessibilityLabel).toContain('25');
  });

  it('completed row has accessibilityLabel indicating completion', () => {
    mockUseDailyQuests.mockReturnValue({
      quests: [{ ...QUEST_PURCHASE, completed: true }, QUEST_REVIEW, QUEST_AR],
      loading: false,
      refresh: jest.fn(),
    });
    const { getByTestId } = renderCard();
    const row = getByTestId('daily-quest-row-q-purchase');
    expect(row.props.accessibilityLabel).toContain('complete');
  });
});

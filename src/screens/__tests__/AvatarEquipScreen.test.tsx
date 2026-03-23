/**
 * AvatarEquipScreen tests — cf-ymo
 *
 * TDD spec for the accessory equip screen.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AvatarEquipScreen } from '../AvatarEquipScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

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
  };
});

const mockUseAvatarState = jest.fn();
jest.mock('@/hooks/useAvatarState', () => ({
  useAvatarState: () => mockUseAvatarState(),
}));

const mockEquipAccessory = jest.fn();
const mockGetWixClient = jest.fn();
jest.mock('@/services/wix/wixClientSingleton', () => ({
  getWixClientSingleton: () => mockGetWixClient(),
}));

function renderScreen() {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <AvatarEquipScreen />
      </ThemeProvider>
    </NavigationContainer>,
  );
}

describe('AvatarEquipScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAvatarState.mockReturnValue({
      equippedAccessoryId: null,
      unlockedAccessoryIds: ['hat-crown', 'badge-star', 'bg-mountain'],
      loading: false,
      error: null,
      refreshAvatarState: jest.fn(),
    });
    mockEquipAccessory.mockResolvedValue({});
    mockGetWixClient.mockReturnValue({ callFunction: mockEquipAccessory });
  });

  // ── Rendering ──────────────────────────────────────────────────────

  it('has screen testID', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('avatar-equip-screen')).toBeTruthy();
  });

  it('renders the accessory grid', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('accessory-grid')).toBeTruthy();
  });

  it('renders accessory items', () => {
    const { getAllByTestId } = renderScreen();
    expect(getAllByTestId(/^accessory-item-/).length).toBeGreaterThan(0);
  });

  it('shows accessory names', () => {
    const { getByText } = renderScreen();
    expect(getByText('Crown')).toBeTruthy();
  });

  // ── Locked / unlocked ──────────────────────────────────────────────

  it('marks locked accessories as dimmed', () => {
    const { getByTestId } = renderScreen();
    // hat-cowboy is not in unlockedAccessoryIds — should be locked
    const lockedItem = getByTestId('accessory-item-hat-cowboy');
    expect(lockedItem.props.accessibilityState?.disabled).toBe(true);
  });

  it('shows lock icon on locked accessories', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('accessory-lock-hat-cowboy')).toBeTruthy();
  });

  it('does not show lock icon on unlocked accessories', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('accessory-lock-hat-crown')).toBeNull();
  });

  // ── Equip action ───────────────────────────────────────────────────

  it('pressing unlocked accessory calls equip function', async () => {
    const mockRefresh = jest.fn().mockResolvedValue(undefined);
    mockUseAvatarState.mockReturnValue({
      equippedAccessoryId: null,
      unlockedAccessoryIds: ['hat-crown', 'badge-star', 'bg-mountain'],
      loading: false,
      error: null,
      refreshAvatarState: mockRefresh,
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('accessory-item-hat-crown'));
    expect(mockEquipAccessory).toHaveBeenCalledWith(
      expect.stringContaining('equip'),
      expect.any(String),
      expect.objectContaining({ accessoryId: 'hat-crown' }),
    );
  });

  it('pressing locked accessory does not call equip function', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('accessory-item-hat-cowboy'));
    expect(mockEquipAccessory).not.toHaveBeenCalled();
  });

  // ── Points cost ────────────────────────────────────────────────────

  it('shows points cost for premium accessories', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('accessory-cost-hat-cowboy')).toBeTruthy();
  });

  it('does not show cost for free accessories', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('accessory-cost-hat-crown')).toBeNull();
  });

  // ── Currently equipped indicator ────────────────────────────────────

  it('shows equipped indicator on currently equipped accessory', () => {
    mockUseAvatarState.mockReturnValue({
      equippedAccessoryId: 'hat-crown',
      unlockedAccessoryIds: ['hat-crown', 'badge-star', 'bg-mountain'],
      loading: false,
      error: null,
      refreshAvatarState: jest.fn(),
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('accessory-equipped-hat-crown')).toBeTruthy();
  });

  // ── Loading state ──────────────────────────────────────────────────

  it('shows loading indicator when avatar state is loading', () => {
    mockUseAvatarState.mockReturnValue({
      equippedAccessoryId: null,
      unlockedAccessoryIds: [],
      loading: true,
      error: null,
      refreshAvatarState: jest.fn(),
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('avatar-equip-loading')).toBeTruthy();
  });

  // ── Error state ────────────────────────────────────────────────────

  it('shows error message when avatar state fails to load', () => {
    mockUseAvatarState.mockReturnValue({
      equippedAccessoryId: null,
      unlockedAccessoryIds: [],
      loading: false,
      error: 'Network error',
      refreshAvatarState: jest.fn(),
    });
    const { getByTestId } = renderScreen();
    expect(getByTestId('avatar-equip-error')).toBeTruthy();
  });

  // ── Disabled state on locked accessories (via accessibilityState) ────

  it('locked accessory is not interactive (accessibilityState.disabled)', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('accessory-item-hat-cowboy').props.accessibilityState?.disabled).toBe(true);
  });

  it('unlocked accessory is interactive (accessibilityState not disabled)', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('accessory-item-hat-crown').props.accessibilityState?.disabled).toBe(false);
  });

  // ── Equip error (CLAUDE.md: no empty catch blocks) ─────────────────

  it('shows equip error banner when wix client throws', async () => {
    mockEquipAccessory.mockRejectedValue(new Error('Wix timeout'));
    const { getByTestId, findByTestId } = renderScreen();
    fireEvent.press(getByTestId('accessory-item-hat-crown'));
    const errorEl = await findByTestId('avatar-equip-equip-error');
    expect(errorEl).toBeTruthy();
  });

  it('shows error banner when wix client is unavailable', async () => {
    mockGetWixClient.mockReturnValueOnce(null);
    const { getByTestId, findByTestId } = renderScreen();
    fireEvent.press(getByTestId('accessory-item-hat-crown'));
    const errorEl = await findByTestId('avatar-equip-equip-error');
    expect(errorEl).toBeTruthy();
  });

  // ── Unequip path ───────────────────────────────────────────────────

  it('tapping currently-equipped accessory calls equip with null (unequip)', () => {
    mockUseAvatarState.mockReturnValue({
      equippedAccessoryId: 'hat-crown',
      unlockedAccessoryIds: ['hat-crown', 'badge-star', 'bg-mountain'],
      loading: false,
      error: null,
      refreshAvatarState: jest.fn().mockResolvedValue(undefined),
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('accessory-item-hat-crown'));
    expect(mockEquipAccessory).toHaveBeenCalledWith(
      expect.stringContaining('equip'),
      expect.any(String),
      expect.objectContaining({ accessoryId: null }),
    );
  });

  // ── Edge case: empty unlocked list ─────────────────────────────────

  it('renders grid without crashing when unlockedAccessoryIds is empty', () => {
    mockUseAvatarState.mockReturnValue({
      equippedAccessoryId: null,
      unlockedAccessoryIds: [],
      loading: false,
      error: null,
      refreshAvatarState: jest.fn(),
    });
    expect(() => renderScreen()).not.toThrow();
  });
});

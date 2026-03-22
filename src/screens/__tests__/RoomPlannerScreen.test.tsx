/**
 * @module RoomPlannerScreen.test
 *
 * TDD tests for cm-62p Room Planner screen. Written before implementation.
 * Covers: render, room dimensions, product placement, save/share analytics,
 * persistence, initial product from navigation params, empty state.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { RoomPlannerScreen } from '../RoomPlannerScreen';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockTrackEvent = jest.fn();
jest.mock('@/services/analytics', () => ({
  events: {
    roomPlanSave: jest.fn(),
    roomPlanShare: jest.fn(),
  },
  trackEvent: (...args: any[]) => mockTrackEvent(...args),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-view-shot', () => {
  const { forwardRef } = require('react');
  const MockViewShot = forwardRef(({ children, ...props }: any, ref: any) =>
    require('react').createElement('View', { ...props, ref }, children),
  );
  MockViewShot.displayName = 'MockViewShot';
  return {
    __esModule: true,
    default: MockViewShot,
    captureRef: jest.fn().mockResolvedValue('file:///tmp/room-plan.png'),
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Share = { share: jest.fn().mockResolvedValue({ action: 'sharedAction' }) };
  return RN;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();

function renderRoomPlanner(params?: { productSlug?: string }) {
  return render(
    <NavigationContainer>
      <ThemeProvider>
        <Stack.Navigator>
          <Stack.Screen
            name="RoomPlanner"
            component={RoomPlannerScreen}
            initialParams={params ?? {}}
          />
        </Stack.Navigator>
      </ThemeProvider>
    </NavigationContainer>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

let mockAsyncStorage: { getItem: jest.Mock; setItem: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStorage = require('@react-native-async-storage/async-storage');
  mockAsyncStorage.getItem.mockResolvedValue(null);
});

describe('RoomPlannerScreen — render', () => {
  it('renders the room planner screen', async () => {
    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => expect(getByTestId('room-planner-screen')).toBeTruthy());
  });

  it('renders the SVG canvas', async () => {
    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => expect(getByTestId('room-planner-canvas')).toBeTruthy());
  });

  it('renders save and share buttons', async () => {
    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => {
      expect(getByTestId('room-planner-save-btn')).toBeTruthy();
      expect(getByTestId('room-planner-share-btn')).toBeTruthy();
    });
  });

  it('renders room dimension inputs', async () => {
    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => {
      expect(getByTestId('room-planner-room-width')).toBeTruthy();
      expect(getByTestId('room-planner-room-depth')).toBeTruthy();
    });
  });

  it('renders product picker panel', async () => {
    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => expect(getByTestId('room-planner-product-picker')).toBeTruthy());
  });

  it('shows empty state when no products placed', async () => {
    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => expect(getByTestId('room-planner-empty-state')).toBeTruthy());
  });
});

describe('RoomPlannerScreen — room dimensions', () => {
  it('shows default room dimensions (12 × 14 ft)', async () => {
    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => {
      const widthInput = getByTestId('room-planner-room-width');
      const depthInput = getByTestId('room-planner-room-depth');
      expect(widthInput.props.value ?? widthInput.props.children?.toString()).toMatch(/12/);
      expect(depthInput.props.value ?? depthInput.props.children?.toString()).toMatch(/14/);
    });
  });

  it('updates room width when changed', async () => {
    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => getByTestId('room-planner-room-width'));
    fireEvent.changeText(getByTestId('room-planner-room-width'), '16');
    await waitFor(() => {
      const widthInput = getByTestId('room-planner-room-width');
      expect(widthInput.props.value ?? widthInput.props.children?.toString()).toMatch(/16/);
    });
  });
});

describe('RoomPlannerScreen — product placement', () => {
  it('can add a product to the canvas from the picker', async () => {
    const { getByTestId, queryByTestId } = renderRoomPlanner();
    await waitFor(() => getByTestId('room-planner-product-picker'));

    // Find and tap the add button for the Asheville futon
    const addBtn = getByTestId('room-planner-add-asheville-full-futon');
    fireEvent.press(addBtn);

    await waitFor(() => {
      expect(queryByTestId('room-planner-empty-state')).toBeNull();
    });
  });

  it('removes empty state when first product is placed', async () => {
    const { getByTestId, queryByTestId } = renderRoomPlanner();
    await waitFor(() => getByTestId('room-planner-product-picker'));

    fireEvent.press(getByTestId('room-planner-add-asheville-full-futon'));

    await waitFor(() => {
      expect(queryByTestId('room-planner-empty-state')).toBeNull();
    });
  });
});

describe('RoomPlannerScreen — initial product from params', () => {
  it('pre-places product when productSlug param is provided', async () => {
    const { queryByTestId } = renderRoomPlanner({ productSlug: 'asheville-full-futon' });

    await waitFor(() => {
      expect(queryByTestId('room-planner-empty-state')).toBeNull();
    });
  });
});

describe('RoomPlannerScreen — analytics', () => {
  it('calls room_plan_save analytics on save', async () => {
    const { events } = require('@/services/analytics');
    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => getByTestId('room-planner-save-btn'));

    await act(async () => {
      fireEvent.press(getByTestId('room-planner-save-btn'));
    });

    expect(events.roomPlanSave).toHaveBeenCalledTimes(1);
  });

  it('calls room_plan_share analytics on share', async () => {
    const { events } = require('@/services/analytics');
    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => getByTestId('room-planner-share-btn'));

    await act(async () => {
      fireEvent.press(getByTestId('room-planner-share-btn'));
    });

    expect(events.roomPlanShare).toHaveBeenCalledTimes(1);
  });
});

describe('RoomPlannerScreen — persistence', () => {
  it('saves plan to AsyncStorage on save button press', async () => {
    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => getByTestId('room-planner-save-btn'));

    await act(async () => {
      fireEvent.press(getByTestId('room-planner-save-btn'));
    });

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('room_plan'),
      expect.any(String),
    );
  });

  it('loads saved plan from AsyncStorage on mount', async () => {
    const savedPlan = JSON.stringify({
      roomWidth: 10,
      roomDepth: 12,
      items: [],
      updatedAt: Date.now(),
    });
    mockAsyncStorage.getItem.mockResolvedValueOnce(savedPlan);

    const { getByTestId } = renderRoomPlanner();
    await waitFor(() => getByTestId('room-planner-room-width'));

    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
      expect.stringContaining('room_plan'),
    );
  });
});

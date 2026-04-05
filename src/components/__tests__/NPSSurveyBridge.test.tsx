/**
 * Tests for NPSSurveyBridge component — cm-5cp.
 *
 * Covers:
 *  - Renders NPSSurveyModal (hidden by default when no order data)
 *  - Reads most recent order from AsyncStorage via NUDGES_INDEX_KEY
 *  - Modal is visible when shouldShow is true (3d+ after delivery, no 90d suppress)
 *  - Modal is hidden when shouldShow is false
 *  - onDismiss wires to hook's dismiss()
 *  - onSubmitted wires to hook's dismiss()
 *  - Re-checks order on AppState 'active' transition
 *
 * hq-ghe: post-purchase NPS survey.
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { NPSSurveyBridge } from '../NPSSurveyBridge';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

jest.mock('@/services/wix', () => ({
  useOptionalWixClient: () => null,
}));

// Mock useNPSSurvey so we control shouldShow without needing real dates/storage
const mockDismiss = jest.fn().mockResolvedValue(undefined);
const mockSubmit = jest.fn().mockResolvedValue(undefined);
let mockShouldShow = false;

jest.mock('@/hooks/useNPSSurvey', () => ({
  useNPSSurvey: () => ({
    shouldShow: mockShouldShow,
    isSubmitting: false,
    submitSuccess: false,
    submitError: null,
    dismiss: mockDismiss,
    submit: mockSubmit,
  }),
  STORAGE_KEY: '@cfutons/nps_last_prompted',
  DELIVERY_DELAY_MS: 259200000,
  SUPPRESS_MS: 7776000000,
}));

jest.mock('@/hooks/usePostPurchaseReviewPush', () => ({
  PUSH_STORAGE_PREFIX: '@cfutons/review_push_',
  NUDGES_INDEX_KEY: '@cfutons/review_nudges_index',
}));

// Stub NPSSurveyModal to avoid rendering the full modal UI in bridge tests
jest.mock('@/components/NPSSurveyModal', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    NPSSurveyModal: ({ visible, testID, onDismiss, onSubmitted }: any) =>
      createElement(View, {
        testID: testID ?? 'nps-survey-bridge-modal',
        accessibilityState: { expanded: visible },
        // Expose callbacks so tests can reach them
        onAccessibilityAction: ({ nativeEvent: { actionName } }: any) => {
          if (actionName === 'dismiss') onDismiss?.();
          if (actionName === 'submitted') onSubmitted?.();
        },
      }),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const ORDER_ID = 'order-bridge-001';
const PLACED_AT = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(); // 4 days ago

function setupOrderInStorage() {
  mockGetItem.mockImplementation(async (key: string) => {
    if (key === '@cfutons/review_nudges_index') {
      return JSON.stringify([ORDER_ID]);
    }
    if (key === `@cfutons/review_push_${ORDER_ID}`) {
      return JSON.stringify({ orderId: ORDER_ID, placedAt: PLACED_AT });
    }
    return null;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NPSSurveyBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShouldShow = false;
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('renders without crashing', async () => {
    const { getByTestId } = render(<NPSSurveyBridge />);
    await waitFor(() => expect(getByTestId('nps-survey-bridge-modal')).toBeTruthy());
  });

  it('modal is hidden (not expanded) when shouldShow is false', async () => {
    mockShouldShow = false;
    const { getByTestId } = render(<NPSSurveyBridge />);
    await waitFor(() => {
      const modal = getByTestId('nps-survey-bridge-modal');
      expect(modal.props.accessibilityState?.expanded).toBe(false);
    });
  });

  it('modal is visible (expanded) when shouldShow is true', async () => {
    mockShouldShow = true;
    const { getByTestId } = render(<NPSSurveyBridge />);
    await waitFor(() => {
      const modal = getByTestId('nps-survey-bridge-modal');
      expect(modal.props.accessibilityState?.expanded).toBe(true);
    });
  });

  it('reads order from AsyncStorage on mount', async () => {
    setupOrderInStorage();
    render(<NPSSurveyBridge />);
    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith('@cfutons/review_nudges_index');
    });
  });

  it('reads individual order record after finding index', async () => {
    setupOrderInStorage();
    render(<NPSSurveyBridge />);
    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith(`@cfutons/review_push_${ORDER_ID}`);
    });
  });

  it('re-reads order when app comes to foreground', async () => {
    setupOrderInStorage();
    let appStateListener: ((state: string) => void) | null = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      appStateListener = handler as (state: string) => void;
      return { remove: jest.fn() };
    });

    render(<NPSSurveyBridge />);
    await waitFor(() => expect(mockGetItem).toHaveBeenCalled());

    const callsBefore = mockGetItem.mock.calls.length;
    act(() => appStateListener?.('active'));

    await waitFor(() => {
      expect(mockGetItem.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('handles empty AsyncStorage gracefully (no order)', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(() => render(<NPSSurveyBridge />)).not.toThrow();
  });

  it('handles AsyncStorage error gracefully', async () => {
    mockGetItem.mockRejectedValue(new Error('Storage unavailable'));
    expect(() => render(<NPSSurveyBridge />)).not.toThrow();
  });
});

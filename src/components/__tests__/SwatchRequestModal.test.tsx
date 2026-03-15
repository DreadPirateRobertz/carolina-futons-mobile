/**
 * @module SwatchRequestModal.test
 *
 * TDD tests for the SwatchRequestModal component — allows users to select
 * up to 3 fabric swatches and enter a shipping address to request physical samples.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SwatchRequestModal } from '../SwatchRequestModal';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { FABRICS } from '@/data/futons';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('@/services/analytics', () => ({
  events: {
    requestSwatches: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  productId: 'prod-asheville',
  productName: 'The Asheville',
  fabrics: FABRICS,
};

function renderModal(props: Partial<React.ComponentProps<typeof SwatchRequestModal>> = {}) {
  return render(
    <ThemeProvider>
      <SwatchRequestModal {...defaultProps} {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SwatchRequestModal', () => {
  describe('rendering', () => {
    it('renders when visible', () => {
      const { getByText } = renderModal();
      expect(getByText('Request Free Swatches')).toBeTruthy();
    });

    it('does not render when not visible', () => {
      const { queryByText } = renderModal({ visible: false });
      expect(queryByText('Request Free Swatches')).toBeNull();
    });

    it('shows product name in header', () => {
      const { getByText } = renderModal();
      expect(getByText(/The Asheville/)).toBeTruthy();
    });

    it('renders all fabric swatches', () => {
      const { getByTestId } = renderModal();
      FABRICS.forEach((fabric) => {
        expect(getByTestId(`swatch-option-${fabric.id}`)).toBeTruthy();
      });
    });

    it('shows "up to 3 free" messaging', () => {
      const { getByText } = renderModal();
      expect(getByText(/up to 3/i)).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('fabric swatches have accessibility labels with fabric name', () => {
      const { getByTestId } = renderModal();
      const swatch = getByTestId('swatch-option-natural-linen');
      expect(swatch.props.accessibilityLabel).toContain('Natural Linen');
    });

    it('selected swatches announce selected state', () => {
      const { getByTestId } = renderModal();
      const swatch = getByTestId('swatch-option-natural-linen');
      fireEvent.press(swatch);

      const updated = getByTestId('swatch-option-natural-linen');
      expect(updated.props.accessibilityState?.selected).toBe(true);
    });

    it('submit button has descriptive accessibility label', () => {
      const { getByTestId } = renderModal();
      const submitBtn = getByTestId('swatch-submit-button');
      expect(submitBtn.props.accessibilityLabel).toBeTruthy();
      expect(submitBtn.props.accessibilityRole).toBe('button');
    });

    it('close button has accessibility label', () => {
      const { getByTestId } = renderModal();
      const closeBtn = getByTestId('swatch-close-button');
      expect(closeBtn.props.accessibilityLabel).toContain('Close');
    });

    it('address fields have accessibility labels', () => {
      const { getByTestId } = renderModal();
      // Select a fabric to show address form
      fireEvent.press(getByTestId('swatch-option-natural-linen'));

      expect(getByTestId('swatch-address-name').props.accessibilityLabel).toContain('name');
    });

    it('counter announces number of swatches selected', () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('swatch-option-natural-linen'));
      fireEvent.press(getByTestId('swatch-option-slate-gray'));

      const counter = getByTestId('swatch-selection-counter');
      expect(counter.props.accessibilityLabel).toMatch(/2.*selected/i);
    });
  });

  describe('fabric selection interaction', () => {
    it('selects a fabric on press', () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('swatch-option-natural-linen'));

      const swatch = getByTestId('swatch-option-natural-linen');
      expect(swatch.props.accessibilityState?.selected).toBe(true);
    });

    it('deselects a fabric on second press', () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('swatch-option-natural-linen'));
      fireEvent.press(getByTestId('swatch-option-natural-linen'));

      const swatch = getByTestId('swatch-option-natural-linen');
      expect(swatch.props.accessibilityState?.selected).toBe(false);
    });

    it('prevents selecting more than 3 fabrics', () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('swatch-option-natural-linen'));
      fireEvent.press(getByTestId('swatch-option-slate-gray'));
      fireEvent.press(getByTestId('swatch-option-mountain-blue'));
      fireEvent.press(getByTestId('swatch-option-sunset-coral'));

      const fourth = getByTestId('swatch-option-sunset-coral');
      expect(fourth.props.accessibilityState?.selected).toBe(false);
    });

    it('updates selection counter text', () => {
      const { getByTestId, getByText } = renderModal();
      fireEvent.press(getByTestId('swatch-option-natural-linen'));

      expect(getByText('1 of 3 selected')).toBeTruthy();
    });
  });

  describe('address form', () => {
    it('validates required fields on submit', async () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('swatch-option-natural-linen'));
      fireEvent.press(getByTestId('swatch-submit-button'));

      await waitFor(() => {
        expect(getByTestId('swatch-error-name')).toBeTruthy();
      });
    });

    it('validates zip code format', async () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('swatch-option-natural-linen'));

      fireEvent.changeText(getByTestId('swatch-address-name'), 'Jane Doe');
      fireEvent.changeText(getByTestId('swatch-address-line1'), '123 Main St');
      fireEvent.changeText(getByTestId('swatch-address-city'), 'Asheville');
      fireEvent.changeText(getByTestId('swatch-address-state'), 'NC');
      fireEvent.changeText(getByTestId('swatch-address-zip'), 'abc');

      fireEvent.press(getByTestId('swatch-submit-button'));

      await waitFor(() => {
        expect(getByTestId('swatch-error-zip')).toBeTruthy();
      });
    });

    it('requires at least one fabric selected to submit', async () => {
      const { getByTestId, getByText } = renderModal();
      fireEvent.press(getByTestId('swatch-submit-button'));

      await waitFor(() => {
        expect(getByText(/select at least/i)).toBeTruthy();
      });
    });
  });

  describe('submission flow', () => {
    it('shows success state after valid submission', async () => {
      const { getByTestId, getByText } = renderModal();
      fireEvent.press(getByTestId('swatch-option-natural-linen'));

      fireEvent.changeText(getByTestId('swatch-address-name'), 'Jane Doe');
      fireEvent.changeText(getByTestId('swatch-address-line1'), '123 Main St');
      fireEvent.changeText(getByTestId('swatch-address-city'), 'Asheville');
      fireEvent.changeText(getByTestId('swatch-address-state'), 'NC');
      fireEvent.changeText(getByTestId('swatch-address-zip'), '28801');

      fireEvent.press(getByTestId('swatch-submit-button'));

      await waitFor(() => {
        expect(getByText(/swatches are on the way/i)).toBeTruthy();
      });
    });

    it('disables submit button while submitting', async () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('swatch-option-natural-linen'));

      fireEvent.changeText(getByTestId('swatch-address-name'), 'Jane Doe');
      fireEvent.changeText(getByTestId('swatch-address-line1'), '123 Main St');
      fireEvent.changeText(getByTestId('swatch-address-city'), 'Asheville');
      fireEvent.changeText(getByTestId('swatch-address-state'), 'NC');
      fireEvent.changeText(getByTestId('swatch-address-zip'), '28801');

      fireEvent.press(getByTestId('swatch-submit-button'));

      const submitBtn = getByTestId('swatch-submit-button');
      expect(submitBtn.props.accessibilityState?.disabled).toBe(true);
    });

    it('calls onClose after successful submission and done tap', async () => {
      const onClose = jest.fn();
      const { getByTestId, getByText } = renderModal({ onClose });
      fireEvent.press(getByTestId('swatch-option-natural-linen'));

      fireEvent.changeText(getByTestId('swatch-address-name'), 'Jane Doe');
      fireEvent.changeText(getByTestId('swatch-address-line1'), '123 Main St');
      fireEvent.changeText(getByTestId('swatch-address-city'), 'Asheville');
      fireEvent.changeText(getByTestId('swatch-address-state'), 'NC');
      fireEvent.changeText(getByTestId('swatch-address-zip'), '28801');

      fireEvent.press(getByTestId('swatch-submit-button'));

      await waitFor(() => {
        expect(getByText(/swatches are on the way/i)).toBeTruthy();
      });

      fireEvent.press(getByTestId('swatch-done-button'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('close behavior', () => {
    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderModal({ onClose });
      fireEvent.press(getByTestId('swatch-close-button'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('rate limit display', () => {
    it('shows already-requested message when recent request exists', async () => {
      const recentRequests = JSON.stringify([
        {
          productId: 'prod-asheville',
          fabricIds: ['natural-linen'],
          timestamp: Date.now() - 1000,
        },
      ]);

      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(recentRequests);

      const { getByText } = renderModal();

      await waitFor(() => {
        expect(getByText(/already requested/i)).toBeTruthy();
      });
    });
  });
});

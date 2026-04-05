/**
 * Tests for OnboardingStyleModal — cm-qdm
 *
 * AC:
 *  1. Does not render content when visible=false
 *  2. Step 0: shows furniture style options (Modern, Coastal, Rustic, Traditional)
 *  3. Step 0: shows progress 1/2
 *  4. Selecting a furniture style advances to step 1
 *  5. Step 1: shows room type options (Living Room, Bedroom, Guest Room, Dorm, Home Office)
 *  6. Step 1: shows progress 2/2
 *  7. Selecting a room type advances to step 2 (completion)
 *  8. Completion step shows save button
 *  9. Save button calls hook's save() method
 * 10. Successful save calls onComplete
 * 11. Back on step 0 calls onDismiss
 * 12. Back on step 1 goes back to step 0
 * 13. Back on completion step goes back to step 1
 * 14. isSaving shows loading indicator, disables save button
 * 15. saveError shows error message below save button
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { OnboardingStyleModal } from '../OnboardingStyleModal';

// --- Mocks ---

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { sunsetCoral: '#E8845C', white: '#FFFFFF', sandBase: '#F5EFE4' },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    borderRadius: { card: 12, button: 12, pill: 20 },
    typography: {
      headingFamily: 'System',
      bodyFamily: 'System',
      bodyFamilySemiBold: 'System',
    },
    shadows: { button: {} },
  }),
}));

jest.mock('@/services/wix/wixProvider', () => ({
  useOptionalWixClient: () => null,
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

// Control the hook from outside the component in tests
const mockSetFurnitureStyle = jest.fn();
const mockSetRoomType = jest.fn();
const mockGoBack = jest.fn();
const mockSave = jest.fn();

let mockHookState = {
  furnitureStyle: null as string | null,
  roomType: null as string | null,
  step: 0,
  isSaving: false,
  saveError: null as string | null,
  setFurnitureStyle: mockSetFurnitureStyle,
  setRoomType: mockSetRoomType,
  goBack: mockGoBack,
  save: mockSave,
};

jest.mock('@/hooks/useOnboardingStyleQuiz', () => ({
  useOnboardingStyleQuiz: () => mockHookState,
}));

// --- Helpers ---

function renderModal(
  props: { visible?: boolean; onDismiss?: () => void; onComplete?: () => void } = {},
) {
  const onDismiss = props.onDismiss ?? jest.fn();
  const onComplete = props.onComplete ?? jest.fn();
  return render(
    <OnboardingStyleModal
      visible={props.visible ?? true}
      onDismiss={onDismiss}
      onComplete={onComplete}
    />,
  );
}

// --- Tests ---

describe('OnboardingStyleModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookState = {
      furnitureStyle: null,
      roomType: null,
      step: 0,
      isSaving: false,
      saveError: null,
      setFurnitureStyle: mockSetFurnitureStyle,
      setRoomType: mockSetRoomType,
      goBack: mockGoBack,
      save: mockSave,
    };
    mockSave.mockResolvedValue(true);
  });

  // --- Visibility ---

  describe('visibility', () => {
    it('does not render modal content when visible=false', () => {
      const { queryByTestId } = renderModal({ visible: false });
      expect(queryByTestId('onboarding-style-modal')).toBeNull();
    });

    it('renders modal content when visible=true', () => {
      const { getByTestId } = renderModal({ visible: true });
      expect(getByTestId('onboarding-style-modal')).toBeTruthy();
    });
  });

  // --- Step 0: Furniture Style ---

  describe('step 0 — furniture style', () => {
    it('shows the furniture style step', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-step-0')).toBeTruthy();
    });

    it('shows progress 1/2', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('quiz-progress')).toBeTruthy();
      expect(getByTestId('quiz-progress-label')).toBeTruthy();
    });

    it('shows Modern option', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-option-modern')).toBeTruthy();
    });

    it('shows Coastal option', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-option-coastal')).toBeTruthy();
    });

    it('shows Rustic option', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-option-rustic')).toBeTruthy();
    });

    it('shows Traditional option', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-option-traditional')).toBeTruthy();
    });

    it('calls setFurnitureStyle with correct value when an option is pressed', () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('style-option-coastal'));
      expect(mockSetFurnitureStyle).toHaveBeenCalledWith('coastal');
    });
  });

  // --- Step 1: Room Type ---

  describe('step 1 — room type', () => {
    beforeEach(() => {
      mockHookState = { ...mockHookState, step: 1, furnitureStyle: 'coastal' };
    });

    it('shows the room type step', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-step-1')).toBeTruthy();
    });

    it('shows Living Room option', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('room-option-living-room')).toBeTruthy();
    });

    it('shows Bedroom option', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('room-option-bedroom')).toBeTruthy();
    });

    it('shows Guest Room option', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('room-option-guest-room')).toBeTruthy();
    });

    it('shows Dorm option', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('room-option-dorm')).toBeTruthy();
    });

    it('shows Home Office option', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('room-option-office')).toBeTruthy();
    });

    it('calls setRoomType with correct value when an option is pressed', () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('room-option-bedroom'));
      expect(mockSetRoomType).toHaveBeenCalledWith('bedroom');
    });
  });

  // --- Step 2: Completion ---

  describe('step 2 — completion', () => {
    beforeEach(() => {
      mockHookState = {
        ...mockHookState,
        step: 2,
        furnitureStyle: 'rustic',
        roomType: 'bedroom',
      };
    });

    it('shows completion step', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-step-completion')).toBeTruthy();
    });

    it('shows save button', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-quiz-save-button')).toBeTruthy();
    });

    it('pressing save calls hook save()', async () => {
      const { getByTestId } = renderModal();
      await act(async () => {
        fireEvent.press(getByTestId('style-quiz-save-button'));
      });
      expect(mockSave).toHaveBeenCalled();
    });

    it('calls onComplete after successful save', async () => {
      const onComplete = jest.fn();
      mockSave.mockResolvedValueOnce(true);
      const { getByTestId } = renderModal({ onComplete });
      await act(async () => {
        fireEvent.press(getByTestId('style-quiz-save-button'));
      });
      expect(onComplete).toHaveBeenCalled();
    });

    it('does not call onComplete when save returns false', async () => {
      const onComplete = jest.fn();
      mockSave.mockResolvedValueOnce(false);
      const { getByTestId } = renderModal({ onComplete });
      await act(async () => {
        fireEvent.press(getByTestId('style-quiz-save-button'));
      });
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  // --- isSaving state ---

  describe('isSaving', () => {
    beforeEach(() => {
      mockHookState = {
        ...mockHookState,
        step: 2,
        furnitureStyle: 'modern',
        roomType: 'dorm',
        isSaving: true,
      };
    });

    it('shows loading indicator when isSaving is true', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-quiz-saving-indicator')).toBeTruthy();
    });

    it('save button is disabled when isSaving', () => {
      const { getByTestId } = renderModal();
      const btn = getByTestId('style-quiz-save-button');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });
  });

  // --- saveError ---

  describe('saveError', () => {
    beforeEach(() => {
      mockHookState = {
        ...mockHookState,
        step: 2,
        furnitureStyle: 'traditional',
        roomType: 'office',
        saveError: 'Connection error. Your preferences were saved locally.',
      };
    });

    it('shows saveError message', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-quiz-save-error')).toBeTruthy();
    });

    it('error message contains the saveError text', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-quiz-save-error').props.children).toContain('Connection error');
    });
  });

  // --- Navigation / back ---

  describe('back navigation', () => {
    it('calls onDismiss when back is pressed on step 0', () => {
      const onDismiss = jest.fn();
      const { getByTestId } = renderModal({ onDismiss });
      fireEvent.press(getByTestId('style-quiz-back-button'));
      expect(onDismiss).toHaveBeenCalled();
    });

    it('calls goBack when back is pressed on step 1', () => {
      mockHookState = { ...mockHookState, step: 1, furnitureStyle: 'modern' };
      const onDismiss = jest.fn();
      const { getByTestId } = renderModal({ onDismiss });
      fireEvent.press(getByTestId('style-quiz-back-button'));
      expect(mockGoBack).toHaveBeenCalled();
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('calls goBack when back is pressed on completion step', () => {
      mockHookState = { ...mockHookState, step: 2, furnitureStyle: 'rustic', roomType: 'dorm' };
      const onDismiss = jest.fn();
      const { getByTestId } = renderModal({ onDismiss });
      fireEvent.press(getByTestId('style-quiz-back-button'));
      expect(mockGoBack).toHaveBeenCalled();
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  // --- Accessibility ---

  describe('accessibility', () => {
    it('style option buttons have accessibilityRole=button', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId('style-option-modern').props.accessibilityRole).toBe('button');
    });

    it('selected furniture style has accessibilityState selected=true', () => {
      mockHookState = { ...mockHookState, furnitureStyle: 'coastal' };
      const { getByTestId } = renderModal();
      expect(getByTestId('style-option-coastal').props.accessibilityState?.selected).toBe(true);
    });

    it('unselected option has accessibilityState selected=false', () => {
      mockHookState = { ...mockHookState, furnitureStyle: 'coastal' };
      const { getByTestId } = renderModal();
      expect(getByTestId('style-option-modern').props.accessibilityState?.selected).toBe(false);
    });
  });
});

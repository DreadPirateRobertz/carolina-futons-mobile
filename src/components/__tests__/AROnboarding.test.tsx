import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AROnboarding } from '../AROnboarding';

describe('AROnboarding', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders first tutorial step', () => {
    const { getByTestId, getByText } = render(
      <AROnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />,
    );
    expect(getByTestId('ar-onboarding')).toBeTruthy();
    expect(getByText(/scan/i)).toBeTruthy();
  });

  it('shows skip button', () => {
    const { getByTestId } = render(
      <AROnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />,
    );
    expect(getByTestId('ar-onboarding-skip')).toBeTruthy();
  });

  it('advances to next step on button press', () => {
    const { getByTestId } = render(
      <AROnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />,
    );
    fireEvent.press(getByTestId('ar-onboarding-next'));
    // Should be on step 2 now
    expect(getByTestId('ar-onboarding-step-1')).toBeTruthy();
  });

  it('calls onSkip when skip pressed', () => {
    const { getByTestId } = render(
      <AROnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />,
    );
    fireEvent.press(getByTestId('ar-onboarding-skip'));
    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('calls onComplete on final step action', () => {
    const { getByTestId } = render(
      <AROnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />,
    );
    // Advance through all steps
    fireEvent.press(getByTestId('ar-onboarding-next'));
    fireEvent.press(getByTestId('ar-onboarding-next'));
    // Final step should show "Get Started" and call onComplete
    fireEvent.press(getByTestId('ar-onboarding-next'));
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('shows progress indicator', () => {
    const { getByTestId } = render(
      <AROnboarding onComplete={mockOnComplete} onSkip={mockOnSkip} />,
    );
    expect(getByTestId('ar-onboarding-progress')).toBeTruthy();
  });
});

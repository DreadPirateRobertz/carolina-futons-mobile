/**
 * Tests for the PrivacyPolicyScreen component.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PrivacyPolicyScreen } from '../PrivacyPolicyScreen';

// Mock dependencies
jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#F2E8D5',
      espresso: '#3A2518',
      espressoLight: '#6B5B4F',
      white: '#FFFFFF',
      mountainBlue: '#5B8FA8',
    },
    spacing: { sm: 8, md: 16, lg: 24 },
    borderRadius: { card: 12 },
    typography: {
      headingFamily: 'System',
      bodyFamily: 'System',
      bodyFamilySemiBold: 'System',
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34 }),
}));

describe('PrivacyPolicyScreen', () => {
  it('renders the privacy policy title', () => {
    const { getByText } = render(<PrivacyPolicyScreen />);
    expect(getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders key policy sections', () => {
    const { getByText } = render(<PrivacyPolicyScreen />);
    expect(getByText('Information We Collect')).toBeTruthy();
    expect(getByText('How We Use Your Information')).toBeTruthy();
    expect(getByText('Data Sharing')).toBeTruthy();
    expect(getByText('Data Security')).toBeTruthy();
    expect(getByText('Your Rights')).toBeTruthy();
    expect(getByText('Contact Us')).toBeTruthy();
  });

  it('renders the effective date', () => {
    const { getByTestId } = render(<PrivacyPolicyScreen />);
    expect(getByTestId('privacy-effective-date')).toBeTruthy();
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(<PrivacyPolicyScreen onBack={onBack} />);
    fireEvent.press(getByTestId('privacy-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders without onBack (no back button)', () => {
    const { queryByTestId } = render(<PrivacyPolicyScreen />);
    expect(queryByTestId('privacy-back')).toBeNull();
  });

  it('renders contact email', () => {
    const { getByText } = render(<PrivacyPolicyScreen />);
    expect(getByText(/privacy@carolinafutons\.com/)).toBeTruthy();
  });

  it('has correct testID', () => {
    const { getByTestId } = render(<PrivacyPolicyScreen testID="custom-privacy" />);
    expect(getByTestId('custom-privacy')).toBeTruthy();
  });
});

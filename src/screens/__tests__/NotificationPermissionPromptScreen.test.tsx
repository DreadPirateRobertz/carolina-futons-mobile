import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockRequest = jest.fn().mockResolvedValue('granted');
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@/hooks/useNotificationPermission', () => ({
  useNotificationPermission: () => ({
    status: 'undetermined',
    hasAskedBefore: false,
    requestPermission: mockRequest,
    openSettings: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// Mock useTheme to avoid theme provider requirements in tests
jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3A2518',
      sandBase: '#E8D5B7',
      offWhite: '#FAF7F2',
      sunsetCoral: '#E8845C',
    },
    spacing: { sm: 8, md: 16, lg: 24, xl: 32 },
    typography: { headingFamily: 'System', bodyFamily: 'System' },
    borderRadius: { md: 8 },
  }),
}));

import { NotificationPermissionPromptScreen } from '../NotificationPermissionPromptScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue('granted');
});

it('renders screen title and explanation text', () => {
  const { getByText, getAllByText } = render(<NotificationPermissionPromptScreen />);
  expect(getByText(/stay in the loop/i)).toBeTruthy();
  expect(getAllByText(/notif/i).length).toBeGreaterThan(0);
});

it('primary CTA text contains "Turn on notifications"', () => {
  const { getByText } = render(<NotificationPermissionPromptScreen />);
  expect(getByText(/turn on notifications/i)).toBeTruthy();
});

it('secondary CTA text contains "Maybe later"', () => {
  const { getByText } = render(<NotificationPermissionPromptScreen />);
  expect(getByText(/maybe later/i)).toBeTruthy();
});

it('primary CTA has testID notif-prompt-enable', () => {
  const { getByTestId } = render(<NotificationPermissionPromptScreen />);
  expect(getByTestId('notif-prompt-enable')).toBeTruthy();
});

it('pressing primary CTA calls requestPermission', async () => {
  const { getByTestId } = render(<NotificationPermissionPromptScreen />);
  fireEvent.press(getByTestId('notif-prompt-enable'));
  expect(mockRequest).toHaveBeenCalled();
});

it('pressing maybe later navigates to Home', () => {
  const { getByText } = render(<NotificationPermissionPromptScreen />);
  fireEvent.press(getByText(/maybe later/i));
  expect(mockNavigate).toHaveBeenCalledWith('Home');
});

it('primary CTA has accessibilityRole button', () => {
  const { getByTestId } = render(<NotificationPermissionPromptScreen />);
  expect(getByTestId('notif-prompt-enable').props.accessibilityRole).toBe('button');
});

it('pressing primary CTA navigates to Home after requestPermission', async () => {
  const { getByTestId } = render(<NotificationPermissionPromptScreen />);
  fireEvent.press(getByTestId('notif-prompt-enable'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Home'));
  expect(mockRequest).toHaveBeenCalled();
});

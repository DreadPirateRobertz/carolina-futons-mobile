import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Share, Clipboard } from 'react-native';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      espresso: '#3A2518',
      sandBase: '#E8D5B7',
      sunsetCoral: '#E8845C',
      offWhite: '#FAF7F2',
    },
    spacing: { sm: 8, md: 16 },
    typography: { bodyFamily: 'System', headingFamily: 'System' },
    borderRadius: { md: 8 },
  }),
}));

jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});

const mockGenerate = jest.fn().mockResolvedValue('carolinafutons://referral/ABC123');
jest.mock('@/services/referralService', () => ({
  generateReferralLink: (...args: unknown[]) => mockGenerate(...args),
}));
jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({ callFunction: jest.fn() }),
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'member-1' } }),
}));

import { ShareSheet } from '../ShareSheet';

beforeEach(() => jest.clearAllMocks());

it('renders share and copy buttons', async () => {
  const { getByTestId } = render(<ShareSheet />);
  await waitFor(() => expect(getByTestId('share-btn')).toBeTruthy());
  expect(getByTestId('copy-link-btn')).toBeTruthy();
});

it('calls Share.share with referral link', async () => {
  const { getByTestId } = render(<ShareSheet />);
  await waitFor(() => expect(getByTestId('share-btn')).toBeTruthy());
  fireEvent.press(getByTestId('share-btn'));
  await waitFor(() =>
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('carolinafutons://referral/ABC123'),
      }),
    ),
  );
});

it('copies link to clipboard', async () => {
  const { getByTestId } = render(<ShareSheet />);
  await waitFor(() => expect(getByTestId('copy-link-btn')).toBeTruthy());
  fireEvent.press(getByTestId('copy-link-btn'));
  expect(Clipboard.setString).toHaveBeenCalledWith('carolinafutons://referral/ABC123');
});

it('shows error when generateReferralLink returns null', async () => {
  mockGenerate.mockResolvedValue(null);
  const { getByText } = render(<ShareSheet />);
  await waitFor(() => expect(getByText(/unable to generate link/i)).toBeTruthy());
});

describe('accessibility', () => {
  beforeEach(() => {
    mockGenerate.mockResolvedValue('carolinafutons://referral/ABC123');
  });

  it('share button has accessibilityLabel', async () => {
    const { getByTestId } = render(<ShareSheet />);
    await waitFor(() => expect(getByTestId('share-btn')).toBeTruthy());
    expect(getByTestId('share-btn').props.accessibilityLabel).toBeTruthy();
  });

  it('copy button has accessibilityLabel', async () => {
    const { getByTestId } = render(<ShareSheet />);
    await waitFor(() => expect(getByTestId('copy-link-btn')).toBeTruthy());
    expect(getByTestId('copy-link-btn').props.accessibilityLabel).toBeTruthy();
  });

  it('copy button accessibilityLabel reflects copied state after press', async () => {
    const { getByTestId } = render(<ShareSheet />);
    await waitFor(() => expect(getByTestId('copy-link-btn')).toBeTruthy());
    fireEvent.press(getByTestId('copy-link-btn'));
    expect(getByTestId('copy-link-btn').props.accessibilityLabel).toMatch(/copied/i);
  });
});

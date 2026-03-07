import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ForceUpdateModal } from '../ForceUpdateModal';
import { ThemeProvider } from '@/theme/ThemeProvider';

jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true));

function renderModal(props: { visible: boolean; required: boolean; onDismiss?: () => void }) {
  return render(
    <ThemeProvider>
      <ForceUpdateModal {...props} testID="force-update-modal" />
    </ThemeProvider>,
  );
}

describe('ForceUpdateModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Update Required" title for required updates', () => {
    const { getByTestId } = renderModal({ visible: true, required: true });
    expect(getByTestId('force-update-title').props.children).toBe('Update Required');
  });

  it('renders "Update Available" title for recommended updates', () => {
    const { getByTestId } = renderModal({ visible: true, required: false, onDismiss: jest.fn() });
    expect(getByTestId('force-update-title').props.children).toBe('Update Available');
  });

  it('opens store URL when update button pressed', () => {
    const { getByTestId } = renderModal({ visible: true, required: true });
    fireEvent.press(getByTestId('force-update-button'));
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('apps.apple.com'));
  });

  it('shows dismiss button for non-required updates', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderModal({ visible: true, required: false, onDismiss });
    fireEvent.press(getByTestId('force-update-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('hides dismiss button for required updates', () => {
    const { queryByTestId } = renderModal({ visible: true, required: true });
    expect(queryByTestId('force-update-dismiss')).toBeNull();
  });

  it('does not render content when not visible', () => {
    const { queryByTestId } = renderModal({ visible: false, required: false });
    expect(queryByTestId('force-update-title')).toBeNull();
  });
});

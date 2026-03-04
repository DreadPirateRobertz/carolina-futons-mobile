import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ConnectivityProvider, useConnectivity } from '../useConnectivity';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

function ConnectivityHarness() {
  const { isOnline, setOnline } = useConnectivity();
  return (
    <View>
      <Text testID="online">{String(isOnline)}</Text>
      <TouchableOpacity testID="go-offline" onPress={() => setOnline(false)} />
      <TouchableOpacity testID="go-online" onPress={() => setOnline(true)} />
    </View>
  );
}

function renderConnectivity(initialOnline = true) {
  return render(
    <ConnectivityProvider initialOnline={initialOnline} skipNetInfo>
      <ConnectivityHarness />
    </ConnectivityProvider>,
  );
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const NetInfo = require('@react-native-community/netinfo');

describe('useConnectivity', () => {
  it('starts online by default', () => {
    const { getByTestId } = renderConnectivity();
    expect(getByTestId('online').props.children).toBe('true');
  });

  it('starts offline when initialOnline=false', () => {
    const { getByTestId } = renderConnectivity(false);
    expect(getByTestId('online').props.children).toBe('false');
  });

  it('goes offline', () => {
    const { getByTestId } = renderConnectivity();
    fireEvent.press(getByTestId('go-offline'));
    expect(getByTestId('online').props.children).toBe('false');
  });

  it('goes back online', () => {
    const { getByTestId } = renderConnectivity(false);
    fireEvent.press(getByTestId('go-online'));
    expect(getByTestId('online').props.children).toBe('true');
  });

  it('throws outside provider', () => {
    function Bad() {
      useConnectivity();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(
      'useConnectivity must be used within a ConnectivityProvider',
    );
  });

  describe('NetInfo integration', () => {
    it('subscribes to NetInfo when skipNetInfo is false', () => {
      NetInfo.addEventListener.mockClear();
      render(
        <ConnectivityProvider>
          <ConnectivityHarness />
        </ConnectivityProvider>,
      );
      expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('does not subscribe to NetInfo when skipNetInfo is true', () => {
      NetInfo.addEventListener.mockClear();
      render(
        <ConnectivityProvider skipNetInfo>
          <ConnectivityHarness />
        </ConnectivityProvider>,
      );
      expect(NetInfo.addEventListener).not.toHaveBeenCalled();
    });

    it('updates isOnline when NetInfo reports change', () => {
      let listener: (state: { isConnected: boolean }) => void;
      NetInfo.addEventListener.mockImplementation((cb: typeof listener) => {
        listener = cb;
        return jest.fn();
      });

      const { getByTestId } = render(
        <ConnectivityProvider>
          <ConnectivityHarness />
        </ConnectivityProvider>,
      );

      // Simulate going offline
      act(() => listener!({ isConnected: false }));
      expect(getByTestId('online').props.children).toBe('false');

      // Simulate going online
      act(() => listener!({ isConnected: true }));
      expect(getByTestId('online').props.children).toBe('true');
    });
  });
});

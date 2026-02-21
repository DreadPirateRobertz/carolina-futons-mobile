import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ConnectivityProvider, useConnectivity } from '../useConnectivity';

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
    <ConnectivityProvider initialOnline={initialOnline}>
      <ConnectivityHarness />
    </ConnectivityProvider>,
  );
}

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
});

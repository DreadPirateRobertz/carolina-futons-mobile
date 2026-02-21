import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccountScreen } from '../AccountScreen';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { Text, TouchableOpacity, View } from 'react-native';

function renderAccount(
  props: Partial<React.ComponentProps<typeof AccountScreen>> = {},
  authenticated = false,
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider>
        <AuthProvider>
          {authenticated && <AutoSignIn />}
          {children}
        </AuthProvider>
      </ThemeProvider>
    );
  }
  return render(<AccountScreen {...props} />, { wrapper: Wrapper });
}

/** Signs in automatically on mount */
function AutoSignIn() {
  const { signIn } = useAuth();
  React.useEffect(() => {
    signIn('test@test.com', 'Pass1234');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

describe('AccountScreen', () => {
  describe('Guest state', () => {
    it('renders account screen', () => {
      const { getByTestId } = renderAccount();
      expect(getByTestId('account-screen')).toBeTruthy();
    });

    it('shows guest title', () => {
      const { getByTestId } = renderAccount();
      expect(getByTestId('guest-title')).toBeTruthy();
    });

    it('shows sign in button', () => {
      const { getByTestId } = renderAccount();
      expect(getByTestId('account-sign-in-button')).toBeTruthy();
    });

    it('calls onLogin when sign in pressed', () => {
      const onLogin = jest.fn();
      const { getByTestId } = renderAccount({ onLogin });
      fireEvent.press(getByTestId('account-sign-in-button'));
      expect(onLogin).toHaveBeenCalledTimes(1);
    });

    it('does not show user profile', () => {
      const { queryByTestId } = renderAccount();
      expect(queryByTestId('user-display-name')).toBeNull();
    });
  });

  describe('Authenticated state', () => {
    it('shows user display name', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-display-name')).toBeTruthy();
      });
    });

    it('shows user email', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-email').props.children).toBe('test@test.com');
      });
    });

    it('shows user avatar', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('user-avatar')).toBeTruthy();
      });
    });

    it('shows sign out button', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('sign-out-button')).toBeTruthy();
      });
    });

    it('signs out when sign out pressed', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('sign-out-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('sign-out-button'));
      expect(getByTestId('guest-title')).toBeTruthy();
    });

    it('shows menu items', async () => {
      const { getByTestId } = renderAccount({}, true);
      await waitFor(() => {
        expect(getByTestId('account-order-history')).toBeTruthy();
      });
      expect(getByTestId('account-addresses')).toBeTruthy();
      expect(getByTestId('account-payment')).toBeTruthy();
      expect(getByTestId('account-notifications')).toBeTruthy();
    });

    it('calls onOrderHistory when pressed', async () => {
      const onOrderHistory = jest.fn();
      const { getByTestId } = renderAccount({ onOrderHistory }, true);
      await waitFor(() => {
        expect(getByTestId('account-order-history')).toBeTruthy();
      });
      fireEvent.press(getByTestId('account-order-history'));
      expect(onOrderHistory).toHaveBeenCalledTimes(1);
    });
  });
});

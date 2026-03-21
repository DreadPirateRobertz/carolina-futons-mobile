/**
 * @module MiniCartDrawerHost
 *
 * Renders the MiniCartDrawer at the root navigation level, suppressed on
 * the Checkout screen. Receives navigationRef and currentRoute as props
 * (instead of useNavigation/useNavigationState) so it can be rendered as a
 * sibling of AppNavigator without requiring NavigationStateListenerContext.
 *
 * cm-3jz: useNavigation + useNavigationState both throw
 * "Couldn't get the navigation state" in React Navigation v7 when called
 * outside a navigator screen. Using the navigationRef directly avoids this.
 */
import React, { useCallback } from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import { MiniCartDrawer } from '@/components/MiniCartDrawer';
import { useMiniCartDrawer } from '@/hooks/useMiniCartDrawer';
import type { RootStackParamList } from './AppNavigator';

interface Props {
  /** The navigation container ref — used to call navigate() without hooks. */
  navigationRef: NavigationContainerRef<RootStackParamList>;
  /** Current top-level route name, tracked by App.tsx via onStateChange. */
  currentRoute?: string;
}

/**
 * Root-level host that renders the slide-up mini-cart on all screens except
 * Checkout. Must be rendered inside NavigationContainer + MiniCartDrawerProvider.
 */
export function MiniCartDrawerHost({ navigationRef, currentRoute }: Props) {
  const { isOpen, close } = useMiniCartDrawer();

  const handleCheckout = useCallback(() => {
    close();
    navigationRef.navigate('Checkout');
  }, [close, navigationRef]);

  // Suppress drawer on Checkout screen
  if (currentRoute === 'Checkout') return null;

  return (
    <MiniCartDrawer
      visible={isOpen}
      onClose={close}
      onCheckout={handleCheckout}
      testID="mini-cart-drawer-host"
    />
  );
}

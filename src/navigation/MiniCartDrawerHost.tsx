/**
 * @module MiniCartDrawerHost
 *
 * Renders the MiniCartDrawer at the root navigation level, suppressed on
 * the Checkout screen. Consumes useMiniCartDrawer() for open/close state
 * and navigates to Checkout when the drawer's CTA is pressed.
 *
 * Accepts a navigationRef instead of useNavigation/useNavigationState because
 * this component renders as a sibling of the root navigator (not inside a
 * screen), so the navigation context hooks are unavailable here.
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import { MiniCartDrawer } from '@/components/MiniCartDrawer';
import { useMiniCartDrawer } from '@/hooks/useMiniCartDrawer';
import type { RootStackParamList } from './AppNavigator';

interface Props {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
}

/**
 * Root-level host that renders the slide-up mini-cart on all screens except
 * Checkout. Must be rendered inside NavigationContainer + MiniCartDrawerProvider.
 */
export function MiniCartDrawerHost({ navigationRef }: Props) {
  const { isOpen, close } = useMiniCartDrawer();
  const [currentRoute, setCurrentRoute] = useState<string | undefined>();

  // Subscribe to navigation state to know the current screen
  useEffect(() => {
    const ref = navigationRef.current;
    if (!ref) return;
    const unsubscribe = ref.addListener('state', () => {
      setCurrentRoute(ref.getCurrentRoute()?.name);
    });
    return unsubscribe;
  }, [navigationRef]);

  const handleCheckout = useCallback(() => {
    close();
    navigationRef.current?.navigate('Checkout');
  }, [close, navigationRef]);

  // Do not render on Checkout screen
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

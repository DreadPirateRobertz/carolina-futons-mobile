/**
 * @module MiniCartDrawerHost
 *
 * Renders the MiniCartDrawer and CartFAB at the root navigation level.
 * Both are suppressed on Checkout and Cart screens. The CartFAB here provides
 * the global cart trigger for all screens (including stack screens that sit above
 * the tab navigator where the TabNavigator-level FAB is hidden).
 *
 * cm-3jz: useNavigation + useNavigationState both throw
 * "Couldn't get the navigation state" in React Navigation v7 when called
 * outside a navigator screen. Using the navigationRef directly avoids this.
 *
 * cm-377: CartFAB moved here (from TabNavigator) so it is accessible from
 * any screen, not just tab screens.
 */
import React, { useCallback } from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import { MiniCartDrawer } from '@/components/MiniCartDrawer';
import { CartFAB } from '@/components/CartFAB';
import { useMiniCartDrawer } from '@/hooks/useMiniCartDrawer';
import type { RootStackParamList } from './AppNavigator';

/** Screens on which neither the drawer nor the CartFAB should appear. */
const SUPPRESSED_ROUTES = new Set(['Checkout', 'Cart']);

interface Props {
  /** The navigation container ref — used to call navigate() without hooks. */
  navigationRef: NavigationContainerRef<RootStackParamList>;
  /** Current top-level route name, tracked by App.tsx via onStateChange. */
  currentRoute?: string;
}

/**
 * Root-level host that renders the slide-up mini-cart drawer and the
 * persistent CartFAB on all screens except Checkout and Cart.
 * Must be rendered inside NavigationContainer + MiniCartDrawerProvider.
 */
export function MiniCartDrawerHost({ navigationRef, currentRoute }: Props) {
  const { isOpen, close } = useMiniCartDrawer();

  const handleCheckout = useCallback(() => {
    close();
    navigationRef.navigate('Checkout');
  }, [close, navigationRef]);

  if (SUPPRESSED_ROUTES.has(currentRoute ?? '')) return null;

  return (
    <>
      <CartFAB />
      <MiniCartDrawer
        visible={isOpen}
        onClose={close}
        onCheckout={handleCheckout}
        testID="mini-cart-drawer-host"
      />
    </>
  );
}

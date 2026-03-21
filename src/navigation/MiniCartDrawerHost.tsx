/**
 * @module MiniCartDrawerHost
 *
 * Renders the MiniCartDrawer at the root navigation level, suppressed on
 * the Checkout screen. Consumes useMiniCartDrawer() for open/close state
 * and navigates to Checkout when the drawer's CTA is pressed.
 */
import React, { useCallback } from 'react';
import { useNavigationState, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MiniCartDrawer } from '@/components/MiniCartDrawer';
import { useMiniCartDrawer } from '@/hooks/useMiniCartDrawer';
import type { RootStackParamList } from './AppNavigator';

/**
 * Root-level host that renders the slide-up mini-cart on all screens except
 * Checkout. Must be rendered inside NavigationContainer + MiniCartDrawerProvider.
 */
export function MiniCartDrawerHost() {
  const { isOpen, close } = useMiniCartDrawer();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Determine current top-level route name to suppress drawer on Checkout
  const currentRouteName = useNavigationState((state) => {
    if (!state || !state.routes || state.routes.length === 0) return undefined;
    return state.routes[state.index]?.name;
  });

  const handleCheckout = useCallback(() => {
    close();
    navigation.navigate('Checkout');
  }, [close, navigation]);

  // Do not render on Checkout screen
  if (currentRouteName === 'Checkout') return null;

  return (
    <MiniCartDrawer
      visible={isOpen}
      onClose={close}
      onCheckout={handleCheckout}
      testID="mini-cart-drawer-host"
    />
  );
}

/**
 * @module AppNavigator
 *
 * Root native-stack navigator for the app. Lazy-loads all screens beyond the
 * tab shell to minimize initial JS parse time. Handles onboarding gating,
 * checkout flow reset, and modal presentation of auth screens.
 */
import React, { useCallback, lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { TabNavigator } from './TabNavigator';
import { withScreenErrorBoundary } from './withScreenErrorBoundary';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import type { ARWebScreenParams } from '@/screens/ARWebScreen';
import type { OrderConfirmation } from '@/services/payment';
import { useOnboarding } from '@/hooks/useOnboarding';

// Lazy-load non-critical screens to reduce initial bundle parse time
const ARScreen = lazy(() =>
  import('@/screens/ARScreen').then((m) => ({ default: withScreenErrorBoundary(m.ARScreen, 'AR') })),
);
const ProductDetailScreen = lazy(() =>
  import('@/screens/ProductDetailScreen').then((m) => ({
    default: withScreenErrorBoundary(m.ProductDetailScreen, 'ProductDetail'),
  })),
);
const CategoryScreen = lazy(() =>
  import('@/screens/CategoryScreen').then((m) => ({
    default: withScreenErrorBoundary(m.CategoryScreen, 'Category'),
  })),
);
const CheckoutScreen = lazy(() =>
  import('@/screens/CheckoutScreen').then((m) => ({
    default: withScreenErrorBoundary(m.CheckoutScreen, 'Checkout'),
  })),
);
const OrderHistoryScreen = lazy(() =>
  import('@/screens/OrderHistoryScreen').then((m) => ({
    default: withScreenErrorBoundary(m.OrderHistoryScreen, 'OrderHistory'),
  })),
);
const OrderDetailScreen = lazy(() =>
  import('@/screens/OrderDetailScreen').then((m) => ({
    default: withScreenErrorBoundary(m.OrderDetailScreen, 'OrderDetail'),
  })),
);
const LoginScreen = lazy(() =>
  import('@/screens/LoginScreen').then((m) => ({
    default: withScreenErrorBoundary(m.LoginScreen, 'Login'),
  })),
);
const SignUpScreen = lazy(() =>
  import('@/screens/SignUpScreen').then((m) => ({
    default: withScreenErrorBoundary(m.SignUpScreen, 'SignUp'),
  })),
);
const ForgotPasswordScreen = lazy(() =>
  import('@/screens/ForgotPasswordScreen').then((m) => ({
    default: withScreenErrorBoundary(m.ForgotPasswordScreen, 'ForgotPassword'),
  })),
);
const NotificationPreferencesScreen = lazy(() =>
  import('@/screens/NotificationPreferencesScreen').then((m) => ({
    default: withScreenErrorBoundary(m.NotificationPreferencesScreen, 'NotificationPreferences'),
  })),
);
const WishlistScreen = lazy(() =>
  import('@/screens/WishlistScreen').then((m) => ({
    default: withScreenErrorBoundary(m.WishlistScreen, 'Wishlist'),
  })),
);
const StoreLocatorScreen = lazy(() =>
  import('@/screens/StoreLocatorScreen').then((m) => ({
    default: withScreenErrorBoundary(m.StoreLocatorScreen, 'StoreLocator'),
  })),
);
const StoreDetailScreen = lazy(() =>
  import('@/screens/StoreDetailScreen').then((m) => ({
    default: withScreenErrorBoundary(m.StoreDetailScreen, 'StoreDetail'),
  })),
);
const ARWebScreen = lazy(() =>
  import('@/screens/ARWebScreen').then((m) => ({
    default: withScreenErrorBoundary(m.ARWebScreen, 'ARWeb'),
  })),
);
const CollectionsScreen = lazy(() =>
  import('@/screens/CollectionsScreen').then((m) => ({
    default: withScreenErrorBoundary(m.CollectionsScreen, 'Collections'),
  })),
);
const CollectionDetailScreen = lazy(() =>
  import('@/screens/CollectionDetailScreen').then((m) => ({
    default: withScreenErrorBoundary(m.CollectionDetailScreen, 'CollectionDetail'),
  })),
);
const PremiumScreen = lazy(() =>
  import('@/screens/PremiumScreen').then((m) => ({
    default: withScreenErrorBoundary(m.PremiumScreen, 'Premium'),
  })),
);
const OrderConfirmationScreen = lazy(() =>
  import('@/screens/OrderConfirmationScreen').then((m) => ({
    default: m.OrderConfirmationScreen,
  })),
);

function LazyFallback() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E8D5B7',
      }}
    >
      <ActivityIndicator size="large" color="#E8845C" />
    </View>
  );
}

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: undefined;
  AR: { initialModelId?: string } | undefined;
  ProductDetail: { slug: string };
  Category: { slug: string };
  Checkout: undefined;
  OrderConfirmation: { order: OrderConfirmation };
  OrderHistory: undefined;
  OrderDetail: { orderId: string };
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  NotificationPreferences: undefined;
  Wishlist: undefined;
  StoreLocator: undefined;
  StoreDetail: { storeId: string };
  ARWeb: ARWebScreenParams;
  Collections: undefined;
  CollectionDetail: { slug: string };
  Premium: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const fadeTransition: NativeStackNavigationOptions = {
  animation: 'fade',
  animationDuration: 250,
};

const slideUpTransition: NativeStackNavigationOptions = {
  animation: 'slide_from_bottom',
  animationDuration: 300,
};

const modalTransition: NativeStackNavigationOptions = {
  presentation: 'modal',
  animation: 'slide_from_bottom',
  animationDuration: 300,
};

/** Root stack navigator — gates onboarding, then renders the tab shell + push screens. */
export function AppNavigator() {
  const { isLoading, hasSeenOnboarding, completeOnboarding } = useOnboarding();

  const handleOnboardingComplete = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#E8D5B7',
        }}
        testID="onboarding-loading"
      >
        <ActivityIndicator size="large" color="#E8845C" />
      </View>
    );
  }

  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={hasSeenOnboarding ? 'Tabs' : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding">
          {({ navigation: nav }) => (
            <OnboardingScreen
              onComplete={() => {
                handleOnboardingComplete();
                nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Tabs' }] }));
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen
          name="AR"
          component={ARScreen}
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={fadeTransition} />
        <Stack.Screen name="Category" component={CategoryScreen} options={fadeTransition} />
        <Stack.Screen name="Checkout">
          {({ navigation: nav }) => (
            <CheckoutScreen
              onOrderComplete={(order) => {
                nav.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Tabs' }, { name: 'OrderConfirmation', params: { order } }],
                  }),
                );
              }}
              onBack={() => nav.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="OrderConfirmation">
          {({ route, navigation: nav }) => (
            <OrderConfirmationScreen
              order={(route.params as { order: OrderConfirmation }).order}
              onContinueShopping={() => {
                nav.dispatch(
                  CommonActions.reset({ index: 0, routes: [{ name: 'Tabs' }] }),
                );
              }}
              onViewOrders={() => {
                nav.dispatch(
                  CommonActions.reset({
                    index: 1,
                    routes: [{ name: 'Tabs' }, { name: 'OrderHistory' }],
                  }),
                );
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="OrderHistory">
          {({ navigation: nav }) => (
            <OrderHistoryScreen
              onSelectOrder={(orderId) => nav.navigate('OrderDetail', { orderId })}
              onStartShopping={() => {
                nav.dispatch(
                  CommonActions.reset({ index: 0, routes: [{ name: 'Tabs' }] }),
                );
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="OrderDetail">
          {({ route, navigation: nav }) => (
            <OrderDetailScreen
              orderId={(route.params as { orderId: string }).orderId}
              onBack={() => nav.goBack()}
              onReorderSuccess={() => {
                nav.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Tabs', state: { index: 2 } }],
                  }),
                );
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Login" component={LoginScreen} options={modalTransition} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={modalTransition} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} />
        <Stack.Screen name="StoreLocator" component={StoreLocatorScreen} />
        <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
        <Stack.Screen
          name="ARWeb"
          component={ARWebScreen}
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen name="Collections" component={CollectionsScreen} options={fadeTransition} />
        <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} options={fadeTransition} />
        <Stack.Screen name="Premium">
          {({ navigation: nav }) => (
            <PremiumScreen onBack={() => nav.goBack()} />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </Suspense>
  );
}

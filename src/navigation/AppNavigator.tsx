import React, { useCallback, lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Category" component={CategoryScreen} />
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
        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ presentation: 'modal' }} />
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
        <Stack.Screen name="Collections" component={CollectionsScreen} />
        <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}

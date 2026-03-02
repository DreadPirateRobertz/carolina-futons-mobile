import React, { useCallback, lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { TabNavigator } from './TabNavigator';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import type { ARWebScreenParams } from '@/screens/ARWebScreen';
import type { OrderConfirmation } from '@/services/payment';
import { useOnboarding } from '@/hooks/useOnboarding';

// Lazy-load non-critical screens to reduce initial bundle parse time
const ARScreen = lazy(() => import('@/screens/ARScreen').then((m) => ({ default: m.ARScreen })));
const ProductDetailScreen = lazy(() =>
  import('@/screens/ProductDetailScreen').then((m) => ({ default: m.ProductDetailScreen })),
);
const CategoryScreen = lazy(() =>
  import('@/screens/CategoryScreen').then((m) => ({ default: m.CategoryScreen })),
);
const CheckoutScreen = lazy(() =>
  import('@/screens/CheckoutScreen').then((m) => ({ default: m.CheckoutScreen })),
);
const OrderHistoryScreen = lazy(() =>
  import('@/screens/OrderHistoryScreen').then((m) => ({ default: m.OrderHistoryScreen })),
);
const OrderDetailScreen = lazy(() =>
  import('@/screens/OrderDetailScreen').then((m) => ({ default: m.OrderDetailScreen })),
);
const LoginScreen = lazy(() =>
  import('@/screens/LoginScreen').then((m) => ({ default: m.LoginScreen })),
);
const SignUpScreen = lazy(() =>
  import('@/screens/SignUpScreen').then((m) => ({ default: m.SignUpScreen })),
);
const ForgotPasswordScreen = lazy(() =>
  import('@/screens/ForgotPasswordScreen').then((m) => ({ default: m.ForgotPasswordScreen })),
);
const NotificationPreferencesScreen = lazy(() =>
  import('@/screens/NotificationPreferencesScreen').then((m) => ({
    default: m.NotificationPreferencesScreen,
  })),
);
const WishlistScreen = lazy(() =>
  import('@/screens/WishlistScreen').then((m) => ({ default: m.WishlistScreen })),
);
const StoreLocatorScreen = lazy(() =>
  import('@/screens/StoreLocatorScreen').then((m) => ({ default: m.StoreLocatorScreen })),
);
const StoreDetailScreen = lazy(() =>
  import('@/screens/StoreDetailScreen').then((m) => ({ default: m.StoreDetailScreen })),
);
const ARWebScreen = lazy(() =>
  import('@/screens/ARWebScreen').then((m) => ({ default: m.ARWebScreen })),
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
      </Stack.Navigator>
    </Suspense>
  );
}

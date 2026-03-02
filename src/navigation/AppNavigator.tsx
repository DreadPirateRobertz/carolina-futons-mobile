import React, { Suspense, useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { TabNavigator } from './TabNavigator';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { CategoryScreen } from '@/screens/CategoryScreen';
import { useOnboarding } from '@/hooks/useOnboarding';

// Lazy-loaded screens — only parsed when first navigated to
const ARScreen = React.lazy(() => import('@/screens/ARScreen').then(m => ({ default: m.ARScreen })));
const CheckoutScreen = React.lazy(() => import('@/screens/CheckoutScreen').then(m => ({ default: m.CheckoutScreen })));
const OrderHistoryScreen = React.lazy(() => import('@/screens/OrderHistoryScreen').then(m => ({ default: m.OrderHistoryScreen })));
const OrderDetailScreen = React.lazy(() => import('@/screens/OrderDetailScreen').then(m => ({ default: m.OrderDetailScreen })));
const LoginScreen = React.lazy(() => import('@/screens/LoginScreen').then(m => ({ default: m.LoginScreen })));
const SignUpScreen = React.lazy(() => import('@/screens/SignUpScreen').then(m => ({ default: m.SignUpScreen })));
const ForgotPasswordScreen = React.lazy(() => import('@/screens/ForgotPasswordScreen').then(m => ({ default: m.ForgotPasswordScreen })));
const NotificationPreferencesScreen = React.lazy(() => import('@/screens/NotificationPreferencesScreen').then(m => ({ default: m.NotificationPreferencesScreen })));
const WishlistScreen = React.lazy(() => import('@/screens/WishlistScreen').then(m => ({ default: m.WishlistScreen })));
const StoreLocatorScreen = React.lazy(() => import('@/screens/StoreLocatorScreen').then(m => ({ default: m.StoreLocatorScreen })));
const StoreDetailScreen = React.lazy(() => import('@/screens/StoreDetailScreen').then(m => ({ default: m.StoreDetailScreen })));
const ARWebScreen = React.lazy(() => import('@/screens/ARWebScreen').then(m => ({ default: m.ARWebScreen })));

// Type-only import — does not cause runtime module loading
export type { ARWebScreenParams } from '@/screens/ARWebScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: undefined;
  AR: { initialModelId?: string } | undefined;
  ProductDetail: { slug: string };
  Category: { slug: string };
  Checkout: undefined;
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

function LazyFallback() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8D5B7' }}>
      <ActivityIndicator size="large" color="#E8845C" />
    </View>
  );
}

// Wrapper to add Suspense boundary around lazy-loaded screen components
function withSuspense<P extends object>(LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

const LazyARScreen = withSuspense(ARScreen);
const LazyCheckoutScreen = withSuspense(CheckoutScreen);
const LazyOrderHistoryScreen = withSuspense(OrderHistoryScreen);
const LazyOrderDetailScreen = withSuspense(OrderDetailScreen);
const LazyLoginScreen = withSuspense(LoginScreen);
const LazySignUpScreen = withSuspense(SignUpScreen);
const LazyForgotPasswordScreen = withSuspense(ForgotPasswordScreen);
const LazyNotificationPreferencesScreen = withSuspense(NotificationPreferencesScreen);
const LazyWishlistScreen = withSuspense(WishlistScreen);
const LazyStoreLocatorScreen = withSuspense(StoreLocatorScreen);
const LazyStoreDetailScreen = withSuspense(StoreDetailScreen);
const LazyARWebScreen = withSuspense(ARWebScreen);

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
        component={LazyARScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="Checkout" component={LazyCheckoutScreen} />
      <Stack.Screen name="OrderHistory" component={LazyOrderHistoryScreen} />
      <Stack.Screen name="OrderDetail" component={LazyOrderDetailScreen} />
      <Stack.Screen name="Login" component={LazyLoginScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="SignUp" component={LazySignUpScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ForgotPassword" component={LazyForgotPasswordScreen} />
      <Stack.Screen name="NotificationPreferences" component={LazyNotificationPreferencesScreen} />
      <Stack.Screen name="Wishlist" component={LazyWishlistScreen} />
      <Stack.Screen name="StoreLocator" component={LazyStoreLocatorScreen} />
      <Stack.Screen name="StoreDetail" component={LazyStoreDetailScreen} />
      <Stack.Screen
        name="ARWeb"
        component={LazyARWebScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}

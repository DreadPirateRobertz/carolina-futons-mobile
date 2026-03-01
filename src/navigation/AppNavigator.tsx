import React, { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { TabNavigator } from './TabNavigator';
import { ARScreen } from '@/screens/ARScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { CategoryScreen } from '@/screens/CategoryScreen';
import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { OrderHistoryScreen } from '@/screens/OrderHistoryScreen';
import { OrderDetailScreen } from '@/screens/OrderDetailScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { SignUpScreen } from '@/screens/SignUpScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { NotificationPreferencesScreen } from '@/screens/NotificationPreferencesScreen';
import { WishlistScreen } from '@/screens/WishlistScreen';
import { StoreLocatorScreen } from '@/screens/StoreLocatorScreen';
import { StoreDetailScreen } from '@/screens/StoreDetailScreen';
import { ARWebScreen, type ARWebScreenParams } from '@/screens/ARWebScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { useOnboarding } from '@/hooks/useOnboarding';

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
        component={ARScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
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
  );
}

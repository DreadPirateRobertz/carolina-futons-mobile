/**
 * @module TabNavigator
 *
 * Bottom tab navigator providing the four primary app destinations:
 * Home, Shop, Cart (with badge), and Account. Uses the custom
 * AnimatedTabBar for spring-press feedback.
 */
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme';
import { useCart } from '@/hooks/useCart';
import { HomeScreen } from '@/screens/HomeScreen';
import { ShopScreen } from '@/screens/ShopScreen';
import { CartScreen } from '@/screens/CartScreen';
import { AccountScreen } from '@/screens/AccountScreen';
import { AnimatedTabBar } from './AnimatedTabBar';
import type { RootStackParamList } from './AppNavigator';

export type TabParamList = {
  Home: undefined;
  Shop: undefined;
  Cart: undefined;
  Account: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Shop: '🛋️',
    Cart: '🛒',
    Account: '👤',
  };
  return <Text style={{ fontSize: focused ? 22 : 20 }}>{icons[label] ?? '•'}</Text>;
}

function AccountScreenWithNav() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <AccountScreen
      onOrderHistory={() => nav.navigate('OrderHistory')}
      onLogin={() => nav.navigate('Login')}
      onPremium={() => nav.navigate('Premium')}
    />
  );
}

/** Bottom tab shell with cart badge count and the custom AnimatedTabBar. */
export function TabNavigator() {
  const { colors } = useTheme();
  const { itemCount } = useCart();

  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.sunsetCoral,
        tabBarInactiveTintColor: colors.espressoLight,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Home" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Shop" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Cart" focused={focused} color={color} />
          ),
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.sunsetCoral },
        }}
      />
      <Tab.Screen
        name="Account"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Account" focused={focused} color={color} />
          ),
        }}
      >
        {() => <AccountScreenWithNav />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

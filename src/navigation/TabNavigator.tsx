/**
 * @module TabNavigator
 *
 * Bottom tab navigator providing the four primary app destinations:
 * Home, Shop, Cart (with badge), and Account. Uses the custom
 * AnimatedTabBar for spring-press feedback.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme';
import { useCart } from '@/hooks/useCart';
import { useStreak } from '@/hooks/useStreak';
import { useLoyalty } from '@/hooks/useLoyalty';
import { HomeScreen } from '@/screens/HomeScreen';
import { ShopScreen } from '@/screens/ShopScreen';
import { CartScreen } from '@/screens/CartScreen';
import { AccountScreen } from '@/screens/AccountScreen';
import { CompareFAB } from '@/components/CompareFAB';
import { AnimatedTabBar } from './AnimatedTabBar';
import { useLivingSky } from '@/hooks/useLivingSky';
import { withScreenErrorBoundary } from './withScreenErrorBoundary';
import { HomeTabIcon, ShopTabIcon, CartTabIcon, AccountTabIcon } from './TabIcons';
import type { RootStackParamList } from './AppNavigator';

const HomeScreenWithBoundary = withScreenErrorBoundary(HomeScreen, 'Home');
const ShopScreenWithBoundary = withScreenErrorBoundary(ShopScreen, 'Shop');
const CartScreenWithBoundary = withScreenErrorBoundary(CartScreen, 'Cart');

export type TabParamList = {
  Home: undefined;
  Shop: undefined;
  Cart: undefined;
  Account: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function AccountScreenWithNav() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <AccountScreen
      onOrderHistory={() => nav.navigate('OrderHistory')}
      onLogin={() => nav.navigate('Login')}
      onPremium={() => nav.navigate('Premium')}
      onStyleQuiz={() => nav.navigate('StyleQuiz')}
      onPrivacyPolicy={() => nav.navigate('PrivacyPolicy')}
      onLeaderboard={() => nav.navigate('Leaderboard')}
    />
  );
}

const AccountScreenWithBoundary = withScreenErrorBoundary(AccountScreenWithNav, 'Account');

/** Bottom tab shell with cart badge count, streak badge, tier badge, and the custom AnimatedTabBar. */
export function TabNavigator() {
  const { colors } = useTheme();
  const { itemCount } = useCart();
  const { streak } = useStreak();
  const { tier } = useLoyalty();
  const { navBg, navText } = useLivingSky();

  return (
    <View style={tabStyles.container}>
      <Tab.Navigator
        tabBar={(props) => <AnimatedTabBar {...props} navBg={navBg} navText={navText} />}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.sunsetCoral,
          tabBarInactiveTintColor: colors.espressoLight,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreenWithBoundary}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <HomeTabIcon focused={focused} color={color} streak={streak} />
            ),
          }}
        />
        <Tab.Screen
          name="Shop"
          component={ShopScreenWithBoundary}
          options={{
            tabBarIcon: ({ focused, color }) => <ShopTabIcon focused={focused} color={color} />,
          }}
        />
        <Tab.Screen
          name="Cart"
          component={CartScreenWithBoundary}
          options={{
            tabBarIcon: ({ focused, color }) => <CartTabIcon focused={focused} color={color} />,
            tabBarBadge: itemCount > 0 ? itemCount : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.sunsetCoral },
          }}
        />
        <Tab.Screen
          name="Account"
          component={AccountScreenWithBoundary}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <AccountTabIcon focused={focused} color={color} tier={tier} />
            ),
          }}
        />
      </Tab.Navigator>
      <CompareFAB testID="compare-fab" />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

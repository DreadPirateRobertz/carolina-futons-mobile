import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { darkPalette } from '@/theme/tokens';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const SPRING_CONFIG = { damping: 15, stiffness: 150 };
const ACTIVE_COLOR = '#F5F0EB';
const INACTIVE_COLOR = '#B8A99A';

function TabButton({
  route,
  descriptor,
  isFocused,
  navigation,
}: {
  route: { key: string; name: string };
  descriptor: any;
  isFocused: boolean;
  navigation: any;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }, [isFocused, navigation, route]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, SPRING_CONFIG);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const { options } = descriptor;
  const label = options.tabBarLabel ?? route.name;
  const badge = options.tabBarBadge;
  const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

  return (
    <Pressable
      testID={`tab-${route.name}`}
      accessibilityRole="tab"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        {options.tabBarIcon?.({ focused: isFocused, color, size: 22 })}
        <Text style={[styles.label, { color, fontWeight: isFocused ? '600' : '400' }]}>
          {label}
        </Text>
        {badge != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="animated-tab-bar"
      style={[styles.container, { paddingBottom: insets.bottom || 8 }]}
    >
      {state.routes.map((route, index) => (
        <TabButton
          key={route.key}
          route={route}
          descriptor={descriptors[route.key]}
          isFocused={state.index === index}
          navigation={navigation}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: darkPalette.glass,
    borderTopWidth: 1,
    borderTopColor: darkPalette.glassBorder,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#E8845C',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

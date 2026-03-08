/**
 * @module MountainRefreshControl
 *
 * Brand-themed pull-to-refresh control with spring-animated mountain
 * peak indicator. Uses the Blue Ridge color palette: mountainBlue tint
 * on iOS, sunsetCoral + mountainBlue progress colors on Android.
 *
 * Usage: pass as `refreshControl` prop on ScrollView or FlatList, and
 * render `<MountainRefreshIndicator>` at the top of the scroll content
 * for the animated icon overlay.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  RefreshControl,
  RefreshControlProps,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/tokens';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

/**
 * Brand-colored RefreshControl. Drop-in replacement with Carolina
 * Futons palette applied to the native spinner.
 */
export function MountainRefreshControl(props: RefreshControlProps) {
  return (
    <RefreshControl
      {...props}
      tintColor={Platform.OS === 'ios' ? colors.mountainBlue : props.tintColor}
      colors={Platform.OS === 'android' ? [colors.sunsetCoral, colors.mountainBlue] : props.colors}
      progressBackgroundColor={
        Platform.OS === 'android' ? colors.sandLight : props.progressBackgroundColor
      }
      title={Platform.OS === 'ios' && props.refreshing ? 'Refreshing...' : undefined}
      titleColor={Platform.OS === 'ios' ? colors.mountainBlueDark : undefined}
    />
  );
}

/**
 * Animated mountain peak SVG that pulses with a spring animation
 * while refreshing. Render at the top of scroll content alongside
 * a MountainRefreshControl for the full branded pull-to-refresh.
 */
export function MountainRefreshIndicator({
  refreshing,
  testID,
}: {
  refreshing: boolean;
  testID?: string;
}) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.spring(bounceAnim, {
            toValue: 1.2,
            tension: 80,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.spring(bounceAnim, {
            toValue: 1,
            tension: 80,
            friction: 4,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
    Animated.spring(bounceAnim, {
      toValue: 0,
      tension: 60,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, [refreshing, bounceAnim]);

  if (!refreshing) return null;

  const scale = bounceAnim.interpolate({
    inputRange: [0, 1, 1.2],
    outputRange: [0.6, 1, 1.2],
  });

  return (
    <View style={styles.indicatorContainer} testID={testID ?? 'mountain-refresh-indicator'}>
      <AnimatedSvg width={28} height={20} viewBox="0 0 28 20" style={{ transform: [{ scale }] }}>
        <Path d="M14 2L22 18H6L14 2Z" fill={colors.mountainBlue} opacity={0.9} />
        <Path d="M20 8L26 18H14L20 8Z" fill={colors.mountainBlueDark} opacity={0.7} />
        <Path d="M8 10L12 18H4L8 10Z" fill={colors.mountainBlueLight} opacity={0.8} />
      </AnimatedSvg>
    </View>
  );
}

const styles = StyleSheet.create({
  indicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});

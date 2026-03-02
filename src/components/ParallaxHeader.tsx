import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedImage = Animated.createAnimatedComponent(Image);

interface Props {
  imageUri: string;
  height: number;
  scrollY: SharedValue<number>;
  children?: React.ReactNode;
  testID?: string;
  parallaxFactor?: number;
}

export function ParallaxHeader({
  imageUri,
  height,
  scrollY,
  children,
  testID,
  parallaxFactor = 0.5,
}: Props) {
  const imageStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-height, 0, height],
      [-height * parallaxFactor, 0, height * parallaxFactor],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [-height, 0],
      [2, 1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }, { scale }] };
  });

  const overlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, height * 0.6],
      [0, 0.6],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <View testID={testID} style={[styles.container, { height }]}>
      <AnimatedImage
        source={{ uri: imageUri }}
        style={[styles.image, { height: height * 1.3 }, imageStyle]}
        contentFit="cover"
      />
      <Animated.View style={[styles.darkenOverlay, overlayStyle]} />
      <View style={styles.overlay}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', width: SCREEN_WIDTH },
  image: { position: 'absolute', width: SCREEN_WIDTH, top: 0 },
  darkenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1C1410',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 24,
  },
});

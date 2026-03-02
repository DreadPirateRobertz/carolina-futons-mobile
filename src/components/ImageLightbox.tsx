import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { type ProductImage } from '@/data/products';
import { useTheme } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

interface Props {
  images: ProductImage[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

export function ImageLightbox({ images, initialIndex, visible, onClose, testID }: Props) {
  const { colors } = useTheme();

  const [activeIndex, setActiveIndex] = React.useState(initialIndex);
  const flatListRef = React.useRef<FlatList>(null);

  React.useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      // Scroll to initial image when opening
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: initialIndex * SCREEN_WIDTH,
          animated: false,
        });
      }, 50);
    }
  }, [visible, initialIndex]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const onPageScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (index !== activeIndex && index >= 0 && index < images.length) {
        setActiveIndex(index);
      }
    },
    [activeIndex, images.length],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ProductImage; index: number }) => (
      <ZoomableImage image={item} onDismiss={handleClose} testID={`lightbox-image-${index}`} />
    ),
    [handleClose],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
      testID={testID ?? 'image-lightbox'}
    >
      <GestureHandlerRootView style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.backdrop}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="lightbox-close"
            accessibilityLabel="Close image viewer"
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          {/* Image pager */}
          <FlatList
            ref={flatListRef}
            data={images}
            renderItem={renderItem}
            keyExtractor={(_, i) => `lightbox-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onPageScroll}
            scrollEventThrottle={16}
            testID="lightbox-pager"
          />

          {/* Pagination + alt text */}
          <View style={styles.footer}>
            {images.length > 1 && (
              <View style={styles.pagination} testID="lightbox-pagination">
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: i === activeIndex ? '#FFFFFF' : 'rgba(255,255,255,0.4)' },
                    ]}
                  />
                ))}
              </View>
            )}
            <Text style={styles.altText} numberOfLines={1}>
              {images[activeIndex]?.alt}
            </Text>
            <Text style={styles.hintText}>Pinch to zoom · Double-tap to toggle</Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** Individual zoomable image with pinch, pan, and double-tap gestures */
function ZoomableImage({
  image,
  onDismiss,
  testID,
}: {
  image: ProductImage;
  onDismiss: () => void;
  testID?: string;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetZoom = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, SPRING_CONFIG);
    savedScale.value = 1;
    translateX.value = withSpring(0, SPRING_CONFIG);
    translateY.value = withSpring(0, SPRING_CONFIG);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Pinch to zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(newScale, 0.5), 4);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        resetZoom();
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan to move when zoomed
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1) {
        // Panning zoomed image
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else {
        // Swipe down to dismiss (only when not zoomed)
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (scale.value <= 1) {
        // Dismiss if swiped far enough
        if (Math.abs(translateY.value) > DISMISS_THRESHOLD) {
          runOnJS(onDismiss)();
        }
        translateY.value = withSpring(0, SPRING_CONFIG);
        translateX.value = withSpring(0, SPRING_CONFIG);
      } else {
        // Clamp panning to reasonable bounds
        const maxX = ((scale.value - 1) * SCREEN_WIDTH) / 2;
        const maxY = ((scale.value - 1) * SCREEN_HEIGHT) / 2;
        translateX.value = withSpring(
          Math.min(Math.max(translateX.value, -maxX), maxX),
          SPRING_CONFIG,
        );
        translateY.value = withSpring(
          Math.min(Math.max(translateY.value, -maxY), maxY),
          SPRING_CONFIG,
        );
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  // Double-tap to toggle zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.value > 1) {
        resetZoom();
        runOnJS(triggerHaptic)();
      } else {
        // Zoom to 2.5x centered on tap point
        const targetScale = 2.5;
        const focusX = e.x - SCREEN_WIDTH / 2;
        const focusY = e.y - SCREEN_HEIGHT / 2;
        scale.value = withSpring(targetScale, SPRING_CONFIG);
        savedScale.value = targetScale;
        translateX.value = withSpring(-focusX * (targetScale - 1), SPRING_CONFIG);
        translateY.value = withSpring(-focusY * (targetScale - 1), SPRING_CONFIG);
        savedTranslateX.value = -focusX * (targetScale - 1);
        savedTranslateY.value = -focusY * (targetScale - 1);
        runOnJS(triggerHaptic)();
      }
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Exclusive(doubleTapGesture, panGesture),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.imageContainer} testID={testID}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageWrapper, animatedStyle]}>
          <Image
            source={{ uri: image.uri }}
            style={styles.fullImage}
            contentFit="contain"
            transition={200}
            accessibilityLabel={image.alt}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '300',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  altText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
  },
});

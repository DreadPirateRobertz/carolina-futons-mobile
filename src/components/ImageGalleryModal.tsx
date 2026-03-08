/**
 * @module ImageGalleryModal
 *
 * Fullscreen image gallery modal with swipe navigation and pinch-to-zoom.
 * Opens from the product detail gallery on tap. Shows pagination dots
 * and a close button. Swipe left/right to navigate between images.
 */
import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZoomableImage } from '@/components/ZoomableImage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GalleryImage {
  uri?: string;
  label: string;
}

interface Props {
  visible: boolean;
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  renderImage: (image: GalleryImage, index: number) => React.ReactNode;
  testID?: string;
}

export function ImageGalleryModal({
  visible,
  images,
  initialIndex,
  onClose,
  onIndexChange,
  renderImage,
  testID,
}: Props) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      // Scroll to initial index after modal opens
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
  }, [visible, initialIndex]);

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (index !== activeIndex) {
        setActiveIndex(index);
        onIndexChange?.(index);
      }
    },
    [activeIndex, onIndexChange],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: GalleryImage; index: number }) => (
      <View style={styles.slide}>
        <ZoomableImage testID={`fullscreen-zoom-${index}`}>
          <View style={styles.imageContainer}>{renderImage(item, index)}</View>
        </ZoomableImage>
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>{item.label}</Text>
        </View>
      </View>
    ),
    [renderImage],
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {Platform.OS === 'ios' && <StatusBar barStyle="light-content" />}

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
          testID="gallery-modal-close"
          accessibilityLabel="Close gallery"
          accessibilityRole="button"
        >
          <Text style={styles.closeText}>X</Text>
        </TouchableOpacity>

        {/* Counter */}
        <View style={[styles.counter, { top: insets.top + 16 }]}>
          <Text style={styles.counterText}>
            {activeIndex + 1} / {images.length}
          </Text>
        </View>

        {/* Gallery */}
        <FlatList
          ref={flatListRef}
          data={images}
          renderItem={renderItem}
          keyExtractor={(_, i) => `fullscreen-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          testID="fullscreen-gallery-list"
        />

        {/* Pagination dots */}
        <View style={[styles.pagination, { bottom: insets.bottom + 20 }]}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  counter: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  counterText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    position: 'absolute',
    bottom: 100,
  },
  labelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pagination: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
});

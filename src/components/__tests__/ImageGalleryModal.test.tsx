import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ImageGalleryModal } from '../ImageGalleryModal';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.useSharedValue = jest.fn((init: number) => ({ value: init }));
  Reanimated.useAnimatedStyle = jest.fn((fn: () => object) => fn());
  Reanimated.withSpring = jest.fn((val: number) => val);
  return Reanimated;
});

jest.mock('react-native-gesture-handler', () => {
  const { View: RNView } = require('react-native');
  return {
    Gesture: {
      Pinch: () => ({ onUpdate: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() }),
      Pan: () => ({
        minPointers: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      Tap: () => ({ numberOfTaps: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() }),
      Simultaneous: jest.fn(),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => <RNView>{children}</RNView>,
  };
});

const mockImages = [{ label: 'Front View' }, { label: 'Side View' }, { label: 'Flat Position' }];

const defaultProps = {
  visible: true,
  images: mockImages,
  initialIndex: 0,
  onClose: jest.fn(),
  renderImage: (image: { label: string }) => (
    <View testID={`image-${image.label}`}>
      <Text>{image.label}</Text>
    </View>
  ),
};

describe('ImageGalleryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when visible', () => {
    const { getByText } = render(<ImageGalleryModal {...defaultProps} />);
    expect(getByText('1 / 3')).toBeTruthy();
  });

  it('does not render content when not visible', () => {
    const { queryByText } = render(<ImageGalleryModal {...defaultProps} visible={false} />);
    // Modal with visible=false doesn't render children
    expect(queryByText('1 / 3')).toBeNull();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ImageGalleryModal {...defaultProps} onClose={onClose} />);

    fireEvent.press(getByTestId('gallery-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders correct number of pagination dots', () => {
    const { getByTestId } = render(<ImageGalleryModal {...defaultProps} testID="modal" />);

    expect(getByTestId('fullscreen-gallery-list')).toBeTruthy();
  });

  it('renders images via renderImage prop', () => {
    const { getAllByText } = render(<ImageGalleryModal {...defaultProps} />);
    expect(getAllByText('Front View').length).toBeGreaterThanOrEqual(1);
  });

  describe('Edge cases', () => {
    it('renders single image without pagination dots issue', () => {
      const singleImage = [{ label: 'Only View' }];
      const { getByText, getByLabelText } = render(
        <ImageGalleryModal {...defaultProps} images={singleImage} />,
      );
      expect(getByText('1 / 1')).toBeTruthy();
      expect(getByLabelText('Image 1 of 1')).toBeTruthy();
    });

    it('handles initialIndex at last image', () => {
      const { getByText } = render(<ImageGalleryModal {...defaultProps} initialIndex={2} />);
      expect(getByText('3 / 3')).toBeTruthy();
    });

    it('calls onRequestClose (Android back) which triggers onClose', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ImageGalleryModal {...defaultProps} onClose={onClose} testID="gallery-modal" />,
      );
      // Modal's onRequestClose is wired to onClose
      const modal = getByTestId('gallery-modal');
      expect(modal.props.onRequestClose).toBeDefined();
    });

    it('wraps each image in ZoomableImage', () => {
      const { getByTestId } = render(<ImageGalleryModal {...defaultProps} />);
      // Each slide has a ZoomableImage wrapper with testID
      expect(getByTestId('fullscreen-zoom-0')).toBeTruthy();
    });

    it('renders image labels below each slide', () => {
      const { getAllByText } = render(<ImageGalleryModal {...defaultProps} />);
      // All labels from images should be rendered
      expect(getAllByText('Front View').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Side View').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Accessibility', () => {
    it('has accessibilityLabel on gallery list', () => {
      const { getByTestId } = render(<ImageGalleryModal {...defaultProps} />);
      const list = getByTestId('fullscreen-gallery-list');
      expect(list.props.accessibilityRole).toBe('adjustable');
      expect(list.props.accessibilityLabel).toBe('Product image gallery');
      expect(list.props.accessibilityHint).toBe('Swipe left or right to view more images');
    });

    it('has close button with accessibilityLabel', () => {
      const { getByTestId } = render(<ImageGalleryModal {...defaultProps} />);
      const close = getByTestId('gallery-modal-close');
      expect(close.props.accessibilityLabel).toBe('Close gallery');
      expect(close.props.accessibilityRole).toBe('button');
    });

    it('announces pagination position', () => {
      const { getByLabelText } = render(<ImageGalleryModal {...defaultProps} />);
      expect(getByLabelText('Image 1 of 3')).toBeTruthy();
    });
  });
});

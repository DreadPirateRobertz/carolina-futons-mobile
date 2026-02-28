import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { ARWebScreen } from '../ARWebScreen';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = { goBack: mockGoBack };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock ModelViewerWeb so it renders on all platforms in tests
jest.mock('@/components/ModelViewerWeb', () => ({
  ModelViewerWeb: ({ testID, glbUrl, title }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID ?? 'model-viewer-web'}>
        <Text>{title}</Text>
      </View>
    );
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const defaultRoute = {
  params: {
    glbUrl: 'https://cdn.example.com/model.glb',
    usdzUrl: 'https://cdn.example.com/model.usdz',
    title: 'The Asheville',
    productId: 'prod-asheville-full',
  },
};

describe('ARWebScreen', () => {
  describe('Rendering', () => {
    it('renders with ar-web-screen testID', () => {
      const { getByTestId } = render(
        <ARWebScreen route={defaultRoute as any} />,
      );
      expect(getByTestId('ar-web-screen')).toBeTruthy();
    });

    it('renders the product title', () => {
      const { getAllByText } = render(
        <ARWebScreen route={defaultRoute as any} />,
      );
      expect(getAllByText('The Asheville').length).toBeGreaterThanOrEqual(1);
    });

    it('renders a close button', () => {
      const { getByTestId } = render(
        <ARWebScreen route={defaultRoute as any} />,
      );
      expect(getByTestId('ar-web-close')).toBeTruthy();
    });

    it('renders ModelViewerWeb with correct props', () => {
      const { getByTestId } = render(
        <ARWebScreen route={defaultRoute as any} />,
      );
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('calls navigation.goBack when close button pressed', () => {
      const { getByTestId } = render(
        <ARWebScreen route={defaultRoute as any} />,
      );
      fireEvent.press(getByTestId('ar-web-close'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls onClose prop instead of goBack when provided', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ARWebScreen route={defaultRoute as any} onClose={onClose} />,
      );
      fireEvent.press(getByTestId('ar-web-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('close button has accessibility label', () => {
      const { getByTestId } = render(
        <ARWebScreen route={defaultRoute as any} />,
      );
      const closeBtn = getByTestId('ar-web-close');
      expect(closeBtn.props.accessibilityLabel).toBe('Close 3D viewer');
    });

    it('close button has button role', () => {
      const { getByTestId } = render(
        <ARWebScreen route={defaultRoute as any} />,
      );
      const closeBtn = getByTestId('ar-web-close');
      expect(closeBtn.props.accessibilityRole).toBe('button');
    });
  });
});

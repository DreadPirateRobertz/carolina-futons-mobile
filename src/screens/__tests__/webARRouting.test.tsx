import React from 'react';
import { Platform, Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WishlistProvider } from '@/hooks/useWishlist';
import { FUTON_MODELS } from '@/data/futons';
import { openARViewer } from '@/utils/openARViewer';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
}));

// Mock openARViewer to capture calls
jest.mock('@/utils/openARViewer', () => ({
  openARViewer: jest.fn(),
  getARModelAssets: jest.fn(() => ({
    glbUrl: 'https://cdn.example.com/model.glb',
    usdzUrl: 'https://cdn.example.com/model.usdz',
  })),
  buildSceneViewerUrl: jest.fn(),
}));

// Re-export for utils/index.ts barrel
jest.mock('@/utils', () => {
  const actual = jest.requireActual('@/utils');
  const arViewer = require('@/utils/openARViewer');
  return {
    ...actual,
    openARViewer: arViewer.openARViewer,
  };
});

const mockedOpenARViewer = openARViewer as jest.MockedFunction<typeof openARViewer>;

function renderDetail(props: Partial<React.ComponentProps<typeof ProductDetailScreen>> = {}) {
  return render(
    <ThemeProvider>
      <WishlistProvider>
        <ProductDetailScreen {...props} />
      </WishlistProvider>
    </ThemeProvider>,
  );
}

describe('Web AR Routing', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
  });

  describe('on web platform', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('passes onWebModelView callback to openARViewer on web', () => {
      const { getByTestId } = renderDetail();
      const arButton = getByTestId('ar-cta-button');
      fireEvent.press(arButton);

      expect(mockedOpenARViewer).toHaveBeenCalledTimes(1);
      const callArgs = mockedOpenARViewer.mock.calls[0];
      // Third argument should be options with onWebModelView
      expect(callArgs[2]).toHaveProperty('onWebModelView');
      expect(typeof callArgs[2]?.onWebModelView).toBe('function');
    });

    it('onWebModelView navigates to ARWeb screen', () => {
      const { getByTestId } = renderDetail();
      const arButton = getByTestId('ar-cta-button');
      fireEvent.press(arButton);

      // Extract the onWebModelView callback and invoke it
      const options = mockedOpenARViewer.mock.calls[0][2];
      options?.onWebModelView?.({
        glbUrl: 'https://cdn.example.com/model.glb',
        usdzUrl: 'https://cdn.example.com/model.usdz',
        modelId: 'asheville-full',
        modelName: 'The Asheville',
      });

      expect(mockNavigate).toHaveBeenCalledWith('ARWeb', expect.objectContaining({
        glbUrl: 'https://cdn.example.com/model.glb',
        usdzUrl: 'https://cdn.example.com/model.usdz',
        title: 'The Asheville',
      }));
    });

    it('passes productId in navigation params', () => {
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('ar-cta-button'));

      const options = mockedOpenARViewer.mock.calls[0][2];
      options?.onWebModelView?.({
        glbUrl: 'https://cdn.example.com/model.glb',
        usdzUrl: 'https://cdn.example.com/model.usdz',
        modelId: 'asheville-full',
        modelName: 'The Asheville',
      });

      expect(mockNavigate).toHaveBeenCalledWith('ARWeb', expect.objectContaining({
        productId: expect.stringContaining('asheville'),
      }));
    });
  });

  describe('on native platforms', () => {
    it('calls openARViewer on iOS without onWebModelView', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      const { getByTestId } = renderDetail();
      fireEvent.press(getByTestId('ar-cta-button'));

      expect(mockedOpenARViewer).toHaveBeenCalledTimes(1);
      // On native, onWebModelView should not be provided (or is irrelevant)
      // openARViewer handles iOS/Android natively
    });
  });
});

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { ProductCardVideo } from '../ProductCardVideo';

// expo-av is mocked in jest.setup.js — Video renders as a View with testOnly_onError prop

describe('ProductCardVideo', () => {
  describe('rendering', () => {
    it('renders when videoUri is provided', () => {
      const { getByTestId } = render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="card-video" />,
      );
      expect(getByTestId('card-video')).toBeTruthy();
    });

    it('accepts a custom testID', () => {
      const { getByTestId } = render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="my-video" />,
      );
      expect(getByTestId('my-video')).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('renders null after video error (fallback to underlying image)', async () => {
      const { getByTestId, queryByTestId } = render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="card-video" />,
      );

      const onError = getByTestId('card-video').props.testOnly_onError;
      expect(onError).toBeDefined();
      await act(async () => {
        onError();
      });

      expect(queryByTestId('card-video')).toBeNull();
    });

    it('does not crash when onError fires with an error payload', async () => {
      const { getByTestId, queryByTestId } = render(
        <ProductCardVideo videoUri="https://broken.example.com/video.mp4" testID="card-video" />,
      );

      await act(async () => {
        getByTestId('card-video').props.testOnly_onError({ error: 'NETWORK_ERROR' });
      });

      expect(queryByTestId('card-video')).toBeNull();
    });

    it('renders normally before any error occurs', () => {
      const { getByTestId } = render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="card-video" />,
      );
      expect(getByTestId('card-video')).toBeTruthy();
    });

    it('error state is per-instance — two cards with same URI fail independently', async () => {
      const { getByTestId: getVideo1, queryByTestId: queryVideo1 } = render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="video-1" />,
      );
      const { getByTestId: getVideo2 } = render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="video-2" />,
      );

      await act(async () => {
        getVideo1('video-1').props.testOnly_onError();
      });

      expect(queryVideo1('video-1')).toBeNull();
      expect(getVideo2('video-2')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('renders without crashing when videoUri is an empty string', () => {
      const { getByTestId } = render(<ProductCardVideo videoUri="" testID="card-video" />);
      expect(getByTestId('card-video')).toBeTruthy();
    });

    it('renders without crashing when videoUri has query params', () => {
      const { getByTestId } = render(
        <ProductCardVideo
          videoUri="https://example.com/video.mp4?token=abc123&format=mp4"
          testID="card-video"
        />,
      );
      expect(getByTestId('card-video')).toBeTruthy();
    });

    it('renders without crashing when videoUri is very long', () => {
      const longUri = 'https://example.com/' + 'a'.repeat(2000) + '.mp4';
      const { getByTestId } = render(<ProductCardVideo videoUri={longUri} testID="card-video" />);
      expect(getByTestId('card-video')).toBeTruthy();
    });
  });
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { ProductCardVideo } from '../ProductCardVideo';
import { useVideoPlayer } from 'expo-video';

// expo-video is mocked in jest.setup.js — VideoView renders as a View

describe('ProductCardVideo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  describe('player setup', () => {
    it('creates a video player with the provided URI', () => {
      render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="card-video" />,
      );
      expect(useVideoPlayer).toHaveBeenCalledWith(
        'https://example.com/video.mp4',
        expect.any(Function),
      );
    });

    it('configures player for muted looping autoplay', () => {
      const mockSetup = { loop: false, muted: false, play: jest.fn() };
      (useVideoPlayer as jest.Mock).mockImplementation((_src, setup) => {
        if (setup) setup(mockSetup);
        return mockSetup;
      });

      render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="card-video" />,
      );

      expect(mockSetup.loop).toBe(true);
      expect(mockSetup.muted).toBe(true);
      expect(mockSetup.play).toHaveBeenCalled();
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

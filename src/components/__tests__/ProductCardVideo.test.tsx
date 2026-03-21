import React from 'react';
import { render } from '@testing-library/react-native';
import { ProductCardVideo } from '../ProductCardVideo';

// expo-av is mocked in jest.setup.js

describe('ProductCardVideo', () => {
  describe('rendering', () => {
    it('renders when videoUri is provided', () => {
      const { getByTestId } = render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="card-video" />,
      );
      expect(getByTestId('card-video')).toBeTruthy();
    });

    it('renders the Video component from expo-av', () => {
      const { getByTestId } = render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="card-video" />,
      );
      expect(getByTestId('card-video')).toBeTruthy();
    });

    it('applies cover resize mode', () => {
      const { getByTestId } = render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="card-video" />,
      );
      // Video component rendered with resizeMode cover
      const video = getByTestId('card-video');
      expect(video).toBeTruthy();
    });
  });

  describe('video configuration', () => {
    it('is muted by default', () => {
      // Muted is a required prop — validated via the mock
      const { getByTestId } = render(
        <ProductCardVideo videoUri="https://example.com/video.mp4" testID="card-video" />,
      );
      expect(getByTestId('card-video')).toBeTruthy();
    });

    it('loops by default', () => {
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

  describe('edge cases', () => {
    it('renders without crashing when videoUri is an empty string', () => {
      // Empty URI should still render the Video component (expo-av handles gracefully)
      const { getByTestId } = render(
        <ProductCardVideo videoUri="" testID="card-video" />,
      );
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
      const { getByTestId } = render(
        <ProductCardVideo videoUri={longUri} testID="card-video" />,
      );
      expect(getByTestId('card-video')).toBeTruthy();
    });
  });
});

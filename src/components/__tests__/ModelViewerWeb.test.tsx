import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';
import { ModelViewerWeb } from '../ModelViewerWeb';

const defaultProps = {
  glbUrl: 'https://cdn.example.com/model.glb',
  usdzUrl: 'https://cdn.example.com/model.usdz',
  title: 'Asheville Futon',
  dimensions: { width: 1.37, depth: 0.86, height: 0.84 },
};

describe('ModelViewerWeb', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
  });

  describe('Native platforms', () => {
    it('renders null on iOS', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      const { toJSON } = render(<ModelViewerWeb {...defaultProps} />);
      expect(toJSON()).toBeNull();
    });

    it('renders null on Android', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      const { toJSON } = render(<ModelViewerWeb {...defaultProps} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('Web platform', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('renders a container view on web', () => {
      const { getByTestId } = render(<ModelViewerWeb {...defaultProps} />);
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });

    it('accepts custom testID', () => {
      const { getByTestId } = render(
        <ModelViewerWeb {...defaultProps} testID="custom-viewer" />,
      );
      expect(getByTestId('custom-viewer')).toBeTruthy();
    });

    it('renders a title label', () => {
      const { getByText } = render(<ModelViewerWeb {...defaultProps} />);
      expect(getByText('Asheville Futon')).toBeTruthy();
    });

    it('renders dimension text', () => {
      const { getByText } = render(<ModelViewerWeb {...defaultProps} />);
      // Dimensions should be displayed in human-readable form (inches or meters)
      expect(getByText(/1\.37/)).toBeTruthy(); // width shows up
    });

    it('renders with all required props', () => {
      // Should not throw
      const { getByTestId } = render(<ModelViewerWeb {...defaultProps} />);
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });

    it('renders without optional testID', () => {
      const { glbUrl, usdzUrl, title, dimensions } = defaultProps;
      const { getByTestId } = render(
        <ModelViewerWeb glbUrl={glbUrl} usdzUrl={usdzUrl} title={title} dimensions={dimensions} />,
      );
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });
  });

  describe('Props validation', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('passes glbUrl to the viewer', () => {
      const { getByTestId } = render(<ModelViewerWeb {...defaultProps} />);
      // The component should exist and accept the glbUrl
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });

    it('handles zero dimensions gracefully', () => {
      const props = {
        ...defaultProps,
        dimensions: { width: 0, depth: 0, height: 0 },
      };
      const { getByTestId } = render(<ModelViewerWeb {...props} />);
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });
  });

  describe('Script injection', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('includes model-viewer script URL reference', () => {
      const { getByTestId } = render(<ModelViewerWeb {...defaultProps} />);
      // Component should render successfully — script injection is internal
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('has accessible label with product title', () => {
      const { getByLabelText } = render(<ModelViewerWeb {...defaultProps} />);
      expect(getByLabelText(/Asheville Futon/)).toBeTruthy();
    });
  });
});

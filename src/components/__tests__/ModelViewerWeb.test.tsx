import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

const originalPlatform = Platform.OS;

// Lazy import — may not exist yet (test-first)
let ModelViewerWeb: any;
try {
  ModelViewerWeb = require('../ModelViewerWeb').ModelViewerWeb;
} catch {
  ModelViewerWeb = null;
}

const describeIfImplemented = ModelViewerWeb ? describe : describe.skip;

afterEach(() => {
  Object.defineProperty(Platform, 'OS', { value: originalPlatform });
});

describeIfImplemented('ModelViewerWeb', () => {
  it('renders null on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const { toJSON } = render(
      <ModelViewerWeb
        glbUrl="https://example.com/model.glb"
        usdzUrl="https://example.com/model.usdz"
        title="Test Futon"
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders null on Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    const { toJSON } = render(
      <ModelViewerWeb
        glbUrl="https://example.com/model.glb"
        usdzUrl="https://example.com/model.usdz"
        title="Test Futon"
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders a container on web', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const { getByTestId } = render(
      <ModelViewerWeb
        glbUrl="https://example.com/model.glb"
        usdzUrl="https://example.com/model.usdz"
        title="Test Futon"
        testID="model-viewer"
      />,
    );
    expect(getByTestId('model-viewer')).toBeTruthy();
  });

  it('renders with default testID', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const { getByTestId } = render(
      <ModelViewerWeb
        glbUrl="https://example.com/model.glb"
        usdzUrl="https://example.com/model.usdz"
        title="Test Futon"
      />,
    );
    expect(getByTestId('model-viewer-web')).toBeTruthy();
  });

  it('displays the product title on web', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const { getByText } = render(
      <ModelViewerWeb
        glbUrl="https://example.com/model.glb"
        usdzUrl="https://example.com/model.usdz"
        title="The Asheville Futon"
      />,
    );
    expect(getByText('The Asheville Futon')).toBeTruthy();
  });

  it('shows a fallback message when no glbUrl provided', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const { getByText } = render(
      <ModelViewerWeb
        glbUrl=""
        usdzUrl=""
        title="Test Futon"
      />,
    );
    expect(getByText(/3D model not available/i)).toBeTruthy();
  });
});

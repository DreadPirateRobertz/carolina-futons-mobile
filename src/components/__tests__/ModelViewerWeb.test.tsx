import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import {
  ModelViewerWeb,
  buildModelViewerHTML,
  MODEL_VIEWER_CDN,
  resetScriptState,
} from '../ModelViewerWeb';

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
    resetScriptState();
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

    it('renders dimension text with multiplication sign', () => {
      const { getByText } = render(<ModelViewerWeb {...defaultProps} />);
      expect(getByText(/1\.37m × 0\.86m × 0\.84m/)).toBeTruthy();
    });

    it('renders without optional testID', () => {
      const { getByTestId } = render(
        <ModelViewerWeb
          glbUrl={defaultProps.glbUrl}
          usdzUrl={defaultProps.usdzUrl}
          title={defaultProps.title}
          dimensions={defaultProps.dimensions}
        />,
      );
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });
  });

  describe('Props handling', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('handles zero dimensions gracefully', () => {
      const props = {
        ...defaultProps,
        dimensions: { width: 0, depth: 0, height: 0 },
      };
      const { getByTestId } = render(<ModelViewerWeb {...props} />);
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });

    it('renders loading state initially', () => {
      const { getByText } = render(<ModelViewerWeb {...defaultProps} />);
      expect(getByText(/loading|3d/i)).toBeTruthy();
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

  describe('buildModelViewerHTML', () => {
    it('generates HTML with src attribute for GLB URL', () => {
      const html = buildModelViewerHTML(defaultProps);
      expect(html).toContain('src="https://cdn.example.com/model.glb"');
    });

    it('generates HTML with ios-src attribute for USDZ URL', () => {
      const html = buildModelViewerHTML(defaultProps);
      expect(html).toContain('ios-src="https://cdn.example.com/model.usdz"');
    });

    it('includes alt text with title', () => {
      const html = buildModelViewerHTML(defaultProps);
      expect(html).toContain('alt="Asheville Futon"');
    });

    it('enables camera-controls for rotate/zoom', () => {
      const html = buildModelViewerHTML(defaultProps);
      expect(html).toContain('camera-controls');
    });

    it('enables AR mode', () => {
      const html = buildModelViewerHTML(defaultProps);
      expect(html).toMatch(/\bar\b/);
    });

    it('includes ar-modes for iOS Quick Look', () => {
      const html = buildModelViewerHTML(defaultProps);
      expect(html).toContain('ar-modes="webxr scene-viewer quick-look"');
    });

    it('enables shadow rendering', () => {
      const html = buildModelViewerHTML(defaultProps);
      expect(html).toContain('shadow-intensity');
    });

    it('enables auto-rotate', () => {
      const html = buildModelViewerHTML(defaultProps);
      expect(html).toContain('auto-rotate');
    });

    it('sets 100% width and height on the element', () => {
      const html = buildModelViewerHTML(defaultProps);
      expect(html).toContain('width: 100%');
      expect(html).toContain('height: 100%');
    });

    it('escapes HTML entities in title', () => {
      const html = buildModelViewerHTML({
        ...defaultProps,
        title: 'Test <script>alert("xss")</script>',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;');
    });

    it('escapes quotes in URLs', () => {
      const html = buildModelViewerHTML({
        ...defaultProps,
        glbUrl: 'https://example.com/model"test.glb',
      });
      expect(html).not.toContain('model"test');
      expect(html).toContain('&quot;');
    });
  });

  describe('Script injection', () => {
    // Script injection tests require DOM — skip if no document (non-jsdom env)
    const hasDom = typeof document !== 'undefined';

    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      if (hasDom) {
        document.querySelectorAll('script[data-model-viewer]').forEach((s) => s.remove());
      }
      resetScriptState();
    });

    (hasDom ? it : it.skip)('injects model-viewer script tag into document head', () => {
      render(<ModelViewerWeb {...defaultProps} />);
      const scripts = document.querySelectorAll('script[data-model-viewer]');
      expect(scripts.length).toBe(1);
    });

    (hasDom ? it : it.skip)('uses correct CDN URL', () => {
      render(<ModelViewerWeb {...defaultProps} />);
      const script = document.querySelector('script[data-model-viewer]') as HTMLScriptElement;
      expect(script.src).toBe(MODEL_VIEWER_CDN);
    });

    (hasDom ? it : it.skip)('sets script type to module', () => {
      render(<ModelViewerWeb {...defaultProps} />);
      const script = document.querySelector('script[data-model-viewer]') as HTMLScriptElement;
      expect(script.type).toBe('module');
    });

    (hasDom ? it : it.skip)('does not inject duplicate scripts on re-render', () => {
      const { rerender } = render(<ModelViewerWeb {...defaultProps} />);
      rerender(<ModelViewerWeb {...defaultProps} title="Different Product" />);
      const scripts = document.querySelectorAll('script[data-model-viewer]');
      expect(scripts.length).toBe(1);
    });

    (hasDom ? it : it.skip)('does not inject script on native platforms', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      render(<ModelViewerWeb {...defaultProps} />);
      const scripts = document.querySelectorAll('script[data-model-viewer]');
      expect(scripts.length).toBe(0);
    });

    it('exports MODEL_VIEWER_CDN constant', () => {
      expect(MODEL_VIEWER_CDN).toContain('model-viewer');
      expect(MODEL_VIEWER_CDN).toContain('googleapis.com');
    });

    it('resetScriptState allows re-injection', () => {
      // Just verifies the function exists and is callable
      expect(() => resetScriptState()).not.toThrow();
    });
  });

  describe('Loading state', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('shows loading indicator while model-viewer initializes', () => {
      const { getByTestId } = render(<ModelViewerWeb {...defaultProps} />);
      expect(getByTestId('model-viewer-loading')).toBeTruthy();
    });
  });
});

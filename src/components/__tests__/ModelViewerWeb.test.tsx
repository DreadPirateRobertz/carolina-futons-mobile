import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';
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
      const { getByTestId } = render(<ModelViewerWeb {...defaultProps} testID="custom-viewer" />);
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

    it('renders without dimensions prop', () => {
      const { getByTestId, queryByText } = render(
        <ModelViewerWeb
          glbUrl={defaultProps.glbUrl}
          usdzUrl={defaultProps.usdzUrl}
          title={defaultProps.title}
        />,
      );
      expect(getByTestId('model-viewer-web')).toBeTruthy();
      expect(queryByText(/×/)).toBeNull();
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

  describe('Fallback / empty state', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('shows fallback message when glbUrl is empty string', () => {
      const { getByText } = render(<ModelViewerWeb glbUrl="" usdzUrl="" title="Test Futon" />);
      expect(getByText(/3D model not available/i)).toBeTruthy();
    });

    it('shows fallback with custom testID when glbUrl is empty', () => {
      const { getByTestId } = render(
        <ModelViewerWeb glbUrl="" usdzUrl="" title="Test Futon" testID="custom-fallback" />,
      );
      expect(getByTestId('custom-fallback')).toBeTruthy();
    });

    it('shows default testID in fallback mode', () => {
      const { getByTestId } = render(<ModelViewerWeb glbUrl="" usdzUrl="" title="Test Futon" />);
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

    it('produces a <model-viewer> tag', () => {
      const html = buildModelViewerHTML(defaultProps);
      expect(html).toMatch(/^<model-viewer/);
      expect(html).toMatch(/<\/model-viewer>$/);
    });
  });

  describe('XSS prevention (buildModelViewerHTML)', () => {
    it('escapes HTML tags in title', () => {
      const html = buildModelViewerHTML({
        ...defaultProps,
        title: 'Test <script>alert("xss")</script>',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;');
    });

    it('escapes double quotes in URLs', () => {
      const html = buildModelViewerHTML({
        ...defaultProps,
        glbUrl: 'https://example.com/model"test.glb',
      });
      expect(html).not.toContain('model"test');
      expect(html).toContain('&quot;');
    });

    it('escapes single quotes in title', () => {
      const html = buildModelViewerHTML({
        ...defaultProps,
        title: "O'Brien's Futon",
      });
      expect(html).toContain('&#39;');
    });

    it('escapes ampersands in title', () => {
      const html = buildModelViewerHTML({
        ...defaultProps,
        title: 'Futon & Ottoman',
      });
      expect(html).toContain('&amp;');
    });

    it('escapes greater-than signs in title', () => {
      const html = buildModelViewerHTML({
        ...defaultProps,
        title: 'Size > Large',
      });
      expect(html).toContain('&gt;');
    });

    it('escapes event handler injection in URL', () => {
      const html = buildModelViewerHTML({
        ...defaultProps,
        glbUrl: '" onload="alert(1)" data-x="',
      });
      // Quotes are escaped so attribute breakout is impossible
      expect(html).toContain('&quot;');
      expect(html).not.toContain('src="" onload=');
    });

    it('escapes HTML injection via img tag in title', () => {
      const html = buildModelViewerHTML({
        ...defaultProps,
        title: '<img src=x onerror=alert(1)>',
      });
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });

    it('handles empty strings without error', () => {
      const html = buildModelViewerHTML({ glbUrl: '', usdzUrl: '', title: '' });
      expect(html).toContain('src=""');
      expect(html).toContain('alt=""');
    });

    it('handles very long strings without error', () => {
      const longStr = 'A'.repeat(10000);
      const html = buildModelViewerHTML({
        glbUrl: `https://example.com/${longStr}.glb`,
        usdzUrl: `https://example.com/${longStr}.usdz`,
        title: longStr,
      });
      expect(html).toContain(longStr);
    });

    it('handles unicode characters', () => {
      const html = buildModelViewerHTML({
        ...defaultProps,
        title: 'Futon 日本語 émojis 🛋️',
      });
      expect(html).toContain('日本語');
    });

    it('handles newlines in input strings', () => {
      const html = buildModelViewerHTML({
        ...defaultProps,
        title: 'Futon\nwith\nnewlines',
      });
      expect(html).toContain('alt="Futon\nwith\nnewlines"');
    });
  });

  describe('Script injection', () => {
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

    it('MODEL_VIEWER_CDN is a valid HTTPS URL', () => {
      expect(MODEL_VIEWER_CDN).toMatch(/^https:\/\//);
    });

    it('resetScriptState allows re-injection', () => {
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

    it('shows loading text', () => {
      const { getByText } = render(<ModelViewerWeb {...defaultProps} />);
      expect(getByText('Loading 3D model...')).toBeTruthy();
    });
  });

  describe('Edge cases: boundary values', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('handles negative dimension values', () => {
      const { getByTestId } = render(
        <ModelViewerWeb {...defaultProps} dimensions={{ width: -1, depth: -2, height: -3 }} />,
      );
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });

    it('handles very large dimension values', () => {
      const { getByTestId } = render(
        <ModelViewerWeb
          {...defaultProps}
          dimensions={{ width: 999999, depth: 999999, height: 999999 }}
        />,
      );
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });

    it('handles fractional dimension values with many decimals', () => {
      const { getByText } = render(
        <ModelViewerWeb
          {...defaultProps}
          dimensions={{ width: 1.123456789, depth: 0.000001, height: 99.9 }}
        />,
      );
      expect(getByText(/1\.123456789m/)).toBeTruthy();
    });

    it('renders with very long title', () => {
      const longTitle = 'A'.repeat(500);
      const { getByText } = render(<ModelViewerWeb {...defaultProps} title={longTitle} />);
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('renders with special characters in title', () => {
      const { getByText } = render(
        <ModelViewerWeb {...defaultProps} title="Futon™ — «Premium» Edition" />,
      );
      expect(getByText('Futon™ — «Premium» Edition')).toBeTruthy();
    });

    it('renders with URL containing query parameters', () => {
      const { getByTestId } = render(
        <ModelViewerWeb
          {...defaultProps}
          glbUrl="https://cdn.example.com/model.glb?v=2&token=abc"
        />,
      );
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });

    it('renders with URL containing hash fragment', () => {
      const { getByTestId } = render(
        <ModelViewerWeb {...defaultProps} glbUrl="https://cdn.example.com/model.glb#section" />,
      );
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });

    it('renders with URL containing encoded characters', () => {
      const { getByTestId } = render(
        <ModelViewerWeb {...defaultProps} glbUrl="https://cdn.example.com/model%20name.glb" />,
      );
      expect(getByTestId('model-viewer-web')).toBeTruthy();
    });
  });
});

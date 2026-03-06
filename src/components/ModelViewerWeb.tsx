/**
 * @module ModelViewerWeb
 *
 * Web-only 3D model viewer powered by Google's <model-viewer> web component.
 * Injects the model-viewer script from CDN and creates the custom element via
 * safe DOM APIs (no innerHTML) to prevent XSS. Renders nothing on native
 * platforms — iOS/Android use the native AR path instead.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Platform, ActivityIndicator } from 'react-native';

/** CDN URL for Google's model-viewer web component (v3.5.0). */
export const MODEL_VIEWER_CDN =
  'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';

interface Props {
  glbUrl: string;
  usdzUrl: string;
  title: string;
  dimensions?: { width: number; depth: number; height: number };
  testID?: string;
}

/** Escape HTML entities to prevent XSS in generated HTML */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format meters to a display string (e.g. "1.37m") */
function fmtDim(meters: number): string {
  return `${meters}m`;
}

/**
 * Build the <model-viewer> HTML string with all required attributes.
 * All inputs are HTML-escaped to prevent injection.
 * Exported for direct unit testing of attribute generation.
 */
export function buildModelViewerHTML(props: {
  glbUrl: string;
  usdzUrl: string;
  title: string;
}): string {
  const src = escapeHTML(props.glbUrl);
  const iosSrc = escapeHTML(props.usdzUrl);
  const alt = escapeHTML(props.title);

  return `<model-viewer
    src="${src}"
    ios-src="${iosSrc}"
    alt="${alt}"
    ar
    ar-modes="webxr scene-viewer quick-look"
    camera-controls
    auto-rotate
    shadow-intensity="1"
    style="width: 100%; height: 100%; background-color: #2A2018;"
  ></model-viewer>`;
}

/**
 * Create a <model-viewer> DOM element using safe DOM APIs (no innerHTML).
 * Sets all attributes via setAttribute to avoid XSS.
 */
function createModelViewerElement(props: {
  glbUrl: string;
  usdzUrl: string;
  title: string;
}): HTMLElement {
  const el = document.createElement('model-viewer');
  el.setAttribute('src', props.glbUrl);
  el.setAttribute('ios-src', props.usdzUrl);
  el.setAttribute('alt', props.title);
  el.setAttribute('ar', '');
  el.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
  el.setAttribute('camera-controls', '');
  el.setAttribute('auto-rotate', '');
  el.setAttribute('shadow-intensity', '1');
  el.style.width = '100%';
  el.style.height = '100%';
  el.style.backgroundColor = '#2A2018';
  return el;
}

let _scriptLoaded = false;

/** Reset script injection state (for testing) */
export function resetScriptState(): void {
  _scriptLoaded = false;
}

function injectModelViewerScript(): void {
  if (Platform.OS !== 'web' || _scriptLoaded) return;
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[data-model-viewer]')) {
    _scriptLoaded = true;
    return;
  }
  const script = document.createElement('script');
  script.type = 'module';
  script.src = MODEL_VIEWER_CDN;
  script.setAttribute('data-model-viewer', 'true');
  document.head.appendChild(script);
  _scriptLoaded = true;
}

/**
 * Web-only 3D model viewer using Google's <model-viewer> web component.
 * Loads the model-viewer library from CDN via script injection (no npm dependency).
 * On web, injects a real <model-viewer> custom element into the DOM via safe DOM APIs.
 * Renders null on native platforms (iOS/Android).
 */
export function ModelViewerWeb({ glbUrl, usdzUrl, title, dimensions, testID }: Props) {
  const viewerRef = useRef<View>(null);

  useEffect(() => {
    injectModelViewerScript();
  }, []);

  // Inject <model-viewer> element into the DOM container via safe DOM APIs
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!viewerRef.current) return;

    const node = viewerRef.current as unknown as HTMLElement;
    if (node && typeof node.querySelector === 'function') {
      // Remove existing model-viewer if props changed
      const existing = node.querySelector('model-viewer');
      if (existing) existing.remove();

      const mvElement = createModelViewerElement({ glbUrl, usdzUrl, title });
      node.appendChild(mvElement);
    }
  }, [glbUrl, usdzUrl, title]);

  if (Platform.OS !== 'web') {
    return null;
  }

  if (!glbUrl) {
    return (
      <View style={styles.container} testID={testID ?? 'model-viewer-web'}>
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>3D model not available</Text>
        </View>
      </View>
    );
  }

  const dimText = dimensions
    ? `${fmtDim(dimensions.width)} × ${fmtDim(dimensions.depth)} × ${fmtDim(dimensions.height)}`
    : undefined;

  return (
    <View
      style={styles.container}
      testID={testID ?? 'model-viewer-web'}
      accessibilityLabel={`3D viewer: ${title}`}
    >
      <View style={styles.viewerWrapper}>
        <View ref={viewerRef} style={styles.viewerContainer} testID="model-viewer-element" />
        <View style={styles.loadingOverlay} testID="model-viewer-loading">
          <ActivityIndicator size="large" color="#5B8FA8" />
          <Text style={styles.loadingText}>Loading 3D model...</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        {dimText && <Text style={styles.dimensions}>{dimText}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1410',
  },
  viewerWrapper: {
    flex: 1,
    minHeight: 300,
    position: 'relative' as const,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#2A2018',
  },
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(42, 32, 24, 0.8)',
  },
  loadingText: {
    color: 'rgba(242, 232, 213, 0.6)',
    fontSize: 13,
    marginTop: 12,
  },
  info: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: '#F2E8D5',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  dimensions: {
    color: 'rgba(242, 232, 213, 0.6)',
    fontSize: 13,
    marginTop: 4,
  },
  fallback: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 300,
  },
  fallbackText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
});

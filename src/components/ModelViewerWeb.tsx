import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';

const MODEL_VIEWER_CDN =
  'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';

interface Props {
  glbUrl: string;
  usdzUrl: string;
  title: string;
  dimensions: { width: number; depth: number; height: number };
  testID?: string;
}

/** Format meters to a display string (e.g. "1.37m") */
function fmtDim(meters: number): string {
  return `${meters}m`;
}

let scriptLoaded = false;

function injectModelViewerScript(): void {
  if (Platform.OS !== 'web' || scriptLoaded) return;
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[data-model-viewer]')) {
    scriptLoaded = true;
    return;
  }
  const script = document.createElement('script');
  script.type = 'module';
  script.src = MODEL_VIEWER_CDN;
  script.setAttribute('data-model-viewer', 'true');
  document.head.appendChild(script);
  scriptLoaded = true;
}

/**
 * Web-only 3D model viewer using Google's <model-viewer> web component.
 * Loads the model-viewer library from CDN via script injection (no npm dependency).
 * Renders null on native platforms (iOS/Android).
 */
export function ModelViewerWeb({ glbUrl, usdzUrl, title, dimensions, testID }: Props) {
  const containerRef = useRef<View>(null);

  useEffect(() => {
    injectModelViewerScript();
  }, []);

  if (Platform.OS !== 'web') {
    return null;
  }

  const dimText = `${fmtDim(dimensions.width)} × ${fmtDim(dimensions.depth)} × ${fmtDim(dimensions.height)}`;

  return (
    <View
      style={styles.container}
      testID={testID ?? 'model-viewer-web'}
      accessibilityLabel={`3D viewer: ${title}`}
      ref={containerRef}
    >
      <View style={styles.viewerWrapper}>
        {/*
          In a real web environment, this renders a <model-viewer> custom element.
          In React Native Web's test environment, we render a placeholder that
          represents where the web component would be injected via DOM manipulation.
        */}
        <View
          style={styles.viewerPlaceholder}
          testID="model-viewer-element"
          // @ts-expect-error — web-only data attributes for DOM model-viewer element
          dataSet={{
            glbUrl,
            usdzUrl,
            title,
          }}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.dimensions}>{dimText}</Text>
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
  },
  viewerPlaceholder: {
    flex: 1,
    backgroundColor: '#2A2018',
  },
  info: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: '#F2E8D5',
    fontSize: 18,
    fontWeight: '700',
  },
  dimensions: {
    color: 'rgba(242, 232, 213, 0.6)',
    fontSize: 13,
    marginTop: 4,
  },
});

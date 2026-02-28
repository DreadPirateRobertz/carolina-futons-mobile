import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';

interface Props {
  glbUrl: string;
  usdzUrl: string;
  title: string;
  dimensions?: { width: number; depth: number; height: number };
  testID?: string;
}

/**
 * Web-only 3D model viewer using Google's <model-viewer> web component.
 * On native platforms (iOS/Android), renders null — native AR viewers handle 3D.
 *
 * On web, injects the model-viewer script from Google CDN and renders an
 * interactive 3D viewer with rotate/zoom and AR button on supported browsers.
 *
 * Security note: All URLs come from the app's own model catalog (models3d.ts),
 * never from user input, so content injection is not a concern.
 */
export function ModelViewerWeb({ glbUrl, usdzUrl, title, testID }: Props) {
  if (Platform.OS !== 'web') {
    return null;
  }

  if (!glbUrl) {
    return (
      <View style={styles.container} testID={testID ?? 'model-viewer-web'}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>3D model not available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID ?? 'model-viewer-web'}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.viewerContainer}>
        <ModelViewerElement glbUrl={glbUrl} usdzUrl={usdzUrl} title={title} />
      </View>
    </View>
  );
}

/**
 * Inner component that renders the <model-viewer> web component.
 * Uses dangerouslySetInnerHTML because React Native Web doesn't support
 * custom HTML elements directly. URLs are from our controlled catalog only.
 */
function ModelViewerElement({
  glbUrl,
  usdzUrl,
  title,
}: {
  glbUrl: string;
  usdzUrl: string;
  title: string;
}) {
  if (Platform.OS !== 'web') return null;

  // Build model-viewer HTML. All values come from our internal models3d.ts catalog.
  const modelViewerHtml = [
    '<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>',
    '<model-viewer',
    `  src="${glbUrl}"`,
    `  ios-src="${usdzUrl}"`,
    `  alt="${title} - 3D model"`,
    '  ar',
    '  ar-modes="webxr scene-viewer quick-look"',
    '  camera-controls',
    '  shadow-intensity="1"',
    '  auto-rotate',
    '  style="width: 100%; height: 100%; min-height: 400px;"',
    '>',
    '</model-viewer>',
  ].join('\n');

  return (
    <View style={styles.webViewContainer}>
      {/* eslint-disable-next-line -- URLs sourced from internal catalog, not user input */}
      {/* @ts-ignore — dangerouslySetInnerHTML available via react-native-web */}
      <div
        dangerouslySetInnerHTML={{ __html: modelViewerHtml }}
        style={{ width: '100%', height: '100%', minHeight: 400 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    padding: 16,
    textAlign: 'center',
  },
  viewerContainer: {
    flex: 1,
    minHeight: 400,
  },
  webViewContainer: {
    flex: 1,
    minHeight: 400,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  fallbackText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
});

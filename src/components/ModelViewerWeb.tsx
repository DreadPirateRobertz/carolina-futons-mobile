import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface Props {
  glbUrl: string;
  usdzUrl?: string;
  title?: string;
  dimensions?: { width: number; depth: number; height: number };
  testID?: string;
}

/**
 * Web-only 3D model viewer using Google's <model-viewer> web component.
 * Renders null on native platforms.
 *
 * Placeholder — full implementation with script injection and
 * model-viewer attributes will be provided by the ModelViewerWeb PR.
 */
export function ModelViewerWeb({ glbUrl, usdzUrl, title, dimensions, testID }: Props) {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container} testID={testID ?? 'model-viewer-web'}>
      <Text style={styles.placeholder}>3D Viewer: {title ?? 'Model'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1410',
  },
  placeholder: {
    color: '#F2E8D5',
    fontSize: 16,
  },
});

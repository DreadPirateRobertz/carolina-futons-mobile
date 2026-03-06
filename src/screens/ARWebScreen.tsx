/**
 * @module ARWebScreen
 *
 * Web-platform counterpart to the native AR (Augmented Reality) screen.
 * Since WebXR support is limited, this screen uses a `<model-viewer>` wrapper
 * (via ModelViewerWeb) to let customers rotate and inspect a 3D futon model
 * in their browser. Launched from ProductDetailScreen when the user taps
 * "Try in Your Room" on a web build.
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ModelViewerWeb } from '@/components/ModelViewerWeb';

/**
 * Navigation parameters required to render the AR (Augmented Reality) web viewer.
 *
 * @property glbUrl - URL to the GLB (GL Binary) 3D model file for non-Apple devices.
 * @property usdzUrl - URL to the USDZ (Universal Scene Description Zip) model file for Apple Quick Look.
 * @property title - Human-readable product name displayed in the header.
 * @property productId - Catalog product identifier, used for analytics attribution.
 */
export interface ARWebScreenParams {
  glbUrl: string;
  usdzUrl: string;
  title: string;
  productId: string;
}

/** Props for the ARWebScreen component. */
interface Props {
  /** React Navigation route containing {@link ARWebScreenParams}. */
  route: { params: ARWebScreenParams };
  /** Optional override for the close action; defaults to navigation.goBack(). */
  onClose?: () => void;
  /** Test identifier for end-to-end tests. */
  testID?: string;
}

/**
 * Full-screen modal that renders an interactive 3D model viewer for web.
 * Displays a dark header bar with the product title and a close button,
 * with the ModelViewerWeb component filling the remaining viewport.
 *
 * @param props - {@link Props}
 * @returns The AR (Augmented Reality) web viewer screen.
 */
export function ARWebScreen({ route, onClose, testID }: Props) {
  const navigation = useNavigation();
  const { glbUrl, usdzUrl, title } = route.params;

  const handleClose = useCallback(() => {
    if (onClose) return onClose();
    navigation.goBack();
  }, [onClose, navigation]);

  return (
    <View style={styles.container} testID={testID ?? 'ar-web-screen'}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          testID="ar-web-close"
          accessibilityLabel="Close 3D viewer"
          accessibilityRole="button"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      <ModelViewerWeb glbUrl={glbUrl} usdzUrl={usdzUrl} title={title} testID="model-viewer-web" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1410',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#1A1410',
  },
  title: {
    color: '#F2E8D5',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(242, 232, 213, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#F2E8D5',
    fontSize: 18,
    fontWeight: '300',
  },
});

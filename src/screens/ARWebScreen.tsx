import React, { useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ModelViewerWeb } from '@/components/ModelViewerWeb';

export interface ARWebScreenParams {
  glbUrl: string;
  usdzUrl: string;
  title: string;
  productId: string;
}

interface Props {
  route: { params: ARWebScreenParams };
  onClose?: () => void;
  testID?: string;
}

/**
 * Full-screen modal screen wrapping ModelViewerWeb for web platform.
 * Shows a 3D model viewer with a header bar containing the product title and close button.
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

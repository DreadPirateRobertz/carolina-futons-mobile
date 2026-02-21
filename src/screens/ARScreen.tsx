import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { FUTON_MODELS, type FutonModel, type Fabric } from '@/data/futons';
import { ARFutonOverlay } from '@/components/ARFutonOverlay';
import { ARControls } from '@/components/ARControls';

interface Props {
  onClose?: () => void;
  initialModelId?: string;
  testID?: string;
}

/**
 * AR Camera Overlay screen.
 * Shows the device camera with a futon model overlaid in the scene.
 * User can drag/pinch/rotate the futon, swap fabrics, view dimensions.
 */
export function ARScreen({ onClose, initialModelId, testID }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  const [selectedModel, setSelectedModel] = useState<FutonModel>(
    FUTON_MODELS.find((m) => m.id === initialModelId) ?? FUTON_MODELS[0],
  );
  const [selectedFabric, setSelectedFabric] = useState<Fabric>(selectedModel.fabrics[0]);
  const [showDimensions, setShowDimensions] = useState(false);

  const handleSelectModel = useCallback(
    (model: FutonModel) => {
      setSelectedModel(model);
      // Keep fabric if available on new model, else reset
      if (!model.fabrics.find((f) => f.id === selectedFabric.id)) {
        setSelectedFabric(model.fabrics[0]);
      }
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    [selectedFabric],
  );

  const handleSelectFabric = useCallback((fabric: Fabric) => {
    setSelectedFabric(fabric);
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, []);

  const handleToggleDimensions = useCallback(() => {
    setShowDimensions((prev) => !prev);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={styles.permissionContainer} testID="ar-loading">
        <Text style={styles.permissionText}>Initializing camera...</Text>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer} testID="ar-permission">
        <View style={styles.permissionCard}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>See Futons in Your Room</Text>
          <Text style={styles.permissionDescription}>
            Point your camera at your room to see how our futons look in your space. We need camera
            access to make the magic happen.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            testID="ar-grant-permission"
            accessibilityLabel="Allow camera access"
            accessibilityRole="button"
          >
            <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity
              style={styles.permissionDismiss}
              onPress={handleClose}
              testID="ar-permission-dismiss"
            >
              <Text style={styles.permissionDismissText}>Maybe Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Camera granted — show AR view
  return (
    <GestureHandlerRootView style={styles.root} testID={testID ?? 'ar-screen'}>
      {/* Camera feed */}
      <CameraView style={styles.camera} facing="back" testID="ar-camera">
        {/* Crosshair / placement guide */}
        <View style={styles.crosshairContainer}>
          <View style={styles.crosshairH} />
          <View style={styles.crosshairV} />
        </View>

        {/* Instruction hint */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            Drag to position · Pinch to resize · Two-finger rotate
          </Text>
        </View>

        {/* Futon overlay - centered, user drags from there */}
        <View style={styles.overlayContainer}>
          <ARFutonOverlay
            model={selectedModel}
            fabric={selectedFabric}
            showDimensions={showDimensions}
            testID="ar-futon-overlay"
          />
        </View>
      </CameraView>

      {/* Bottom controls */}
      <ARControls
        models={FUTON_MODELS}
        selectedModel={selectedModel}
        selectedFabric={selectedFabric}
        showDimensions={showDimensions}
        onSelectModel={handleSelectModel}
        onSelectFabric={handleSelectFabric}
        onToggleDimensions={handleToggleDimensions}
        onClose={handleClose}
        testID="ar-controls"
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#1A1410',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#2A2018',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    color: '#F2E8D5',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionText: {
    color: '#F2E8D5',
    fontSize: 16,
  },
  permissionDescription: {
    color: 'rgba(242, 232, 213, 0.7)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#E8845C',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  permissionDismiss: {
    marginTop: 16,
    paddingVertical: 8,
  },
  permissionDismissText: {
    color: 'rgba(242, 232, 213, 0.5)',
    fontSize: 14,
  },
  crosshairContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.4,
  },
  crosshairH: {
    position: 'absolute',
    width: 40,
    height: 1,
    backgroundColor: '#FFFFFF',
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
  },
  hintContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

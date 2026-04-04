/**
 * @module VisualSearchScreen
 *
 * Camera viewfinder for visual product search — deacon-905.
 *
 * Handles camera permission states (undetermined, denied, denied-permanently, granted),
 * presents a full-screen viewfinder with a shutter button, captures a photo,
 * and navigates to VisualSearchResultsScreen with the image URI.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { captureException } from '@/services/crashReporting';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function VisualSearchScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraPermission = useCameraPermission();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCapture = useCallback(async () => {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync();
      if (photo?.uri) {
        navigation.navigate('VisualSearchResults', { imageUri: photo.uri });
      }
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setCapturing(false);
    }
  }, [capturing, navigation]);

  const handleOpenSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  // ── Permission: undetermined ───────────────────────────────────────────────
  if (cameraPermission.state === 'undetermined') {
    return (
      <View
        style={[styles.container, styles.centered, { paddingTop: insets.top }]}
        testID="visual-search-screen"
      >
        <BackButton onPress={handleBack} />
        <View testID="visual-search-permission-prompt" style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionBody}>{cameraPermission.explanation}</Text>
          <TouchableOpacity
            testID="visual-search-allow-camera"
            style={styles.primaryButton}
            onPress={cameraPermission.request}
            accessibilityLabel="Allow camera access"
          >
            <Text style={styles.primaryButtonText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Permission: denied (can re-prompt) ────────────────────────────────────
  if (cameraPermission.state === 'denied') {
    return (
      <View
        style={[styles.container, styles.centered, { paddingTop: insets.top }]}
        testID="visual-search-screen"
      >
        <BackButton onPress={handleBack} />
        <View testID="visual-search-permission-denied" style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Camera Permission Denied</Text>
          <Text style={styles.permissionBody}>{cameraPermission.explanation}</Text>
          <TouchableOpacity
            testID="visual-search-permission-retry"
            style={styles.primaryButton}
            onPress={cameraPermission.request}
            accessibilityLabel="Try again to allow camera access"
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Permission: denied permanently ────────────────────────────────────────
  if (cameraPermission.state === 'denied-permanently') {
    return (
      <View
        style={[styles.container, styles.centered, { paddingTop: insets.top }]}
        testID="visual-search-screen"
      >
        <BackButton onPress={handleBack} />
        <View testID="visual-search-permission-denied-permanent" style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionBody}>
            Camera access was denied. Enable it in Settings to use visual search.
          </Text>
          {cameraPermission.settingsInstructions && (
            <Text style={styles.settingsHint}>{cameraPermission.settingsInstructions}</Text>
          )}
          <TouchableOpacity
            testID="visual-search-open-settings"
            style={styles.primaryButton}
            onPress={handleOpenSettings}
            accessibilityLabel={
              Platform.OS === 'ios'
                ? 'Open Settings to enable camera'
                : 'Open app settings to enable camera'
            }
          >
            <Text style={styles.primaryButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Permission granted — camera viewfinder ────────────────────────────────
  return (
    <View style={styles.container} testID="visual-search-screen">
      <CameraView ref={cameraRef} style={styles.camera} testID="visual-search-camera" facing="back">
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <BackButton onPress={handleBack} light />
          <Text style={styles.topLabel}>Visual Search</Text>
          <View style={styles.topBarSpacer} />
        </View>

        {/* Capturing indicator */}
        {capturing && (
          <View style={styles.capturingOverlay} testID="visual-search-capturing">
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Shutter button */}
        <View style={[styles.shutterRow, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            testID="visual-search-shutter"
            style={[styles.shutterButton, capturing && styles.shutterButtonDisabled]}
            onPress={handleCapture}
            disabled={capturing}
            accessibilityLabel="Take photo to search for similar products"
            accessibilityRole="button"
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

// ── BackButton ─────────────────────────────────────────────────────────────────

function BackButton({ onPress, light = false }: { onPress: () => void; light?: boolean }) {
  return (
    <TouchableOpacity
      testID="visual-search-back"
      style={styles.backButton}
      onPress={onPress}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Text style={[styles.backButtonText, light && styles.backButtonTextLight]}>‹</Text>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1008',
  },
  camera: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  topBarSpacer: {
    width: 44,
  },
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  shutterRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterButtonDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  permissionBox: {
    marginHorizontal: 32,
    alignItems: 'center',
    gap: 12,
  },
  permissionTitle: {
    color: '#F5E6C8',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionBody: {
    color: '#C4A882',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  settingsHint: {
    color: '#A08060',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#E8845C',
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 32,
    color: '#C4A882',
    lineHeight: 36,
  },
  backButtonTextLight: {
    color: '#fff',
  },
});

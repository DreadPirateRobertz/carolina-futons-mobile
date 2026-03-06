/**
 * @module ARScreen
 *
 * Native AR (Augmented Reality) camera screen for the "Try in Your Room" feature.
 * This is the primary differentiator of the Carolina Futons app: customers point
 * their phone camera at a room, the app detects floor/wall surfaces, and they can
 * place, resize, and rotate a virtual futon to see how it fits. Screenshots can
 * be saved to the gallery or shared with friends.
 *
 * Surface detection is powered by ARKit on iOS and ARCore on Android via the
 * {@link useSurfaceDetection} hook. Lighting estimation adjusts shadow rendering
 * so the virtual furniture looks realistic under varying room conditions.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Alert, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import {
  useFutonModels,
  useProductByModelId,
  type FutonModel,
  type Fabric,
} from '@/hooks/useFutonModels';
import type { Product } from '@/hooks/useProducts';
import { ARFutonOverlay } from '@/components/ARFutonOverlay';
import { ARControls } from '@/components/ARControls';
import { ARProductPicker } from '@/components/ARProductPicker';
import { PlaneIndicator } from '@/components/PlaneIndicator';
import { events } from '@/services/analytics';
import { formatPrice } from '@/utils';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { useSurfaceDetection } from '@/hooks/useSurfaceDetection';

/** Props for the ARScreen component. */
interface Props {
  /** Optional override for the close action; defaults to navigation.goBack(). */
  onClose?: () => void;
  /** Pre-select a specific futon model when the screen opens. */
  initialModelId?: string;
  /** React Navigation route; used as fallback source for initialModelId. */
  route?: { params?: { initialModelId?: string } };
  /** Test identifier for end-to-end tests. */
  testID?: string;
}

/**
 * Full-screen AR (Augmented Reality) camera view with surface detection, furniture
 * placement, screenshot capture, and social sharing.
 *
 * Handles several states: camera permission prompt, model loading, error fallback,
 * and the main AR experience with controls for model/fabric selection, dimensions
 * toggle, wishlist, and add-to-cart.
 *
 * @param props - {@link Props}
 * @returns The native AR camera screen.
 */
export function ARScreen({ onClose, initialModelId, route, testID }: Props) {
  const navigation = useNavigation();
  const modelId = initialModelId ?? route?.params?.initialModelId;
  const [permission, requestPermission] = useCameraPermissions();

  // Data from hooks — replaces direct FUTON_MODELS/PRODUCTS imports
  const {
    models: futonModels,
    isLoading: modelsLoading,
    error: modelsError,
    getModelById,
  } = useFutonModels();

  const [selectedModel, setSelectedModel] = useState<FutonModel | null>(null);

  // Initialize selectedModel once models are loaded
  useEffect(() => {
    if (futonModels.length > 0 && !selectedModel) {
      setSelectedModel(getModelById(modelId ?? '') ?? futonModels[0]);
    }
  }, [futonModels, modelId, getModelById, selectedModel]);
  const [selectedFabric, setSelectedFabric] = useState<Fabric | null>(null);

  // Initialize selectedFabric when selectedModel changes
  useEffect(() => {
    if (selectedModel && !selectedFabric) {
      setSelectedFabric(selectedModel.fabrics[0]);
    }
  }, [selectedModel, selectedFabric]);

  // Product lookup via hook — replaces direct PRODUCTS.find(...)
  const { product: currentProduct } = useProductByModelId(selectedModel?.id);
  const [showDimensions, setShowDimensions] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [wishlistSaved, setWishlistSaved] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [isPlaced, setIsPlaced] = useState(false);
  const [hasPlacement, setHasPlacement] = useState(false);
  const [lightingWarningDismissed, setLightingWarningDismissed] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);
  const wishlist = useWishlist();
  const cart = useCart();

  // Surface detection + lighting estimation
  const {
    detectionState,
    planes,
    hasFloor,
    shadowParams,
    lightingCondition,
    lightingWarning,
    performHitTest,
  } = useSurfaceDetection({
    detectHorizontal: true,
    detectVertical: true,
    minimumPlaneExtent: 0.3,
    maxPlanes: 8,
    confidenceThreshold: 0.6,
  });

  // Track surface detection analytics events
  useEffect(() => {
    if (detectionState === 'detected' && planes.length > 0) {
      const first = planes[0];
      events.arSurfaceDetected(first.type, first.confidence);
    }
    if (detectionState === 'tracking') {
      events.arSurfaceTracking(planes.length);
    }
  }, [detectionState, planes]);

  // Show lighting warning when conditions are poor
  useEffect(() => {
    if (lightingWarning && !lightingWarningDismissed) {
      events.arLightingWarning(lightingCondition);
    }
  }, [lightingWarning, lightingWarningDismissed, lightingCondition]);

  const isInWishlist = currentProduct ? wishlist.isInWishlist(currentProduct.id) : false;

  const handleSelectModel = useCallback(
    (model: FutonModel) => {
      setSelectedModel(model);
      if (!selectedFabric || !model.fabrics.find((f) => f.id === selectedFabric.id)) {
        setSelectedFabric(model.fabrics[0]);
      }
      setIsPlaced(false);
      setHasPlacement(false);
      events.arModelSelected(model.id, `prod-${model.id}`);
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    [selectedFabric],
  );

  const handleSelectFabric = useCallback(
    (fabric: Fabric) => {
      setSelectedFabric(fabric);
      if (selectedModel) events.selectFabric(`prod-${selectedModel.id}`, fabric.id);
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedModel?.id],
  );

  const handleToggleDimensions = useCallback(() => {
    setShowDimensions((prev) => !prev);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleClose = useCallback(() => {
    if (onClose) return onClose();
    navigation.goBack();
  }, [onClose, navigation]);

  const handleAddToCart = useCallback(() => {
    if (!selectedModel || !selectedFabric) return;
    cart.addItem(selectedModel, selectedFabric, 1);
    events.arAddToCart(
      selectedModel.id,
      selectedFabric.id,
      selectedModel.basePrice + selectedFabric.price,
    );
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [cart, selectedModel, selectedFabric]);

  /** Handle tap on camera view to place furniture on detected surface */
  const handleCameraPress = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      if (!hasFloor || detectionState !== 'tracking') return;

      const { locationX, locationY } = event.nativeEvent;
      const screenWidth = 390;
      const screenHeight = 844;
      const normalizedX = locationX / screenWidth;
      const normalizedY = locationY / screenHeight;

      const anchor = performHitTest(normalizedX, normalizedY);
      if (anchor?.isValid) {
        setIsPlaced(true);
        setHasPlacement(true);
        if (selectedModel) events.arFurniturePlaced(selectedModel.id, anchor.planeId);
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasFloor, detectionState, performHitTest, selectedModel?.id],
  );

  const captureScene = useCallback(async (): Promise<string | null> => {
    if (!viewShotRef.current) return null;
    try {
      setIsCapturing(true);
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
      });
      if (selectedModel && selectedFabric) events.arScreenshot(selectedModel.id, selectedFabric.id);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return uri;
    } catch {
      Alert.alert('Capture Failed', 'Could not capture the AR scene. Please try again.');
      return null;
    } finally {
      setIsCapturing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel?.id, selectedFabric?.id]);

  const handleShare = useCallback(async () => {
    const uri = await captureScene();
    if (!uri) return;

    const message = `Check out the ${selectedModel?.name} in ${selectedFabric?.name} — ${formatPrice((selectedModel?.basePrice ?? 0) + (selectedFabric?.price ?? 0))}!\n\nViewed in AR with Carolina Futons\ncarolinafutons.com`;

    try {
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your AR view',
        });
      } else {
        await Share.share({ message, url: uri });
      }
      if (selectedModel && selectedFabric) events.arShare(selectedModel.id, selectedFabric.id);
    } catch {
      // User cancelled share — not an error
    }
  }, [captureScene, selectedModel, selectedFabric]);

  const handleSaveToGallery = useCallback(async () => {
    const uri = await captureScene();
    if (!uri) return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access to save AR screenshots.',
        );
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      if (selectedModel && selectedFabric)
        events.arSaveToGallery(selectedModel.id, selectedFabric.id);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Saved', 'AR screenshot saved to your photo library.');
    } catch {
      Alert.alert('Save Failed', 'Could not save to your photo library. Please try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureScene, selectedModel?.id, selectedFabric?.id]);

  const handleToggleWishlist = useCallback(() => {
    if (!currentProduct) return;
    wishlist.toggle(currentProduct);
    const nowInWishlist = !isInWishlist;
    if (nowInWishlist) {
      if (selectedModel && selectedFabric)
        events.arSaveToWishlist(selectedModel.id, selectedFabric.id);
      setWishlistSaved(true);
      setTimeout(() => setWishlistSaved(false), 2000);
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProduct, wishlist, isInWishlist, selectedModel?.id, selectedFabric?.id]);

  /** Open the product picker overlay */
  const handleOpenProductPicker = useCallback(() => {
    setShowProductPicker(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  /** Handle product selection from picker — switch model, keep placement */
  const handlePickProduct = useCallback(
    (product: Product) => {
      const modelId = product.id.replace(/^prod-/, '');
      const futonModel = getModelById(modelId);
      if (futonModel) {
        setSelectedModel(futonModel);
        if (!selectedFabric || !futonModel.fabrics.find((f) => f.id === selectedFabric.id)) {
          setSelectedFabric(futonModel.fabrics[0]);
        }
      }
      events.arModelSelected(modelId, product.id);
      setShowProductPicker(false);
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFabric],
  );

  // Determine product category for snap-to-wall behavior
  const productCategory = currentProduct?.category;

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
          {(onClose || navigation) && (
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

  // Models loading
  if (modelsLoading) {
    return (
      <View style={styles.permissionContainer} testID="ar-loading">
        <Text style={styles.permissionText}>Loading futon models...</Text>
      </View>
    );
  }

  // Models error
  if (modelsError) {
    return (
      <View style={styles.permissionContainer} testID="ar-error">
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>We couldn't load futon models</Text>
          <Text style={styles.permissionDescription}>{modelsError.message}</Text>
        </View>
      </View>
    );
  }

  // Waiting for model initialization
  if (!selectedModel || !selectedFabric) {
    return (
      <View style={styles.permissionContainer} testID="ar-loading">
        <Text style={styles.permissionText}>Loading...</Text>
      </View>
    );
  }

  // Camera granted — show AR view with surface detection
  return (
    <GestureHandlerRootView style={styles.root} testID={testID ?? 'ar-screen'}>
      <ViewShot ref={viewShotRef} style={styles.camera} options={{ format: 'png', quality: 1 }}>
        <CameraView style={styles.camera} facing="back" testID="ar-camera">
          {/* Surface plane indicators */}
          <PlaneIndicator
            planes={planes}
            detectionState={detectionState}
            shadowParams={shadowParams}
            hasPlacement={hasPlacement}
            testID="plane-indicator"
          />

          {/* Touch handler for placing furniture */}
          <TouchableOpacity
            style={styles.touchableArea}
            activeOpacity={1}
            onPress={handleCameraPress}
            testID="ar-touch-area"
          />

          {/* Instruction hint — context-aware */}
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>
              {detectionState === 'scanning'
                ? 'Point camera at floor to detect surface'
                : detectionState === 'detected' || detectionState === 'tracking'
                  ? hasPlacement
                    ? 'Drag to position · Pinch to resize · Two-finger rotate'
                    : 'Tap on the floor to place furniture'
                  : 'Initializing AR...'}
            </Text>
          </View>

          {/* Lighting warning banner */}
          {lightingWarning && !lightingWarningDismissed && (
            <TouchableOpacity
              style={styles.lightingWarning}
              onPress={() => setLightingWarningDismissed(true)}
              testID="lighting-warning"
            >
              <Text style={styles.lightingWarningText}>{lightingWarning}</Text>
              <Text style={styles.lightingWarningDismiss}>✕</Text>
            </TouchableOpacity>
          )}

          {/* Futon overlay — shown after placement */}
          <View style={styles.overlayContainer}>
            <ARFutonOverlay
              model={selectedModel}
              fabric={selectedFabric}
              showDimensions={showDimensions}
              isPlaced={isPlaced}
              category={productCategory}
              testID="ar-futon-overlay"
            />
          </View>

          {/* Dynamic shadow under furniture based on lighting */}
          {hasPlacement && (
            <View
              style={[
                styles.furnitureShadow,
                {
                  shadowColor: shadowParams.color,
                  shadowOffset: { width: shadowParams.offsetX, height: shadowParams.offsetY },
                  shadowOpacity: shadowParams.opacity,
                  shadowRadius: shadowParams.blur,
                },
              ]}
              testID="ar-furniture-shadow"
            />
          )}

          {/* Watermark */}
          <View style={styles.watermarkContainer} testID="ar-watermark">
            <Text style={styles.watermarkText}>Carolina Futons</Text>
            <Text style={styles.watermarkSubtext}>carolinafutons.com</Text>
          </View>
        </CameraView>
      </ViewShot>

      {/* Bottom controls */}
      <ARControls
        models={futonModels}
        selectedModel={selectedModel}
        selectedFabric={selectedFabric}
        showDimensions={showDimensions}
        onSelectModel={handleSelectModel}
        onSelectFabric={handleSelectFabric}
        onToggleDimensions={handleToggleDimensions}
        onClose={handleClose}
        onAddToCart={handleAddToCart}
        onShare={handleShare}
        onSaveToGallery={handleSaveToGallery}
        onToggleWishlist={currentProduct ? handleToggleWishlist : undefined}
        onBrowseProducts={handleOpenProductPicker}
        isInWishlist={isInWishlist}
        wishlistSaved={wishlistSaved}
        isCapturing={isCapturing}
        testID="ar-controls"
      />

      {/* Product picker overlay */}
      {showProductPicker && (
        <ARProductPicker
          selectedProductId={currentProduct?.id}
          onSelectProduct={handlePickProduct}
          onClose={() => setShowProductPicker(false)}
        />
      )}
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
  touchableArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  hintContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
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
  lightingWarning: {
    position: 'absolute',
    top: 140,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 132, 92, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    zIndex: 10,
  },
  lightingWarningText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  lightingWarningDismiss: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '300',
    marginLeft: 8,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  furnitureShadow: {
    position: 'absolute',
    bottom: '30%',
    left: '15%',
    right: '15%',
    height: 10,
    backgroundColor: 'transparent',
    borderRadius: 100,
    elevation: 8,
  },
  watermarkContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    alignItems: 'flex-end',
    opacity: 0.6,
    zIndex: 5,
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  watermarkSubtext: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginTop: 1,
  },
});

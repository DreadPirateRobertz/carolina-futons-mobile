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
import { CameraView } from 'expo-camera';
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
import { modelIdToProductId, productIdToModelId } from '@/utils';
import { ARFutonOverlay } from '@/components/ARFutonOverlay';
import { ARControls } from '@/components/ARControls';
import { ARProductPicker } from '@/components/ARProductPicker';
import { PlaneIndicator } from '@/components/PlaneIndicator';
import { events } from '@/services/analytics';
import { formatPrice } from '@/utils';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { useSurfaceDetection } from '@/hooks/useSurfaceDetection';
import { useARMeasurement } from '@/hooks/useARMeasurement';
import { ARMeasurementOverlay } from '@/components/ARMeasurementOverlay';
import { ARComparisonOverlay } from '@/components/ARComparisonOverlay';
import { AROnboarding } from '@/components/AROnboarding';
import { ARMaterialSelector } from '@/components/ARMaterialSelector';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { useAROnboarding } from '@/hooks/useAROnboarding';
import { useModelLoader } from '@/hooks/useModelLoader';
import { ModelLoadingOverlay } from '@/components/ModelLoadingOverlay';
import { useStagedItems, type StagedItem } from '@/hooks/useStagedItems';

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
  const cameraPermission = useCameraPermission();
  const arOnboarding = useAROnboarding();

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
  const [compareModel, setCompareModel] = useState<FutonModel | null>(null);
  const [showComparePicker, setShowComparePicker] = useState(false);
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);
  const wishlist = useWishlist();
  const cart = useCart();

  // Multi-product staging for room planning
  const staged = useStagedItems();

  // 3D model download with progress tracking
  const modelLoader = useModelLoader();

  // Trigger model download when selected model changes
  useEffect(() => {
    if (selectedModel) {
      const productId = modelIdToProductId(selectedModel.id);
      if (productId) {
        modelLoader.load(productId);
      }
    }
  }, [selectedModel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // AR measurement tool
  const measurement = useARMeasurement();

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
      events.arModelSelected(model.id, modelIdToProductId(model.id));
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

  /** Handle tap on camera view — routes to measurement or furniture placement */
  const handleCameraPress = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      if (!hasFloor || detectionState !== 'tracking') return;

      const { locationX, locationY } = event.nativeEvent;
      const screenWidth = 390;
      const screenHeight = 844;
      const normalizedX = locationX / screenWidth;
      const normalizedY = locationY / screenHeight;

      const anchor = performHitTest(normalizedX, normalizedY);
      if (!anchor?.isValid) return;

      // If measurement mode is active, route tap to measurement tool
      if (measurement.state === 'placing-first' || measurement.state === 'placing-second') {
        measurement.placePoint(anchor.worldPosition);
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return;
      }

      // Normal furniture placement — adds to staged items for multi-product scenes
      setIsPlaced(true);
      setHasPlacement(true);
      if (selectedModel && selectedFabric) {
        staged.addItem(selectedModel, selectedFabric);
      }
      if (selectedModel) events.arFurniturePlaced(selectedModel.id, anchor.planeId);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasFloor, detectionState, performHitTest, selectedModel?.id, measurement.state, measurement.placePoint],
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

  const handleToggleCompare = useCallback(() => {
    if (compareModel || showComparePicker) {
      setCompareModel(null);
      setShowComparePicker(false);
    } else {
      setShowComparePicker(true);
    }
  }, [compareModel, showComparePicker]);

  const handleSelectCompareModel = useCallback(
    (model: FutonModel) => {
      setCompareModel(model);
      setShowComparePicker(false);
    },
    [],
  );

  /** Toggle material/fabric selector overlay */
  const handleToggleMaterialSelector = useCallback(() => {
    setShowMaterialSelector((prev) => !prev);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  /** Handle fabric selection from the material selector overlay */
  const handleMaterialSelectorFabric = useCallback(
    (fabric: Fabric) => {
      setSelectedFabric(fabric);
      if (selectedModel) {
        events.selectFabric(`prod-${selectedModel.id}`, fabric.id);
        events.arMaterialSwap(selectedModel.id, fabric.id);
      }
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedModel?.id],
  );

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
      const modelId = productIdToModelId(product.id);
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

  // Permission not yet determined — show priming screen
  if (cameraPermission.state === 'undetermined') {
    return (
      <View style={styles.permissionContainer} testID="ar-permission">
        <View style={styles.permissionCard}>
          <Text style={styles.permissionIcon}>{'\u{1F4F7}'}</Text>
          <Text style={styles.permissionTitle}>See Futons in Your Room</Text>
          <Text style={styles.permissionDescription}>
            {cameraPermission.explanation}
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={cameraPermission.request}
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

  // Permission denied — can re-prompt
  if (cameraPermission.state === 'denied') {
    return (
      <View style={styles.permissionContainer} testID="ar-permission">
        <View style={styles.permissionCard}>
          <Text style={styles.permissionIcon}>{'\u{1F4F7}'}</Text>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionDescription}>
            {cameraPermission.explanation}
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={cameraPermission.request}
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

  // Permission permanently denied — direct to Settings
  if (cameraPermission.state === 'denied-permanently') {
    return (
      <View style={styles.permissionContainer} testID="ar-permission-settings">
        <View style={styles.permissionCard}>
          <Text style={styles.permissionIcon}>{'\u{1F6AB}'}</Text>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDescription}>
            Camera permission was denied. To use AR features, please enable camera access in your device settings.
          </Text>
          {cameraPermission.settingsInstructions && (
            <Text style={styles.settingsInstructions}>
              {cameraPermission.settingsInstructions}
            </Text>
          )}
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={cameraPermission.openSettings}
            testID="ar-open-settings"
            accessibilityLabel="Open device settings"
            accessibilityRole="button"
          >
            <Text style={styles.permissionButtonText}>Open Settings</Text>
          </TouchableOpacity>
          {(onClose || navigation) && (
            <TouchableOpacity
              style={styles.permissionDismiss}
              onPress={handleClose}
              testID="ar-permission-dismiss"
            >
              <Text style={styles.permissionDismissText}>Go Back</Text>
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
  const showModelLoading = modelLoader.status.state === 'downloading' || modelLoader.status.state === 'checking-cache';

  return (
    <GestureHandlerRootView style={styles.root} testID={testID ?? 'ar-screen'}>
      {showModelLoading && <ModelLoadingOverlay status={modelLoader.status} />}
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

          {/* Interaction hint — shown after furniture placement */}
          {hasPlacement && (
            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>
                Drag to position · Pinch to resize · Two-finger rotate
              </Text>
            </View>
          )}

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

          {/* AR measurement overlay */}
          <ARMeasurementOverlay
            points={measurement.points}
            state={measurement.state}
            distanceDisplay={measurement.distanceDisplay}
            fits={selectedModel ? measurement.checkFit({
              width: selectedModel.dimensions.width / 39.3701,
              depth: selectedModel.dimensions.depth / 39.3701,
              height: selectedModel.dimensions.height / 39.3701,
            }) : null}
            testID="ar-measurement-overlay"
          />

          {/* AR comparison overlay */}
          {compareModel && selectedModel && (
            <ARComparisonOverlay
              modelA={{
                id: selectedModel.id,
                name: selectedModel.name,
                dimensions: selectedModel.dimensions,
              }}
              modelB={{
                id: compareModel.id,
                name: compareModel.name,
                dimensions: compareModel.dimensions,
              }}
            />
          )}

          {/* Staged items — previously placed furniture in the scene */}
          {staged.items.slice(0, -1).map((item) => (
            <View key={item.id} style={styles.overlayContainer}>
              <ARFutonOverlay
                model={item.model}
                fabric={item.fabric}
                showDimensions={false}
                isPlaced={true}
                testID={`ar-staged-${item.id}`}
              />
            </View>
          ))}

          {/* Active futon overlay — the currently selected piece */}
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

      {/* AR onboarding tutorial — shown on first AR session */}
      {!arOnboarding.isLoading && !arOnboarding.hasSeenAROnboarding && (
        <AROnboarding
          onComplete={arOnboarding.completeAROnboarding}
          onSkip={arOnboarding.completeAROnboarding}
        />
      )}

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
        isComparing={compareModel !== null || showComparePicker}
        onToggleCompare={handleToggleCompare}
        onToggleMaterialSelector={handleToggleMaterialSelector}
        isMeasuring={measurement.state !== 'idle'}
        onToggleMeasure={() => {
          if (measurement.state === 'idle') {
            measurement.activate();
          } else {
            measurement.deactivate();
          }
        }}
        onResetMeasure={measurement.reset}
        testID="ar-controls"
      />

      {/* Multi-product staging controls */}
      {hasPlacement && staged.canAdd && (
        <TouchableOpacity
          style={styles.addAnotherButton}
          onPress={() => {
            // Reset placement for next item, keep staged items visible
            setIsPlaced(false);
            setHasPlacement(false);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          testID="ar-add-another"
          accessibilityLabel={`Add another piece (${staged.items.length} of ${staged.maxItems})`}
          accessibilityRole="button"
        >
          <Text style={styles.addAnotherText}>
            + Add Another ({staged.items.length}/{staged.maxItems})
          </Text>
        </TouchableOpacity>
      )}

      {/* Staged items count badge */}
      {staged.items.length > 1 && (
        <View style={styles.stagedBadge} testID="ar-staged-count">
          <Text style={styles.stagedBadgeText}>{staged.items.length} pieces</Text>
          <TouchableOpacity
            onPress={() => {
              staged.clearAll();
              setIsPlaced(false);
              setHasPlacement(false);
            }}
            testID="ar-clear-scene"
            accessibilityLabel="Clear all placed items"
          >
            <Text style={styles.stagedClearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Compare model picker */}
      {showComparePicker && (
        <View style={styles.comparePickerOverlay} testID="ar-compare-picker">
          <Text style={styles.comparePickerTitle}>Compare with...</Text>
          <View style={styles.comparePickerList}>
            {futonModels
              .filter((m) => m.id !== selectedModel?.id)
              .map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={styles.comparePickerItem}
                  onPress={() => handleSelectCompareModel(model)}
                  testID={`ar-compare-model-${model.id}`}
                >
                  <Text style={styles.comparePickerItemName}>{model.name}</Text>
                  <Text style={styles.comparePickerItemDims}>
                    {model.dimensions.width}" W × {model.dimensions.depth}" D × {model.dimensions.height}" H
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      )}

      {/* Material/fabric selector overlay */}
      {showMaterialSelector && selectedModel && selectedFabric && (
        <ARMaterialSelector
          model={selectedModel}
          selectedFabric={selectedFabric}
          onSelectFabric={handleMaterialSelectorFabric}
          onClose={() => setShowMaterialSelector(false)}
          testID="ar-material-selector"
        />
      )}

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
  settingsInstructions: {
    color: 'rgba(242, 232, 213, 0.5)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
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
  comparePickerOverlay: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 16,
    zIndex: 25,
  },
  comparePickerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  comparePickerList: {
    gap: 8,
  },
  comparePickerItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
  },
  comparePickerItemName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  comparePickerItemDims: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
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
  addAnotherButton: {
    position: 'absolute',
    right: 16,
    bottom: 180,
    backgroundColor: 'rgba(91,143,168,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addAnotherText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  stagedBadge: {
    position: 'absolute',
    left: 16,
    bottom: 180,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stagedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  stagedClearText: {
    color: '#E8845C',
    fontSize: 12,
    fontWeight: '600',
  },
});

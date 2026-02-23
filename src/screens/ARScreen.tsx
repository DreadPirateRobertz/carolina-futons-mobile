import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Alert, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { FUTON_MODELS, type FutonModel, type Fabric } from '@/data/futons';
import { PRODUCTS, type Product } from '@/data/products';
import { ARFutonOverlay } from '@/components/ARFutonOverlay';
import { ARControls } from '@/components/ARControls';
import { ARProductPicker } from '@/components/ARProductPicker';
import { events } from '@/services/analytics';
import { formatPrice } from '@/utils';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';

interface Props {
  onClose?: () => void;
  initialModelId?: string;
  route?: { params?: { initialModelId?: string } };
  testID?: string;
}

/**
 * AR Camera Overlay screen.
 * Shows the device camera with a futon model overlaid in the scene.
 * User can drag/pinch/rotate the futon, swap fabrics, view dimensions.
 * Supports screenshot capture, sharing, saving to gallery, and wishlist.
 */
export function ARScreen({ onClose, initialModelId, route, testID }: Props) {
  const navigation = useNavigation();
  // Support both direct props and route params from React Navigation
  const modelId = initialModelId ?? route?.params?.initialModelId;
  const [permission, requestPermission] = useCameraPermissions();

  const [selectedModel, setSelectedModel] = useState<FutonModel>(
    FUTON_MODELS.find((m) => m.id === modelId) ?? FUTON_MODELS[0],
  );
  const [selectedFabric, setSelectedFabric] = useState<Fabric>(selectedModel.fabrics[0]);
  const [showDimensions, setShowDimensions] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [wishlistSaved, setWishlistSaved] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);
  const wishlist = useWishlist();
  const cart = useCart();

  // Map current futon model to its product for wishlist
  const currentProduct = PRODUCTS.find((p) => p.id === `prod-${selectedModel.id}`) ?? null;
  const isInWishlist = currentProduct ? wishlist.isInWishlist(currentProduct.id) : false;

  const handleSelectModel = useCallback(
    (model: FutonModel) => {
      setSelectedModel(model);
      if (!model.fabrics.find((f) => f.id === selectedFabric.id)) {
        setSelectedFabric(model.fabrics[0]);
      }
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
      events.selectFabric(`prod-${selectedModel.id}`, fabric.id);
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    [selectedModel.id],
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
    cart.addItem(selectedModel, selectedFabric, 1);
    events.arAddToCart(selectedModel.id, selectedFabric.id, selectedModel.basePrice + selectedFabric.price);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [cart, selectedModel, selectedFabric]);

  /** Capture the AR scene (camera + overlay + watermark) as an image URI */
  const captureScene = useCallback(async (): Promise<string | null> => {
    if (!viewShotRef.current) return null;
    try {
      setIsCapturing(true);
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
      });
      events.arScreenshot(selectedModel.id, selectedFabric.id);
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
  }, [selectedModel.id, selectedFabric.id]);

  /** Share the AR screenshot via native share sheet */
  const handleShare = useCallback(async () => {
    const uri = await captureScene();
    if (!uri) return;

    const message = `Check out the ${selectedModel.name} in ${selectedFabric.name} — ${formatPrice(selectedModel.basePrice + selectedFabric.price)}!\n\nViewed in AR with Carolina Futons\ncarolinafutons.com`;

    try {
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your AR view',
        });
      } else {
        await Share.share({ message, url: uri });
      }
      events.arShare(selectedModel.id, selectedFabric.id);
    } catch {
      // User cancelled share — not an error
    }
  }, [captureScene, selectedModel, selectedFabric]);

  /** Save the AR screenshot to device gallery */
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
      events.arSaveToGallery(selectedModel.id, selectedFabric.id);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Saved', 'AR screenshot saved to your photo library.');
    } catch {
      Alert.alert('Save Failed', 'Could not save to your photo library. Please try again.');
    }
  }, [captureScene, selectedModel.id, selectedFabric.id]);

  /** Toggle wishlist for the current futon model */
  const handleToggleWishlist = useCallback(() => {
    if (!currentProduct) return;
    wishlist.toggle(currentProduct);
    const nowInWishlist = !isInWishlist;
    if (nowInWishlist) {
      events.arSaveToWishlist(selectedModel.id, selectedFabric.id);
      setWishlistSaved(true);
      setTimeout(() => setWishlistSaved(false), 2000);
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [currentProduct, wishlist, isInWishlist, selectedModel.id, selectedFabric.id]);

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
      // Find the matching FutonModel for the overlay
      const modelId = product.id.replace(/^prod-/, '');
      const futonModel = FUTON_MODELS.find((m) => m.id === modelId);
      if (futonModel) {
        setSelectedModel(futonModel);
        // Keep fabric if available on new model, else reset
        if (!futonModel.fabrics.find((f) => f.id === selectedFabric.id)) {
          setSelectedFabric(futonModel.fabrics[0]);
        }
      }
      events.arModelSelected(modelId, product.id);
      setShowProductPicker(false);
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    [selectedFabric],
  );

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

  // Camera granted — show AR view
  return (
    <GestureHandlerRootView style={styles.root} testID={testID ?? 'ar-screen'}>
      {/* Capturable area: camera feed + overlay + watermark */}
      <ViewShot ref={viewShotRef} style={styles.camera} options={{ format: 'png', quality: 1 }}>
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

          {/* Watermark — visible in captures */}
          <View style={styles.watermarkContainer} testID="ar-watermark">
            <Text style={styles.watermarkText}>Carolina Futons</Text>
            <Text style={styles.watermarkSubtext}>carolinafutons.com</Text>
          </View>
        </CameraView>
      </ViewShot>

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
  watermarkContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    alignItems: 'flex-end',
    opacity: 0.6,
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

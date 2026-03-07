/**
 * AR Viewer launcher — opens Quick Look (iOS) or Scene Viewer (Android).
 *
 * Phase 1: Uses platform native AR viewers via Linking.openURL().
 * No native code or extra dependencies required.
 *
 * URLs are resolved from the 3D model catalog (models3d.ts) which is kept
 * in sync with the asset pipeline via sync-catalog.ts.
 */
import { Alert, Linking, Platform } from 'react-native';

import { getModel3DForProduct, MODEL_CDN_BASE } from '@/data/models3d';
import { type FutonModelId, modelIdToProductId } from '@/data/productId';

export interface ARModelAssets {
  usdzUrl: string; // iOS Quick Look
  glbUrl: string; // Android Scene Viewer
}

export interface WebModelViewParams {
  glbUrl: string;
  usdzUrl: string;
  modelId: string;
  modelName: string;
}

export interface OpenARViewerOptions {
  onWebModelView?: (params: WebModelViewParams) => void;
}

/**
 * Resolve AR asset URLs for a model ID (slug without `prod-` prefix).
 * Looks up the 3D model catalog first for pipeline-generated URLs;
 * falls back to CDN convention if the product isn't in the catalog.
 */
export function getARModelAssets(modelId: FutonModelId): ARModelAssets {
  const pid = modelIdToProductId(modelId);
  const asset = getModel3DForProduct(pid);
  if (asset) {
    return { usdzUrl: asset.usdzUrl, glbUrl: asset.glbUrl };
  }
  // Fallback for models not yet in the pipeline catalog
  return {
    usdzUrl: `${MODEL_CDN_BASE}/usdz/${modelId}.usdz`,
    glbUrl: `${MODEL_CDN_BASE}/glb/${modelId}.glb`,
  };
}

/**
 * Build the Scene Viewer intent URL for Android.
 * @see https://developers.google.com/ar/develop/scene-viewer
 */
export function buildSceneViewerUrl(glbUrl: string, title: string): string {
  const params = new URLSearchParams({
    file: glbUrl,
    mode: 'ar_preferred',
    title,
  });
  return `https://arvr.google.com/scene-viewer/1.0?${params.toString()}`;
}

/**
 * Opens the AR viewer for a given product.
 *
 * - iOS: Opens .usdz URL which triggers Apple Quick Look AR natively
 * - Android: Opens Scene Viewer intent with .glb model
 */
export async function openARViewer(
  modelId: FutonModelId,
  modelName: string,
  options?: OpenARViewerOptions,
): Promise<void> {
  const assets = getARModelAssets(modelId);

  if (Platform.OS === 'ios') {
    const url = assets.usdzUrl;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'AR Not Available',
        'Your device does not support AR viewing. Please try on a device with iOS 12 or later.',
      );
    }
  } else if (Platform.OS === 'android') {
    const url = buildSceneViewerUrl(assets.glbUrl, modelName);
    const intentUrl =
      `intent://arvr.google.com/scene-viewer/1.0?` +
      `file=${encodeURIComponent(assets.glbUrl)}` +
      `&mode=ar_preferred` +
      `&title=${encodeURIComponent(modelName)}` +
      `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;end;`;
    try {
      await Linking.openURL(intentUrl);
    } catch {
      // Fallback to web Scene Viewer if intent fails
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'AR Not Available',
          'Your device does not support AR viewing. Please install Google Play Services for AR.',
        );
      }
    }
  } else {
    if (options?.onWebModelView) {
      options.onWebModelView({
        glbUrl: assets.glbUrl,
        usdzUrl: assets.usdzUrl,
        modelId,
        modelName,
      });
    } else {
      Alert.alert('AR Not Available', 'AR viewing is only available on mobile devices.');
    }
  }
}

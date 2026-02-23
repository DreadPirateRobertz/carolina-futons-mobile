/**
 * AR Viewer launcher — opens Quick Look (iOS) or Scene Viewer (Android).
 *
 * Phase 1: Uses platform native AR viewers via Linking.openURL().
 * No native code or extra dependencies required.
 */
import { Alert, Linking, Platform } from 'react-native';

const AR_ASSET_BASE_URL = 'https://assets.carolinafutons.com/ar-models';

/**
 * Maps a futon model ID to AR asset URLs.
 * In production, these would come from the CMS/CDN.
 */
export interface ARModelAssets {
  usdzUrl: string; // iOS Quick Look
  glbUrl: string; // Android Scene Viewer
}

export function getARModelAssets(modelId: string): ARModelAssets {
  return {
    usdzUrl: `${AR_ASSET_BASE_URL}/${modelId}.usdz`,
    glbUrl: `${AR_ASSET_BASE_URL}/${modelId}.glb`,
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
export async function openARViewer(modelId: string, modelName: string): Promise<void> {
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
    Alert.alert('AR Not Available', 'AR viewing is only available on mobile devices.');
  }
}

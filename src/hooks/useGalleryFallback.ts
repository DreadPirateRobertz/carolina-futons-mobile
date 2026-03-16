/**
 * @module useGalleryFallback
 *
 * Provides a gallery image picker as a fallback when the camera is unavailable
 * (permission denied, simulator, no camera hardware). Users can pick a room
 * photo and the AR overlay renders on top of it.
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Device from 'expo-device';

export interface UseGalleryFallbackReturn {
  imageUri: string | null;
  isGalleryMode: boolean;
  cameraUnavailable: boolean;
  pickImage: () => Promise<void>;
  clearImage: () => void;
}

export function useGalleryFallback(): UseGalleryFallbackReturn {
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      // Picker failed or permission denied — stay in current state
    }
  }, []);

  const clearImage = useCallback(() => {
    setImageUri(null);
  }, []);

  return {
    imageUri,
    isGalleryMode: imageUri !== null,
    cameraUnavailable: !Device.isDevice,
    pickImage,
    clearImage,
  };
}

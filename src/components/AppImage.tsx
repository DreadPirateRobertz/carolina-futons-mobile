/**
 * @module AppImage
 *
 * Unified image wrapper providing caching, blurhash placeholder,
 * skeleton shimmer, retry-on-error, and progressive fade-in.
 *
 * Built on expo-image for native performance. Retry logic uses a
 * recyclingKey to force re-fetch without unmounting the component tree.
 *
 * cm-48e
 */

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { ImageContentFit, ImageSource } from 'expo-image';
import { SkeletonRow } from './Skeleton';

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_TRANSITION_MS = 200;

export interface AppImageProps {
  /** Image URI or static asset. */
  source: ImageSource | { uri: string };
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /**
   * Blurhash string shown as placeholder while the image loads.
   * When provided, expo-image renders the hash natively and the
   * skeleton shimmer is suppressed (expo-image already handles it).
   */
  placeholder?: string;
  /** expo-image cache strategy. Defaults to 'memory-disk'. */
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
  /** Number of retry attempts before calling onError. Defaults to 3. */
  maxRetries?: number;
  /** Milliseconds to wait between retry attempts. Defaults to 1000. */
  retryDelayMs?: number;
  /** Fade-in transition duration in ms. Defaults to 200. */
  transition?: number;
  /** Called when image finishes loading successfully. */
  onLoad?: () => void;
  /** Called after all retries are exhausted. */
  onError?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

type LoadState = 'loading' | 'loaded' | 'error';

export function AppImage({
  source,
  style,
  contentFit = 'cover',
  placeholder,
  cachePolicy = 'memory-disk',
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  transition = DEFAULT_TRANSITION_MS,
  onLoad,
  onError,
  testID,
  accessibilityLabel,
}: AppImageProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [recyclingKey, setRecyclingKey] = useState(0);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLoad = useCallback(() => {
    retryCountRef.current = 0;
    setLoadState('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => {
        setRecyclingKey((k) => k + 1);
      }, retryDelayMs);
    } else {
      setLoadState('error');
      onError?.();
    }
  }, [maxRetries, retryDelayMs, onError]);

  const showSkeleton = loadState === 'loading' && placeholder == null;
  const showError = loadState === 'error';

  return (
    <View style={[styles.container, style]}>
      {showSkeleton && (
        <SkeletonRow
          testID={`${testID ?? 'app-image'}-skeleton`}
          style={StyleSheet.absoluteFill}
          height={undefined}
          borderRadius={0}
        />
      )}

      {!showError && (
        <Image
          testID={testID}
          source={source}
          style={styles.image}
          contentFit={contentFit}
          placeholder={placeholder != null ? { blurhash: placeholder } : undefined}
          cachePolicy={cachePolicy}
          transition={transition}
          recyclingKey={String(recyclingKey)}
          onLoad={handleLoad}
          onError={handleError}
          accessibilityLabel={accessibilityLabel}
        />
      )}

      {showError && (
        <View
          testID={`${testID ?? 'app-image'}-error`}
          style={[StyleSheet.absoluteFill, styles.errorContainer]}
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel ?? 'Image unavailable'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    backgroundColor: '#F0EDE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

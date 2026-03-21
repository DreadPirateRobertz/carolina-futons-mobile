import React, { memo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface Props {
  videoUri: string;
  testID?: string;
}

/** Muted autoplay looping video preview for product cards. Falls back to nothing (image shows through) on error. */
export const ProductCardVideo = memo(function ProductCardVideo({ videoUri, testID }: Props) {
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  return (
    <Video
      testID={testID}
      source={{ uri: videoUri }}
      style={styles.video}
      resizeMode={ResizeMode.COVER}
      shouldPlay
      isLooping
      isMuted
      useNativeControls={false}
      onError={() => setErrored(true)}
    />
  );
});

const styles = StyleSheet.create({
  video: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
});

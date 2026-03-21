import React from 'react';
import { StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface Props {
  videoUri: string;
  testID?: string;
}

/** Muted autoplay looping video preview for product cards. */
export function ProductCardVideo({ videoUri, testID }: Props) {
  return (
    <Video
      testID={testID}
      source={{ uri: videoUri }}
      style={StyleSheet.absoluteFill}
      resizeMode={ResizeMode.COVER}
      shouldPlay
      isLooping
      isMuted
      useNativeControls={false}
    />
  );
}

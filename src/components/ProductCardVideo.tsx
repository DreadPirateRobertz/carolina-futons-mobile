import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface Props {
  videoUri: string;
  testID?: string;
}

/** Muted autoplay looping video preview for product cards. Falls back to nothing (image shows through) on error. */
export const ProductCardVideo = memo(function ProductCardVideo({ videoUri, testID }: Props) {
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      testID={testID}
      player={player}
      style={styles.video}
      contentFit="cover"
      nativeControls={false}
    />
  );
});

const styles = StyleSheet.create({
  video: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
});

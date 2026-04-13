/**
 * @module RealRoomPhotoCard
 *
 * Displays a single real-room photo with shop-this-room hotspot buttons
 * and attribution — cm-xnq.
 *
 * Hotspot buttons are positioned absolutely using normalized [0,1] coordinates
 * (x, y, width, height) relative to the image container dimensions.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import type { RealRoomPhoto } from '@/hooks/useRealRoomPhotos';

export interface RealRoomPhotoCardProps {
  photo: RealRoomPhoto;
  onPress: (photoId: string) => void;
  onHotspotPress: (productId: string) => void;
}

const BLURHASH = 'LKO2:N%2Tw=w]~RBVZRi};RPxuwH';

export function RealRoomPhotoCard({ photo, onPress, onHotspotPress }: RealRoomPhotoCardProps) {
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setImgSize({ width, height });
  }, []);

  const handlePress = useCallback(() => onPress(photo.id), [photo.id, onPress]);

  const location = `${photo.city}, ${photo.state}`;
  const imgAltText = photo.altText ?? location;

  return (
    <TouchableOpacity
      testID={`real-room-photo-card-${photo.id}`}
      style={styles.card}
      onPress={handlePress}
      accessibilityLabel={`Room photo from ${photo.city}, ${photo.state}${photo.caption ? ` — ${photo.caption}` : ''}`}
      accessibilityRole="button"
    >
      {/* Image + hotspots */}
      <View style={styles.imageContainer} onLayout={handleLayout}>
        <Image
          testID={`real-room-photo-image-${photo.id}`}
          source={{ uri: photo.imageUrl }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={{ blurhash: BLURHASH }}
          accessibilityLabel={imgAltText}
        />

        {/* Shop-this-room hotspot buttons */}
        {photo.tags.map((tag) => (
          <TouchableOpacity
            key={tag.productId}
            testID={`hotspot-${tag.productId}`}
            style={[
              styles.hotspot,
              imgSize.width > 0 && {
                left: tag.x * imgSize.width,
                top: tag.y * imgSize.height,
                width: tag.width * imgSize.width,
                height: tag.height * imgSize.height,
              },
            ]}
            onPress={() => {
              onHotspotPress(tag.productId);
            }}
            accessibilityLabel={`Shop ${tag.productName}`}
            accessibilityRole="button"
          />
        ))}
      </View>

      {/* Attribution strip */}
      <View style={styles.footer}>
        <Text
          testID={`real-room-photo-location-${photo.id}`}
          style={styles.location}
          numberOfLines={1}
        >
          {location}
        </Text>
        {photo.caption != null && (
          <Text
            testID={`real-room-photo-caption-${photo.id}`}
            style={styles.caption}
            numberOfLines={2}
          >
            {photo.caption}
          </Text>
        )}
        {photo.memberName != null && (
          <Text
            testID={`real-room-photo-member-${photo.id}`}
            style={styles.member}
            numberOfLines={1}
          >
            — {photo.memberName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 220,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hotspot: {
    position: 'absolute',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E8845C',
    backgroundColor: 'rgba(232, 132, 92, 0.15)',
  },
  footer: {
    padding: 12,
    gap: 4,
  },
  location: {
    fontSize: 12,
    color: '#6B4C30',
    fontWeight: '600',
  },
  caption: {
    fontSize: 14,
    color: '#2C1A0E',
    lineHeight: 20,
  },
  member: {
    fontSize: 12,
    color: '#9A7A5A',
    fontStyle: 'italic',
  },
});

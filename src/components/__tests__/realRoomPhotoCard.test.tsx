/**
 * Tests for RealRoomPhotoCard component — cm-xnq.
 *
 * Covers:
 *  - Renders the photo image with correct URI
 *  - Shows city + state location
 *  - Shows caption when present
 *  - Shows memberName when present
 *  - Omits caption when not provided
 *  - Omits memberName when not provided
 *  - Renders shop-this-room hotspot buttons for each tag
 *  - Hotspot press calls onHotspotPress with productId
 *  - No hotspots rendered when tags is empty
 *  - Card press calls onPress
 *  - Accessibility label includes city, state
 *  - Uses altText for image accessibility when provided
 *
 * cm-xnq: RealRoomPhotos display on RoomGalleryScreen.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RealRoomPhotoCard } from '../RealRoomPhotoCard';
import type { RealRoomPhoto } from '@/hooks/useRealRoomPhotos';

const PHOTO_FULL: RealRoomPhoto = {
  id: 'photo-001',
  imageUrl: 'https://cdn.example.com/room1.jpg',
  city: 'Asheville',
  state: 'NC',
  caption: 'My cozy living room',
  memberName: 'Jane D.',
  altText: 'Living room with Summit Futon',
  createdAt: '2026-03-15T10:00:00.000Z',
  tags: [
    { productId: 'prod-1', productName: 'Summit Futon', x: 0.3, y: 0.4, width: 0.15, height: 0.2 },
    { productId: 'prod-2', productName: 'Valley Sofa', x: 0.7, y: 0.6, width: 0.12, height: 0.18 },
  ],
};

const PHOTO_MINIMAL: RealRoomPhoto = {
  id: 'photo-002',
  imageUrl: 'https://cdn.example.com/room2.jpg',
  city: 'Charlotte',
  state: 'NC',
  createdAt: '2026-03-10T08:00:00.000Z',
  tags: [],
};

function renderCard(
  photo: RealRoomPhoto = PHOTO_FULL,
  overrides: Partial<React.ComponentProps<typeof RealRoomPhotoCard>> = {},
) {
  const onPress = jest.fn();
  const onHotspotPress = jest.fn();
  const result = render(
    <RealRoomPhotoCard
      photo={photo}
      onPress={onPress}
      onHotspotPress={onHotspotPress}
      {...overrides}
    />,
  );
  return { ...result, onPress, onHotspotPress };
}

describe('RealRoomPhotoCard', () => {
  it('renders the card', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('real-room-photo-card-photo-001')).toBeTruthy();
  });

  it('renders the photo image', () => {
    const { getByTestId } = renderCard();
    const img = getByTestId('real-room-photo-image-photo-001');
    expect(img.props.source?.uri ?? img.props.source).toBeTruthy();
  });

  it('shows city and state', () => {
    const { getByTestId } = renderCard();
    const location = getByTestId('real-room-photo-location-photo-001');
    expect(location.props.children ?? location.props.accessibilityLabel).toBeTruthy();
    // Text content contains city and state
    const text = JSON.stringify(location.props);
    expect(text).toContain('Asheville');
    expect(text).toContain('NC');
  });

  it('shows caption when provided', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('real-room-photo-caption-photo-001')).toBeTruthy();
  });

  it('caption text matches photo caption', () => {
    const { getByTestId } = renderCard();
    const el = getByTestId('real-room-photo-caption-photo-001');
    expect(JSON.stringify(el.props)).toContain('My cozy living room');
  });

  it('shows memberName when provided', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('real-room-photo-member-photo-001')).toBeTruthy();
  });

  it('omits caption element when caption not provided', () => {
    const { queryByTestId } = renderCard(PHOTO_MINIMAL);
    expect(queryByTestId('real-room-photo-caption-photo-002')).toBeNull();
  });

  it('omits memberName element when not provided', () => {
    const { queryByTestId } = renderCard(PHOTO_MINIMAL);
    expect(queryByTestId('real-room-photo-member-photo-002')).toBeNull();
  });

  it('renders a hotspot button for each tag', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('hotspot-prod-1')).toBeTruthy();
    expect(getByTestId('hotspot-prod-2')).toBeTruthy();
  });

  it('pressing a hotspot calls onHotspotPress with productId', () => {
    const { getByTestId, onHotspotPress } = renderCard();
    fireEvent.press(getByTestId('hotspot-prod-1'));
    expect(onHotspotPress).toHaveBeenCalledWith('prod-1');
  });

  it('does not render hotspot buttons when tags is empty', () => {
    const { queryByTestId } = renderCard(PHOTO_MINIMAL);
    expect(queryByTestId('hotspot-prod-1')).toBeNull();
  });

  it('pressing the card calls onPress with photo id', () => {
    const { getByTestId, onPress } = renderCard();
    fireEvent.press(getByTestId('real-room-photo-card-photo-001'));
    expect(onPress).toHaveBeenCalledWith('photo-001');
  });

  it('card has accessibility label including city and state', () => {
    const { getByTestId } = renderCard();
    const card = getByTestId('real-room-photo-card-photo-001');
    const label = card.props.accessibilityLabel ?? '';
    expect(label).toContain('Asheville');
    expect(label).toContain('NC');
  });

  it('uses altText for image accessibility label when provided', () => {
    const { getByTestId } = renderCard();
    const img = getByTestId('real-room-photo-image-photo-001');
    expect(img.props.accessibilityLabel).toBe('Living room with Summit Futon');
  });

  it('falls back to city+state for image accessibility when no altText', () => {
    const { getByTestId } = renderCard(PHOTO_MINIMAL);
    const img = getByTestId('real-room-photo-image-photo-002');
    const label = img.props.accessibilityLabel ?? '';
    expect(label).toContain('Charlotte');
  });
});

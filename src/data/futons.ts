/**
 * Futon product catalog for AR overlay feature.
 * Dimensions in inches (real-world), used for dimension overlay labels.
 */
import { type FutonModelId, futonModelId } from './productId';

export interface Fabric {
  id: string;
  name: string;
  color: string;
  secondaryColor?: string;
  price: number;
}

export interface FutonModel {
  id: FutonModelId;
  name: string;
  tagline: string;
  dimensions: {
    width: number; // inches (sofa position)
    depth: number; // inches (sofa position)
    height: number; // inches (back height, sofa position)
    seatHeight: number; // inches
  };
  basePrice: number;
  fabrics: Fabric[];
}

export const FABRICS: Fabric[] = [
  { id: 'natural-linen', name: 'Natural Linen', color: '#D4C5A9', price: 0 },
  { id: 'slate-gray', name: 'Slate Gray', color: '#6B7B8D', price: 0 },
  { id: 'mountain-blue', name: 'Mountain Blue', color: '#5B8FA8', price: 29 },
  { id: 'sunset-coral', name: 'Sunset Coral', color: '#E8845C', price: 29 },
  { id: 'forest-green', name: 'Forest Green', color: '#4A7C59', price: 29 },
  { id: 'espresso-brown', name: 'Espresso Brown', color: '#5C4033', price: 49 },
  { id: 'mauve-blush', name: 'Mauve Blush', color: '#C9A0A0', price: 49 },
  { id: 'charcoal', name: 'Charcoal', color: '#3D3D3D', price: 49 },
];

export const FUTON_MODELS: FutonModel[] = [
  {
    id: futonModelId('asheville-full'),
    name: 'The Asheville',
    tagline: 'Our bestselling full-size futon',
    dimensions: { width: 54, depth: 34, height: 33, seatHeight: 18 },
    basePrice: 349,
    fabrics: FABRICS,
  },
  {
    id: futonModelId('blue-ridge-queen'),
    name: 'The Blue Ridge',
    tagline: 'Queen-size luxury comfort',
    dimensions: { width: 60, depth: 36, height: 35, seatHeight: 19 },
    basePrice: 449,
    fabrics: FABRICS,
  },
  {
    id: futonModelId('pisgah-twin'),
    name: 'The Pisgah',
    tagline: 'Perfect for smaller spaces',
    dimensions: { width: 39, depth: 32, height: 31, seatHeight: 17 },
    basePrice: 279,
    fabrics: FABRICS,
  },
  {
    id: futonModelId('biltmore-loveseat'),
    name: 'The Biltmore',
    tagline: 'Compact loveseat futon',
    dimensions: { width: 48, depth: 33, height: 32, seatHeight: 18 },
    basePrice: 319,
    fabrics: FABRICS,
  },
];

// Utility function moved to @/utils/dimensions — re-exported for backward compatibility
export { inchesToFeetDisplay } from '@/utils/dimensions';

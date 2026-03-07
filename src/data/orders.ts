/**
 * Order data model and mock data for order history/tracking.
 * Real API integration will replace MOCK_ORDERS later.
 */
import { type FutonModelId, futonModelId } from './productId';

export type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderLineItem {
  id: string;
  modelId: FutonModelId;
  modelName: string;
  fabricId: string;
  fabricName: string;
  fabricColor: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface TrackingInfo {
  carrier: string;
  trackingNumber: string;
  url: string;
  estimatedDelivery?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string; // ISO date
  updatedAt: string;
  items: OrderLineItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: ShippingAddress;
  paymentMethod: string; // masked, e.g. "Visa ····4242"
  tracking?: TrackingInfo;
}

/** Status display config */
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; colorToken: 'success' | 'mountainBlue' | 'sunsetCoral' | 'muted' }
> = {
  processing: { label: 'Processing', colorToken: 'mountainBlue' },
  shipped: { label: 'Shipped', colorToken: 'sunsetCoral' },
  delivered: { label: 'Delivered', colorToken: 'success' },
  cancelled: { label: 'Cancelled', colorToken: 'muted' },
};

/** Carrier tracking URL builders */
export function getTrackingUrl(carrier: string, trackingNumber: string): string {
  switch (carrier.toLowerCase()) {
    case 'ups':
      return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    case 'fedex':
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    case 'usps':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    default:
      return '';
  }
}

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-001',
    orderNumber: 'CF-2026-0147',
    status: 'delivered',
    createdAt: '2026-02-10T14:30:00Z',
    updatedAt: '2026-02-15T09:00:00Z',
    items: [
      {
        id: 'li-001',
        modelId: futonModelId('asheville-full'),
        modelName: 'The Asheville',
        fabricId: 'mountain-blue',
        fabricName: 'Mountain Blue',
        fabricColor: '#5B8FA8',
        quantity: 1,
        unitPrice: 378,
        lineTotal: 378,
      },
    ],
    subtotal: 378,
    shipping: 0,
    tax: 26.46,
    total: 404.46,
    shippingAddress: {
      name: 'Jane Smith',
      street: '123 Blue Ridge Pkwy',
      city: 'Hendersonville',
      state: 'NC',
      zip: '28792',
    },
    paymentMethod: 'Visa ····4242',
    tracking: {
      carrier: 'UPS',
      trackingNumber: '1Z999AA10123456784',
      url: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
      estimatedDelivery: '2026-02-15',
    },
  },
  {
    id: 'ord-002',
    orderNumber: 'CF-2026-0163',
    status: 'shipped',
    createdAt: '2026-02-18T10:15:00Z',
    updatedAt: '2026-02-19T16:45:00Z',
    items: [
      {
        id: 'li-002',
        modelId: futonModelId('blue-ridge-queen'),
        modelName: 'The Blue Ridge',
        fabricId: 'espresso-brown',
        fabricName: 'Espresso Brown',
        fabricColor: '#5C4033',
        quantity: 1,
        unitPrice: 498,
        lineTotal: 498,
      },
      {
        id: 'li-003',
        modelId: futonModelId('pisgah-twin'),
        modelName: 'The Pisgah',
        fabricId: 'natural-linen',
        fabricName: 'Natural Linen',
        fabricColor: '#D4C5A9',
        quantity: 2,
        unitPrice: 279,
        lineTotal: 558,
      },
    ],
    subtotal: 1056,
    shipping: 0,
    tax: 73.92,
    total: 1129.92,
    shippingAddress: {
      name: 'John Doe',
      street: '456 Mountain View Dr',
      city: 'Asheville',
      state: 'NC',
      zip: '28801',
    },
    paymentMethod: 'Affirm (4 payments)',
    tracking: {
      carrier: 'FedEx',
      trackingNumber: '794644790200',
      url: 'https://www.fedex.com/fedextrack/?trknbr=794644790200',
      estimatedDelivery: '2026-02-22',
    },
  },
  {
    id: 'ord-003',
    orderNumber: 'CF-2026-0171',
    status: 'processing',
    createdAt: '2026-02-20T08:00:00Z',
    updatedAt: '2026-02-20T08:00:00Z',
    items: [
      {
        id: 'li-004',
        modelId: futonModelId('biltmore-loveseat'),
        modelName: 'The Biltmore',
        fabricId: 'sunset-coral',
        fabricName: 'Sunset Coral',
        fabricColor: '#E8845C',
        quantity: 1,
        unitPrice: 348,
        lineTotal: 348,
      },
    ],
    subtotal: 348,
    shipping: 49,
    tax: 24.36,
    total: 421.36,
    shippingAddress: {
      name: 'Jane Smith',
      street: '123 Blue Ridge Pkwy',
      city: 'Hendersonville',
      state: 'NC',
      zip: '28792',
    },
    paymentMethod: 'Apple Pay',
  },
  {
    id: 'ord-004',
    orderNumber: 'CF-2026-0089',
    status: 'cancelled',
    createdAt: '2026-01-28T12:00:00Z',
    updatedAt: '2026-01-29T09:30:00Z',
    items: [
      {
        id: 'li-005',
        modelId: futonModelId('asheville-full'),
        modelName: 'The Asheville',
        fabricId: 'charcoal',
        fabricName: 'Charcoal',
        fabricColor: '#3D3D3D',
        quantity: 1,
        unitPrice: 398,
        lineTotal: 398,
      },
    ],
    subtotal: 398,
    shipping: 0,
    tax: 27.86,
    total: 425.86,
    shippingAddress: {
      name: 'Jane Smith',
      street: '123 Blue Ridge Pkwy',
      city: 'Hendersonville',
      state: 'NC',
      zip: '28792',
    },
    paymentMethod: 'Visa ····4242',
  },
];

/**
 * Store/showroom location data and types.
 * Mock data now; designed for Wix CMS API integration later.
 */

export interface StoreHours {
  day: string;
  open: string;
  close: string;
  closed?: boolean;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  hours: StoreHours[];
  photos: string[];
  features: string[];
  description: string;
}

export type AppointmentType = 'consultation' | 'measurement' | 'pickup';

export interface AppointmentSlot {
  date: string;
  time: string;
  type: AppointmentType;
}

export const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: 'consultation', label: 'Design Consultation' },
  { value: 'measurement', label: 'Room Measurement' },
  { value: 'pickup', label: 'Order Pickup' },
];

/**
 * Check if a store is currently open based on its hours.
 * Uses a fixed day/time for deterministic mock behavior.
 */
export function isStoreOpen(store: Store, now?: Date): boolean {
  const date = now ?? new Date();
  const dayIndex = date.getDay();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = store.hours.find((h) => h.day === days[dayIndex]);
  if (!today || today.closed) return false;

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const [openH, openM] = today.open.split(':').map(Number);
  const [closeH, closeM] = today.close.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in miles.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/** Format phone number for display: (828) 555-0100 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

const WEEKDAY_HOURS: StoreHours[] = [
  { day: 'Monday', open: '10:00', close: '18:00' },
  { day: 'Tuesday', open: '10:00', close: '18:00' },
  { day: 'Wednesday', open: '10:00', close: '18:00' },
  { day: 'Thursday', open: '10:00', close: '20:00' },
  { day: 'Friday', open: '10:00', close: '20:00' },
  { day: 'Saturday', open: '09:00', close: '18:00' },
  { day: 'Sunday', open: '12:00', close: '17:00' },
];

/**
 * Mock store catalog. In production, fetched from Wix CMS API.
 */
export const STORES: Store[] = [
  {
    id: 'store-asheville',
    name: 'Carolina Futons — Asheville',
    address: '142 Biltmore Ave',
    city: 'Asheville',
    state: 'NC',
    zip: '28801',
    phone: '8285550100',
    email: 'asheville@carolinafutons.com',
    latitude: 35.5946,
    longitude: -82.554,
    hours: WEEKDAY_HOURS,
    photos: [
      'https://placeholder.co/600x400/D4C5A9/3A2518?text=Asheville+Showroom',
      'https://placeholder.co/600x400/D4C5A9/3A2518?text=Asheville+Interior',
    ],
    features: ['Full showroom', 'Design consultation', 'Same-day pickup', 'Free parking'],
    description:
      'Our flagship showroom in downtown Asheville. Try every futon model and browse our full fabric collection. Free design consultations available.',
  },
  {
    id: 'store-charlotte',
    name: 'Carolina Futons — Charlotte',
    address: '3200 Freedom Dr',
    city: 'Charlotte',
    state: 'NC',
    zip: '28208',
    phone: '7045550200',
    email: 'charlotte@carolinafutons.com',
    latitude: 35.2271,
    longitude: -80.8431,
    hours: WEEKDAY_HOURS,
    photos: ['https://placeholder.co/600x400/D4C5A9/3A2518?text=Charlotte+Showroom'],
    features: ['Full showroom', 'Design consultation', 'Delivery available'],
    description:
      'Our Charlotte location features a spacious showroom with every model on display. Convenient access from I-85.',
  },
  {
    id: 'store-raleigh',
    name: 'Carolina Futons — Raleigh',
    address: '510 Glenwood Ave',
    city: 'Raleigh',
    state: 'NC',
    zip: '27603',
    phone: '9195550300',
    email: 'raleigh@carolinafutons.com',
    latitude: 35.7876,
    longitude: -78.6389,
    hours: WEEKDAY_HOURS,
    photos: ['https://placeholder.co/600x400/D4C5A9/3A2518?text=Raleigh+Showroom'],
    features: ['Full showroom', 'Room measurement service', 'Free parking'],
    description:
      'Located in the Glenwood South district. Browse our collection and get expert help finding the perfect futon for your space.',
  },
  {
    id: 'store-greenville',
    name: 'Carolina Futons — Greenville',
    address: '700 S Main St',
    city: 'Greenville',
    state: 'SC',
    zip: '29601',
    phone: '8645550400',
    email: 'greenville@carolinafutons.com',
    latitude: 34.8469,
    longitude: -82.3985,
    hours: [
      { day: 'Monday', open: '10:00', close: '18:00' },
      { day: 'Tuesday', open: '10:00', close: '18:00' },
      { day: 'Wednesday', open: '10:00', close: '18:00' },
      { day: 'Thursday', open: '10:00', close: '18:00' },
      { day: 'Friday', open: '10:00', close: '20:00' },
      { day: 'Saturday', open: '09:00', close: '17:00' },
      { day: 'Sunday', open: '', close: '', closed: true },
    ],
    photos: ['https://placeholder.co/600x400/D4C5A9/3A2518?text=Greenville+Showroom'],
    features: ['Compact showroom', 'Design consultation', 'Order pickup'],
    description:
      'Our newest location on Main Street in downtown Greenville. Compact showroom with select models and full fabric samples.',
  },
];

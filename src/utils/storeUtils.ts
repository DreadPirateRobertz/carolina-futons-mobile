/**
 * @module storeUtils
 *
 * Helpers for the store-locator feature: open/closed status based on
 * today's hours, Haversine distance calculation, and phone formatting.
 */
import type { Store } from '@/data/stores';

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

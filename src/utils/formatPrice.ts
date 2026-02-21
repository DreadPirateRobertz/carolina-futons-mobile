/**
 * Format a number as a USD price string.
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

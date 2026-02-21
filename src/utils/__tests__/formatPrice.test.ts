import { formatPrice } from '@/utils/formatPrice';

describe('formatPrice', () => {
  it('formats a whole number with two decimal places', () => {
    expect(formatPrice(300)).toBe('$300.00');
  });

  it('formats a price with cents', () => {
    expect(formatPrice(299.99)).toBe('$299.99');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('rounds to two decimal places', () => {
    expect(formatPrice(19.999)).toBe('$20.00');
  });

  it('formats a price with one decimal place', () => {
    expect(formatPrice(49.5)).toBe('$49.50');
  });

  it('formats large prices', () => {
    expect(formatPrice(1299.99)).toBe('$1299.99');
  });

  it('formats small prices', () => {
    expect(formatPrice(0.99)).toBe('$0.99');
  });
});

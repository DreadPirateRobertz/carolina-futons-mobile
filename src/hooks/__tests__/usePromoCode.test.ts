import { renderHook, act } from '@testing-library/react-native';
import { usePromoCode } from '../usePromoCode';
import { WixApiError } from '@/services/wix/wixClient';

const mockApplyCoupon = jest.fn();

jest.mock('@/services/wix/wixProvider', () => ({
  useWixClient: () => ({
    applyCoupon: mockApplyCoupon,
  }),
}));

describe('usePromoCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in idle state with no coupon', () => {
    const { result } = renderHook(() => usePromoCode());
    expect(result.current.status).toBe('idle');
    expect(result.current.coupon).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error for empty code', async () => {
    const { result } = renderHook(() => usePromoCode());
    await act(async () => {
      await result.current.applyCode('  ');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Please enter a promo code');
  });

  it('applies a percentage coupon successfully', async () => {
    mockApplyCoupon.mockResolvedValue({
      id: 'c1',
      code: 'SAVE20',
      name: '20% Off',
      discountType: 'percentage',
      discountValue: 20,
    });

    const { result } = renderHook(() => usePromoCode());
    await act(async () => {
      await result.current.applyCode('SAVE20');
    });

    expect(result.current.status).toBe('applied');
    expect(result.current.coupon?.code).toBe('SAVE20');
    expect(result.current.error).toBeNull();
  });

  it('computes percentage discount', async () => {
    mockApplyCoupon.mockResolvedValue({
      id: 'c1',
      code: 'SAVE20',
      name: '20% Off',
      discountType: 'percentage',
      discountValue: 20,
    });

    const { result } = renderHook(() => usePromoCode());
    await act(async () => {
      await result.current.applyCode('SAVE20');
    });

    expect(result.current.getDiscount(100)).toBe(20);
    expect(result.current.getDiscount(349)).toBe(69.8);
  });

  it('computes fixed discount capped at subtotal', async () => {
    mockApplyCoupon.mockResolvedValue({
      id: 'c2',
      code: 'FLAT50',
      name: '$50 Off',
      discountType: 'fixed',
      discountValue: 50,
    });

    const { result } = renderHook(() => usePromoCode());
    await act(async () => {
      await result.current.applyCode('FLAT50');
    });

    expect(result.current.getDiscount(100)).toBe(50);
    expect(result.current.getDiscount(30)).toBe(30); // Capped at subtotal
  });

  it('returns 0 discount when subtotal below minimum', async () => {
    mockApplyCoupon.mockResolvedValue({
      id: 'c3',
      code: 'BIG10',
      name: '10% Off $200+',
      discountType: 'percentage',
      discountValue: 10,
      minimumSubtotal: 200,
    });

    const { result } = renderHook(() => usePromoCode());
    await act(async () => {
      await result.current.applyCode('BIG10');
    });

    expect(result.current.getDiscount(100)).toBe(0);
    expect(result.current.getDiscount(200)).toBe(20);
  });

  it('handles API error with 404', async () => {
    mockApplyCoupon.mockRejectedValue(new WixApiError('Not found', 404));

    const { result } = renderHook(() => usePromoCode());
    await act(async () => {
      await result.current.applyCode('INVALID');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Invalid promo code');
    expect(result.current.coupon).toBeNull();
  });

  it('handles generic API error', async () => {
    mockApplyCoupon.mockRejectedValue(new WixApiError('Server error', 500));

    const { result } = renderHook(() => usePromoCode());
    await act(async () => {
      await result.current.applyCode('BROKEN');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Server error');
  });

  it('removes applied coupon', async () => {
    mockApplyCoupon.mockResolvedValue({
      id: 'c1',
      code: 'SAVE20',
      name: '20% Off',
      discountType: 'percentage',
      discountValue: 20,
    });

    const { result } = renderHook(() => usePromoCode());
    await act(async () => {
      await result.current.applyCode('SAVE20');
    });
    expect(result.current.status).toBe('applied');

    act(() => {
      result.current.removeCode();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.coupon).toBeNull();
    expect(result.current.getDiscount(100)).toBe(0);
  });
});

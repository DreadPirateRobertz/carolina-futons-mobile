import { routeNotificationTap } from '../NotificationRouter';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, reset: jest.fn() };

beforeEach(() => jest.clearAllMocks());

it('routes order_shipped to OrderDetail screen', () => {
  routeNotificationTap({ type: 'order_shipped', orderId: 'ord-123' }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('OrderDetail', { orderId: 'ord-123' });
});

it('routes order_delivered to OrderDetail screen', () => {
  routeNotificationTap({ type: 'order_delivered', orderId: 'ord-456' }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('OrderDetail', { orderId: 'ord-456' });
});

it('routes order_refunded to OrderDetail screen', () => {
  routeNotificationTap({ type: 'order_refunded', orderId: 'ord-789' }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('OrderDetail', { orderId: 'ord-789' });
});

it('routes streak_extended to Challenges screen', () => {
  routeNotificationTap({ type: 'streak_extended' }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('Challenges');
});

it('routes badge_earned to Loyalty screen', () => {
  routeNotificationTap({ type: 'badge_earned' }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('Loyalty');
});

it('routes price_drop to ProductDetail screen', () => {
  routeNotificationTap({ type: 'price_drop', productSlug: 'mesa-5000' }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { slug: 'mesa-5000' });
});

it('routes challenge_started to Challenges screen', () => {
  routeNotificationTap({ type: 'challenge_started' }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('Challenges');
});

it('routes unknown type to Home screen', () => {
  routeNotificationTap({ type: 'unknown_future_type' as never }, mockNavigation as never);
  expect(mockNavigate).toHaveBeenCalledWith('Home');
});

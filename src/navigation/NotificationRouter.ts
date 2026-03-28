export type NotificationPayload =
  | { type: 'order_shipped'; orderId: string }
  | { type: 'order_delivered'; orderId: string }
  | { type: 'order_refunded'; orderId: string }
  | { type: 'challenge_started'; challengeId?: string }
  | { type: 'streak_extended' }
  | { type: 'badge_earned' }
  | { type: 'price_drop'; productSlug: string };

interface NavigationLike {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
}

export function routeNotificationTap(
  payload: NotificationPayload,
  navigation: NavigationLike,
): void {
  switch (payload.type) {
    case 'order_shipped':
    case 'order_delivered':
    case 'order_refunded':
      navigation.navigate('OrderDetail', { orderId: payload.orderId });
      break;
    case 'challenge_started':
    case 'streak_extended':
      navigation.navigate('Challenges');
      break;
    case 'badge_earned':
      navigation.navigate('Loyalty');
      break;
    case 'price_drop':
      navigation.navigate('ProductDetail', { slug: payload.productSlug });
      break;
    default:
      navigation.navigate('Home');
  }
}

/**
 * PostPurchaseReviewBridge — cm-qbt
 *
 * Rendered inside the provider tree (App.tsx). Watches for orders that
 * qualify for an in-app review nudge (3+ days after purchase) and shows
 * the PostPurchaseReviewModal. On "Leave a Review", navigates to the product
 * detail screen. On "Maybe Later", applies a 30-day cooldown.
 */
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { usePostPurchaseInAppPrompt } from '@/hooks/usePostPurchaseInAppPrompt';
import { PostPurchaseReviewModal } from '@/components/PostPurchaseReviewModal';

export function PostPurchaseReviewBridge() {
  const navigation = useNavigation<any>();
  const { pendingOrder, dismiss, markReviewed } = usePostPurchaseInAppPrompt();

  const handleReview = useCallback(async () => {
    if (!pendingOrder) return;
    // Mark reviewed optimistically so the modal closes immediately
    await markReviewed();
    try {
      navigation.navigate('ProductDetail', { productId: pendingOrder.productId });
    } catch {
      // Navigation unavailable (e.g. during tests) — non-critical
    }
  }, [pendingOrder, markReviewed, navigation]);

  const handleLater = useCallback(async () => {
    await dismiss();
  }, [dismiss]);

  return (
    <PostPurchaseReviewModal
      visible={pendingOrder !== null}
      onReview={handleReview}
      onLater={handleLater}
    />
  );
}

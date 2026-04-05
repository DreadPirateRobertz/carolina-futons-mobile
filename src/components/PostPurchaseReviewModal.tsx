/**
 * PostPurchaseReviewModal — cm-qbt
 *
 * In-app prompt shown 3 days after an order is placed, asking the user to
 * leave a product review. Rendered by PostPurchaseReviewBridge.
 */
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  visible: boolean;
  onReview: () => void;
  onLater: () => void;
}

export function PostPurchaseReviewModal({ visible, onReview, onLater }: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      testID="post-purchase-review-modal"
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.card,
              padding: spacing.lg,
            },
            shadows.card,
          ]}
          testID="post-purchase-review-card"
        >
          <Text style={[styles.emoji]} accessibilityRole="text" accessibilityLabel="sofa emoji">
            🛋️
          </Text>

          <Text
            style={[styles.title, { color: colors.espresso }]}
            accessibilityRole="header"
            testID="post-purchase-review-title"
          >
            Enjoying your futon?
          </Text>

          <Text style={[styles.body, { color: colors.espressoLight }]}>
            Share your experience and earn 50 loyalty points!
          </Text>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.sunsetCoral,
                borderRadius: borderRadius.button,
                marginTop: spacing.md,
              },
              shadows.button,
            ]}
            onPress={onReview}
            testID="post-purchase-review-cta"
            accessibilityLabel="Leave a review"
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Leave a Review</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: spacing.sm }]}
            onPress={onLater}
            testID="post-purchase-review-later"
            accessibilityLabel="Maybe later"
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryButtonText, { color: colors.espressoLight }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

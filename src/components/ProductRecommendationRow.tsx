import React from 'react';
import { View } from 'react-native';
import { useProductRecommendations } from '@/hooks/useProductRecommendations';
import { RecommendationCarousel } from './RecommendationCarousel';
import { SkeletonCarouselRow } from './SkeletonCarouselItem';
import { type Product } from '@/data/products';

interface ProductRecommendationRowProps {
  productId: string;
  title?: string;
  onProductPress?: (product: Product) => void;
  testID?: string;
  skeletonTestID?: string;
}

/**
 * Self-contained recommendation rail: wraps useProductRecommendations and renders
 * a horizontal product carousel. Renders a skeleton while loading, nothing when
 * recommendations are empty.
 */
export function ProductRecommendationRow({
  productId,
  title = 'Recommended for You',
  onProductPress,
  testID,
  skeletonTestID,
}: ProductRecommendationRowProps) {
  const { recommendations, isLoading } = useProductRecommendations(productId);

  if (!productId) return null;

  if (isLoading) {
    return <View testID={skeletonTestID ?? 'rec-row-skeleton'}><SkeletonCarouselRow /></View>;
  }

  if (recommendations.length === 0) return null;

  return (
    <View testID={testID}>
      <RecommendationCarousel
        title={title}
        products={recommendations}
        onProductPress={onProductPress}
        testID={testID ? `${testID}-carousel` : 'recommendation-carousel'}
      />
    </View>
  );
}

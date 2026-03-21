/**
 * @module OrderHistoryScreen
 *
 * Chronological list of the user's past and in-progress orders.
 * Each card shows order number, status badge (color-coded), date,
 * item summary, and total. Supports pull-to-refresh and navigates
 * to OrderDetailScreen on tap. Shows an empty state with a CTA
 * when there are no orders yet.
 */
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { darkPalette } from '@/theme/tokens';
import { EmptyState } from '@/components/EmptyState';
import { CategoryIllustration } from '@/components/illustrations/CategoryIllustration';
import { MountainSkyline } from '@/components/MountainSkyline';
import { SkeletonOrderList } from '@/components/SkeletonOrderCard';
import { useOrders, ORDER_STATUS_CONFIG, type Order } from '@/hooks/useOrders';
import {
  MountainRefreshControl,
  MountainRefreshIndicator,
} from '@/components/MountainRefreshControl';
import { formatPrice } from '@/utils';

interface Props {
  orders?: Order[];
  onSelectOrder?: (orderId: string) => void;
  onStartShopping?: () => void;
  testID?: string;
}

/** Scrollable list of past orders with status badges and pull-to-refresh. */
export function OrderHistoryScreen({
  orders: ordersProp,
  onSelectOrder,
  onStartShopping,
  testID,
}: Props) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { orders: hookOrders, isLoading, error: hookError, refresh: hookRefresh } = useOrders();

  // Use prop orders or fall back to hook data (already sorted newest-first)
  const orders = ordersProp
    ? ordersProp
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : hookOrders;

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    hookRefresh();
    setTimeout(() => setRefreshing(false), 800);
  }, [hookRefresh]);

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const renderOrder = useCallback(
    ({ item }: { item: Order }) => {
      const statusConfig = ORDER_STATUS_CONFIG[item.status];
      const statusColor = colors[statusConfig.colorToken];
      const itemSummary =
        item.items.length === 1
          ? item.items[0].modelName
          : `${item.items[0].modelName} + ${item.items.length - 1} more`;

      return (
        <TouchableOpacity
          style={[
            styles.orderCard,
            {
              backgroundColor: darkPalette.surface,
              borderRadius: borderRadius.card,
              marginHorizontal: spacing.lg,
              borderWidth: 1,
              borderColor: darkPalette.borderSubtle,
            },
          ]}
          onPress={() => onSelectOrder?.(item.id)}
          testID={`order-card-${item.id}`}
          accessibilityLabel={`Order ${item.orderNumber}, ${statusConfig.label}, ${formatPrice(item.total)}`}
          accessibilityRole="button"
        >
          <View style={styles.orderHeader}>
            <Text
              style={[
                styles.orderNumber,
                { color: darkPalette.textPrimary, fontFamily: typography.bodyFamilyBold },
              ]}
              testID={`order-number-${item.id}`}
            >
              {item.orderNumber}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor + '20', borderRadius: borderRadius.sm },
              ]}
              testID={`order-status-${item.id}`}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>{statusConfig.label}</Text>
            </View>
          </View>

          <Text
            style={[
              styles.orderDate,
              { color: darkPalette.textMuted, fontFamily: typography.bodyFamily },
            ]}
            testID={`order-date-${item.id}`}
          >
            {formatDate(item.createdAt)}
          </Text>

          <View style={styles.orderFooter}>
            <Text
              style={[
                styles.orderItems,
                { color: darkPalette.textMuted, fontFamily: typography.bodyFamily },
              ]}
              testID={`order-items-${item.id}`}
              numberOfLines={1}
            >
              {itemSummary}
            </Text>
            <Text
              style={[
                styles.orderTotal,
                { color: darkPalette.textPrimary, fontFamily: typography.headingFamily },
              ]}
              testID={`order-total-${item.id}`}
            >
              {formatPrice(item.total)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, spacing, borderRadius, shadows, onSelectOrder, formatDate],
  );

  if (isLoading && !ordersProp) {
    return (
      <View
        style={[styles.root, { backgroundColor: darkPalette.background }]}
        testID={testID ?? 'order-history-screen'}
      >
        <SkeletonOrderList count={5} />
      </View>
    );
  }

  if (hookError && !ordersProp) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: darkPalette.background }]}
        testID={testID ?? 'order-history-screen'}
      >
        <View testID="order-history-error-illustration" style={styles.illustrationContainer}>
          <MountainSkyline variant="sunset" height={100} testID="order-history-error-skyline" />
        </View>
        <Text
          style={[
            styles.errorTitle,
            { color: darkPalette.textPrimary, fontFamily: typography.bodyFamilyBold },
          ]}
          testID="order-history-error"
        >
          Couldn't load your orders
        </Text>
        <Text
          style={[
            styles.errorMessage,
            { color: darkPalette.textMuted, fontFamily: typography.bodyFamily },
          ]}
        >
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.sunsetCoral }]}
          onPress={hookRefresh}
          testID="order-history-retry"
          accessibilityRole="button"
        >
          <Text style={[styles.retryText, { fontFamily: typography.bodyFamilyBold }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: darkPalette.background }]}
      testID={testID ?? 'order-history-screen'}
    >
      <Text
        style={[
          styles.headerTitle,
          {
            color: darkPalette.textPrimary,
            paddingHorizontal: spacing.lg,
            fontFamily: typography.headingFamily,
          },
        ]}
        accessibilityRole="header"
        testID="order-history-header"
      >
        My Orders
      </Text>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<MountainRefreshIndicator refreshing={refreshing} />}
        ListEmptyComponent={
          <EmptyState
            illustration={<CategoryIllustration testID="orders-illustration" />}
            title="No orders yet"
            message="Once you place your first order, it will appear here."
            action={
              onStartShopping ? { label: 'Start Shopping', onPress: onStartShopping } : undefined
            }
            testID="orders-empty-state"
          />
        }
        refreshControl={
          <MountainRefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            testID="order-refresh-control"
          />
        }
        testID="order-list"
        windowSize={5}
        maxToRenderPerBatch={8}
        removeClippedSubviews
        initialNumToRender={6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    paddingTop: 60,
    paddingBottom: 16,
  },
  listContent: {
    paddingBottom: 32,
    gap: 12,
  },
  orderCard: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: 13,
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  orderItems: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationContainer: {
    marginBottom: 16,
    width: '80%',
    overflow: 'hidden',
    borderRadius: 12,
  },
  errorTitle: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

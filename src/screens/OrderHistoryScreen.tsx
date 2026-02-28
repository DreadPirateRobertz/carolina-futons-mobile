import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '@/theme';
import { EmptyState } from '@/components';
import { ORDER_STATUS_CONFIG, type Order } from '@/data/orders';
import { useOrders } from '@/hooks/useOrders';
import { formatPrice } from '@/utils';

interface Props {
  orders?: Order[];
  onSelectOrder?: (orderId: string) => void;
  onStartShopping?: () => void;
  testID?: string;
}

export function OrderHistoryScreen({
  orders: ordersProp,
  onSelectOrder,
  onStartShopping,
  testID,
}: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { orders: hookOrders } = useOrders();

  // Use prop orders or fall back to hook data (already sorted newest-first)
  const orders = ordersProp
    ? ordersProp.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : hookOrders;

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate network refresh — real implementation will call API
    setTimeout(() => setRefreshing(false), 800);
  }, []);

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
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.card,
              marginHorizontal: spacing.lg,
            },
            shadows.card,
          ]}
          onPress={() => onSelectOrder?.(item.id)}
          testID={`order-card-${item.id}`}
          accessibilityLabel={`Order ${item.orderNumber}, ${statusConfig.label}, ${formatPrice(item.total)}`}
          accessibilityRole="button"
        >
          <View style={styles.orderHeader}>
            <Text
              style={[styles.orderNumber, { color: colors.espresso }]}
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
            style={[styles.orderDate, { color: colors.espressoLight }]}
            testID={`order-date-${item.id}`}
          >
            {formatDate(item.createdAt)}
          </Text>

          <View style={styles.orderFooter}>
            <Text
              style={[styles.orderItems, { color: colors.espressoLight }]}
              testID={`order-items-${item.id}`}
              numberOfLines={1}
            >
              {itemSummary}
            </Text>
            <Text
              style={[styles.orderTotal, { color: colors.espresso }]}
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

  if (orders.length === 0) {
    return (
      <View
        style={[styles.root, { backgroundColor: colors.sandBase }]}
        testID={testID ?? 'order-history-screen'}
      >
        <EmptyState
          icon="empty"
          title="No orders yet"
          message="Once you place your first order, it will appear here."
          action={
            onStartShopping ? { label: 'Start Shopping', onPress: onStartShopping } : undefined
          }
          testID="orders-empty-state"
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      testID={testID ?? 'order-history-screen'}
    >
      <Text
        style={[styles.headerTitle, { color: colors.espresso, paddingHorizontal: spacing.lg }]}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.mountainBlue}
            testID="order-refresh-control"
          />
        }
        testID="order-list"
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
});

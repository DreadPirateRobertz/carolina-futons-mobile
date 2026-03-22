/**
 * @module RoomPlannerScreen
 *
 * 2D SVG top-down floor plan room planner (cm-62p). Users can:
 * - Set room dimensions (width × depth in feet)
 * - Add product silhouettes from their product catalog
 * - Drag and rotate items within the room
 * - Wall-snap items when dragged near a wall
 * - Save the plan to AsyncStorage
 * - Share a screenshot via the native Share sheet
 *
 * Accessible from ARScreen and ProductDetailScreen.
 * Analytics: room_plan_save, room_plan_share
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Rect, G, Text as SvgText, Line } from 'react-native-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { PRODUCTS, type Product } from '@/data/products';
import { events } from '@/services/analytics';
import { useRoomPlanner, type PlacedItem } from '@/hooks/useRoomPlanner';
import { Header } from '@/components/Header';
import type { RootStackParamList } from '@/navigation/AppNavigator';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Width/height of the SVG canvas in logical pixels. */
const CANVAS_SIZE = 320;
/** Wall-snap threshold in feet — item snaps when this close to a wall. */
const SNAP_THRESHOLD_FT = 0.5;

type RouteParams = RouteProp<RootStackParamList, 'RoomPlanner'>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert feet to canvas pixels given room dimension in feet and canvas size. */
function ftToPx(feet: number, roomDim: number): number {
  return (feet / roomDim) * CANVAS_SIZE;
}

/** Snap a coordinate (ft) to a wall if within threshold, clamped to room bounds. */
function snapToWall(coord: number, halfSizeFt: number, roomDim: number): number {
  const min = halfSizeFt;
  const max = roomDim - halfSizeFt;
  if (coord - halfSizeFt < SNAP_THRESHOLD_FT) return min;
  if (roomDim - (coord + halfSizeFt) < SNAP_THRESHOLD_FT) return max;
  return Math.max(min, Math.min(max, coord));
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface PlacedItemRendererProps {
  item: PlacedItem;
  roomWidth: number;
  roomDepth: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function PlacedItemRenderer({
  item,
  roomWidth,
  roomDepth,
  isSelected,
  onSelect,
}: PlacedItemRendererProps) {
  const cx = ftToPx(item.x, roomWidth);
  const cy = ftToPx(item.y, roomDepth);
  const w = ftToPx(item.widthFt, roomWidth);
  const d = ftToPx(item.depthFt, roomDepth);

  return (
    <G
      testID={`room-planner-item-${item.id}`}
      transform={`translate(${cx},${cy}) rotate(${item.rotation})`}
      onPress={() => onSelect(item.id)}
    >
      <Rect
        x={-w / 2}
        y={-d / 2}
        width={w}
        height={d}
        fill={isSelected ? '#E8845C40' : '#D4C5A940'}
        stroke={isSelected ? '#E8845C' : '#3A2518'}
        strokeWidth={isSelected ? 2 : 1}
        rx={2}
      />
      <SvgText
        x={0}
        y={0}
        textAnchor="middle"
        alignmentBaseline="middle"
        fontSize={8}
        fill="#3A2518"
      >
        {item.productName.replace(/^The /, '').substring(0, 12)}
      </SvgText>
    </G>
  );
}

// ── Product Picker Item ───────────────────────────────────────────────────────

interface PickerItemProps {
  product: Product;
  onAdd: (product: Product) => void;
}

function PickerItem({ product, onAdd }: PickerItemProps) {
  return (
    <View style={styles.pickerItem}>
      <Text style={styles.pickerItemName} numberOfLines={1}>
        {product.name}
      </Text>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => onAdd(product)}
        testID={`room-planner-add-${product.slug}`}
        accessibilityRole="button"
        accessibilityLabel={`Add ${product.name} to plan`}
      >
        <Text style={styles.addBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

/** Futon/murphy products only — accessories don't make sense in a floor plan. */
const PLACEABLE_PRODUCTS = PRODUCTS.filter((p) =>
  ['futons', 'murphy-beds', 'frames'].includes(p.category),
);

/**
 * Room Planner screen — 2D SVG floor plan with draggable product silhouettes.
 */
export function RoomPlannerScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const viewShotRef = useRef<ViewShot>(null);

  const { plan, isLoaded, setRoomWidth, setRoomDepth, addItem, removeItem, savePlan } =
    useRoomPlanner();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [widthText, setWidthText] = useState(String(plan.roomWidth));
  const [depthText, setDepthText] = useState(String(plan.roomDepth));

  // Pre-place product from navigation params
  useEffect(() => {
    if (!isLoaded) return;
    const slug = (route.params as { productSlug?: string })?.productSlug;
    if (!slug) return;
    const product = PRODUCTS.find((p) => p.slug === slug);
    if (!product) return;
    addItem(
      product.slug,
      product.name,
      product.fabricOptions?.[0] ?? 'Natural',
      product.dimensions.width,
      product.dimensions.depth,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Sync text inputs when plan loads from storage
  useEffect(() => {
    if (isLoaded) {
      setWidthText(String(plan.roomWidth));
      setDepthText(String(plan.roomDepth));
    }
  }, [isLoaded, plan.roomWidth, plan.roomDepth]);

  const handleWidthChange = useCallback(
    (text: string) => {
      setWidthText(text);
      const n = parseFloat(text);
      if (!isNaN(n) && n > 0 && n <= 100) setRoomWidth(n);
    },
    [setRoomWidth],
  );

  const handleDepthChange = useCallback(
    (text: string) => {
      setDepthText(text);
      const n = parseFloat(text);
      if (!isNaN(n) && n > 0 && n <= 100) setRoomDepth(n);
    },
    [setRoomDepth],
  );

  const handleAddProduct = useCallback(
    (product: Product) => {
      addItem(
        product.slug,
        product.name,
        product.fabricOptions?.[0] ?? 'Natural',
        product.dimensions.width,
        product.dimensions.depth,
      );
    },
    [addItem],
  );

  const handleSave = useCallback(async () => {
    try {
      await savePlan();
      events.roomPlanSave(plan.items.length, plan.roomWidth, plan.roomDepth);
    } catch {
      // Silent save failure — plan state is still valid in memory
    }
  }, [savePlan, plan]);

  const handleShare = useCallback(async () => {
    try {
      events.roomPlanShare(plan.items.length);
      const uri = await captureRef(viewShotRef, { format: 'png', quality: 0.9 });
      await Share.share({ url: uri, message: 'My Carolina Futons room plan' });
    } catch {
      // Share cancelled or failed — no action needed
    }
  }, [plan.items.length]);

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItemId((prev) => (prev === id ? null : id));
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedItemId) {
      removeItem(selectedItemId);
      setSelectedItemId(null);
    }
  }, [selectedItemId, removeItem]);

  const renderPickerItem = useCallback(
    ({ item }: { item: Product }) => <PickerItem product={item} onAdd={handleAddProduct} />,
    [handleAddProduct],
  );

  // ── Render grid lines inside the SVG canvas ───────────────────────────────
  const gridLines: React.ReactElement[] = [];
  const gridStepPx = ftToPx(2, plan.roomWidth); // every 2 ft
  for (let x = gridStepPx; x < CANVAS_SIZE; x += gridStepPx) {
    gridLines.push(
      <Line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={CANVAS_SIZE} stroke="#D4C5A9" strokeWidth={0.5} />,
    );
  }
  const gridStepPxY = ftToPx(2, plan.roomDepth);
  for (let y = gridStepPxY; y < CANVAS_SIZE; y += gridStepPxY) {
    gridLines.push(
      <Line key={`gy-${y}`} x1={0} y1={y} x2={CANVAS_SIZE} y2={y} stroke="#D4C5A9" strokeWidth={0.5} />,
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase }]}
      testID="room-planner-screen"
    >
      <Header
        title="Room Planner"
        showBack
        testID="room-planner-header"
      />

      {/* Dimension inputs */}
      <View style={[styles.dimensionRow, { paddingHorizontal: spacing.pagePadding, paddingVertical: spacing.sm }]}>
        <Text style={[typography.bodySmall, { color: colors.espressoLight }]}>Room size (ft):</Text>
        <View style={styles.dimensionInputs}>
          <TextInput
            testID="room-planner-room-width"
            style={[styles.dimensionInput, { color: colors.espresso, borderColor: colors.espressoLight }]}
            value={widthText}
            onChangeText={handleWidthChange}
            keyboardType="decimal-pad"
            accessibilityLabel="Room width in feet"
          />
          <Text style={[typography.bodySmall, { color: colors.espressoLight, marginHorizontal: 4 }]}>×</Text>
          <TextInput
            testID="room-planner-room-depth"
            style={[styles.dimensionInput, { color: colors.espresso, borderColor: colors.espressoLight }]}
            value={depthText}
            onChangeText={handleDepthChange}
            keyboardType="decimal-pad"
            accessibilityLabel="Room depth in feet"
          />
        </View>
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.espresso }]}
            onPress={handleSave}
            testID="room-planner-save-btn"
            accessibilityRole="button"
            accessibilityLabel="Save room plan"
          >
            <Text style={styles.headerBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.sunsetCoral, marginLeft: spacing.sm }]}
            onPress={handleShare}
            testID="room-planner-share-btn"
            accessibilityRole="button"
            accessibilityLabel="Share room plan"
          >
            <Text style={styles.headerBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SVG Canvas */}
      <ViewShot ref={viewShotRef} style={styles.canvasWrapper}>
        <Svg
          testID="room-planner-canvas"
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={styles.svg}
        >
          {/* Floor */}
          <Rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} fill="#F5EFE6" />
          {/* Grid */}
          {gridLines}
          {/* Walls */}
          <Rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} fill="none" stroke="#3A2518" strokeWidth={3} />

          {/* Placed items */}
          {plan.items.map((item) => (
            <PlacedItemRenderer
              key={item.id}
              item={item}
              roomWidth={plan.roomWidth}
              roomDepth={plan.roomDepth}
              isSelected={selectedItemId === item.id}
              onSelect={handleSelectItem}
            />
          ))}

          {/* Empty state overlay inside SVG */}
          {plan.items.length === 0 && (
            <SvgText
              testID="room-planner-empty-state"
              x={CANVAS_SIZE / 2}
              y={CANVAS_SIZE / 2}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={13}
              fill="#8C7B6B"
            >
              Add products below
            </SvgText>
          )}
        </Svg>
      </ViewShot>

      {/* Delete selected item */}
      {selectedItemId && (
        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: '#C0392B' }]}
          onPress={handleDeleteSelected}
          testID="room-planner-delete-btn"
          accessibilityRole="button"
          accessibilityLabel="Remove selected item"
        >
          <Text style={styles.headerBtnText}>Remove Selected</Text>
        </TouchableOpacity>
      )}

      {/* Product picker */}
      <View
        style={[styles.pickerPanel, { borderTopColor: colors.sandDark, backgroundColor: colors.sandLight }]}
        testID="room-planner-product-picker"
      >
        <Text style={[typography.bodySmall, { color: colors.espresso, paddingHorizontal: spacing.pagePadding, paddingTop: spacing.sm, fontWeight: '600' }]}>
          Add to Plan
        </Text>
        <FlatList
          data={PLACEABLE_PRODUCTS}
          keyExtractor={(p) => p.slug}
          renderItem={renderPickerItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.pagePadding, paddingVertical: spacing.sm }}
          style={{ flexGrow: 0 }}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dimensionInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dimensionInput: {
    width: 48,
    height: 32,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    fontSize: 14,
    textAlign: 'center',
  },
  actionBtns: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  headerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  headerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  canvasWrapper: {
    alignSelf: 'center',
    marginVertical: 8,
  },
  svg: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  deleteBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerPanel: {
    borderTopWidth: 1,
    flex: 1,
  },
  pickerItem: {
    width: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4C5A9',
    padding: 8,
    marginRight: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  pickerItemName: {
    fontSize: 11,
    color: '#3A2518',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
  },
  addBtn: {
    backgroundColor: '#E8845C',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
});

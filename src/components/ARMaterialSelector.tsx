/**
 * @module ARMaterialSelector
 *
 * Slide-up overlay for fabric/color selection in the AR camera view.
 * Displays larger swatches with names, prices, and a live texture preview
 * strip showing the selected fabric applied to the current model. Animates
 * in/out with a spring transition.
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { type FutonModel, type Fabric } from '@/data/futons';
import { formatPrice } from '@/utils';

interface Props {
  model: FutonModel;
  selectedFabric: Fabric;
  onSelectFabric: (fabric: Fabric) => void;
  onClose: () => void;
  testID?: string;
}

/**
 * Full-width slide-up overlay for selecting fabric/color on the current
 * futon model. Shows a texture preview strip at the top and a grid of
 * fabric swatches below.
 */
export function ARMaterialSelector({
  model,
  selectedFabric,
  onSelectFabric,
  onClose,
  testID,
}: Props) {
  const handleSelect = useCallback(
    (fabric: Fabric) => {
      onSelectFabric(fabric);
    },
    [onSelectFabric],
  );

  const totalPrice = model.basePrice + selectedFabric.price;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18).stiffness(200)}
      exiting={SlideOutDown.springify().damping(20).stiffness(250)}
      style={styles.overlay}
      testID={testID}
    >
      {/* Backdrop tap to dismiss */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        testID="material-selector-backdrop"
      />

      <View style={styles.panel}>
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Choose Fabric</Text>
            <Text style={styles.subtitle}>
              {model.name} — {formatPrice(totalPrice)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            testID="material-selector-close"
            accessibilityLabel="Close fabric selector"
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Texture preview strip — shows how the selected fabric looks */}
        <TexturePreviewStrip fabric={selectedFabric} />

        {/* Fabric swatch grid */}
        <ScrollView
          style={styles.swatchScroll}
          contentContainerStyle={styles.swatchGrid}
          showsVerticalScrollIndicator={false}
        >
          {model.fabrics.map((fabric) => {
            const isSelected = fabric.id === selectedFabric.id;
            return (
              <TouchableOpacity
                key={fabric.id}
                style={[styles.swatchItem, isSelected && styles.swatchItemSelected]}
                onPress={() => handleSelect(fabric)}
                testID={`material-swatch-${fabric.id}`}
                accessibilityLabel={`${fabric.name}${fabric.price > 0 ? `, add ${formatPrice(fabric.price)}` : ', included'}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[styles.swatchColor, { backgroundColor: fabric.color }]}>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>{'\u2713'}</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.swatchName, isSelected && styles.swatchNameSelected]}
                  numberOfLines={1}
                >
                  {fabric.name}
                </Text>
                <Text style={styles.swatchPrice}>
                  {fabric.price > 0 ? `+${formatPrice(fabric.price)}` : 'Included'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

/** Horizontal strip showing a simulated texture preview of the selected fabric */
function TexturePreviewStrip({ fabric }: { fabric: Fabric }) {
  const darkerColor = darkenColor(fabric.color, 0.15);
  const lighterColor = lightenColor(fabric.color, 0.1);

  return (
    <View style={styles.previewStrip} testID="texture-preview-strip">
      <View style={styles.previewLabelRow}>
        <Text style={styles.previewLabel}>Preview</Text>
        <Text style={styles.previewFabricName}>{fabric.name}</Text>
      </View>
      <View style={styles.previewTextureRow}>
        {/* Simulate fabric texture with alternating color bands */}
        <View style={[styles.previewBand, { backgroundColor: fabric.color, flex: 3 }]} />
        <View style={[styles.previewBand, { backgroundColor: darkerColor, flex: 1 }]} />
        <View style={[styles.previewBand, { backgroundColor: fabric.color, flex: 2 }]} />
        <View style={[styles.previewBand, { backgroundColor: lighterColor, flex: 1 }]} />
        <View style={[styles.previewBand, { backgroundColor: fabric.color, flex: 3 }]} />
        <View style={[styles.previewBand, { backgroundColor: darkerColor, flex: 1 }]} />
        <View style={[styles.previewBand, { backgroundColor: lighterColor, flex: 2 }]} />
      </View>
    </View>
  );
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (num & 0xff) * (1 - amount));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) * (1 + amount));
  const g = Math.min(255, ((num >> 8) & 0xff) * (1 + amount));
  const b = Math.min(255, (num & 0xff) * (1 + amount));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  panel: {
    backgroundColor: 'rgba(20, 16, 12, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    color: '#F2E8D5',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(242, 232, 213, 0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(232, 132, 92, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8845C',
  },
  closeText: {
    color: '#E8845C',
    fontSize: 14,
    fontWeight: '600',
  },
  previewStrip: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  previewLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewLabel: {
    color: 'rgba(242, 232, 213, 0.4)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  previewFabricName: {
    color: 'rgba(242, 232, 213, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  previewTextureRow: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewBand: {
    height: '100%',
  },
  swatchScroll: {
    paddingHorizontal: 20,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 16,
  },
  swatchItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  swatchItemSelected: {
    backgroundColor: 'rgba(232, 132, 92, 0.12)',
    borderColor: '#E8845C',
  },
  swatchColor: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  swatchName: {
    color: 'rgba(242, 232, 213, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  swatchNameSelected: {
    color: '#F2E8D5',
  },
  swatchPrice: {
    color: 'rgba(242, 232, 213, 0.4)',
    fontSize: 11,
    marginTop: 2,
  },
});

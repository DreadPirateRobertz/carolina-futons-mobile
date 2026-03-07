/**
 * @module ARComparisonOverlay
 *
 * Side-by-side AR comparison showing two futon models with dimension
 * differences highlighted. Helps customers decide between sizes by
 * showing exactly how much wider/deeper/taller one model is vs another.
 */
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

interface ModelInfo {
  id: string;
  name: string;
  dimensions: { width: number; depth: number; height: number };
}

interface Props {
  modelA: ModelInfo | null;
  modelB: ModelInfo | null;
  testID?: string;
}

function dimensionDiff(aVal: number, bVal: number, label: string): string {
  const diff = aVal - bVal;
  if (diff === 0) return `Same ${label}`;
  if (diff > 0)
    return `+${diff}" ${label === 'height' ? 'taller' : label === 'width' ? 'wider' : 'deeper'}`;
  return `${diff}" ${label === 'height' ? 'shorter' : label === 'width' ? 'narrower' : 'shallower'}`;
}

export function ARComparisonOverlay({ modelA, modelB, testID }: Props) {
  if (!modelA || !modelB) return null;

  const widthDiff = dimensionDiff(modelA.dimensions.width, modelB.dimensions.width, 'width');
  const depthDiff = dimensionDiff(modelA.dimensions.depth, modelB.dimensions.depth, 'depth');
  const heightDiff = dimensionDiff(modelA.dimensions.height, modelB.dimensions.height, 'height');

  return (
    <View style={styles.container} testID={testID ?? 'comparison-overlay'}>
      <View style={styles.modelsRow}>
        {/* Model A */}
        <View style={styles.modelCard} testID="comparison-model-a">
          <View style={[styles.modelPreview, styles.modelPreviewA]} />
          <Text style={styles.modelName}>{modelA.name}</Text>
          <Text style={styles.modelDims}>
            {modelA.dimensions.width}" W × {modelA.dimensions.depth}" D × {modelA.dimensions.height}
            " H
          </Text>
        </View>

        {/* VS divider */}
        <View style={styles.vsDivider}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {/* Model B */}
        <View style={styles.modelCard} testID="comparison-model-b">
          <View style={[styles.modelPreview, styles.modelPreviewB]} />
          <Text style={styles.modelName}>{modelB.name}</Text>
          <Text style={styles.modelDims}>
            {modelB.dimensions.width}" W × {modelB.dimensions.depth}" D × {modelB.dimensions.height}
            " H
          </Text>
        </View>
      </View>

      {/* Dimension differences */}
      <View style={styles.diffsContainer}>
        <Text style={styles.diffText}>{widthDiff}</Text>
        <Text style={styles.diffSeparator}>·</Text>
        <Text style={styles.diffText}>{depthDiff}</Text>
        <Text style={styles.diffSeparator}>·</Text>
        <Text style={styles.diffText}>{heightDiff}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    padding: 16,
    zIndex: 20,
  },
  modelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modelCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  modelPreview: {
    width: 80,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
  },
  modelPreviewA: {
    backgroundColor: 'rgba(91, 143, 168, 0.3)',
    borderColor: '#5B8FA8',
  },
  modelPreviewB: {
    backgroundColor: 'rgba(232, 132, 92, 0.3)',
    borderColor: '#E8845C',
  },
  modelName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modelDims: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
  },
  vsDivider: {
    paddingHorizontal: 12,
  },
  vsText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontWeight: '700',
  },
  diffsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  diffText: {
    color: '#5B8FA8',
    fontSize: 13,
    fontWeight: '600',
  },
  diffSeparator: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 13,
  },
});

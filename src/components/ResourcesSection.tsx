/**
 * @module ResourcesSection
 *
 * Collapsible accordion for the PDP "Resources" section. Surfaces spec sheet
 * PDFs, care guide PDFs, return/warranty policy links, and an optional product
 * video. Returns null when no resource URLs are provided so no layout gap
 * appears when a product has no resources.
 *
 * PDF taps: expo-sharing (native share sheet on mobile); falls back to
 * expo-web-browser if sharing is unavailable.
 * Policy links: expo-web-browser (in-app browser).
 * Video: expo-web-browser — taps open the video URL in the in-app browser.
 */

import React, { memo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/theme';
import type { ProductResources } from '@/data/products';

interface Props {
  resources?: ProductResources;
  testID?: string;
}

function hasAnyResource(resources?: ProductResources): boolean {
  if (!resources) return false;
  return !!(
    resources.specSheetUrl ||
    resources.careGuideUrl ||
    resources.returnPolicyUrl ||
    resources.warrantyPolicyUrl ||
    resources.videoUrl
  );
}

async function openPdf(url: string): Promise<void> {
  try {
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(url, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } else {
      await WebBrowser.openBrowserAsync(url);
    }
  } catch {
    // Swallow — user may cancel share sheet or browser dismissed
  }
}

async function openLink(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    // Swallow — browser may be unavailable or user cancelled
  }
}

export const ResourcesSection = memo(function ResourcesSection({ resources, testID }: Props) {
  if (!hasAnyResource(resources)) return null;
  return <ResourcesSectionInner resources={resources!} testID={testID} />;
});

function ResourcesSectionInner({
  resources,
  testID,
}: {
  resources: ProductResources;
  testID?: string;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  const handleSpec = useCallback(
    () => void openPdf(resources.specSheetUrl!),
    [resources.specSheetUrl],
  );
  const handleCare = useCallback(
    () => void openPdf(resources.careGuideUrl!),
    [resources.careGuideUrl],
  );
  const handleReturn = useCallback(
    () => void openLink(resources.returnPolicyUrl!),
    [resources.returnPolicyUrl],
  );
  const handleWarranty = useCallback(
    () => void openLink(resources.warrantyPolicyUrl!),
    [resources.warrantyPolicyUrl],
  );

  return (
    <View testID={testID} style={[styles.container, { paddingHorizontal: spacing.lg }]}>
      {/* Accordion toggle */}
      <TouchableOpacity
        testID="resources-toggle"
        onPress={toggle}
        style={[
          styles.toggle,
          {
            backgroundColor: colors.sandDark,
            borderRadius: borderRadius.md,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Resources"
        accessibilityState={{ expanded }}
      >
        <Text
          style={[
            styles.toggleLabel,
            { color: colors.espresso, fontFamily: typography.bodyFamilyBold },
          ]}
        >
          Resources
        </Text>
        <Text style={[styles.chevron, { color: colors.espressoLight }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Accordion content — only mounted when expanded */}
      {expanded ? (
        <View testID="resources-content" style={styles.content}>
          {resources.specSheetUrl ? (
            <TouchableOpacity
              testID="resource-item-spec-sheet"
              onPress={handleSpec}
              style={[styles.item, { borderColor: colors.overlay }]}
              accessibilityRole="button"
              accessibilityLabel="Spec sheet, PDF"
            >
              <Text style={[styles.itemIcon, { color: colors.espressoLight }]}>📄</Text>
              <Text
                style={[
                  styles.itemLabel,
                  { color: colors.espresso, fontFamily: typography.bodyFamily },
                ]}
              >
                Spec Sheet
              </Text>
              <Text style={[styles.itemBadge, { color: colors.espressoLight }]}>PDF</Text>
            </TouchableOpacity>
          ) : null}

          {resources.careGuideUrl ? (
            <TouchableOpacity
              testID="resource-item-care-guide"
              onPress={handleCare}
              style={[styles.item, { borderColor: colors.overlay }]}
              accessibilityRole="button"
              accessibilityLabel="Care guide, PDF"
            >
              <Text style={[styles.itemIcon, { color: colors.espressoLight }]}>📋</Text>
              <Text
                style={[
                  styles.itemLabel,
                  { color: colors.espresso, fontFamily: typography.bodyFamily },
                ]}
              >
                Care Guide
              </Text>
              <Text style={[styles.itemBadge, { color: colors.espressoLight }]}>PDF</Text>
            </TouchableOpacity>
          ) : null}

          {resources.returnPolicyUrl ? (
            <TouchableOpacity
              testID="resource-item-return-policy"
              onPress={handleReturn}
              style={[styles.item, { borderColor: colors.overlay }]}
              accessibilityRole="button"
              accessibilityLabel="Return policy"
            >
              <Text style={[styles.itemIcon, { color: colors.espressoLight }]}>↩️</Text>
              <Text
                style={[
                  styles.itemLabel,
                  { color: colors.espresso, fontFamily: typography.bodyFamily },
                ]}
              >
                Return Policy
              </Text>
              <Text style={[styles.itemChevron, { color: colors.espressoLight }]}>›</Text>
            </TouchableOpacity>
          ) : null}

          {resources.warrantyPolicyUrl ? (
            <TouchableOpacity
              testID="resource-item-warranty-policy"
              onPress={handleWarranty}
              style={[styles.item, { borderColor: colors.overlay }]}
              accessibilityRole="button"
              accessibilityLabel="Warranty policy"
            >
              <Text style={[styles.itemIcon, { color: colors.espressoLight }]}>🛡</Text>
              <Text
                style={[
                  styles.itemLabel,
                  { color: colors.espresso, fontFamily: typography.bodyFamily },
                ]}
              >
                Warranty Policy
              </Text>
              <Text style={[styles.itemChevron, { color: colors.espressoLight }]}>›</Text>
            </TouchableOpacity>
          ) : null}

          {resources.videoUrl ? (
            <TouchableOpacity
              testID="resources-video-player"
              onPress={() => WebBrowser.openBrowserAsync(resources.videoUrl!)}
              style={styles.videoLink}
              accessibilityRole="button"
              accessibilityLabel="Watch product video"
            >
              <Text style={[styles.itemLabel, { color: colors.espresso }]}>Watch Video</Text>
              <Text style={[styles.itemChevron, { color: colors.espressoLight }]}>›</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 12,
  },
  content: {
    marginTop: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 24,
    textAlign: 'center',
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
  },
  itemBadge: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  itemChevron: {
    fontSize: 18,
  },
  videoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
});

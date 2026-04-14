/**
 * @module ResourcesSection tests
 *
 * TDD suite for the PDP Resources accordion — spec sheets, care guide, policy
 * links, and optional video embed.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ResourcesSection } from '../ResourcesSection';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { ProductResources } from '@/data/products';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

// expo-sharing is auto-mocked via __mocks__/expo-sharing.js

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));

const MOCK_RESOURCES: ProductResources = {
  specSheetUrl: 'https://carolinafutons.com/docs/bali-spec.pdf',
  careGuideUrl: 'https://carolinafutons.com/docs/bali-care.pdf',
  returnPolicyUrl: 'https://carolinafutons.com/policies/returns',
  warrantyPolicyUrl: 'https://carolinafutons.com/policies/warranty',
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
};

function renderResources(resources?: ProductResources, testID = 'resources-section') {
  return render(
    <ThemeProvider>
      <ResourcesSection resources={resources} testID={testID} />
    </ThemeProvider>,
  );
}

describe('ResourcesSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  });

  // ─── Visibility ───────────────────────────────────────────────────────────

  describe('visibility', () => {
    it('renders nothing when resources is undefined', () => {
      const { queryByTestId } = renderResources(undefined);
      expect(queryByTestId('resources-section')).toBeNull();
    });

    it('renders nothing when resources is empty object', () => {
      const { queryByTestId } = renderResources({});
      expect(queryByTestId('resources-section')).toBeNull();
    });

    it('renders when at least one resource url is present', () => {
      const { getByTestId } = renderResources({ specSheetUrl: MOCK_RESOURCES.specSheetUrl });
      expect(getByTestId('resources-section')).toBeTruthy();
    });

    it('renders the accordion toggle button', () => {
      const { getByTestId } = renderResources(MOCK_RESOURCES);
      expect(getByTestId('resources-toggle')).toBeTruthy();
    });
  });

  // ─── Accordion expand/collapse ────────────────────────────────────────────

  describe('accordion', () => {
    it('starts collapsed — resource items not visible', () => {
      const { queryByTestId } = renderResources(MOCK_RESOURCES);
      expect(queryByTestId('resources-content')).toBeNull();
    });

    it('expands when toggle is pressed', () => {
      const { getByTestId } = renderResources(MOCK_RESOURCES);
      fireEvent.press(getByTestId('resources-toggle'));
      expect(getByTestId('resources-content')).toBeTruthy();
    });

    it('collapses again when toggle is pressed a second time', () => {
      const { getByTestId, queryByTestId } = renderResources(MOCK_RESOURCES);
      fireEvent.press(getByTestId('resources-toggle'));
      expect(getByTestId('resources-content')).toBeTruthy();
      fireEvent.press(getByTestId('resources-toggle'));
      expect(queryByTestId('resources-content')).toBeNull();
    });

    it('toggle has correct accessibilityState when collapsed', () => {
      const { getByTestId } = renderResources(MOCK_RESOURCES);
      const toggle = getByTestId('resources-toggle');
      expect(toggle.props.accessibilityState).toMatchObject({ expanded: false });
    });

    it('toggle has correct accessibilityState when expanded', () => {
      const { getByTestId } = renderResources(MOCK_RESOURCES);
      fireEvent.press(getByTestId('resources-toggle'));
      const toggle = getByTestId('resources-toggle');
      expect(toggle.props.accessibilityState).toMatchObject({ expanded: true });
    });
  });

  // ─── Resource items ───────────────────────────────────────────────────────

  describe('resource items', () => {
    beforeEach(() => {});

    function openResources(resources: ProductResources) {
      const utils = renderResources(resources);
      fireEvent.press(utils.getByTestId('resources-toggle'));
      return utils;
    }

    it('renders spec sheet link when specSheetUrl provided', () => {
      const { getByTestId } = openResources({ specSheetUrl: MOCK_RESOURCES.specSheetUrl });
      expect(getByTestId('resource-item-spec-sheet')).toBeTruthy();
    });

    it('renders care guide link when careGuideUrl provided', () => {
      const { getByTestId } = openResources({ careGuideUrl: MOCK_RESOURCES.careGuideUrl });
      expect(getByTestId('resource-item-care-guide')).toBeTruthy();
    });

    it('renders return policy link when returnPolicyUrl provided', () => {
      const { getByTestId } = openResources({ returnPolicyUrl: MOCK_RESOURCES.returnPolicyUrl });
      expect(getByTestId('resource-item-return-policy')).toBeTruthy();
    });

    it('renders warranty policy link when warrantyPolicyUrl provided', () => {
      const { getByTestId } = openResources({
        warrantyPolicyUrl: MOCK_RESOURCES.warrantyPolicyUrl,
      });
      expect(getByTestId('resource-item-warranty-policy')).toBeTruthy();
    });

    it('does not render spec sheet when specSheetUrl absent', () => {
      const { queryByTestId } = openResources({
        careGuideUrl: MOCK_RESOURCES.careGuideUrl,
        returnPolicyUrl: MOCK_RESOURCES.returnPolicyUrl,
      });
      expect(queryByTestId('resource-item-spec-sheet')).toBeNull();
    });

    it('does not render care guide when careGuideUrl absent', () => {
      const { queryByTestId } = openResources({ specSheetUrl: MOCK_RESOURCES.specSheetUrl });
      expect(queryByTestId('resource-item-care-guide')).toBeNull();
    });

    it('renders video player when videoUrl is provided', () => {
      const { getByTestId } = openResources({ videoUrl: MOCK_RESOURCES.videoUrl });
      expect(getByTestId('resources-video-player')).toBeTruthy();
    });

    it('does not render video player when videoUrl is absent', () => {
      const { queryByTestId } = openResources({ specSheetUrl: MOCK_RESOURCES.specSheetUrl });
      expect(queryByTestId('resources-video-player')).toBeNull();
    });

    // cm-zo1: expo-av was imported but never used. Video taps go through
    // expo-web-browser. Lock that behavior in so the dead import can't creep back.
    it('tapping the video player opens the video URL in the in-app browser', async () => {
      const { getByTestId } = openResources({ videoUrl: MOCK_RESOURCES.videoUrl });
      await act(async () => {
        fireEvent.press(getByTestId('resources-video-player'));
      });
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(MOCK_RESOURCES.videoUrl);
    });
  });

  // ─── PDF tap — expo-sharing ───────────────────────────────────────────────

  describe('PDF tap — expo-sharing', () => {
    function openWithSpec() {
      const utils = renderResources(MOCK_RESOURCES);
      fireEvent.press(utils.getByTestId('resources-toggle'));
      return utils;
    }

    it('calls Sharing.shareAsync with spec sheet URL when tapped', async () => {
      const { getByTestId } = openWithSpec();
      await act(async () => {
        fireEvent.press(getByTestId('resource-item-spec-sheet'));
      });
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        MOCK_RESOURCES.specSheetUrl,
        expect.any(Object),
      );
    });

    it('calls Sharing.shareAsync with care guide URL when tapped', async () => {
      const { getByTestId } = openWithSpec();
      await act(async () => {
        fireEvent.press(getByTestId('resource-item-care-guide'));
      });
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        MOCK_RESOURCES.careGuideUrl,
        expect.any(Object),
      );
    });

    it('falls back to WebBrowser when sharing unavailable', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
      const { getByTestId } = openWithSpec();
      await act(async () => {
        fireEvent.press(getByTestId('resource-item-spec-sheet'));
      });
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(MOCK_RESOURCES.specSheetUrl);
    });
  });

  // ─── Policy links — WebBrowser ────────────────────────────────────────────

  describe('policy links — WebBrowser', () => {
    function openWithPolicies() {
      const utils = renderResources(MOCK_RESOURCES);
      fireEvent.press(utils.getByTestId('resources-toggle'));
      return utils;
    }

    it('opens return policy in browser when tapped', async () => {
      const { getByTestId } = openWithPolicies();
      await act(async () => {
        fireEvent.press(getByTestId('resource-item-return-policy'));
      });
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(MOCK_RESOURCES.returnPolicyUrl);
    });

    it('opens warranty policy in browser when tapped', async () => {
      const { getByTestId } = openWithPolicies();
      await act(async () => {
        fireEvent.press(getByTestId('resource-item-warranty-policy'));
      });
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(MOCK_RESOURCES.warrantyPolicyUrl);
    });
  });

  // ─── Accessibility ────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('toggle has accessibilityRole="button"', () => {
      const { getByTestId } = renderResources(MOCK_RESOURCES);
      expect(getByTestId('resources-toggle').props.accessibilityRole).toBe('button');
    });

    it('spec sheet item has accessible label including "PDF"', () => {
      const utils = renderResources(MOCK_RESOURCES);
      fireEvent.press(utils.getByTestId('resources-toggle'));
      const item = utils.getByTestId('resource-item-spec-sheet');
      expect(item.props.accessibilityLabel).toMatch(/spec sheet/i);
      expect(item.props.accessibilityLabel).toMatch(/pdf/i);
    });

    it('care guide item has accessible label including "PDF"', () => {
      const utils = renderResources(MOCK_RESOURCES);
      fireEvent.press(utils.getByTestId('resources-toggle'));
      const item = utils.getByTestId('resource-item-care-guide');
      expect(item.props.accessibilityLabel).toMatch(/care guide/i);
      expect(item.props.accessibilityLabel).toMatch(/pdf/i);
    });

    it('return policy item has accessible label', () => {
      const utils = renderResources(MOCK_RESOURCES);
      fireEvent.press(utils.getByTestId('resources-toggle'));
      const item = utils.getByTestId('resource-item-return-policy');
      expect(item.props.accessibilityLabel).toMatch(/return policy/i);
    });

    it('warranty policy item has accessible label', () => {
      const utils = renderResources(MOCK_RESOURCES);
      fireEvent.press(utils.getByTestId('resources-toggle'));
      const item = utils.getByTestId('resource-item-warranty-policy');
      expect(item.props.accessibilityLabel).toMatch(/warranty/i);
    });

    it('resource items have accessibilityRole="button"', () => {
      const utils = renderResources(MOCK_RESOURCES);
      fireEvent.press(utils.getByTestId('resources-toggle'));
      const item = utils.getByTestId('resource-item-spec-sheet');
      expect(item.props.accessibilityRole).toBe('button');
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  describe('error handling', () => {
    it('does not throw when Sharing.shareAsync rejects', async () => {
      (Sharing.shareAsync as jest.Mock).mockRejectedValue(new Error('sharing failed'));
      const utils = renderResources(MOCK_RESOURCES);
      fireEvent.press(utils.getByTestId('resources-toggle'));
      await expect(
        act(async () => {
          fireEvent.press(utils.getByTestId('resource-item-spec-sheet'));
        }),
      ).resolves.not.toThrow();
    });

    it('does not throw when WebBrowser.openBrowserAsync rejects', async () => {
      (WebBrowser.openBrowserAsync as jest.Mock).mockRejectedValue(new Error('browser failed'));
      const utils = renderResources(MOCK_RESOURCES);
      fireEvent.press(utils.getByTestId('resources-toggle'));
      await expect(
        act(async () => {
          fireEvent.press(utils.getByTestId('resource-item-return-policy'));
        }),
      ).resolves.not.toThrow();
    });
  });
});

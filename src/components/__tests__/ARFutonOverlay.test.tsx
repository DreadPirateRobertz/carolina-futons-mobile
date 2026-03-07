import React from 'react';
import { render } from '@testing-library/react-native';

import { ARFutonOverlay } from '../ARFutonOverlay';
import { FUTON_MODELS, FABRICS } from '@/data/futons';
import type { ShadowParams, ModelShadingParams } from '@/services/lightingEstimation';

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => {
  return {
    Gesture: {
      Pan: () => ({ onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }),
      Pinch: () => ({ onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }),
      Rotation: () => ({ onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }),
      Simultaneous: () => ({}),
    },
    GestureDetector: ({ children }: any) => children,
  };
});

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    withSpring: (val: any) => val,
    withTiming: (val: any) => val,
    Easing: { out: () => ({}), quad: {} },
  };
});

const asheville = FUTON_MODELS[0];
const blueRidge = FUTON_MODELS[1];
const pisgah = FUTON_MODELS[2];
const naturalLinen = FABRICS[0];

describe('ARFutonOverlay', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          testID="overlay"
        />,
      );
      expect(getByTestId('overlay')).toBeTruthy();
    });

    it('renders with each futon model', () => {
      for (const model of FUTON_MODELS) {
        const { getByTestId, unmount } = render(
          <ARFutonOverlay
            model={model}
            fabric={naturalLinen}
            showDimensions={false}
            testID="overlay"
          />,
        );
        expect(getByTestId('overlay')).toBeTruthy();
        unmount();
      }
    });

    it('renders with each fabric', () => {
      for (const fabric of FABRICS) {
        const { getByTestId, unmount } = render(
          <ARFutonOverlay
            model={asheville}
            fabric={fabric}
            showDimensions={false}
            testID="overlay"
          />,
        );
        expect(getByTestId('overlay')).toBeTruthy();
        unmount();
      }
    });

    it('shows model name badge', () => {
      const { getByText } = render(
        <ARFutonOverlay model={asheville} fabric={naturalLinen} showDimensions={false} />,
      );
      expect(getByText('The Asheville')).toBeTruthy();
    });

    it('shows correct model name for each model', () => {
      for (const model of FUTON_MODELS) {
        const { getByText, unmount } = render(
          <ARFutonOverlay model={model} fabric={naturalLinen} showDimensions={false} />,
        );
        expect(getByText(model.name)).toBeTruthy();
        unmount();
      }
    });
  });

  describe('Dimensions', () => {
    it('hides dimensions when showDimensions is false', () => {
      const { queryByText } = render(
        <ARFutonOverlay model={asheville} fabric={naturalLinen} showDimensions={false} />,
      );
      expect(queryByText(/W$/)).toBeNull();
      expect(queryByText(/D$/)).toBeNull();
      expect(queryByText(/H$/)).toBeNull();
    });

    it('shows W/D/H dimensions when showDimensions is true', () => {
      const { getByText } = render(
        <ARFutonOverlay model={asheville} fabric={naturalLinen} showDimensions={true} />,
      );
      // Asheville: 54" W = 4'6" W, 34" D = 2'10" D, 33" H = 2'9" H
      expect(getByText('4\'6" W')).toBeTruthy();
      expect(getByText('2\'10" D')).toBeTruthy();
      expect(getByText('2\'9" H')).toBeTruthy();
    });

    it('shows correct dimensions for Blue Ridge model', () => {
      const { getByText } = render(
        <ARFutonOverlay model={blueRidge} fabric={naturalLinen} showDimensions={true} />,
      );
      // Blue Ridge: 60" W = 5' W, 36" D = 3' D, 35" H = 2'11" H
      expect(getByText("5' W")).toBeTruthy();
      expect(getByText("3' D")).toBeTruthy();
      expect(getByText('2\'11" H')).toBeTruthy();
    });

    it('shows correct dimensions for Pisgah model', () => {
      const { getByText } = render(
        <ARFutonOverlay model={pisgah} fabric={naturalLinen} showDimensions={true} />,
      );
      // Pisgah: 39" W = 3'3" W, 32" D = 2'8" D, 31" H = 2'7" H
      expect(getByText('3\'3" W')).toBeTruthy();
      expect(getByText('2\'8" D')).toBeTruthy();
      expect(getByText('2\'7" H')).toBeTruthy();
    });
  });

  describe('Cross-model/fabric combinations', () => {
    it('renders every model × fabric combination without error', () => {
      let rendered = 0;
      for (const model of FUTON_MODELS) {
        for (const fabric of FABRICS) {
          const { getByText, unmount } = render(
            <ARFutonOverlay model={model} fabric={fabric} showDimensions={false} />,
          );
          expect(getByText(model.name)).toBeTruthy();
          unmount();
          rendered++;
        }
      }
      // 4 models × 8 fabrics = 32 combinations
      expect(rendered).toBe(FUTON_MODELS.length * FABRICS.length);
    });

    it('renders every model with dimensions without error', () => {
      for (const model of FUTON_MODELS) {
        const { getByText, unmount } = render(
          <ARFutonOverlay model={model} fabric={naturalLinen} showDimensions={true} />,
        );
        expect(getByText(model.name)).toBeTruthy();
        // Should have W, D, H labels
        expect(getByText(/W$/)).toBeTruthy();
        expect(getByText(/D$/)).toBeTruthy();
        expect(getByText(/H$/)).toBeTruthy();
        unmount();
      }
    });
  });

  describe('Tap-to-place visibility', () => {
    it('renders with full opacity when isPlaced is true', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          isPlaced={true}
          testID="overlay"
        />,
      );
      const overlay = getByTestId('overlay');
      const style = overlay.props.style;
      // Animated style should include opacity: 1
      const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flatStyle.opacity).toBe(1);
    });

    it('renders with zero opacity when isPlaced is false', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          isPlaced={false}
          testID="overlay"
        />,
      );
      const overlay = getByTestId('overlay');
      const style = overlay.props.style;
      const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flatStyle.opacity).toBe(0);
    });

    it('defaults to visible when isPlaced is not specified', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          testID="overlay"
        />,
      );
      const overlay = getByTestId('overlay');
      const style = overlay.props.style;
      const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flatStyle.opacity).toBe(1);
    });
  });

  describe('Murphy bed snap-to-wall', () => {
    it('shows snap-to-wall hint for murphy-beds category', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          category="murphy-beds"
          testID="overlay"
        />,
      );
      expect(getByTestId('ar-snap-badge')).toBeTruthy();
    });

    it('does not show snap badge for futons category', () => {
      const { queryByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          category="futons"
          testID="overlay"
        />,
      );
      expect(queryByTestId('ar-snap-badge')).toBeNull();
    });

    it('does not show snap badge when no category specified', () => {
      const { queryByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          testID="overlay"
        />,
      );
      expect(queryByTestId('ar-snap-badge')).toBeNull();
    });

    it('snap badge shows correct text', () => {
      const { getByText } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          category="murphy-beds"
        />,
      );
      expect(getByText('Drag near wall to snap')).toBeTruthy();
    });
  });

  describe('Shadow opacity', () => {
    it('renders with custom shadow opacity', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          shadowOpacity={0.4}
          testID="overlay"
        />,
      );
      expect(getByTestId('overlay')).toBeTruthy();
    });

    it('uses default shadow opacity when not specified', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          testID="overlay"
        />,
      );
      expect(getByTestId('ar-dynamic-shadow')).toBeTruthy();
    });

    it('renders with zero shadow opacity', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          shadowOpacity={0}
          testID="overlay"
        />,
      );
      expect(getByTestId('ar-dynamic-shadow')).toBeTruthy();
    });
  });

  describe('Lighting-driven shading', () => {
    const brightShadow: ShadowParams = {
      opacity: 0.12,
      blur: 12,
      offsetX: -2.4,
      offsetY: 6.4,
      color: 'rgba(0, 0, 10, 0.12)',
    };

    const brightShading: ModelShadingParams = {
      brightness: 1.0,
      tintColor: 'rgba(0, 0, 0, 0)',
      tintOpacity: 0,
      shadowIntensity: 1.0,
    };

    const dimShading: ModelShadingParams = {
      brightness: 0.6,
      tintColor: 'rgba(255, 180, 80, 0.08)',
      tintOpacity: 0.08,
      shadowIntensity: 0.4,
    };

    it('renders with full shadowParams and modelShading', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          shadowParams={brightShadow}
          modelShading={brightShading}
          testID="overlay"
        />,
      );
      expect(getByTestId('overlay')).toBeTruthy();
      expect(getByTestId('ar-dynamic-shadow')).toBeTruthy();
    });

    it('shows lighting tint overlay when tintOpacity > 0', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          modelShading={dimShading}
          testID="overlay"
        />,
      );
      expect(getByTestId('ar-lighting-tint')).toBeTruthy();
    });

    it('hides lighting tint when tintOpacity is 0', () => {
      const { queryByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          modelShading={brightShading}
          testID="overlay"
        />,
      );
      expect(queryByTestId('ar-lighting-tint')).toBeNull();
    });

    it('renders without modelShading (backwards compatible)', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          testID="overlay"
        />,
      );
      expect(getByTestId('overlay')).toBeTruthy();
    });
  });

  describe('Dynamic shadow', () => {
    it('renders dynamic shadow element', () => {
      const { getByTestId } = render(
        <ARFutonOverlay
          model={asheville}
          fabric={naturalLinen}
          showDimensions={false}
          testID="overlay"
        />,
      );
      expect(getByTestId('ar-dynamic-shadow')).toBeTruthy();
    });

    it('renders dynamic shadow for every model', () => {
      for (const model of FUTON_MODELS) {
        const { getByTestId, unmount } = render(
          <ARFutonOverlay model={model} fabric={naturalLinen} showDimensions={false} />,
        );
        expect(getByTestId('ar-dynamic-shadow')).toBeTruthy();
        unmount();
      }
    });
  });
});

import React from 'react';
import { render } from '@testing-library/react-native';

import { CartIllustration } from '../CartIllustration';
import { SearchIllustration } from '../SearchIllustration';
import { WishlistIllustration } from '../WishlistIllustration';
import { ReviewsIllustration } from '../ReviewsIllustration';
import { CategoryIllustration } from '../CategoryIllustration';
import { ErrorIllustration } from '../ErrorIllustration';
import { NotFoundIllustration } from '../NotFoundIllustration';
import { StreamIllustration } from '../StreamIllustration';

const ALL_ILLUSTRATIONS = [
  { name: 'CartIllustration', Component: CartIllustration },
  { name: 'SearchIllustration', Component: SearchIllustration },
  { name: 'WishlistIllustration', Component: WishlistIllustration },
  { name: 'ReviewsIllustration', Component: ReviewsIllustration },
  { name: 'CategoryIllustration', Component: CategoryIllustration },
  { name: 'ErrorIllustration', Component: ErrorIllustration },
  { name: 'NotFoundIllustration', Component: NotFoundIllustration },
  { name: 'StreamIllustration', Component: StreamIllustration },
];

describe('Blue Ridge Illustrations', () => {
  describe.each(ALL_ILLUSTRATIONS)('$name', ({ Component }) => {
    it('renders without crashing', () => {
      const { toJSON } = render(<Component />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders an Svg root element', () => {
      const { toJSON } = render(<Component />);
      const tree = toJSON();
      expect(tree).not.toBeNull();
      expect(tree!.type).toBe('Svg');
    });

    it('accepts width and height props', () => {
      const { toJSON } = render(<Component width={200} height={150} />);
      const tree = toJSON();
      expect(tree!.props.width).toBe(200);
      expect(tree!.props.height).toBe(150);
    });

    it('has default dimensions', () => {
      const { toJSON } = render(<Component />);
      const tree = toJSON();
      expect(tree!.props.width).toBeDefined();
      expect(tree!.props.height).toBeDefined();
    });

    it('passes testID to Svg element', () => {
      const { getByTestId } = render(<Component testID="test-illustration" />);
      expect(getByTestId('test-illustration')).toBeTruthy();
    });

    it('has at least 5 Path elements for mountain depth', () => {
      const { toJSON } = render(<Component />);
      const json = JSON.stringify(toJSON());
      const paths = json.match(/"type":"Path"/g) || [];
      expect(paths.length).toBeGreaterThanOrEqual(5);
    });

    it('has at least 4 gradient stops for rich sky', () => {
      const { toJSON } = render(<Component />);
      const json = JSON.stringify(toJSON());
      const stops = json.match(/"type":"Stop"/g) || [];
      expect(stops.length).toBeGreaterThanOrEqual(4);
    });
  });
});

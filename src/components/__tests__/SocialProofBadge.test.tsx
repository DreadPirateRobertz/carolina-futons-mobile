/**
 * Tests for SocialProofBadge — hq-5yo88
 *
 * Renders "X sold this week" badge and review excerpt on PDP.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { SocialProofBadge } from '../SocialProofBadge';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      sandLight: '#F2E8D5',
      sandDark: '#D4BC96',
      espresso: '#3A2518',
      espressoLight: '#5C4033',
      mountainBlue: '#5B8FA8',
      sunsetCoral: '#E8845C',
      success: '#4A7C59',
      offWhite: '#FAF7F2',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    borderRadius: { sm: 4, md: 8, lg: 16 },
    typography: {
      bodyFamily: 'System',
      headingFamily: 'System',
    },
  }),
}));

describe('SocialProofBadge', () => {
  // --- Sold count ---

  describe('sold count badge', () => {
    it('renders sold count when > 0', () => {
      const { getByText } = render(
        <SocialProofBadge soldThisWeek={12} topReview={null} isLoading={false} />,
      );
      expect(getByText(/12 sold this week/i)).toBeTruthy();
    });

    it('does NOT render sold badge when soldThisWeek is 0', () => {
      const { queryByText } = render(
        <SocialProofBadge soldThisWeek={0} topReview={null} isLoading={false} />,
      );
      expect(queryByText(/sold this week/i)).toBeNull();
    });

    it('does NOT render sold badge when soldThisWeek is undefined', () => {
      const { queryByText } = render(
        <SocialProofBadge topReview={null} isLoading={false} />,
      );
      expect(queryByText(/sold this week/i)).toBeNull();
    });

    it('has testID for sold badge', () => {
      const { getByTestId } = render(
        <SocialProofBadge soldThisWeek={5} topReview={null} isLoading={false} />,
      );
      expect(getByTestId('sold-this-week-badge')).toBeTruthy();
    });
  });

  // --- Review excerpt ---

  describe('review excerpt', () => {
    const review = {
      authorName: 'Jane D.',
      rating: 5,
      body: 'Best futon we ever bought! Super comfortable.',
    };

    it('renders review excerpt when available', () => {
      const { getByText } = render(
        <SocialProofBadge soldThisWeek={0} topReview={review} isLoading={false} />,
      );
      expect(getByText(/Jane D\./)).toBeTruthy();
      expect(getByText(/Best futon/)).toBeTruthy();
    });

    it('renders star rating for review', () => {
      const { getByTestId } = render(
        <SocialProofBadge soldThisWeek={0} topReview={review} isLoading={false} />,
      );
      expect(getByTestId('review-excerpt-rating')).toBeTruthy();
    });

    it('does NOT render excerpt when topReview is null', () => {
      const { queryByTestId } = render(
        <SocialProofBadge soldThisWeek={5} topReview={null} isLoading={false} />,
      );
      expect(queryByTestId('review-excerpt')).toBeNull();
    });

    it('truncates long review body', () => {
      const longReview = {
        ...review,
        body: 'A'.repeat(200),
      };
      const { getByTestId } = render(
        <SocialProofBadge soldThisWeek={0} topReview={longReview} isLoading={false} />,
      );
      const excerpt = getByTestId('review-excerpt-body');
      // numberOfLines prop should truncate
      expect(excerpt.props.numberOfLines).toBe(2);
    });

    it('has testID for review excerpt container', () => {
      const { getByTestId } = render(
        <SocialProofBadge soldThisWeek={0} topReview={review} isLoading={false} />,
      );
      expect(getByTestId('review-excerpt')).toBeTruthy();
    });
  });

  // --- Loading state ---

  describe('loading state', () => {
    it('renders loading skeleton when isLoading is true', () => {
      const { getByTestId } = render(
        <SocialProofBadge isLoading={true} topReview={null} />,
      );
      expect(getByTestId('social-proof-loading')).toBeTruthy();
    });

    it('does NOT render content when loading', () => {
      const { queryByTestId } = render(
        <SocialProofBadge soldThisWeek={5} topReview={{ authorName: 'X', rating: 5, body: 'Y' }} isLoading={true} />,
      );
      expect(queryByTestId('sold-this-week-badge')).toBeNull();
      expect(queryByTestId('review-excerpt')).toBeNull();
    });
  });

  // --- Both signals ---

  describe('combined display', () => {
    it('renders both sold badge and review excerpt', () => {
      const review = { authorName: 'Jane D.', rating: 5, body: 'Amazing!' };
      const { getByTestId, getByText } = render(
        <SocialProofBadge soldThisWeek={8} topReview={review} isLoading={false} />,
      );
      expect(getByTestId('sold-this-week-badge')).toBeTruthy();
      expect(getByTestId('review-excerpt')).toBeTruthy();
      expect(getByText(/8 sold this week/i)).toBeTruthy();
    });

    it('renders nothing when both signals empty and not loading', () => {
      const { queryByTestId } = render(
        <SocialProofBadge soldThisWeek={0} topReview={null} isLoading={false} />,
      );
      expect(queryByTestId('social-proof-container')).toBeNull();
    });
  });

  // --- Accessibility ---

  describe('accessibility', () => {
    it('sold badge has accessible label', () => {
      const { getByLabelText } = render(
        <SocialProofBadge soldThisWeek={12} topReview={null} isLoading={false} />,
      );
      expect(getByLabelText(/12 sold this week/i)).toBeTruthy();
    });
  });
});

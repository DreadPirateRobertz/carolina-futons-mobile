/**
 * @module QuestionCard
 *
 * Displays a single product Q&A entry — cm-wf3.
 *
 * Shows: question text, author, date, answered/awaiting badge,
 * and the answer body (only when answered).
 */
import React, { memo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/theme';
import type { ProductQuestion } from '@/hooks/useProductQA';

interface QuestionCardProps {
  question: ProductQuestion;
  testID?: string;
}

export const QuestionCard = memo(function QuestionCard({ question, testID }: QuestionCardProps) {
  const { colors, borderRadius, typography } = useTheme();
  const base = testID ?? 'question-card';

  return (
    <View
      style={[styles.card, { backgroundColor: colors.sandDark, borderRadius: borderRadius.md ?? 12 }]}
      testID={base}
    >
      {/* Question row */}
      <View style={styles.row}>
        <Text
          style={[styles.question, { color: colors.espresso, fontFamily: typography.bodyFamilyBold }]}
          testID={`${base}-question`}
        >
          {question.question}
        </Text>
        {question.answered ? (
          <View style={[styles.badge, { backgroundColor: colors.sunsetCoral }]} testID={`${base}-answered-badge`}>
            <Text style={styles.badgeText}>Answered</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: colors.overlay }]} testID={`${base}-awaiting`}>
            <Text style={[styles.badgeText, { color: colors.espressoLight }]}>Awaiting answer</Text>
          </View>
        )}
      </View>

      {/* Answer body — only when answered */}
      {question.answered && question.answer ? (
        <Text
          style={[styles.answer, { color: colors.espresso }]}
          testID={`${base}-answer`}
        >
          {question.answer}
        </Text>
      ) : null}

      {/* Author + date */}
      <Text style={[styles.meta, { color: colors.espressoLight }]} testID={`${base}-author`}>
        {question.authorName}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  question: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
  },
});

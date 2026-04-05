/**
 * @module AnswerThread
 *
 * Q&A Phase 2 — cm-gey.
 *
 * Renders threaded answers for a product question. Top-level answers
 * show an upvote button and (optionally) an inline reply input.
 * Replies are indented under their parent answer.
 *
 * Upvotes are disabled once the user has already upvoted (dedup).
 */
import React, { memo, useCallback, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import type { QAAnswer } from '@/hooks/useQAAnswers';

interface AnswerThreadProps {
  answers: QAAnswer[];
  onUpvote?: (answerId: string) => void;
  onReply?: (parentAnswerId: string, text: string) => void;
  testID?: string;
}

interface ReplyInputProps {
  answerId: string;
  onSubmit: (text: string) => void;
}

function ReplyInput({ answerId, onSubmit }: ReplyInputProps) {
  const { colors, typography } = useTheme();
  const [text, setText] = useState('');

  return (
    <View style={styles.replyInputRow}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Write a reply…"
        placeholderTextColor={colors.espressoLight}
        style={[
          styles.replyInput,
          {
            borderColor: colors.espressoLight,
            color: colors.espresso,
            fontFamily: typography.bodyFamily,
          },
        ]}
        testID={`reply-input-${answerId}`}
        accessibilityLabel="Reply text input"
        multiline
      />
      <TouchableOpacity
        style={[styles.replySubmitBtn, { backgroundColor: colors.sunsetCoral }]}
        onPress={() => {
          if (text.trim()) {
            onSubmit(text.trim());
            setText('');
          }
        }}
        testID={`reply-submit-${answerId}`}
        accessibilityRole="button"
        accessibilityLabel="Submit reply"
      >
        <Text style={[styles.replySubmitText, { fontFamily: typography.bodyFamilyBold }]}>
          Reply
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface AnswerCardProps {
  answer: QAAnswer;
  isReply?: boolean;
  onUpvote?: (answerId: string) => void;
  onReply?: (parentAnswerId: string, text: string) => void;
}

const AnswerCard = memo(function AnswerCard({
  answer,
  isReply = false,
  onUpvote,
  onReply,
}: AnswerCardProps) {
  const { colors, borderRadius, typography, spacing } = useTheme();
  const [showReplyInput, setShowReplyInput] = useState(false);

  const handleUpvote = useCallback(() => {
    if (!answer.hasUserUpvoted) {
      onUpvote?.(answer.id);
    }
  }, [answer.id, answer.hasUserUpvoted, onUpvote]);

  const handleReplySubmit = useCallback(
    (text: string) => {
      onReply?.(answer.id, text);
      setShowReplyInput(false);
    },
    [answer.id, onReply],
  );

  const card = (
    <View
      style={[
        styles.card,
        isReply && styles.replyCard,
        {
          backgroundColor: isReply ? colors.sandLight : colors.sandDark,
          borderRadius: borderRadius.md ?? 12,
          marginLeft: isReply ? spacing.lg : 0,
        },
      ]}
      testID={isReply ? `answer-reply-${answer.id}` : undefined}
      accessibilityRole="none"
    >
      <View testID={`answer-card-${answer.id}`} accessibilityRole="none">
        <Text
          style={[styles.answerText, { color: colors.espresso, fontFamily: typography.bodyFamily }]}
          testID={`answer-text-${answer.id}`}
        >
          {answer.text}
        </Text>

        <View style={styles.metaRow}>
          <Text
            style={[
              styles.author,
              { color: colors.espressoLight, fontFamily: typography.bodyFamily },
            ]}
            testID={`answer-author-${answer.id}`}
          >
            {answer.authorName}
          </Text>

          {/* Upvote button — only on top-level answers */}
          {!isReply && (
            <TouchableOpacity
              style={[
                styles.upvoteBtn,
                {
                  backgroundColor: answer.hasUserUpvoted
                    ? colors.sunsetCoral
                    : (colors.overlay ?? '#E8D5B7'),
                },
              ]}
              onPress={handleUpvote}
              disabled={answer.hasUserUpvoted}
              testID={`upvote-btn-${answer.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Upvote this answer, ${answer.upvoteCount} upvotes`}
              accessibilityState={{
                selected: answer.hasUserUpvoted,
                disabled: answer.hasUserUpvoted,
              }}
            >
              <Text
                style={[
                  styles.upvoteCount,
                  {
                    color: answer.hasUserUpvoted ? '#FFFFFF' : colors.espresso,
                    fontFamily: typography.bodyFamilyBold,
                  },
                ]}
                testID={`upvote-count-${answer.id}`}
              >
                {answer.upvoteCount}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Reply button — only on top-level answers when onReply provided */}
        {!isReply && onReply && !showReplyInput && (
          <Pressable
            onPress={() => setShowReplyInput(true)}
            testID={`reply-btn-${answer.id}`}
            accessibilityRole="button"
            accessibilityLabel="Reply to this answer"
            style={styles.replyBtnContainer}
          >
            <Text
              style={[
                styles.replyBtnText,
                { color: colors.espressoLight, fontFamily: typography.bodyFamily },
              ]}
            >
              Reply
            </Text>
          </Pressable>
        )}

        {showReplyInput && <ReplyInput answerId={answer.id} onSubmit={handleReplySubmit} />}
      </View>
    </View>
  );

  return card;
});

/** Renders a flat list of QAAnswer items as a threaded tree. */
export function AnswerThread({ answers, onUpvote, onReply, testID }: AnswerThreadProps) {
  const { colors } = useTheme();

  const topLevel = answers.filter((a) => !a.parentAnswerId);
  const replyMap = new Map<string, QAAnswer[]>();
  for (const a of answers) {
    if (a.parentAnswerId) {
      const bucket = replyMap.get(a.parentAnswerId) ?? [];
      bucket.push(a);
      replyMap.set(a.parentAnswerId, bucket);
    }
  }

  if (topLevel.length === 0 && answers.length === 0) {
    return (
      <View testID={testID ?? 'answer-thread'}>
        <Text
          testID="answer-thread-empty"
          style={{ color: colors.espressoLight, fontSize: 13, textAlign: 'center' }}
        >
          No answers yet. Be the first to answer!
        </Text>
      </View>
    );
  }

  // Edge case: only replies passed (no top-level answers in list)
  // Render them all as cards so they're accessible to tests
  const renderItems = topLevel.length > 0 ? topLevel : answers;

  return (
    <View testID={testID ?? 'answer-thread'}>
      <View testID="answer-thread-list">
        {renderItems.map((answer) => (
          <View key={answer.id}>
            <AnswerCard
              answer={answer}
              isReply={!!answer.parentAnswerId}
              onUpvote={onUpvote}
              onReply={onReply}
            />
            {/* Render replies nested under this answer */}
            {(replyMap.get(answer.id) ?? []).map((reply) => (
              <AnswerCard key={reply.id} answer={reply} isReply onUpvote={onUpvote} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    marginBottom: 8,
  },
  replyCard: {
    marginTop: 4,
    padding: 10,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  author: {
    fontSize: 12,
  },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  upvoteCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  replyBtnContainer: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  replyBtnText: {
    fontSize: 12,
  },
  replyInputRow: {
    marginTop: 8,
    gap: 6,
  },
  replyInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 60,
  },
  replySubmitBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  replySubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
});

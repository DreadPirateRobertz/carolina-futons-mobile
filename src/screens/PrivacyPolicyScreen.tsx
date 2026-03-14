/**
 * @module PrivacyPolicyScreen
 *
 * Displays the Carolina Futons privacy policy. Accessible from the Account
 * screen Privacy section. Content matches the hosted version at
 * carolinafutons.com/privacy for App Store compliance.
 */
import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface Props {
  onBack?: () => void;
  testID?: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.section}>
      <Text
        style={[styles.sectionTitle, { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold }]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  const { colors, typography } = useTheme();
  return (
    <Text style={[styles.paragraph, { color: colors.espressoLight, fontFamily: typography.bodyFamily }]}>
      {children}
    </Text>
  );
}

export function PrivacyPolicyScreen({ onBack, testID }: Props) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.sandBase, paddingTop: insets.top }]}
      testID={testID ?? 'privacy-policy-screen'}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              testID="privacy-back"
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Text style={[styles.backText, { color: colors.espresso }]}>{'‹'}</Text>
            </TouchableOpacity>
          )}
          <Text
            style={[styles.title, { color: colors.espresso, fontFamily: typography.headingFamily }]}
          >
            Privacy Policy
          </Text>
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text
            style={[styles.effectiveDate, { color: colors.espressoLight }]}
            testID="privacy-effective-date"
          >
            Effective Date: March 1, 2026
          </Text>

          <Paragraph>
            Carolina Futons, LLC ("we", "our", or "us") operates the Carolina Futons
            mobile application. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our app.
          </Paragraph>

          <Section title="Information We Collect">
            <Paragraph>
              We collect information you provide directly: name, email address,
              shipping address, phone number, and payment details when you create an
              account or make a purchase. We also collect device information (device
              model, OS version), usage data (screens viewed, features used), and
              camera data when you use our AR furniture preview feature. Camera data
              is processed on-device and is not stored or transmitted to our servers.
            </Paragraph>
          </Section>

          <Section title="How We Use Your Information">
            <Paragraph>
              We use your information to: process and fulfill orders, provide customer
              support, send order updates and shipping notifications, personalize your
              shopping experience, improve our app and services, send promotional
              communications (with your consent), and detect and prevent fraud.
            </Paragraph>
          </Section>

          <Section title="Data Sharing">
            <Paragraph>
              We share your information with: payment processors (Stripe) to process
              transactions, shipping carriers to deliver orders, analytics providers
              (Mixpanel) to improve our service, and crash reporting services (Sentry)
              to fix bugs. We do not sell your personal information to third parties.
            </Paragraph>
          </Section>

          <Section title="Data Security">
            <Paragraph>
              We implement industry-standard security measures including encrypted
              data transmission (TLS 1.3), secure payment processing (PCI DSS
              compliant via Stripe), biometric authentication for sensitive operations,
              and encrypted local storage for saved credentials. No method of
              electronic transmission is 100% secure, but we strive to protect your
              personal information.
            </Paragraph>
          </Section>

          <Section title="Your Rights">
            <Paragraph>
              You have the right to: access your personal data via the "Export My Data"
              feature in Account settings, request deletion of your account and
              associated data, opt out of promotional communications at any time, and
              disable push notifications in your device settings. California residents
              have additional rights under the CCPA, including the right to know what
              personal information is collected and the right to request deletion.
            </Paragraph>
          </Section>

          <Section title="Children's Privacy">
            <Paragraph>
              Our app is not intended for children under 13. We do not knowingly
              collect personal information from children under 13. If you believe we
              have collected information from a child under 13, please contact us
              immediately.
            </Paragraph>
          </Section>

          <Section title="Changes to This Policy">
            <Paragraph>
              We may update this Privacy Policy from time to time. We will notify you
              of any changes by posting the new policy in the app and updating the
              effective date. Continued use of the app after changes constitutes
              acceptance of the updated policy.
            </Paragraph>
          </Section>

          <Section title="Contact Us">
            <Paragraph>
              If you have questions about this Privacy Policy or our data practices,
              contact us at privacy@carolinafutons.com or write to: Carolina Futons,
              LLC, 123 Haywood Street, Asheville, NC 28801.
            </Paragraph>
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 4,
    paddingRight: 4,
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  effectiveDate: {
    fontSize: 13,
    marginBottom: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
});

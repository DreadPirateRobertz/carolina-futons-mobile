/**
 * @module CheckoutScreen
 *
 * Final step before purchase. Collects shipping/billing address, displays
 * order summary with totals (free-shipping threshold logic), payment method
 * picker (Apple Pay / Google Pay, credit card via Stripe CardField, and BNPL
 * via Affirm/Klarna), and validates all fields before submission.
 *
 * Haptic feedback reinforces selection and success states on native.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { CardField, type CardFieldInput, PlatformPayButton, PlatformPay } from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { typography } from '@/theme/tokens';
import { useCart } from '@/hooks/useCart';
import { usePayment } from '@/hooks/usePayment';
import { formatPrice } from '@/utils';
import type { PaymentMethod } from '@/services/payment';
import type { OrderConfirmation } from '@/services/payment';
import { events } from '@/services/analytics';

const SHIPPING_THRESHOLD = 499;

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

interface Address {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressErrors {
  fullName?: string;
  line1?: string;
  city?: string;
  state?: string;
  zip?: string;
}

const EMPTY_ADDRESS: Address = {
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  zip: '',
};

function validateAddress(addr: Address): AddressErrors {
  const errors: AddressErrors = {};
  if (!addr.fullName.trim()) errors.fullName = 'Full name is required';
  if (!addr.line1.trim()) errors.line1 = 'Street address is required';
  if (!addr.city.trim()) errors.city = 'City is required';
  if (!addr.state.trim()) {
    errors.state = 'State is required';
  } else if (!US_STATES.includes(addr.state.toUpperCase())) {
    errors.state = 'Enter a valid 2-letter state code';
  }
  if (!addr.zip.trim()) {
    errors.zip = 'ZIP code is required';
  } else if (!/^\d{5}(-\d{4})?$/.test(addr.zip.trim())) {
    errors.zip = 'Enter a valid ZIP code';
  }
  return errors;
}

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  icon: string;
  description: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  ...(Platform.OS === 'ios'
    ? [
        {
          id: 'apple-pay' as PaymentMethod,
          label: 'Apple Pay',
          icon: '',
          description: 'Pay with Face ID',
        },
      ]
    : [
        {
          id: 'google-pay' as PaymentMethod,
          label: 'Google Pay',
          icon: 'G',
          description: 'Pay with Google',
        },
      ]),
  {
    id: 'affirm',
    label: 'Affirm',
    icon: 'A',
    description: 'Pay over time, 0% APR available',
  },
  {
    id: 'klarna',
    label: 'Klarna',
    icon: 'K',
    description: '4 interest-free payments',
  },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    icon: '',
    description: 'Visa, Mastercard, Amex',
  },
];

interface Props {
  onOrderComplete?: (order: OrderConfirmation) => void;
  onBack?: () => void;
  testID?: string;
}

/** Checkout flow screen with address form, payment selection, card input, and order totals. */
export function CheckoutScreen({ onOrderComplete, onBack, testID }: Props) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { items, subtotal } = useCart();
  const { status, error, totals, isApplePaySupported, processPayment, resetPayment } = usePayment();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [checkoutTracked, setCheckoutTracked] = useState(false);

  // Address state
  const [shippingAddress, setShippingAddress] = useState<Address>(EMPTY_ADDRESS);
  const [billingAddress, setBillingAddress] = useState<Address>(EMPTY_ADDRESS);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [shippingErrors, setShippingErrors] = useState<AddressErrors>({});
  const [billingErrors, setBillingErrors] = useState<AddressErrors>({});

  // Card state
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // Track whether user has attempted to submit (for showing validation)
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const isProcessing = status === 'processing';

  if (!checkoutTracked && items.length > 0) {
    events.beginCheckout(items.length, totals.total);
    setCheckoutTracked(true);
  }

  const updateShippingField = useCallback(
    (field: keyof Address, value: string) => {
      setShippingAddress((prev) => ({ ...prev, [field]: value }));
      if (shippingErrors[field as keyof AddressErrors]) {
        setShippingErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [shippingErrors],
  );

  const updateBillingField = useCallback(
    (field: keyof Address, value: string) => {
      setBillingAddress((prev) => ({ ...prev, [field]: value }));
      if (billingErrors[field as keyof AddressErrors]) {
        setBillingErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [billingErrors],
  );

  const handleSelectMethod = useCallback(
    (method: PaymentMethod) => {
      if (isProcessing) return;
      setSelectedMethod(method);
      if (error) resetPayment();
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    },
    [isProcessing, error, resetPayment],
  );

  const handleCardChange = useCallback((details: CardFieldInput.Details) => {
    setCardComplete(details.complete);
    if (details.complete) {
      setCardError(null);
    }
  }, []);

  const validateForm = useCallback((): boolean => {
    let isValid = true;

    // Validate shipping address
    const shipErrors = validateAddress(shippingAddress);
    setShippingErrors(shipErrors);
    if (Object.keys(shipErrors).length > 0) isValid = false;

    // Validate billing address (if different)
    if (!billingSameAsShipping) {
      const billErrors = validateAddress(billingAddress);
      setBillingErrors(billErrors);
      if (Object.keys(billErrors).length > 0) isValid = false;
    }

    // Validate card if card payment selected
    if (selectedMethod === 'card' && !cardComplete) {
      setCardError('Please enter valid card details');
      isValid = false;
    }

    return isValid;
  }, [shippingAddress, billingAddress, billingSameAsShipping, selectedMethod, cardComplete]);

  const handlePlaceOrder = useCallback(async () => {
    if (!selectedMethod || isProcessing) return;

    setSubmitAttempted(true);

    if (!validateForm()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const order = await processPayment(selectedMethod);

    if (order) {
      events.purchase(order.orderId, totals.total, items.length);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onOrderComplete?.(order);
    }
  }, [selectedMethod, isProcessing, validateForm, processPayment, onOrderComplete, totals.total, items.length]);

  const handleApplePay = useCallback(async () => {
    if (isProcessing) return;

    setSubmitAttempted(true);
    if (!validateForm()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSelectedMethod('apple-pay');
    const order = await processPayment('apple-pay');

    if (order) {
      events.purchase(order.orderId, totals.total, items.length);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onOrderComplete?.(order);
    }
  }, [isProcessing, validateForm, processPayment, onOrderComplete, totals.total, items.length]);

  const isBNPL = selectedMethod === 'affirm' || selectedMethod === 'klarna';

  const renderAddressField = (
    label: string,
    value: string,
    fieldError: string | undefined,
    onChange: (text: string) => void,
    options: {
      testIDPrefix: string;
      fieldName: string;
      placeholder?: string;
      keyboardType?: 'default' | 'numeric';
      autoCapitalize?: 'none' | 'words' | 'sentences';
      autoComplete?: string;
      maxLength?: number;
    },
  ) => (
    <View style={styles.fieldGroup} key={`${options.testIDPrefix}-${options.fieldName}`}>
      <Text
        style={[
          styles.fieldLabel,
          { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold },
        ]}
      >
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.sandLight,
            color: colors.espresso,
            borderRadius: borderRadius.md,
            borderColor: fieldError ? colors.error : colors.sandDark,
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={options.placeholder ?? label}
        placeholderTextColor={colors.muted}
        keyboardType={options.keyboardType ?? 'default'}
        autoCapitalize={options.autoCapitalize ?? 'words'}
        maxLength={options.maxLength}
        editable={!isProcessing}
        testID={`${options.testIDPrefix}-${options.fieldName}`}
        accessibilityLabel={label}
      />
      {fieldError && (
        <Text
          style={[styles.fieldError, { color: colors.error }]}
          testID={`${options.testIDPrefix}-${options.fieldName}-error`}
        >
          {fieldError}
        </Text>
      )}
    </View>
  );

  const renderAddressForm = (
    address: Address,
    errors: AddressErrors,
    onUpdate: (field: keyof Address, value: string) => void,
    testIDPrefix: string,
  ) => (
    <View testID={`${testIDPrefix}-form`}>
      {renderAddressField('Full Name', address.fullName, errors.fullName, (t) => onUpdate('fullName', t), {
        testIDPrefix,
        fieldName: 'fullName',
        placeholder: 'John Doe',
        autoComplete: 'name',
      })}
      {renderAddressField('Street Address', address.line1, errors.line1, (t) => onUpdate('line1', t), {
        testIDPrefix,
        fieldName: 'line1',
        placeholder: '123 Main St',
        autoComplete: 'street-address',
      })}
      {renderAddressField('Apt, Suite, etc. (optional)', address.line2, undefined, (t) => onUpdate('line2', t), {
        testIDPrefix,
        fieldName: 'line2',
        placeholder: 'Apt 4B',
      })}
      <View style={styles.rowFields}>
        <View style={styles.cityField}>
          {renderAddressField('City', address.city, errors.city, (t) => onUpdate('city', t), {
            testIDPrefix,
            fieldName: 'city',
            placeholder: 'Asheville',
            autoComplete: 'postal-address-locality',
          })}
        </View>
        <View style={styles.stateField}>
          {renderAddressField('State', address.state, errors.state, (t) => onUpdate('state', t.toUpperCase()), {
            testIDPrefix,
            fieldName: 'state',
            placeholder: 'NC',
            autoCapitalize: 'none',
            maxLength: 2,
          })}
        </View>
        <View style={styles.zipField}>
          {renderAddressField('ZIP', address.zip, errors.zip, (t) => onUpdate('zip', t), {
            testIDPrefix,
            fieldName: 'zip',
            placeholder: '28801',
            keyboardType: 'numeric',
            autoComplete: 'postal-code',
            maxLength: 10,
          })}
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.sandBase }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID ?? 'checkout-screen'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            disabled={isProcessing}
            testID="checkout-back-button"
            accessibilityLabel="Go back to cart"
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.backText,
                { color: isProcessing ? colors.muted : colors.espresso },
              ]}
            >
              {'‹'}
            </Text>
          </TouchableOpacity>
        )}
        <Text
          style={[styles.headerTitle, { color: colors.espresso, fontFamily: typography.headingFamily }]}
          accessibilityRole="header"
          testID="checkout-header"
        >
          Checkout
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isProcessing}
        keyboardShouldPersistTaps="handled"
      >
        {/* Shipping Address */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text
            style={[styles.sectionTitle, { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold }]}
            testID="shipping-address-title"
          >
            Shipping Address
          </Text>
          {renderAddressForm(shippingAddress, shippingErrors, updateShippingField, 'shipping')}
        </View>

        {/* Billing / Shipping Toggle */}
        <View
          style={[
            styles.toggleRow,
            {
              marginHorizontal: spacing.lg,
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.md,
            },
          ]}
          testID="billing-toggle-row"
        >
          <Text style={[styles.toggleLabel, { color: colors.espresso }]}>
            Billing same as shipping
          </Text>
          <Switch
            value={billingSameAsShipping}
            onValueChange={(val) => {
              setBillingSameAsShipping(val);
              if (val) setBillingErrors({});
            }}
            disabled={isProcessing}
            trackColor={{ false: colors.sandDark, true: colors.mountainBlueLight }}
            thumbColor={billingSameAsShipping ? colors.mountainBlue : colors.muted}
            testID="billing-same-toggle"
            accessibilityLabel="Use shipping address for billing"
            accessibilityRole="switch"
          />
        </View>

        {/* Billing Address (if different) */}
        {!billingSameAsShipping && (
          <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
            <Text
              style={[styles.sectionTitle, { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold }]}
              testID="billing-address-title"
            >
              Billing Address
            </Text>
            {renderAddressForm(billingAddress, billingErrors, updateBillingField, 'billing')}
          </View>
        )}

        {/* Order items summary */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text
            style={[styles.sectionTitle, { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold }]}
            testID="checkout-items-section-title"
          >
            Items ({items.length})
          </Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow} testID={`checkout-item-${item.id}`}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.espresso }]}>{item.model.name}</Text>
                <Text style={[styles.itemDetail, { color: colors.espressoLight }]}>
                  {item.fabric.name} x{item.quantity}
                </Text>
              </View>
              <Text style={[styles.itemPrice, { color: colors.espresso }]}>
                {formatPrice(item.unitPrice * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View
          style={[
            styles.totalsCard,
            {
              backgroundColor: colors.sandLight,
              borderRadius: borderRadius.card,
              marginHorizontal: spacing.lg,
            },
            shadows.card,
          ]}
          testID="checkout-totals"
        >
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.espresso }]}>
              {formatPrice(totals.subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Shipping</Text>
            <Text
              style={[
                styles.totalValue,
                { color: totals.shipping === 0 ? colors.success : colors.espresso },
              ]}
            >
              {totals.shipping === 0 ? 'FREE' : formatPrice(totals.shipping)}
            </Text>
          </View>
          {subtotal < SHIPPING_THRESHOLD && subtotal > 0 && (
            <Text style={[styles.shippingNote, { color: colors.mountainBlue }]}>
              Free shipping on orders over {formatPrice(SHIPPING_THRESHOLD)}
            </Text>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Tax</Text>
            <Text style={[styles.totalValue, { color: colors.espresso }]}>
              {formatPrice(totals.tax)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.sandDark }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.grandTotalLabel, { color: colors.espresso }]}>Total</Text>
            <Text
              style={[styles.grandTotalValue, { color: colors.espresso, fontFamily: typography.headingFamily }]}
              testID="checkout-total"
            >
              {formatPrice(totals.total)}
            </Text>
          </View>
        </View>

        {/* Apple Pay Quick Button */}
        {Platform.OS === 'ios' && isApplePaySupported && (
          <View
            style={[styles.applePaySection, { marginHorizontal: spacing.lg }]}
            testID="apple-pay-section"
          >
            <PlatformPayButton
              type={PlatformPay.ButtonType.Pay}
              appearance={PlatformPay.ButtonStyle.Black}
              borderRadius={borderRadius.button}
              onPress={handleApplePay}
              disabled={isProcessing}
              style={styles.applePayButton}
              testID="apple-pay-button"
            />
            <View style={styles.applePayDivider}>
              <View style={[styles.applePayDividerLine, { backgroundColor: colors.sandDark }]} />
              <Text style={[styles.applePayDividerText, { color: colors.espressoLight }]}>
                or pay another way
              </Text>
              <View style={[styles.applePayDividerLine, { backgroundColor: colors.sandDark }]} />
            </View>
          </View>
        )}

        {/* Payment Methods */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.espresso }]}>Payment Method</Text>
          {PAYMENT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.paymentOption,
                {
                  backgroundColor: colors.sandLight,
                  borderRadius: borderRadius.md,
                  borderColor: selectedMethod === option.id ? colors.mountainBlue : colors.sandDark,
                },
              ]}
              onPress={() => handleSelectMethod(option.id)}
              disabled={isProcessing}
              testID={`payment-${option.id}`}
              accessibilityLabel={`${option.label}: ${option.description}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedMethod === option.id }}
            >
              <View
                style={[
                  styles.radioOuter,
                  {
                    borderColor: selectedMethod === option.id ? colors.mountainBlue : colors.muted,
                  },
                ]}
              >
                {selectedMethod === option.id && (
                  <View style={[styles.radioInner, { backgroundColor: colors.mountainBlue }]} />
                )}
              </View>
              <View style={styles.paymentInfo}>
                <Text style={[styles.paymentLabel, { color: colors.espresso }]}>
                  {option.icon ? `${option.icon} ` : ''}
                  {option.label}
                </Text>
                <Text style={[styles.paymentDesc, { color: colors.espressoLight }]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stripe CardField — shown when card payment selected */}
        {selectedMethod === 'card' && (
          <View
            style={[styles.cardFieldSection, { marginHorizontal: spacing.lg }]}
            testID="card-field-section"
          >
            <Text
              style={[
                styles.fieldLabel,
                { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold, marginBottom: 8 },
              ]}
            >
              Card Details
            </Text>
            <CardField
              postalCodeEnabled={false}
              placeholders={{ number: '4242 4242 4242 4242' }}
              cardStyle={{
                backgroundColor: colors.sandLight,
                textColor: colors.espresso,
                placeholderColor: colors.muted,
                borderColor: cardError ? colors.error : colors.sandDark,
                borderWidth: 1,
                borderRadius: borderRadius.md,
                fontSize: 16,
              }}
              style={styles.cardField}
              onCardChange={handleCardChange}
              testID="stripe-card-field"
            />
            {cardError && (
              <Text
                style={[styles.fieldError, { color: colors.error }]}
                testID="card-field-error"
              >
                {cardError}
              </Text>
            )}
          </View>
        )}

        {/* BNPL breakdown */}
        {isBNPL && (
          <View
            style={[
              styles.bnplBreakdown,
              {
                backgroundColor: colors.mountainBlueLight,
                borderRadius: borderRadius.md,
                marginHorizontal: spacing.lg,
              },
            ]}
            testID="bnpl-breakdown"
          >
            <Text style={[styles.bnplTitle, { color: colors.mountainBlueDark }]}>
              {selectedMethod === 'affirm' ? 'Affirm' : 'Klarna'} Payment Plan
            </Text>
            {selectedMethod === 'klarna' ? (
              <>
                <Text style={[styles.bnplDetail, { color: colors.mountainBlueDark }]}>
                  4 payments of {formatPrice(totals.total / 4)}
                </Text>
                <Text style={[styles.bnplNote, { color: colors.espressoLight }]}>
                  No interest. No fees if paid on time.
                </Text>
              </>
            ) : (
              <Text style={[styles.bnplNote, { color: colors.espressoLight }]}>
                Flexible monthly payments. 0% APR available.
              </Text>
            )}
          </View>
        )}

        {/* Error message */}
        {error && (
          <View
            style={[
              styles.errorCard,
              {
                borderRadius: borderRadius.md,
                marginHorizontal: spacing.lg,
              },
            ]}
            testID="payment-error"
            accessibilityRole="alert"
          >
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Place Order */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
          <TouchableOpacity
            style={[
              styles.placeOrderButton,
              {
                backgroundColor:
                  selectedMethod && !isProcessing ? colors.sunsetCoral : colors.muted,
                borderRadius: borderRadius.button,
              },
              selectedMethod && !isProcessing ? shadows.button : undefined,
            ]}
            onPress={handlePlaceOrder}
            disabled={!selectedMethod || isProcessing}
            testID="place-order-button"
            accessibilityLabel={
              isProcessing
                ? 'Processing payment'
                : selectedMethod
                  ? `Place order for ${formatPrice(totals.total)}`
                  : 'Select a payment method to continue'
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: !selectedMethod || isProcessing }}
          >
            {isProcessing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.placeOrderText, { marginLeft: 10 }]}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.placeOrderText}>
                {selectedMethod
                  ? `Place Order — ${formatPrice(totals.total)}`
                  : 'Select Payment Method'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 12,
  },
  backText: {
    fontSize: 28,
    fontWeight: '300',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 20,
  },
  section: {
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  // Address form fields
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  cityField: {
    flex: 3,
  },
  stateField: {
    flex: 1.5,
  },
  zipField: {
    flex: 2,
  },
  // Billing toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Items
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Totals
  totalsCard: {
    padding: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 15,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  shippingNote: {
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  // Apple Pay
  applePaySection: {
    paddingTop: 4,
  },
  applePayButton: {
    width: '100%',
    height: 50,
  },
  applePayDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  applePayDividerLine: {
    flex: 1,
    height: 1,
  },
  applePayDividerText: {
    fontSize: 13,
    marginHorizontal: 12,
  },
  // Payment
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    marginBottom: 10,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  // Card field
  cardFieldSection: {
    paddingTop: 4,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  // BNPL
  bnplBreakdown: {
    padding: 16,
    alignItems: 'center',
  },
  bnplTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  bnplDetail: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  bnplNote: {
    fontSize: 12,
  },
  // Error
  errorCard: {
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Place order
  placeOrderButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

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
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Platform,
  KeyboardAvoidingView,
  LayoutAnimation,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { BrandedSpinner } from '@/components/BrandedSpinner';
import {
  CardField,
  type CardFieldInput,
  PlatformPayButton,
  PlatformPay,
} from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { typography } from '@/theme/tokens';
import { useCart, type CartItem } from '@/hooks/useCart';
import { usePayment } from '@/hooks/usePayment';
import { formatPrice } from '@/utils';
import type { PaymentMethod } from '@/services/payment';
import type { OrderConfirmation } from '@/services/payment';
import { events } from '@/services/analytics';
import { PremiumBadge } from '@/components/PremiumBadge';
import { usePremium } from '@/hooks/usePremium';
import { useAddressBook, type SavedAddress } from '@/hooks/useAddressBook';

const SHIPPING_THRESHOLD = 499;

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
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
  const {
    status,
    error,
    totals,
    isApplePaySupported,
    isGooglePaySupported,
    processPayment,
    resetPayment,
  } = usePayment();
  const { isPremium } = usePremium();
  const addressBook = useAddressBook();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [checkoutTracked, setCheckoutTracked] = useState(false);
  const [usingSavedAddress, setUsingSavedAddress] = useState(false);
  const [itemsExpandedOverride, setItemsExpandedOverride] = useState<boolean | null>(null);
  const itemsExpanded = itemsExpandedOverride ?? items.length < 3;

  // Address state — pre-fill from default saved address
  const [shippingAddress, setShippingAddress] = useState<Address>(EMPTY_ADDRESS);

  // Pre-fill with default address on load
  useEffect(() => {
    if (!addressBook.loading && addressBook.defaultAddress && !usingSavedAddress) {
      const da = addressBook.defaultAddress;
      setShippingAddress({
        fullName: da.fullName,
        line1: da.line1,
        line2: da.line2,
        city: da.city,
        state: da.state,
        zip: da.zip,
      });
      setUsingSavedAddress(true);
    }
  }, [addressBook.loading, addressBook.defaultAddress]); // eslint-disable-line react-hooks/exhaustive-deps
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

  const handleFieldFocus = useCallback((e: any) => {
    const target = e.nativeEvent?.target;
    if (!scrollRef.current || !target) return;
    setTimeout(() => {
      const scrollNode = findNodeHandle(scrollRef.current);
      if (!scrollNode) return;
      UIManager.measureLayout(
        target,
        scrollNode,
        () => {},
        (_x: number, y: number) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
        },
      );
    }, 150);
  }, []);

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
      addressBook.saveFromCheckout(shippingAddress);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onOrderComplete?.(order);
    }
  }, [
    selectedMethod,
    isProcessing,
    validateForm,
    processPayment,
    onOrderComplete,
    totals.total,
    items.length,
    addressBook,
    shippingAddress,
  ]);

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

  const handleGooglePay = useCallback(async () => {
    if (isProcessing) return;

    setSubmitAttempted(true);
    if (!validateForm()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSelectedMethod('google-pay');
    const order = await processPayment('google-pay');

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
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
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
      {renderAddressField(
        'Full Name',
        address.fullName,
        errors.fullName,
        (t) => onUpdate('fullName', t),
        {
          testIDPrefix,
          fieldName: 'fullName',
          placeholder: 'John Doe',
          autoComplete: 'name',
        },
      )}
      {renderAddressField(
        'Street Address',
        address.line1,
        errors.line1,
        (t) => onUpdate('line1', t),
        {
          testIDPrefix,
          fieldName: 'line1',
          placeholder: '123 Main St',
          autoComplete: 'street-address',
        },
      )}
      {renderAddressField(
        'Apt, Suite, etc. (optional)',
        address.line2,
        undefined,
        (t) => onUpdate('line2', t),
        {
          testIDPrefix,
          fieldName: 'line2',
          placeholder: 'Apt 4B',
        },
      )}
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
          {renderAddressField(
            'State',
            address.state,
            errors.state,
            (t) => onUpdate('state', t.toUpperCase()),
            {
              testIDPrefix,
              fieldName: 'state',
              placeholder: 'NC',
              autoCapitalize: 'none',
              maxLength: 2,
            },
          )}
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
              style={[styles.backText, { color: isProcessing ? colors.muted : colors.espresso }]}
            >
              {'‹'}
            </Text>
          </TouchableOpacity>
        )}
        <Text
          style={[
            styles.headerTitle,
            { color: colors.espresso, fontFamily: typography.headingFamily },
          ]}
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
        {...({ onFocus: handleFieldFocus } as any)}
      >
        {/* Shipping Address */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold },
            ]}
            testID="shipping-address-title"
            accessibilityRole="header"
          >
            Shipping Address
          </Text>

          {/* Saved address picker */}
          {addressBook.addresses.length > 0 && (
            <View style={styles.savedAddressPicker} testID="saved-address-picker">
              {addressBook.addresses.map((saved) => (
                <TouchableOpacity
                  key={saved.id}
                  style={[
                    styles.savedAddressChip,
                    {
                      borderColor:
                        shippingAddress.line1 === saved.line1 && shippingAddress.zip === saved.zip
                          ? colors.sunsetCoral
                          : colors.espressoLight,
                      borderRadius: borderRadius.button,
                    },
                  ]}
                  onPress={() => {
                    setShippingAddress({
                      fullName: saved.fullName,
                      line1: saved.line1,
                      line2: saved.line2,
                      city: saved.city,
                      state: saved.state,
                      zip: saved.zip,
                    });
                    setShippingErrors({});
                  }}
                  testID={`saved-address-${saved.id}`}
                  accessibilityLabel={`Use address: ${saved.line1}, ${saved.city}`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.savedAddressName, { color: colors.espresso }]}
                    numberOfLines={1}
                  >
                    {saved.fullName}
                  </Text>
                  <Text
                    style={[styles.savedAddressLine, { color: colors.espressoLight }]}
                    numberOfLines={1}
                  >
                    {saved.line1}, {saved.city}, {saved.state}
                  </Text>
                  {saved.isDefault && (
                    <Text style={[styles.savedAddressDefault, { color: colors.sunsetCoral }]}>
                      Default
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.savedAddressChip,
                  {
                    borderColor: colors.espressoLight,
                    borderRadius: borderRadius.button,
                    borderStyle: 'dashed',
                  },
                ]}
                onPress={() => {
                  setShippingAddress(EMPTY_ADDRESS);
                  setShippingErrors({});
                }}
                testID="new-address-button"
                accessibilityLabel="Enter new address"
                accessibilityRole="button"
              >
                <Text style={[styles.savedAddressName, { color: colors.espressoLight }]}>
                  + New Address
                </Text>
              </TouchableOpacity>
            </View>
          )}

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
              if (Platform.OS !== 'web') {
                Haptics.selectionAsync();
              }
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
              style={[
                styles.sectionTitle,
                { color: colors.espresso, fontFamily: typography.bodyFamilySemiBold },
              ]}
              testID="billing-address-title"
              accessibilityRole="header"
            >
              Billing Address
            </Text>
            {renderAddressForm(billingAddress, billingErrors, updateBillingField, 'billing')}
          </View>
        )}

        {/* Order items summary */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <TouchableOpacity
            style={styles.itemsSectionHeader}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setItemsExpandedOverride((prev) => !(prev ?? items.length < 3));
            }}
            activeOpacity={items.length < 3 ? 1 : 0.7}
            disabled={items.length < 3}
            testID="checkout-items-toggle"
            accessibilityLabel={`Items (${items.length})${items.length >= 3 ? `, tap to ${itemsExpanded ? 'collapse' : 'expand'}` : ''}`}
            accessibilityRole={items.length >= 3 ? 'button' : 'header'}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.espresso,
                  fontFamily: typography.bodyFamilySemiBold,
                  marginBottom: 0,
                },
              ]}
              testID="checkout-items-section-title"
            >
              Items ({items.length})
            </Text>
            {items.length >= 3 && (
              <Text
                style={[styles.expandToggle, { color: colors.mountainBlue }]}
                testID="items-expand-toggle"
              >
                {itemsExpanded ? 'Hide' : 'Show'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Collapsed preview: stacked thumbnails + count */}
          {!itemsExpanded && items.length >= 3 && (
            <View style={styles.collapsedPreview} testID="items-collapsed-preview">
              <View style={styles.thumbnailStack}>
                {items.slice(0, 3).map((item, i) => (
                  <View
                    key={item.id}
                    style={[styles.stackedThumb, { left: i * 20, zIndex: 3 - i }]}
                  >
                    <ItemThumbnail item={item} size={36} />
                  </View>
                ))}
              </View>
              <Text
                style={[
                  styles.collapsedText,
                  { color: colors.espressoLight, marginLeft: items.slice(0, 3).length * 20 + 24 },
                ]}
              >
                {items.length} items · {formatPrice(subtotal)}
              </Text>
            </View>
          )}

          {/* Expanded item list with thumbnails */}
          {itemsExpanded &&
            items.map((item) => (
              <View key={item.id} style={styles.itemRow} testID={`checkout-item-${item.id}`}>
                <ItemThumbnail item={item} size={48} />
                <View style={[styles.itemInfo, { marginLeft: 12 }]}>
                  <Text style={[styles.itemName, { color: colors.espresso }]}>
                    {item.model.name}
                  </Text>
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
            <View style={styles.shippingLabelRow}>
              <Text style={[styles.totalLabel, { color: colors.espressoLight }]}>Shipping</Text>
              {isPremium && <PremiumBadge size="sm" testID="shipping-premium-badge" />}
            </View>
            <Text
              style={[
                styles.totalValue,
                { color: totals.shipping === 0 ? colors.success : colors.espresso },
              ]}
            >
              {totals.shipping === 0 ? 'FREE' : formatPrice(totals.shipping)}
            </Text>
          </View>
          {!isPremium && subtotal < SHIPPING_THRESHOLD && subtotal > 0 && (
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
              style={[
                styles.grandTotalValue,
                { color: colors.espresso, fontFamily: typography.headingFamily },
              ]}
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

        {/* Google Pay Quick Button */}
        {Platform.OS === 'android' && isGooglePaySupported && (
          <View
            style={[styles.googlePaySection, { marginHorizontal: spacing.lg }]}
            testID="google-pay-section"
          >
            <PlatformPayButton
              type={PlatformPay.ButtonType.Pay}
              appearance={PlatformPay.ButtonStyle.Black}
              borderRadius={borderRadius.button}
              onPress={handleGooglePay}
              disabled={isProcessing}
              style={styles.googlePayButton}
              testID="google-pay-button"
            />
            <View style={styles.googlePayDivider}>
              <View style={[styles.googlePayDividerLine, { backgroundColor: colors.sandDark }]} />
              <Text style={[styles.googlePayDividerText, { color: colors.espressoLight }]}>
                or pay another way
              </Text>
              <View style={[styles.googlePayDividerLine, { backgroundColor: colors.sandDark }]} />
            </View>
          </View>
        )}

        {/* Payment Methods */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <Text
            style={[styles.sectionTitle, { color: colors.espresso }]}
            accessibilityRole="header"
          >
            Payment Method
          </Text>
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
                {
                  color: colors.espresso,
                  fontFamily: typography.bodyFamilySemiBold,
                  marginBottom: 8,
                },
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
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
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
                <BrandedSpinner size="small" color="#FFFFFF" />
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

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (num & 0xff) * (1 - amount));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/** Mini futon shape thumbnail showing fabric color for checkout item rows. */
function ItemThumbnail({ item, size }: { item: CartItem; size: number }) {
  const darker = darkenColor(item.fabric.color, 0.15);
  const cushionH = size * 0.45;
  const backH = size * 0.3;
  const armW = size * 0.12;

  return (
    <View
      style={[thumbStyles.container, { width: size, height: size, borderRadius: size * 0.18 }]}
      accessible={false}
      importantForAccessibility="no"
      testID={`checkout-thumb-${item.id}`}
    >
      {/* Back cushion */}
      <View
        style={{
          width: size * 0.7,
          height: backH,
          backgroundColor: darker,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
          alignSelf: 'center',
        }}
      />
      {/* Seat cushion */}
      <View
        style={{
          width: size * 0.7,
          height: cushionH,
          backgroundColor: item.fabric.color,
          borderRadius: 2,
          marginTop: 1,
          alignSelf: 'center',
        }}
      />
      {/* Arms */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.08,
          top: size * 0.15,
          width: armW,
          height: size * 0.6,
          backgroundColor: darker,
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.08,
          top: size * 0.15,
          width: armW,
          height: size * 0.6,
          backgroundColor: darker,
          borderRadius: 2,
        }}
      />
    </View>
  );
}

const thumbStyles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F0EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

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
  itemsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandToggle: {
    fontSize: 14,
    fontWeight: '600',
  },
  collapsedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  thumbnailStack: {
    flexDirection: 'row',
    height: 36,
    position: 'relative',
  },
  stackedThumb: {
    position: 'absolute',
    top: 0,
  },
  collapsedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
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
  shippingLabelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
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
  // Google Pay
  googlePaySection: {
    paddingTop: 4,
  },
  googlePayButton: {
    width: '100%',
    height: 50,
  },
  googlePayDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  googlePayDividerLine: {
    flex: 1,
    height: 1,
  },
  googlePayDividerText: {
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
  savedAddressPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  savedAddressChip: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
  },
  savedAddressName: {
    fontSize: 13,
    fontWeight: '600',
  },
  savedAddressLine: {
    fontSize: 12,
    marginTop: 2,
  },
  savedAddressDefault: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});

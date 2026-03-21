# Fabric Sample Request (cm-6a5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `useSwatchRequest` to `wixClient.submitFabricSampleRequest()`, delete the redundant `FabricSampleRequest` component, add error/retry UI to `SwatchRequestModal`, and achieve full test coverage including Wix API success/failure paths and all accessibility requirements.

**Architecture:** `ProductDetailScreen` acquires `wixClient` via `useOptionalWixClient()` and passes it as an optional prop to `SwatchRequestModal`, which forwards it to `useSwatchRequest`. The hook calls the Wix API before writing AsyncStorage; on Wix failure it surfaces an error state so the user can retry without consuming their 24h rate-limit slot. When `wixClient` is `null` (offline / no Wix config) the hook falls back to AsyncStorage-only — identical to current behavior.

**Tech Stack:** React Native, TypeScript, `@testing-library/react-native`, Jest, `@react-native-async-storage/async-storage`, `expo-haptics`, `@/services/wix/wixClient`, `@/services/crashReporting`

**Spec:** `docs/superpowers/specs/2026-03-21-fabric-sample-request-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/hooks/useSwatchRequest.ts` | **Modify** | Accept `wixClient` param; call Wix API before AsyncStorage |
| `src/hooks/__tests__/useSwatchRequest.test.ts` | **Modify** | Add 10 new tests for Wix path |
| `src/components/SwatchRequestModal.tsx` | **Modify** | Add `wixClient` prop; error/retry UI; a11y fixes |
| `src/components/__tests__/SwatchRequestModal.test.tsx` | **Modify** | Add 6 new tests for error UI and a11y |
| `src/screens/ProductDetailScreen.tsx` | **Modify** | Acquire `wixClient`; pass to modal; remove `FabricSampleRequest` |
| `src/components/FabricSampleRequest.tsx` | **Delete** | Redundant; zero tests; inferior UX |

---

## Task 1: Hook tests — Wix API path (TDD)

**Files:**
- Modify: `src/hooks/__tests__/useSwatchRequest.test.ts`

> Write ALL 10 new tests before touching the hook implementation. They must fail first.

- [ ] **Step 1: Add mock for crashReporting and wixClient fixture**

  Open `src/hooks/__tests__/useSwatchRequest.test.ts`. After the existing `jest.mock('@/services/analytics', ...)` block, add:

  ```typescript
  jest.mock('@/services/crashReporting', () => ({
    captureException: jest.fn(),
  }));
  ```

  Add this import at the top alongside the other imports:

  ```typescript
  import { captureException } from '@/services/crashReporting';
  ```

  Add this fixture after `validAddress`:

  ```typescript
  const mockWixClient = {
    submitFabricSampleRequest: jest.fn().mockResolvedValue(undefined),
  };
  ```

  In `beforeEach`, add reset for the mock:

  ```typescript
  mockWixClient.submitFabricSampleRequest.mockClear();
  (captureException as jest.Mock).mockClear();
  ```

- [ ] **Step 2: Add new describe block with 10 tests**

  At the end of the `describe('useSwatchRequest', ...)` block (after `describe('reset', ...)`), add:

  ```typescript
  describe('Wix API integration', () => {
    it('calls wixClient.submitFabricSampleRequest with correct payload', async () => {
      const { result } = renderHook(() =>
        useSwatchRequest('prod-asheville', 'The Asheville', mockWixClient as any),
      );
      act(() => result.current.toggleFabric(mockFabrics[0]));
      act(() => result.current.toggleFabric(mockFabrics[1]));

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });

      expect(mockWixClient.submitFabricSampleRequest).toHaveBeenCalledWith({
        customerName: 'Jane Doe',
        shippingAddress: '123 Main St, Asheville, NC 28801',
        productName: 'The Asheville',
        fabricIds: 'natural-linen,slate-gray',
        fabricNames: 'Natural Linen,Slate Gray',
      });
    });

    it('formats shippingAddress correctly when line2 is present', async () => {
      const addressWithLine2 = { ...validAddress, line2: 'Apt 4B' };
      const { result } = renderHook(() =>
        useSwatchRequest('prod-asheville', 'The Asheville', mockWixClient as any),
      );
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        await result.current.submitRequest(addressWithLine2);
      });

      expect(mockWixClient.submitFabricSampleRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingAddress: '123 Main St, Apt 4B, Asheville, NC 28801',
        }),
      );
    });

    it('formats shippingAddress without trailing comma when line2 is empty', async () => {
      const { result } = renderHook(() =>
        useSwatchRequest('prod-asheville', 'The Asheville', mockWixClient as any),
      );
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        await result.current.submitRequest(validAddress); // line2: ''
      });

      const call = mockWixClient.submitFabricSampleRequest.mock.calls[0][0];
      expect(call.shippingAddress).not.toContain(',,');
      expect(call.shippingAddress).toBe('123 Main St, Asheville, NC 28801');
    });

    it('formats fabricIds as comma-joined ID string', async () => {
      const { result } = renderHook(() =>
        useSwatchRequest('prod-asheville', 'The Asheville', mockWixClient as any),
      );
      act(() => result.current.toggleFabric(mockFabrics[0]));
      act(() => result.current.toggleFabric(mockFabrics[2]));

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });

      const call = mockWixClient.submitFabricSampleRequest.mock.calls[0][0];
      expect(call.fabricIds).toBe('natural-linen,mountain-blue');
    });

    it('formats fabricNames as comma-joined name string', async () => {
      const { result } = renderHook(() =>
        useSwatchRequest('prod-asheville', 'The Asheville', mockWixClient as any),
      );
      act(() => result.current.toggleFabric(mockFabrics[0]));
      act(() => result.current.toggleFabric(mockFabrics[2]));

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });

      const call = mockWixClient.submitFabricSampleRequest.mock.calls[0][0];
      expect(call.fabricNames).toBe('Natural Linen,Mountain Blue');
    });

    it('passes productName to Wix payload', async () => {
      const { result } = renderHook(() =>
        useSwatchRequest('prod-asheville', 'The Asheville Deluxe', mockWixClient as any),
      );
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });

      const call = mockWixClient.submitFabricSampleRequest.mock.calls[0][0];
      expect(call.productName).toBe('The Asheville Deluxe');
    });

    it('sets status to error and does NOT write AsyncStorage when Wix throws', async () => {
      mockWixClient.submitFabricSampleRequest.mockRejectedValueOnce(
        new Error('Network error'),
      );
      const { result } = renderHook(() =>
        useSwatchRequest('prod-asheville', 'The Asheville', mockWixClient as any),
      );
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        const success = await result.current.submitRequest(validAddress);
        expect(success).toBe(false);
      });

      expect(result.current.status).toBe('error');
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('returns true and calls captureException (not setStatus error) when AsyncStorage write fails after Wix success', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage unavailable'),
      );
      const { result } = renderHook(() =>
        useSwatchRequest('prod-asheville', 'The Asheville', mockWixClient as any),
      );
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        const success = await result.current.submitRequest(validAddress);
        expect(success).toBe(true);
      });

      expect(result.current.status).toBe('submitted');
      expect(captureException).toHaveBeenCalledWith(expect.any(Error), 'warning', expect.any(Object));
    });

    it('falls back to AsyncStorage-only path when wixClient is null', async () => {
      const { result } = renderHook(() =>
        useSwatchRequest('prod-asheville', 'The Asheville', null),
      );
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        const success = await result.current.submitRequest(validAddress);
        expect(success).toBe(true);
      });

      expect(mockWixClient.submitFabricSampleRequest).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(result.current.status).toBe('submitted');
    });

    it('uses empty string for productName when not provided (backward compat)', async () => {
      const { result } = renderHook(() =>
        useSwatchRequest('prod-asheville', undefined, mockWixClient as any),
      );
      act(() => result.current.toggleFabric(mockFabrics[0]));

      await act(async () => {
        await result.current.submitRequest(validAddress);
      });

      const call = mockWixClient.submitFabricSampleRequest.mock.calls[0][0];
      expect(call.productName).toBe('');
    });
  });
  ```

- [ ] **Step 3: Run tests to verify they fail**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  npx jest src/hooks/__tests__/useSwatchRequest.test.ts --no-coverage 2>&1 | tail -20
  ```

  Expected: ~10 failures — "useSwatchRequest is not a function" or type errors because the hook doesn't accept `wixClient` yet.

---

## Task 2: Implement hook changes

**Files:**
- Modify: `src/hooks/useSwatchRequest.ts`

- [ ] **Step 1: Add imports**

  Add to the imports at the top of `src/hooks/useSwatchRequest.ts`:

  ```typescript
  import { captureException } from '@/services/crashReporting';
  import type { WixClient } from '@/services/wix/wixClient';
  ```

- [ ] **Step 2: Update hook signature**

  Change line 58:
  ```typescript
  // Before
  export function useSwatchRequest(productId: string): SwatchRequestState {

  // After
  export function useSwatchRequest(
    productId: string,
    productName?: string,
    wixClient?: WixClient | null,
  ): SwatchRequestState {
  ```

- [ ] **Step 3: Replace `submitRequest` callback body**

  Replace the entire `submitRequest` `useCallback` block (lines 96–170) with:

  ```typescript
  const submitRequest = useCallback(
    async (address: SwatchAddress): Promise<boolean> => {
      // Prevent double-tap race condition
      if (submittingRef.current) return false;

      // Validate fabrics
      if (selectedFabrics.length === 0) {
        setValidationErrors(['fabrics']);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {
          // Haptics not available
        }
        return false;
      }

      // Validate address
      const errors = validateAddress(address);
      if (errors.length > 0) {
        setValidationErrors(errors);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {
          // Haptics not available
        }
        return false;
      }

      submittingRef.current = true;
      setStatus('submitting');
      setValidationErrors([]);

      // Step 6: Call Wix API if available
      if (wixClient) {
        const shippingAddress = `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.city}, ${address.state} ${address.zip}`;
        try {
          await wixClient.submitFabricSampleRequest({
            customerName: address.fullName,
            shippingAddress,
            productName: productName ?? '',
            fabricIds: selectedFabrics.map((f) => f.id).join(','),
            fabricNames: selectedFabrics.map((f) => f.name).join(','),
          });
        } catch (err) {
          setStatus('error');
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch {
            // Haptics not available
          }
          submittingRef.current = false;
          return false;
        }
      }

      // Step 7: Write rate-limit record to AsyncStorage
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const requests: StoredRequest[] = stored ? JSON.parse(stored) : [];

        const newRequest: StoredRequest = {
          productId,
          fabricIds: selectedFabrics.map((f) => f.id),
          timestamp: Date.now(),
        };

        const updated = requests.filter((r) => r.productId !== productId);
        updated.push(newRequest);

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        if (wixClient) {
          // Wix succeeded — AsyncStorage failure is non-critical
          captureException(
            err instanceof Error ? err : new Error(String(err)),
            'warning',
            { screen: 'SwatchRequestModal', action: 'asyncStorageWrite' },
          );
          // Fall through to success
        } else {
          // No Wix — AsyncStorage is primary persistence; this is a real failure
          setStatus('error');
          submittingRef.current = false;
          return false;
        }
      }

      // Step 8: Analytics
      events.requestSwatches(
        productId,
        selectedFabrics.map((f) => f.id),
        address.state,
      );

      // Step 9: Haptic success, set submitted state
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics not available
      }

      setStatus('submitted');
      setHasRecentRequest(true);
      submittingRef.current = false;
      return true;
    },
    [productId, productName, wixClient, selectedFabrics],
  );
  ```

- [ ] **Step 4: Run hook tests**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  npx jest src/hooks/__tests__/useSwatchRequest.test.ts --no-coverage 2>&1 | tail -20
  ```

  Expected: All tests pass. Note: the existing `handles AsyncStorage write failure gracefully` test passes the null-wixClient path — it should still expect `status === 'error'` and `success === false`.

- [ ] **Step 5: Commit**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  git add src/hooks/useSwatchRequest.ts src/hooks/__tests__/useSwatchRequest.test.ts
  git commit -m "feat(cm-6a5): wire useSwatchRequest to Wix API, add 10 new tests"
  ```

---

## Task 3: SwatchRequestModal tests — error UI and a11y (TDD)

**Files:**
- Modify: `src/components/__tests__/SwatchRequestModal.test.tsx`

> Write these 6 tests before touching the modal implementation. They must fail first.

- [ ] **Step 1: Add wixClient mock and helper to test file**

  After the existing `jest.mock('@react-native-async-storage/async-storage', ...)` block at the top, add:

  ```typescript
  const mockSubmitFabricSampleRequest = jest.fn();
  const mockWixClient = {
    submitFabricSampleRequest: mockSubmitFabricSampleRequest,
  };
  ```

  In `beforeEach`, add:

  ```typescript
  mockSubmitFabricSampleRequest.mockResolvedValue(undefined);
  ```

- [ ] **Step 2: Add helper to fill valid address**

  After the `renderModal` function, add:

  ```typescript
  function fillValidAddress(getByTestId: ReturnType<typeof renderModal>['getByTestId']) {
    fireEvent.changeText(getByTestId('swatch-address-name'), 'Jane Doe');
    fireEvent.changeText(getByTestId('swatch-address-line1'), '123 Main St');
    fireEvent.changeText(getByTestId('swatch-address-city'), 'Asheville');
    fireEvent.changeText(getByTestId('swatch-address-state'), 'NC');
    fireEvent.changeText(getByTestId('swatch-address-zip'), '28801');
  }
  ```

- [ ] **Step 3: Add new describe block with 6 tests**

  At the end of the `describe('SwatchRequestModal', ...)` block, add:

  ```typescript
  describe('error state (Wix failure)', () => {
    it('shows swatch-error-message when Wix call fails', async () => {
      mockSubmitFabricSampleRequest.mockRejectedValueOnce(new Error('Network'));
      const { getByTestId } = renderModal({ wixClient: mockWixClient as any });
      fireEvent.press(getByTestId('swatch-option-natural-linen'));
      fillValidAddress(getByTestId);
      fireEvent.press(getByTestId('swatch-submit-button'));

      await waitFor(() => {
        expect(getByTestId('swatch-error-message')).toBeTruthy();
      });
    });

    it('shows swatch-retry-button when Wix call fails', async () => {
      mockSubmitFabricSampleRequest.mockRejectedValueOnce(new Error('Network'));
      const { getByTestId } = renderModal({ wixClient: mockWixClient as any });
      fireEvent.press(getByTestId('swatch-option-natural-linen'));
      fillValidAddress(getByTestId);
      fireEvent.press(getByTestId('swatch-submit-button'));

      await waitFor(() => {
        expect(getByTestId('swatch-retry-button')).toBeTruthy();
      });
    });

    it('pressing retry re-triggers submission and succeeds on second attempt', async () => {
      mockSubmitFabricSampleRequest
        .mockRejectedValueOnce(new Error('Network'))
        .mockResolvedValueOnce(undefined);

      const { getByTestId, getByText } = renderModal({ wixClient: mockWixClient as any });
      fireEvent.press(getByTestId('swatch-option-natural-linen'));
      fillValidAddress(getByTestId);
      fireEvent.press(getByTestId('swatch-submit-button'));

      await waitFor(() => {
        expect(getByTestId('swatch-retry-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('swatch-retry-button'));

      await waitFor(() => {
        expect(getByText(/swatches are on the way/i)).toBeTruthy();
      });
    });

    it('error message Text has accessibilityLiveRegion polite', async () => {
      mockSubmitFabricSampleRequest.mockRejectedValueOnce(new Error('Network'));
      const { getByTestId } = renderModal({ wixClient: mockWixClient as any });
      fireEvent.press(getByTestId('swatch-option-natural-linen'));
      fillValidAddress(getByTestId);
      fireEvent.press(getByTestId('swatch-submit-button'));

      await waitFor(() => {
        const msg = getByTestId('swatch-error-message');
        expect(msg.props.accessibilityLiveRegion).toBe('polite');
      });
    });
  });

  describe('submit button a11y', () => {
    it('submit button has accessibilityState.busy true while submitting', async () => {
      // Delay Wix resolution so we can inspect mid-flight state
      let resolve: () => void;
      mockSubmitFabricSampleRequest.mockImplementationOnce(
        () => new Promise<void>((r) => { resolve = r; }),
      );
      const { getByTestId } = renderModal({ wixClient: mockWixClient as any });
      fireEvent.press(getByTestId('swatch-option-natural-linen'));
      fillValidAddress(getByTestId);
      fireEvent.press(getByTestId('swatch-submit-button'));

      await waitFor(() => {
        const btn = getByTestId('swatch-submit-button');
        expect(btn.props.accessibilityState?.busy).toBe(true);
      });

      resolve!();
    });

    it('all touch targets have minHeight and minWidth of at least 44', () => {
      const { getByTestId } = renderModal();
      const targets = [
        getByTestId('swatch-submit-button'),
        getByTestId('swatch-close-button'),
        getByTestId(`swatch-option-${FABRICS[0].id}`),
      ];
      targets.forEach((target) => {
        const style = target.props.style;
        const flatStyle = Array.isArray(style)
          ? Object.assign({}, ...style.flat(Infinity).filter(Boolean))
          : style || {};
        const minH = flatStyle.minHeight ?? flatStyle.height ?? 0;
        const minW = flatStyle.minWidth ?? flatStyle.width ?? 0;
        expect(minH).toBeGreaterThanOrEqual(44);
        expect(minW).toBeGreaterThanOrEqual(44);
      });
    });
  });
  ```

- [ ] **Step 4: Run modal tests to verify new tests fail**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  npx jest src/components/__tests__/SwatchRequestModal.test.tsx --no-coverage 2>&1 | tail -25
  ```

  Expected: The 6 new tests fail (testID not found, accessibilityLiveRegion missing, etc.). Existing tests should still pass.

---

## Task 4: Implement SwatchRequestModal changes

**Files:**
- Modify: `src/components/SwatchRequestModal.tsx`

- [ ] **Step 1: Add WixClient import and update Props**

  Add import after the existing React Native imports:

  ```typescript
  import type { WixClient } from '@/services/wix/wixClient';
  ```

  Update the `Props` interface (around line 25):

  ```typescript
  interface Props {
    visible: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    fabrics: Fabric[];
    wixClient?: WixClient | null;
  }
  ```

- [ ] **Step 2: Update component signature and hook call**

  Update line 42 to destructure `wixClient`:

  ```typescript
  export function SwatchRequestModal({ visible, onClose, productId, productName, fabrics, wixClient }: Props) {
  ```

  Update line 44 to pass `wixClient` to the hook:

  ```typescript
  const swatch = useSwatchRequest(productId, productName, wixClient);
  ```

- [ ] **Step 3: Replace the error state UI section**

  Find the existing error state block (around line 418–422):
  ```typescript
  {/* Error state */}
  {swatch.status === 'error' && (
    <Text style={[styles.errorText, { color: '#D32F2F' }]}>
      Something went wrong. Please try again.
    </Text>
  )}
  ```

  Replace with:
  ```typescript
  {/* Error state */}
  {swatch.status === 'error' && (
    <View style={styles.errorContainer}>
      <Text
        testID="swatch-error-message"
        style={[styles.errorText, { color: '#D32F2F' }]}
        accessibilityLiveRegion="polite"
      >
        Something went wrong. Please try again.
      </Text>
      <TouchableOpacity
        onPress={handleSubmit}
        style={[
          styles.retryButton,
          { borderColor: colors.espresso, borderRadius: borderRadius.md },
        ]}
        testID="swatch-retry-button"
        accessibilityLabel="Retry swatch request"
        accessibilityRole="button"
      >
        <Text style={[styles.retryButtonText, { color: colors.espresso }]}>Try Again</Text>
      </TouchableOpacity>
    </View>
  )}
  ```

- [ ] **Step 4: Update submit button `accessibilityState` to include `busy`**

  Find the submit button's `accessibilityState` prop (around line 445):
  ```typescript
  accessibilityState={{ disabled: swatch.isSubmitting || swatch.hasRecentRequest }}
  ```

  Replace with:
  ```typescript
  accessibilityState={{
    busy: swatch.isSubmitting,
    disabled: swatch.isSubmitting || swatch.hasRecentRequest,
  }}
  ```

- [ ] **Step 5: Fix 44pt touch targets in StyleSheet**

  In the `StyleSheet.create({...})` block, update the following styles:

  ```typescript
  // Update closeButton (line ~478): currently 32×32
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Update swatchOption (line ~511): add minHeight/minWidth
  swatchOption: {
    width: '30%',
    minHeight: 44,
    minWidth: 44,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },

  // Update submitButton (line ~561): add minHeight
  submitButton: {
    paddingVertical: 14,
    minHeight: 44,
    alignItems: 'center',
    marginTop: 20,
  },
  ```

  Add new styles for retry UI:

  ```typescript
  errorContainer: {
    marginBottom: 12,
  },
  retryButton: {
    borderWidth: 1,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  ```

- [ ] **Step 6: Run modal tests**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  npx jest src/components/__tests__/SwatchRequestModal.test.tsx --no-coverage 2>&1 | tail -25
  ```

  Expected: All tests pass — both existing and the 6 new ones.

- [ ] **Step 7: Commit**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  git add src/components/SwatchRequestModal.tsx src/components/__tests__/SwatchRequestModal.test.tsx
  git commit -m "feat(cm-6a5): error/retry UI, a11y fixes, wixClient prop in SwatchRequestModal"
  ```

---

## Task 5: Wire ProductDetailScreen

**Files:**
- Modify: `src/screens/ProductDetailScreen.tsx`

- [ ] **Step 1: Add `useOptionalWixClient` import and remove `FabricSampleRequest` import**

  Find the two import lines (around lines 67–68):
  ```typescript
  import { FabricSampleRequest } from '@/components/FabricSampleRequest';
  import { SwatchRequestModal } from '@/components/SwatchRequestModal';
  ```

  Replace with:
  ```typescript
  import { SwatchRequestModal } from '@/components/SwatchRequestModal';
  import { useOptionalWixClient } from '@/services/wix';
  ```

- [ ] **Step 2: Acquire wixClient in the component body**

  Find other `useOptionalWixClient`-style calls in the codebase for reference (e.g. `src/hooks/useCart.tsx:204`). Add the following line inside the `ProductDetailScreen` (or its inner component) function body, near the other state/hook declarations at the top:

  ```typescript
  const wixClient = useOptionalWixClient();
  ```

- [ ] **Step 3: Remove `FabricSampleRequest` JSX block**

  Find and delete the entire `{/* Fabric Sample Request */}` section (around lines 615–622):

  ```tsx
  {/* Fabric Sample Request */}
  <View style={{ paddingHorizontal: spacing.lg }}>
    <FabricSampleRequest
      fabrics={model.fabrics}
      productName={model.name}
      testID="fabric-sample-request"
    />
  </View>
  ```

  Delete this entire block (including the surrounding `<View>`).

- [ ] **Step 4: Pass `wixClient` to `SwatchRequestModal`**

  Find the `<SwatchRequestModal` usage (around lines 1098–1104):

  ```tsx
  <SwatchRequestModal
    visible={swatchModalVisible}
    onClose={() => setSwatchModalVisible(false)}
    productId={catalogProductId || model.id}
    productName={model.name}
    fabrics={model.fabrics}
  />
  ```

  Add `wixClient={wixClient}`:

  ```tsx
  <SwatchRequestModal
    visible={swatchModalVisible}
    onClose={() => setSwatchModalVisible(false)}
    productId={catalogProductId || model.id}
    productName={model.name}
    fabrics={model.fabrics}
    wixClient={wixClient}
  />
  ```

- [ ] **Step 5: Run ProductDetailScreen tests**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  npx jest src/screens/__tests__/ProductDetailScreen.test.tsx --no-coverage 2>&1 | tail -20
  ```

  Expected: All existing tests pass. The test already mocks `useOptionalWixClient: () => null`.

- [ ] **Step 6: Commit**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  git add src/screens/ProductDetailScreen.tsx
  git commit -m "feat(cm-6a5): wire wixClient into SwatchRequestModal from ProductDetailScreen"
  ```

---

## Task 6: Delete FabricSampleRequest

**Files:**
- Delete: `src/components/FabricSampleRequest.tsx`

- [ ] **Step 1: Verify no remaining references**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  grep -r "FabricSampleRequest" src/ --include="*.ts" --include="*.tsx" -l
  ```

  Expected output: only `src/components/FabricSampleRequest.tsx` and `src/components/__tests__/FabricSampleRequest.test.tsx`. (The test file will be deleted in the next step.)

- [ ] **Step 2: Delete the component and its test file**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  rm src/components/FabricSampleRequest.tsx
  rm src/components/__tests__/FabricSampleRequest.test.tsx
  ```

- [ ] **Step 3: Verify deletion and no broken imports**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  grep -r "FabricSampleRequest" src/ --include="*.ts" --include="*.tsx"
  ```

  Expected: no output.

- [ ] **Step 4: Run full test suite (affected files)**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  npx jest src/hooks/__tests__/useSwatchRequest.test.ts src/components/__tests__/SwatchRequestModal.test.tsx src/screens/__tests__/ProductDetailScreen.test.tsx --no-coverage 2>&1 | tail -30
  ```

  Expected: All tests pass, no references to `FabricSampleRequest`.

- [ ] **Step 5: Commit and push**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  git add -A
  git commit -m "feat(cm-6a5): delete FabricSampleRequest, complete Wix swatch request wiring"
  git push origin cm-6a5-fabric-sample-request
  ```

---

## Task 7: Final verification

- [ ] **Step 1: Run full affected test suite**

  ```bash
  cd /Users/hal/gt/cfutons_mobile
  npx jest src/hooks/__tests__/useSwatchRequest.test.ts src/components/__tests__/SwatchRequestModal.test.tsx src/screens/__tests__/ProductDetailScreen.test.tsx --no-coverage 2>&1 | grep -E "Tests:|Test Suites:|PASS|FAIL"
  ```

  Expected: 3 test suites PASS, all tests pass.

- [ ] **Step 2: Verify acceptance criteria**

  Check each item from the spec:

  - [ ] `FabricSampleRequest` deleted, no references: `grep -r FabricSampleRequest src/` → empty
  - [ ] Wix API wired: `grep "submitFabricSampleRequest" src/hooks/useSwatchRequest.ts`
  - [ ] Error state with retry: `grep "swatch-error-message\|swatch-retry-button" src/components/SwatchRequestModal.tsx`
  - [ ] No empty catch blocks: `grep -n "} catch {$" src/hooks/useSwatchRequest.ts src/components/SwatchRequestModal.tsx` → only haptics catches (acceptable)
  - [ ] accessibilityLiveRegion on error texts: `grep "accessibilityLiveRegion" src/components/SwatchRequestModal.tsx`
  - [ ] 44pt targets: confirmed via test passing
  - [ ] captureException imported and used: `grep "captureException" src/hooks/useSwatchRequest.ts`

- [ ] **Step 3: Open PR**

  ```bash
  gh pr create \
    --title "feat(cm-6a5): wire swatch request to Wix API, error/retry UI, a11y" \
    --body "$(cat <<'EOF'
  ## Summary
  - Wires `useSwatchRequest` to `wixClient.submitFabricSampleRequest()` — physical swatch requests now reach the Wix FabricSampleRequests data collection
  - Deletes redundant `FabricSampleRequest` component (zero tests, single-line address field, inferior UX)
  - Adds error state with retry button to `SwatchRequestModal` when Wix API fails
  - Fixes a11y: `accessibilityLiveRegion="polite"` on error texts, 44pt touch targets on all buttons, `accessibilityState.busy` on Submit
  - Null wixClient fallback: AsyncStorage-only path unchanged — no regression for offline/no-Wix environments

  ## Test plan
  - [ ] `useSwatchRequest.test.ts` — 10 new tests for Wix path (payload format, error handling, fallback, captureException)
  - [ ] `SwatchRequestModal.test.tsx` — 6 new tests (error UI, retry, a11y live region, busy state, 44pt targets)
  - [ ] `ProductDetailScreen.test.tsx` — all existing tests pass with null wixClient path
  - [ ] Manual: submit modal with Wix configured → verify record appears in FabricSampleRequests collection

  Closes bead cm-6a5

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  EOF
  )"
  ```

- [ ] **Step 4: Notify Dallas and close bead**

  ```bash
  gt mail send cfutons_mobile/crew/dallas "cm-6a5 PR open — fabric sample request wired to Wix. PR is up, all tests pass. Ready for review."
  gt done
  ```

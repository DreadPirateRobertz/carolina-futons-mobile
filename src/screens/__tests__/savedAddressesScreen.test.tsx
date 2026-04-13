import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SavedAddressesScreen } from '../SavedAddressesScreen';

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium' },
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      sandBase: '#E8D5B7',
      sandDark: '#D4C4A0',
      espresso: '#3B2410',
      espressoLight: '#6B4C30',
      mountainBlue: '#4A7FA5',
      sunsetCoral: '#E05252',
      overlay: '#00000022',
      pine: '#2D6A4F',
      white: '#FFFFFF',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    borderRadius: { sm: 4, md: 8, lg: 12, button: 8 },
    typography: { body: { fontSize: 15 }, caption: { fontSize: 12 }, label: { fontSize: 13 } },
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockAddAddress = jest.fn();
const mockUpdateAddress = jest.fn();
const mockDeleteAddress = jest.fn();
const mockSetDefault = jest.fn();

const mockUseSavedAddresses = jest.fn();
jest.mock('@/hooks/useSavedAddresses', () => ({
  useSavedAddresses: () => mockUseSavedAddresses(),
}));

// Render AddressForm with real implementation so form interactions work
jest.mock('@/components/BrandedSpinner', () => ({
  BrandedSpinner: () => null,
}));

const ADDR_1 = {
  id: 'addr-1',
  fullName: 'Alice Smith',
  line1: '123 Main St',
  line2: 'Apt 1',
  city: 'Asheville',
  state: 'NC',
  zip: '28801',
  isDefault: true,
};

const ADDR_2 = {
  id: 'addr-2',
  fullName: 'Bob Jones',
  line1: '456 Oak Ave',
  line2: '',
  city: 'Charlotte',
  state: 'NC',
  zip: '28202',
  isDefault: false,
};

function defaultHookState(overrides = {}) {
  return {
    addresses: [],
    defaultAddress: null,
    loading: false,
    addAddress: mockAddAddress,
    updateAddress: mockUpdateAddress,
    deleteAddress: mockDeleteAddress,
    setDefault: mockSetDefault,
    saveFromCheckout: jest.fn(),
    ...overrides,
  };
}

function renderScreen() {
  return render(<SavedAddressesScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAddAddress.mockResolvedValue(undefined);
  mockUpdateAddress.mockResolvedValue(undefined);
  mockDeleteAddress.mockResolvedValue(undefined);
  mockSetDefault.mockResolvedValue(undefined);
  mockUseSavedAddresses.mockReturnValue(defaultHookState());
});

// ── Empty state ────────────────────────────────────────────────────────────────

describe('SavedAddressesScreen — empty state', () => {
  it('shows empty state message when no addresses', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('saved-addresses-empty')).toBeTruthy();
  });

  it('shows "Add Address" button when empty', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('add-address-button')).toBeTruthy();
  });
});

// ── Address list ───────────────────────────────────────────────────────────────

describe('SavedAddressesScreen — address list', () => {
  beforeEach(() => {
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: [ADDR_1, ADDR_2], defaultAddress: ADDR_1 }),
    );
  });

  it('renders all saved addresses', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('address-item-addr-1')).toBeTruthy();
    expect(getByTestId('address-item-addr-2')).toBeTruthy();
  });

  it('shows "Default" badge on the default address', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('address-default-badge-addr-1')).toBeTruthy();
  });

  it('does not show "Default" badge on non-default address', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('address-default-badge-addr-2')).toBeNull();
  });

  it('shows full name and street for each address', () => {
    const { getByText } = renderScreen();
    expect(getByText('Alice Smith')).toBeTruthy();
    expect(getByText('123 Main St, Apt 1')).toBeTruthy();
    expect(getByText('Bob Jones')).toBeTruthy();
    expect(getByText('456 Oak Ave')).toBeTruthy();
  });

  it('shows city, state, zip for each address', () => {
    const { getByText } = renderScreen();
    expect(getByText('Asheville, NC 28801')).toBeTruthy();
    expect(getByText('Charlotte, NC 28202')).toBeTruthy();
  });

  it('hides "Set Default" button on the already-default address', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('set-default-button-addr-1')).toBeNull();
  });

  it('shows "Set Default" button on non-default addresses', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('set-default-button-addr-2')).toBeTruthy();
  });
});

// ── Add address ────────────────────────────────────────────────────────────────

describe('SavedAddressesScreen — add address', () => {
  it('shows AddressForm when "Add Address" is tapped', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('add-address-button'));
    expect(getByTestId('address-form')).toBeTruthy();
  });

  it('hides the address list while form is open', () => {
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: [ADDR_1], defaultAddress: ADDR_1 }),
    );
    const { getByTestId, queryByTestId } = renderScreen();
    fireEvent.press(getByTestId('add-address-button'));
    expect(queryByTestId('address-item-addr-1')).toBeNull();
  });

  it('calls addAddress when form is submitted with valid data', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('add-address-button'));

    fireEvent.changeText(getByTestId('address-full-name-input'), 'Carol White');
    fireEvent.changeText(getByTestId('address-line1-input'), '789 Pine Rd');
    fireEvent.changeText(getByTestId('address-line2-input'), '');
    fireEvent.changeText(getByTestId('address-city-input'), 'Durham');
    fireEvent.changeText(getByTestId('address-state-input'), 'NC');
    fireEvent.changeText(getByTestId('address-zip-input'), '27701');

    fireEvent.press(getByTestId('address-save-button'));

    await waitFor(() => {
      expect(mockAddAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Carol White',
          line1: '789 Pine Rd',
          city: 'Durham',
          state: 'NC',
          zip: '27701',
        }),
      );
    });
  });

  it('dismisses the form after successful add', async () => {
    const { getByTestId, queryByTestId } = renderScreen();
    const { act } = require('@testing-library/react-native');
    fireEvent.press(getByTestId('add-address-button'));

    fireEvent.changeText(getByTestId('address-full-name-input'), 'Carol White');
    fireEvent.changeText(getByTestId('address-line1-input'), '789 Pine Rd');
    fireEvent.changeText(getByTestId('address-line2-input'), '');
    fireEvent.changeText(getByTestId('address-city-input'), 'Durham');
    fireEvent.changeText(getByTestId('address-state-input'), 'NC');
    fireEvent.changeText(getByTestId('address-zip-input'), '27701');

    await act(async () => {
      fireEvent.press(getByTestId('address-save-button'));
    });

    expect(queryByTestId('address-form')).toBeNull();
  });

  it('dismisses the form on cancel without calling addAddress', () => {
    const { getByTestId, queryByTestId } = renderScreen();
    fireEvent.press(getByTestId('add-address-button'));
    expect(getByTestId('address-form')).toBeTruthy();

    fireEvent.press(getByTestId('address-cancel-button'));

    expect(queryByTestId('address-form')).toBeNull();
    expect(mockAddAddress).not.toHaveBeenCalled();
  });

  it('shows validation errors without calling addAddress for empty form', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('add-address-button'));
    fireEvent.press(getByTestId('address-save-button'));

    await waitFor(() => {
      expect(getByText('Full name is required')).toBeTruthy();
    });
    expect(mockAddAddress).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid ZIP (non-5-digit)', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('add-address-button'));

    fireEvent.changeText(getByTestId('address-full-name-input'), 'Carol White');
    fireEvent.changeText(getByTestId('address-line1-input'), '789 Pine Rd');
    fireEvent.changeText(getByTestId('address-city-input'), 'Durham');
    fireEvent.changeText(getByTestId('address-state-input'), 'NC');
    fireEvent.changeText(getByTestId('address-zip-input'), 'bad');
    fireEvent.press(getByTestId('address-save-button'));

    await waitFor(() => {
      expect(getByText('ZIP code must be 5 digits')).toBeTruthy();
    });
    expect(mockAddAddress).not.toHaveBeenCalled();
  });
});

// ── Edit address ───────────────────────────────────────────────────────────────

describe('SavedAddressesScreen — edit address', () => {
  beforeEach(() => {
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: [ADDR_1, ADDR_2], defaultAddress: ADDR_1 }),
    );
  });

  it('shows AddressForm pre-filled with address data when "Edit" is tapped', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('edit-button-addr-2'));

    expect(getByTestId('address-form')).toBeTruthy();
    expect(getByTestId('address-full-name-input').props.value).toBe('Bob Jones');
    expect(getByTestId('address-line1-input').props.value).toBe('456 Oak Ave');
  });

  it('calls updateAddress with modified values on form submit', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('edit-button-addr-2'));

    fireEvent.changeText(getByTestId('address-full-name-input'), 'Bob Updated');
    fireEvent.press(getByTestId('address-save-button'));

    await waitFor(() => {
      expect(mockUpdateAddress).toHaveBeenCalledWith(
        'addr-2',
        expect.objectContaining({ fullName: 'Bob Updated' }),
      );
    });
  });

  it('dismisses form after successful edit', async () => {
    const { getByTestId, queryByTestId } = renderScreen();
    const { act } = require('@testing-library/react-native');
    fireEvent.press(getByTestId('edit-button-addr-2'));

    await act(async () => {
      fireEvent.press(getByTestId('address-save-button'));
    });

    expect(queryByTestId('address-form')).toBeNull();
  });
});

// ── Delete address ─────────────────────────────────────────────────────────────

describe('SavedAddressesScreen — delete address', () => {
  beforeEach(() => {
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: [ADDR_1, ADDR_2], defaultAddress: ADDR_1 }),
    );
  });

  it('shows Alert confirmation when "Delete" is tapped', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('delete-button-addr-2'));

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringMatching(/delete/i),
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: expect.stringMatching(/cancel/i) }),
        expect.objectContaining({ text: expect.stringMatching(/delete/i) }),
      ]),
    );
  });

  it('calls deleteAddress when delete is confirmed', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const deleteBtn = buttons?.find((b) => /delete/i.test(b.text ?? ''));
      deleteBtn?.onPress?.();
    });

    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('delete-button-addr-2'));

    expect(mockDeleteAddress).toHaveBeenCalledWith('addr-2');
  });

  it('does not call deleteAddress when cancel is pressed', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const cancelBtn = buttons?.find((b) => /cancel/i.test(b.text ?? ''));
      cancelBtn?.onPress?.();
    });

    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('delete-button-addr-2'));

    expect(mockDeleteAddress).not.toHaveBeenCalled();
  });
});

// ── Set default ────────────────────────────────────────────────────────────────

describe('SavedAddressesScreen — set default', () => {
  beforeEach(() => {
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: [ADDR_1, ADDR_2], defaultAddress: ADDR_1 }),
    );
  });

  it('calls setDefault with the correct id', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('set-default-button-addr-2'));

    await waitFor(() => {
      expect(mockSetDefault).toHaveBeenCalledWith('addr-2');
    });
  });
});

// ── Max address limit ──────────────────────────────────────────────────────────

describe('SavedAddressesScreen — max address limit', () => {
  it('shows max-reached notice when 5 addresses are saved', () => {
    const fiveAddresses = Array.from({ length: 5 }, (_, i) => ({
      ...ADDR_1,
      id: `addr-${i + 1}`,
      isDefault: i === 0,
    }));
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: fiveAddresses, defaultAddress: fiveAddresses[0] }),
    );

    const { getByTestId } = renderScreen();
    expect(getByTestId('address-max-notice')).toBeTruthy();
  });

  it('disables "Add Address" button at max', () => {
    const fiveAddresses = Array.from({ length: 5 }, (_, i) => ({
      ...ADDR_1,
      id: `addr-${i + 1}`,
      isDefault: i === 0,
    }));
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: fiveAddresses, defaultAddress: fiveAddresses[0] }),
    );

    const { getByTestId } = renderScreen();
    expect(getByTestId('add-address-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('does not open the form when "Add Address" is tapped at max', () => {
    const fiveAddresses = Array.from({ length: 5 }, (_, i) => ({
      ...ADDR_1,
      id: `addr-${i + 1}`,
      isDefault: i === 0,
    }));
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: fiveAddresses, defaultAddress: fiveAddresses[0] }),
    );

    const { getByTestId, queryByTestId } = renderScreen();
    fireEvent.press(getByTestId('add-address-button'));
    expect(queryByTestId('address-form')).toBeNull();
  });
});

// ── Loading state ──────────────────────────────────────────────────────────────

describe('SavedAddressesScreen — loading state', () => {
  it('shows loading indicator while hook is loading', () => {
    mockUseSavedAddresses.mockReturnValue(defaultHookState({ loading: true }));
    const { getByTestId } = renderScreen();
    expect(getByTestId('saved-addresses-loading')).toBeTruthy();
  });

  it('hides loading indicator once loaded', () => {
    mockUseSavedAddresses.mockReturnValue(defaultHookState({ loading: false }));
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('saved-addresses-loading')).toBeNull();
  });
});

// ── Checkout integration: defaultAddress ──────────────────────────────────────

describe('SavedAddressesScreen — checkout default address contract', () => {
  it('exposes defaultAddress correctly to consumers via the hook', async () => {
    // This test validates the contract: useSavedAddresses().defaultAddress
    // is what CheckoutScreen reads. Ensuring the default flag is on one address.
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: [ADDR_1, ADDR_2], defaultAddress: ADDR_1 }),
    );

    const { getByTestId } = renderScreen();

    // The default badge is present only on ADDR_1
    expect(getByTestId('address-default-badge-addr-1')).toBeTruthy();
    expect(() => getByTestId('address-default-badge-addr-2')).toThrow();
  });
});

// ── Delete failure (cm-aem) ────────────────────────────────────────────────────

describe('SavedAddressesScreen — delete failure', () => {
  beforeEach(() => {
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: [ADDR_1, ADDR_2], defaultAddress: ADDR_1 }),
    );
  });

  it('does not crash when deleteAddress rejects', async () => {
    mockDeleteAddress.mockRejectedValueOnce(new Error('Server error'));
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const deleteBtn = buttons?.find((b) => /delete/i.test(b.text ?? ''));
      deleteBtn?.onPress?.();
    });
    const { getByTestId } = renderScreen();
    expect(() => fireEvent.press(getByTestId('delete-button-addr-2'))).not.toThrow();
    await waitFor(() => expect(mockDeleteAddress).toHaveBeenCalledWith('addr-2'));
  });

  it('still shows address list after delete failure (optimistic-free UI)', async () => {
    mockDeleteAddress.mockRejectedValueOnce(new Error('Server error'));
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const deleteBtn = buttons?.find((b) => /delete/i.test(b.text ?? ''));
      deleteBtn?.onPress?.();
    });
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('delete-button-addr-2'));
    await waitFor(() => expect(mockDeleteAddress).toHaveBeenCalled());
    // Address row still visible (hook controls list; screen re-renders from hook state)
    expect(getByTestId('address-item-addr-2')).toBeTruthy();
  });
});

// ── Set-default failure (cm-aem) ──────────────────────────────────────────────

describe('SavedAddressesScreen — set-default error', () => {
  beforeEach(() => {
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: [ADDR_1, ADDR_2], defaultAddress: ADDR_1 }),
    );
  });

  it('does not crash when setDefault rejects', async () => {
    mockSetDefault.mockRejectedValueOnce(new Error('Network error'));
    const { getByTestId } = renderScreen();
    expect(() => fireEvent.press(getByTestId('set-default-button-addr-2'))).not.toThrow();
    await waitFor(() => expect(mockSetDefault).toHaveBeenCalledWith('addr-2'));
  });

  it('address list remains visible after setDefault failure', async () => {
    mockSetDefault.mockRejectedValueOnce(new Error('Network error'));
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('set-default-button-addr-2'));
    await waitFor(() => expect(mockSetDefault).toHaveBeenCalled());
    expect(getByTestId('address-item-addr-2')).toBeTruthy();
  });
});

// ── Address validation edge cases (cm-aem) ────────────────────────────────────

describe('SavedAddressesScreen — validation edge cases', () => {
  it('shows validation error when line1 is empty', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('add-address-button'));

    fireEvent.changeText(getByTestId('address-full-name-input'), 'Test User');
    // leave line1 empty
    fireEvent.changeText(getByTestId('address-city-input'), 'Raleigh');
    fireEvent.changeText(getByTestId('address-state-input'), 'NC');
    fireEvent.changeText(getByTestId('address-zip-input'), '27601');
    fireEvent.press(getByTestId('address-save-button'));

    await waitFor(() => {
      expect(getByText('Street address is required')).toBeTruthy();
    });
    expect(mockAddAddress).not.toHaveBeenCalled();
  });

  it('shows validation error when city is empty', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('add-address-button'));

    fireEvent.changeText(getByTestId('address-full-name-input'), 'Test User');
    fireEvent.changeText(getByTestId('address-line1-input'), '1 Elm St');
    // leave city empty
    fireEvent.changeText(getByTestId('address-state-input'), 'NC');
    fireEvent.changeText(getByTestId('address-zip-input'), '27601');
    fireEvent.press(getByTestId('address-save-button'));

    await waitFor(() => {
      expect(getByText('City is required')).toBeTruthy();
    });
    expect(mockAddAddress).not.toHaveBeenCalled();
  });

  it('shows validation error when state is empty', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('add-address-button'));

    fireEvent.changeText(getByTestId('address-full-name-input'), 'Test User');
    fireEvent.changeText(getByTestId('address-line1-input'), '1 Elm St');
    fireEvent.changeText(getByTestId('address-city-input'), 'Raleigh');
    // leave state empty
    fireEvent.changeText(getByTestId('address-zip-input'), '27601');
    fireEvent.press(getByTestId('address-save-button'));

    await waitFor(() => {
      expect(getByText('State is required')).toBeTruthy();
    });
    expect(mockAddAddress).not.toHaveBeenCalled();
  });

  it('shows validation error for ZIP with more than 5 digits', async () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('add-address-button'));

    fireEvent.changeText(getByTestId('address-full-name-input'), 'Test User');
    fireEvent.changeText(getByTestId('address-line1-input'), '1 Elm St');
    fireEvent.changeText(getByTestId('address-city-input'), 'Raleigh');
    fireEvent.changeText(getByTestId('address-state-input'), 'NC');
    fireEvent.changeText(getByTestId('address-zip-input'), '123456'); // 6 digits
    fireEvent.press(getByTestId('address-save-button'));

    await waitFor(() => {
      expect(getByText('ZIP code must be 5 digits')).toBeTruthy();
    });
    expect(mockAddAddress).not.toHaveBeenCalled();
  });

  it('address with no line2 shows only street line1', () => {
    const addrNoLine2 = { ...ADDR_2, line2: '' };
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: [addrNoLine2], defaultAddress: null }),
    );
    const { getByText, queryByText } = renderScreen();
    expect(getByText('456 Oak Ave')).toBeTruthy();
    // Should not show trailing comma or extra line for empty line2
    expect(queryByText('456 Oak Ave, ')).toBeNull();
  });
});

// ── Single non-default address (cm-aem) ───────────────────────────────────────

describe('SavedAddressesScreen — single non-default address', () => {
  it('shows Set Default button when there is one non-default address', () => {
    const noDefaultAddr = { ...ADDR_1, isDefault: false };
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: [noDefaultAddr], defaultAddress: null }),
    );
    const { getByTestId } = renderScreen();
    expect(getByTestId('set-default-button-addr-1')).toBeTruthy();
  });

  it('does not show max-reached notice with fewer than 5 addresses', () => {
    mockUseSavedAddresses.mockReturnValue(
      defaultHookState({ addresses: [ADDR_1, ADDR_2], defaultAddress: ADDR_1 }),
    );
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('address-max-notice')).toBeNull();
  });
});

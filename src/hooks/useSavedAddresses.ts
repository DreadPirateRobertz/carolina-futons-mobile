/**
 * @module useSavedAddresses
 *
 * Public hook for managing saved shipping addresses.
 * Wraps useAddressBook and auto-wires Wix MemberAddresses sync
 * for authenticated users (cm-5yl).
 *
 * Unauthenticated users get full local CRUD; Wix sync is skipped.
 * Sync failures are swallowed — local state is always authoritative.
 */
import { useCallback, useMemo } from 'react';
import { useAddressBook, type AddressBookState, type SavedAddress } from './useAddressBook';
import { useAuth } from './useAuth';
import { WixAuthService } from '@/services/wix/wixAuth';

export function useSavedAddresses(): AddressBookState {
  const { user } = useAuth();
  const authService = useMemo(() => new WixAuthService(), []);

  const wixSync = useCallback(
    async (addresses: SavedAddress[]) => {
      if (!user) return;
      await authService.syncMemberAddresses(user.id, addresses);
    },
    [user, authService],
  );

  return useAddressBook({ wixSync: user ? wixSync : undefined });
}

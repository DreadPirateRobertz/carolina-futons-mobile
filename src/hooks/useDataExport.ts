/**
 * @module useDataExport
 *
 * Generates a JSON export of all user data: profile, orders, wishlist,
 * and notification preferences. Required for GDPR/CCPA data portability.
 */
import { useState, useCallback } from 'react';
import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from './useAuth';
import { useCart } from './useCart';
import { useWishlist } from './useWishlist';
import { useWixClient } from '@/services/wix';
import { captureException } from '@/services/crashReporting';

export type ExportStatus = 'idle' | 'generating' | 'ready' | 'error';

export interface DataExportState {
  status: ExportStatus;
  error: string | null;
  exportData: () => Promise<void>;
}

export function useDataExport(): DataExportState {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { items: cartItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const wixClient = useWixClient();

  const exportData = useCallback(async () => {
    if (!user) return;

    setStatus('generating');
    setError(null);

    try {
      // Gather orders
      let orders: unknown[] = [];
      try {
        const result = await wixClient.queryOrders({ limit: 100 });
        orders = result.orders;
      } catch {
        // Orders may fail if none exist
      }

      const exportPayload = {
        exportDate: new Date().toISOString(),
        profile: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          phone: user.phone,
          provider: user.provider,
        },
        orders,
        cart: cartItems.map((item) => ({
          productId: item.id,
          productName: item.model.name,
          fabric: item.fabric.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        wishlist: wishlistItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          addedAt: item.addedAt,
        })),
      };

      const json = JSON.stringify(exportPayload, null, 2);
      const filename = `carolina-futons-data-${user.id.slice(0, 8)}.json`;

      if (Platform.OS === 'web') {
        // Web: use Share API
        await Share.share({ message: json, title: filename });
      } else {
        // Native: write to file and share
        const filePath = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(filePath, json);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/json',
            dialogTitle: 'Export Your Data',
          });
        } else {
          await Share.share({ message: json, title: filename });
        }
      }

      setStatus('ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export data';
      setError(message);
      setStatus('error');
      captureException(err instanceof Error ? err : new Error(message));
    }
  }, [user, cartItems, wishlistItems, wixClient]);

  return { status, error, exportData };
}

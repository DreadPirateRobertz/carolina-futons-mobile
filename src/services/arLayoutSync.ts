/**
 * @module arLayoutSync
 *
 * Cloud sync stub for saved AR room layouts.
 * Pushes locally-saved layouts to the backend for cross-device access.
 * Currently a no-op stub — wire to a real API when the backend endpoint
 * is ready (see: carolinafutons.com/api/ar-layouts).
 *
 * TODO(backend): Implement real push/pull once Wix Data API endpoint lands.
 */
/** Minimal layout shape used for push/pull — mirrors SavedARLayout in useSavedARLayouts. */
export interface SyncableARLayout {
  id: string;
  name: string;
  items: { modelId: string; fabricId: string }[];
  thumbnailUri?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Push the user's layouts to the cloud backend.
 * Currently a no-op — resolves immediately.
 */
export async function pushLayouts(_layouts: SyncableARLayout[]): Promise<void> {
  // TODO: POST to /api/ar-layouts with user auth token
}

/**
 * Pull layouts from the cloud backend for the current user.
 * Currently returns an empty array — no remote data available yet.
 */
export async function pullLayouts(): Promise<SyncableARLayout[]> {
  // TODO: GET /api/ar-layouts with user auth token
  return [];
}

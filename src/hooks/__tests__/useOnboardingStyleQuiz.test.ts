/**
 * Tests for useOnboardingStyleQuiz — cm-qdm
 *
 * AC:
 *  1. Initial state: furnitureStyle null, roomType null, step 0, isSaving false, saveError null
 *  2. setFurnitureStyle / setRoomType update state
 *  3. save() no-ops if furnitureStyle or roomType is null, returns false
 *  4. save() persists both fields to AsyncStorage
 *  5. save() upserts to MemberStylePreferences CMS when wixClient + memberId available
 *  6. save() sets isSaving during async op and clears on completion
 *  7. save() sets saveError on AsyncStorage failure (returns false)
 *  8. save() CMS failure is non-fatal: still saves locally, returns true, sets saveError
 *  9. save() without wixClient only writes to AsyncStorage
 * 10. save() without memberId skips CMS, only writes to AsyncStorage
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboardingStyleQuiz, ONBOARDING_STYLE_STORAGE_KEY } from '../useOnboardingStyleQuiz';

// --- Mocks ---

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockUpsertDataItem = jest.fn();
let mockWixClient: { upsertDataItem: jest.Mock } | null = null;

jest.mock('@/services/crashReporting', () => ({ captureException: jest.fn() }));

const MEMBER_ID = 'member-abc';
const FIXED_NOW = new Date('2026-04-05T12:00:00Z');
const getNow = () => FIXED_NOW;

// --- Tests ---

describe('useOnboardingStyleQuiz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    mockWixClient = { upsertDataItem: mockUpsertDataItem };
    mockUpsertDataItem.mockResolvedValue({ id: 'pref-1', data: {} });
  });

  // --- Initial state ---

  describe('initial state', () => {
    it('has null furnitureStyle and roomType', () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz());
      expect(result.current.furnitureStyle).toBeNull();
      expect(result.current.roomType).toBeNull();
    });

    it('starts at step 0', () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz());
      expect(result.current.step).toBe(0);
    });

    it('isSaving is false initially', () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz());
      expect(result.current.isSaving).toBe(false);
    });

    it('saveError is null initially', () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz());
      expect(result.current.saveError).toBeNull();
    });
  });

  // --- State setters ---

  describe('setFurnitureStyle', () => {
    it('updates furnitureStyle', () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz());
      act(() => result.current.setFurnitureStyle('coastal'));
      expect(result.current.furnitureStyle).toBe('coastal');
    });

    it('advances step from 0 to 1', () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz());
      act(() => result.current.setFurnitureStyle('modern'));
      expect(result.current.step).toBe(1);
    });

    it('accepts all four style values', () => {
      const styles = ['modern', 'coastal', 'rustic', 'traditional'] as const;
      for (const s of styles) {
        const { result } = renderHook(() => useOnboardingStyleQuiz());
        act(() => result.current.setFurnitureStyle(s));
        expect(result.current.furnitureStyle).toBe(s);
      }
    });
  });

  describe('setRoomType', () => {
    it('updates roomType', () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz());
      act(() => result.current.setRoomType('bedroom'));
      expect(result.current.roomType).toBe('bedroom');
    });

    it('advances step from 1 to 2 when called from step 1', () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz());
      act(() => result.current.setFurnitureStyle('rustic'));
      act(() => result.current.setRoomType('dorm'));
      expect(result.current.step).toBe(2);
    });

    it('accepts all room type values', () => {
      const rooms = ['living-room', 'bedroom', 'guest-room', 'dorm', 'office'] as const;
      for (const r of rooms) {
        const { result } = renderHook(() => useOnboardingStyleQuiz());
        act(() => result.current.setRoomType(r));
        expect(result.current.roomType).toBe(r);
      }
    });
  });

  describe('goBack', () => {
    it('decrements step when step > 0', () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz());
      act(() => result.current.setFurnitureStyle('modern'));
      expect(result.current.step).toBe(1);
      act(() => result.current.goBack());
      expect(result.current.step).toBe(0);
    });

    it('does not go below step 0', () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz());
      act(() => result.current.goBack());
      expect(result.current.step).toBe(0);
    });
  });

  // --- save() guards ---

  describe('save() guards', () => {
    it('returns false and does not write if furnitureStyle is null', async () => {
      const { result } = renderHook(() =>
        useOnboardingStyleQuiz({ wixClient: mockWixClient, memberId: MEMBER_ID }),
      );
      act(() => result.current.setRoomType('bedroom'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.save();
      });

      expect(success).toBe(false);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      expect(mockUpsertDataItem).not.toHaveBeenCalled();
    });

    it('returns false and does not write if roomType is null', async () => {
      const { result } = renderHook(() =>
        useOnboardingStyleQuiz({ wixClient: mockWixClient, memberId: MEMBER_ID }),
      );
      act(() => result.current.setFurnitureStyle('traditional'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.save();
      });

      expect(success).toBe(false);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  // --- save() — AsyncStorage ---

  describe('save() — AsyncStorage', () => {
    it('writes furnitureStyle and roomType to AsyncStorage', async () => {
      const { result } = renderHook(() =>
        useOnboardingStyleQuiz({ getNow }),
      );
      act(() => result.current.setFurnitureStyle('coastal'));
      act(() => result.current.setRoomType('living-room'));

      await act(async () => {
        await result.current.save();
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        ONBOARDING_STYLE_STORAGE_KEY,
        JSON.stringify({
          furnitureStyle: 'coastal',
          roomType: 'living-room',
          savedAt: FIXED_NOW.toISOString(),
        }),
      );
    });

    it('returns true on successful save', async () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz({ getNow }));
      act(() => result.current.setFurnitureStyle('modern'));
      act(() => result.current.setRoomType('dorm'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.save();
      });

      expect(success).toBe(true);
    });

    it('sets saveError and returns false on AsyncStorage failure', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

      const { result } = renderHook(() => useOnboardingStyleQuiz({ getNow }));
      act(() => result.current.setFurnitureStyle('rustic'));
      act(() => result.current.setRoomType('office'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.save();
      });

      expect(success).toBe(false);
      expect(result.current.saveError).toBe('disk full');
    });

    it('clears saveError on subsequent successful save', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
      const { result } = renderHook(() => useOnboardingStyleQuiz({ getNow }));
      act(() => result.current.setFurnitureStyle('rustic'));
      act(() => result.current.setRoomType('office'));
      await act(async () => { await result.current.save(); });
      expect(result.current.saveError).toBe('disk full');

      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);
      await act(async () => { await result.current.save(); });
      expect(result.current.saveError).toBeNull();
    });
  });

  // --- save() — isSaving flag ---

  describe('save() — isSaving flag', () => {
    it('sets isSaving to true during save and false after', async () => {
      let resolveStorage!: () => void;
      (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(
        () => new Promise<void>((res) => { resolveStorage = res; }),
      );

      const { result } = renderHook(() => useOnboardingStyleQuiz({ getNow }));
      act(() => result.current.setFurnitureStyle('modern'));
      act(() => result.current.setRoomType('bedroom'));

      let savePromise: Promise<boolean>;
      act(() => { savePromise = result.current.save(); });
      expect(result.current.isSaving).toBe(true);

      await act(async () => { resolveStorage(); await savePromise; });
      expect(result.current.isSaving).toBe(false);
    });
  });

  // --- save() — CMS upsert ---

  describe('save() — CMS upsert', () => {
    it('calls upsertDataItem on MemberStylePreferences with memberId, furnitureStyle, roomType, updatedAt', async () => {
      const { result } = renderHook(() =>
        useOnboardingStyleQuiz({ wixClient: mockWixClient, memberId: MEMBER_ID, getNow }),
      );
      act(() => result.current.setFurnitureStyle('traditional'));
      act(() => result.current.setRoomType('guest-room'));

      await act(async () => { await result.current.save(); });

      expect(mockUpsertDataItem).toHaveBeenCalledWith(
        'MemberStylePreferences',
        { memberId: { $eq: MEMBER_ID } },
        {
          memberId: MEMBER_ID,
          furnitureStyle: 'traditional',
          roomType: 'guest-room',
          updatedAt: FIXED_NOW.toISOString(),
        },
      );
    });

    it('skips CMS upsert if memberId is not provided', async () => {
      const { result } = renderHook(() =>
        useOnboardingStyleQuiz({ wixClient: mockWixClient, getNow }),
      );
      act(() => result.current.setFurnitureStyle('coastal'));
      act(() => result.current.setRoomType('bedroom'));

      await act(async () => { await result.current.save(); });

      expect(mockUpsertDataItem).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('skips CMS upsert if wixClient is null', async () => {
      const { result } = renderHook(() =>
        useOnboardingStyleQuiz({ wixClient: null, memberId: MEMBER_ID, getNow }),
      );
      act(() => result.current.setFurnitureStyle('modern'));
      act(() => result.current.setRoomType('living-room'));

      await act(async () => { await result.current.save(); });

      expect(mockUpsertDataItem).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('CMS failure is non-fatal: still returns true and saves to AsyncStorage', async () => {
      mockUpsertDataItem.mockRejectedValueOnce(new Error('network error'));

      const { result } = renderHook(() =>
        useOnboardingStyleQuiz({ wixClient: mockWixClient, memberId: MEMBER_ID, getNow }),
      );
      act(() => result.current.setFurnitureStyle('rustic'));
      act(() => result.current.setRoomType('dorm'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.save();
      });

      expect(success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('CMS failure sets saveError with the error message', async () => {
      mockUpsertDataItem.mockRejectedValueOnce(new Error('CMS down'));

      const { result } = renderHook(() =>
        useOnboardingStyleQuiz({ wixClient: mockWixClient, memberId: MEMBER_ID, getNow }),
      );
      act(() => result.current.setFurnitureStyle('coastal'));
      act(() => result.current.setRoomType('office'));

      await act(async () => { await result.current.save(); });

      expect(result.current.saveError).toBe('CMS down');
    });

    it('no saveError when both AsyncStorage and CMS succeed', async () => {
      const { result } = renderHook(() =>
        useOnboardingStyleQuiz({ wixClient: mockWixClient, memberId: MEMBER_ID, getNow }),
      );
      act(() => result.current.setFurnitureStyle('traditional'));
      act(() => result.current.setRoomType('living-room'));

      await act(async () => { await result.current.save(); });

      expect(result.current.saveError).toBeNull();
    });
  });

  // --- step management ---

  describe('step management', () => {
    it('step 2 indicates completion (both answers given)', () => {
      const { result } = renderHook(() => useOnboardingStyleQuiz());
      act(() => result.current.setFurnitureStyle('coastal'));
      act(() => result.current.setRoomType('bedroom'));
      expect(result.current.step).toBe(2);
    });
  });
});

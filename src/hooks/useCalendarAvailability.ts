/**
 * useCalendarAvailability — cm-lfe
 *
 * Fetches available slot counts per day for a date range from the
 * ConsultationBookings Wix collection. Used to show availability
 * indicators in the calendar picker.
 */

import { useState, useCallback } from 'react';
import { useOptionalWixClient } from '@/services/wix/wixProvider';
import { captureException } from '@/services/crashReporting';
import { ALL_SLOTS } from '@/hooks/useConsultationBooking';

// --- Types ---

export type DayStatus = 'available' | 'full' | 'past';

export interface DayAvailability {
  date: string;
  availableCount: number;
  totalSlots: number;
  status: DayStatus;
}

export interface UseCalendarAvailabilityOptions {
  getNow?: () => Date;
}

export interface UseCalendarAvailabilityReturn {
  availability: Record<string, DayAvailability>;
  isLoading: boolean;
  error: string | null;
  fetchRange: (startDate: string, days: number) => void;
}

// --- Helpers ---

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildDateRange(startDate: string, days: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < days; i++) {
    result.push(addDays(startDate, i));
  }
  return result;
}

// --- Hook ---

export function useCalendarAvailability(
  options: UseCalendarAvailabilityOptions = {},
): UseCalendarAvailabilityReturn {
  const { getNow = () => new Date() } = options;
  const wixClient = useOptionalWixClient();

  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRange = useCallback(
    (startDate: string, days: number) => {
      const today = getNow().toISOString().slice(0, 10);
      const dates = buildDateRange(startDate, days);

      setIsLoading(true);
      setError(null);

      // Resolve past dates immediately without querying
      const pastResult: Record<string, DayAvailability> = {};
      const futureDates: string[] = [];
      for (const date of dates) {
        if (date < today) {
          pastResult[date] = {
            date,
            availableCount: 0,
            totalSlots: ALL_SLOTS.length,
            status: 'past',
          };
        } else {
          futureDates.push(date);
        }
      }

      if (futureDates.length === 0) {
        setAvailability((prev) => ({ ...prev, ...pastResult }));
        setIsLoading(false);
        return;
      }

      // No Wix client — assume all future dates fully available
      if (!wixClient) {
        const noClientResult: Record<string, DayAvailability> = {};
        for (const date of futureDates) {
          noClientResult[date] = {
            date,
            availableCount: ALL_SLOTS.length,
            totalSlots: ALL_SLOTS.length,
            status: 'available',
          };
        }
        setAvailability((prev) => ({ ...prev, ...pastResult, ...noClientResult }));
        setIsLoading(false);
        return;
      }

      // Fetch each future date in parallel
      Promise.all(
        futureDates.map((date) =>
          wixClient
            .queryData<{ timeSlot: string }>('ConsultationBookings', {
              filter: { date: { $eq: date } },
            })
            .then((result) => {
              const takenCount = result.items.length;
              const availableCount = Math.max(0, ALL_SLOTS.length - takenCount);
              return {
                date,
                availableCount,
                totalSlots: ALL_SLOTS.length,
                status: (availableCount === 0 ? 'full' : 'available') as DayStatus,
              };
            }),
        ),
      )
        .then((results) => {
          const fetched: Record<string, DayAvailability> = {};
          for (const r of results) {
            fetched[r.date] = r;
          }
          setAvailability((prev) => ({ ...prev, ...pastResult, ...fetched }));
          setError(null);
        })
        .catch((err) => {
          const error = err instanceof Error ? err : new Error(String(err));
          captureException(error);
          setError(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [wixClient, getNow],
  );

  return { availability, isLoading, error, fetchRange };
}

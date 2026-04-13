/**
 * @module useAfterpaySchedule
 *
 * React hook wrapping getAfterpayInstallments with fortnightly due dates
 * and a totalAmount sum for display and accessibility.
 *
 * Returns 4 installments (price/4, last absorbs rounding remainder),
 * each with a dueDate: today, +14d, +28d, +42d.
 *
 * hq-03t
 */

import { useMemo } from 'react';
import {
  getAfterpayInstallments,
  isAfterpayEligible,
  type AfterpayInstallment,
} from '@/utils/financing';

export interface AfterpayScheduleInstallment extends AfterpayInstallment {
  /** Fortnightly due date: today, +14d, +28d, +42d. */
  dueDate: Date;
}

export interface UseAfterpayScheduleResult {
  installments: AfterpayScheduleInstallment[];
  /** True when price is within Afterpay eligible range ($35–$1,000). */
  isEligible: boolean;
  /** Sum of all installment amounts. Equals price (rounding absorbed in last installment). */
  totalAmount: number;
}

const FORTNIGHT_DAYS = 14;

const SAFE_EMPTY: UseAfterpayScheduleResult = { installments: [], isEligible: false, totalAmount: 0 };

export function useAfterpaySchedule(price: number): UseAfterpayScheduleResult {
  return useMemo(() => {
    try {
      const isEligible = isAfterpayEligible(price);
      if (!isEligible) {
        return SAFE_EMPTY;
      }

      const base = getAfterpayInstallments(price);
      const today = new Date();

      const installments: AfterpayScheduleInstallment[] = base.map((inst) => {
        const dueDate = new Date(today);
        dueDate.setDate(today.getDate() + (inst.number - 1) * FORTNIGHT_DAYS);
        return { ...inst, dueDate };
      });

      const totalAmount =
        Math.round(installments.reduce((sum, i) => sum + i.amount, 0) * 100) / 100;

      return { installments, isEligible, totalAmount };
    } catch (err) {
      console.error('[useAfterpaySchedule] failed to compute installments:', err);
      return SAFE_EMPTY;
    }
  }, [price]);
}

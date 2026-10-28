import { useCallback, useMemo } from 'react'
import { useAppSelector } from '@/app/store'
import { formatMoney, formatMoneyShort, type MoneyFormatOptions } from '@/utils/currencyFormatter'
import { formatDisplayDate } from '@/utils/dateFormatter'

/** Formatting helpers bound to the user's preferences (currency, grouping, date format). */
export function useFormatters() {
  const prefs = useAppSelector((s) => s.settings.preferences)
  const base = useMemo<MoneyFormatOptions>(() => ({ currency: prefs.currency, numberFormat: prefs.numberFormat }), [prefs.currency, prefs.numberFormat])

  const money = useCallback((n: number, options?: Omit<MoneyFormatOptions, 'currency' | 'numberFormat'>) => formatMoney(n, { ...base, ...options }), [base])
  const moneyShort = useCallback((n: number) => formatMoneyShort(n, base), [base])
  const date = useCallback((iso: string) => formatDisplayDate(iso, prefs.dateFormat), [prefs.dateFormat])

  return { money, moneyShort, date, currency: prefs.currency }
}

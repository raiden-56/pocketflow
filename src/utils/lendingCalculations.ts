import type { LendingEntry } from '@/types/finance'
import { roundMoney } from './currencyFormatter'

export interface LendingTotals {
  taken: number
  paidBack: number
  remaining: number
  cashback: number
}

export interface PersonBalance extends LendingTotals {
  person: string
  entries: number
  /** Latest dated entry, ISO; empty when none of the rows have a date. */
  lastDate: string
}

export interface CardUsage extends LendingTotals {
  card: string
  entries: number
}

function add(total: LendingTotals, e: LendingEntry): void {
  total.taken = roundMoney(total.taken + e.amount)
  total.paidBack = roundMoney(total.paidBack + e.paidBack)
  total.remaining = roundMoney(total.remaining + e.remaining)
  total.cashback = roundMoney(total.cashback + e.cashback)
}

export function lendingTotals(entries: LendingEntry[]): LendingTotals {
  const total = { taken: 0, paidBack: 0, remaining: 0, cashback: 0 }
  entries.forEach((e) => add(total, e))
  return total
}

/** One line per person (names compared case-insensitively), largest amount still owed first. */
export function balancesByPerson(entries: LendingEntry[]): PersonBalance[] {
  const map = new Map<string, PersonBalance>()
  for (const e of entries) {
    const key = e.person.trim().toLowerCase()
    const row = map.get(key) ?? { person: e.person.trim(), entries: 0, lastDate: '', taken: 0, paidBack: 0, remaining: 0, cashback: 0 }
    row.entries += 1
    if (e.date > row.lastDate) row.lastDate = e.date
    add(row, e)
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.remaining - a.remaining || a.person.localeCompare(b.person))
}

/** Rows given on a card: a Card column is filled, or "Given via" mentions a card. */
export function isCardEntry(e: LendingEntry): boolean {
  return Boolean(e.card) || /card/i.test(e.via)
}

/** Spends others made on your cards, grouped by card, with the cashback each earned. */
export function cardUsage(entries: LendingEntry[]): CardUsage[] {
  const map = new Map<string, CardUsage>()
  for (const e of entries.filter(isCardEntry)) {
    const card = e.card || 'Credit card'
    const row = map.get(card) ?? { card, entries: 0, taken: 0, paidBack: 0, remaining: 0, cashback: 0 }
    row.entries += 1
    add(row, e)
    map.set(card, row)
  }
  return [...map.values()].sort((a, b) => b.taken - a.taken)
}

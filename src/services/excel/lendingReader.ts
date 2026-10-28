import type * as XLSX from 'xlsx'
import type { LendingEntry } from '@/types/finance'
import type { ValidationIssue } from '@/types/workbook'
import { normalizeDateValue } from '@/utils/dateFormatter'
import { parseAmountValue, roundMoney } from '@/utils/currencyFormatter'
import { createId } from '@/utils/id'

type LendingColumn = 'date' | 'person' | 'via' | 'card' | 'purpose' | 'amount' | 'cashback' | 'paidBack' | 'remaining' | 'notes'

/** Normalized header text → column. Checked in order, so the more specific money columns come before "amount". */
const LENDING_HEADERS: [LendingColumn, RegExp][] = [
  ['date', /^date/],
  ['person', /^(person|name|who|borrower|taken by|friend)/],
  ['via', /^(given via|via|mode|source|paid via|method)/],
  ['card', /^(card|account|card account)/],
  ['purpose', /^(purpose|description|for|reason|details)/],
  ['cashback', /^cash ?back/],
  ['paidBack', /^(paid|repaid|returned|received)/],
  ['remaining', /^(remaining|balance|due|pending|outstanding)/],
  ['amount', /^(amount|taken|amount taken|lent)/],
  ['notes', /^(notes?|remarks?|comments?)/],
]

/** The lending sheet: named "Lending" (also "Loans", "Borrowed", "Credit card usage" …). */
export function findLendingSheet(sheetNames: string[]): string | null {
  return sheetNames.find((n) => /^(lending|loans?|borrow|lent|credit card usage)/i.test(n.trim())) ?? null
}

function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[()[\]{}.:;,/\\_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

const text = (value: unknown) => (value == null ? '' : String(value).replace(/\s+/g, ' ').trim())

/** Reads the lending sheet, if the workbook has one. Rows without a person and amount are ignored. */
export function parseLending(workbook: XLSX.WorkBook, rowsOf: (sheet: XLSX.WorkSheet) => unknown[][]): { entries: LendingEntry[]; issues: Omit<ValidationIssue, 'id'>[] } {
  const name = findLendingSheet(workbook.SheetNames)
  if (!name) return { entries: [], issues: [] }
  const rows = rowsOf(workbook.Sheets[name])
  const headerRow = rows.slice(0, 10).findIndex((row) => row.some((c) => /^(person|name)/.test(normalize(c))))
  if (headerRow === -1) {
    return { entries: [], issues: [{ severity: 'warning', sheet: name, message: 'The lending sheet needs a header row with at least Person and Amount columns.' }] }
  }
  const columns: Partial<Record<LendingColumn, number>> = {}
  rows[headerRow].forEach((cell, c) => {
    const header = normalize(cell)
    const match = LENDING_HEADERS.find(([key, re]) => columns[key] === undefined && re.test(header))
    if (match) columns[match[0]] = c
  })

  const entries: LendingEntry[] = []
  const issues: Omit<ValidationIssue, 'id'>[] = []
  for (let r = headerRow + 1; r < rows.length; r += 1) {
    const row = rows[r] ?? []
    const get = (key: LendingColumn) => (columns[key] === undefined ? null : row[columns[key]!])
    const person = text(get('person'))
    const amount = parseAmountValue(get('amount'))
    if (!person && amount == null) continue
    if (amount == null) {
      issues.push({ severity: 'warning', sheet: name, row: r + 1, message: `Lending row for ${person || 'unknown person'} has no amount and was skipped.` })
      continue
    }
    const paidBack = parseAmountValue(get('paidBack')) ?? 0
    const sheetRemaining = parseAmountValue(get('remaining'))
    entries.push({
      id: createId('lend'),
      date: normalizeDateValue(get('date')) ?? '',
      person: person || 'Unknown',
      via: text(get('via')),
      card: text(get('card')),
      purpose: text(get('purpose')),
      amount: roundMoney(amount),
      cashback: roundMoney(parseAmountValue(get('cashback')) ?? 0),
      paidBack: roundMoney(paidBack),
      remaining: roundMoney(sheetRemaining ?? amount - paidBack),
      notes: text(get('notes')),
      sourceRow: r + 1,
    })
  }
  return { entries, issues }
}

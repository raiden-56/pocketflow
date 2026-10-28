import * as XLSX from 'xlsx'
import type { Transaction, TransactionType } from '@/types/finance'
import {
  MONTH_SHEETS,
  type ColumnKey,
  type ParsedWorkbook,
  type SheetLayout,
  type ValidationIssue,
} from '@/types/workbook'
import { normalizeDateValue, monthOfIso, toIsoDate, formatDisplayDate, yearOfIso } from '@/utils/dateFormatter'
import { parseAmountValue, roundMoney } from '@/utils/currencyFormatter'
import { createId } from '@/utils/id'

/** Header aliases (lower-cased, punctuation stripped) → column key. */
const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  date: ['date', 'transaction date', 'txn date', 'dt'],
  description: ['description', 'desc', 'details', 'particulars', 'item', 'narration', 'title'],
  category: ['category', 'cat', 'head'],
  type: ['type', 'transaction type', 'txn type', 'kind', 'income expense', 'incomeexpense'],
  paymentMethod: ['payment method', 'payment', 'method', 'mode', 'payment mode', 'paid via', 'account'],
  amount: ['amount inr', 'amount', 'amt', 'value', 'amount rs', 'amount rupees', 'inr'],
  notes: ['notes', 'note', 'remarks', 'remark', 'comment', 'comments', 'memo'],
}

const REQUIRED_COLUMNS: ColumnKey[] = ['date', 'description', 'category', 'type', 'amount']

export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[()[\]{}.:;,/\\_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchHeader(normalized: string): ColumnKey | null {
  if (!normalized) return null
  for (const key of Object.keys(HEADER_ALIASES) as ColumnKey[]) {
    if (HEADER_ALIASES[key].includes(normalized)) return key
  }
  // Loose matches: "amount (inr)" → "amount inr", "amount in inr", etc.
  if (normalized.startsWith('amount')) return 'amount'
  if (normalized.startsWith('date')) return 'date'
  if (normalized.includes('payment')) return 'paymentMethod'
  if (normalized.startsWith('desc')) return 'description'
  if (normalized.startsWith('categor')) return 'category'
  if (normalized.startsWith('note') || normalized.startsWith('remark')) return 'notes'
  if (normalized === 'type' || normalized.endsWith(' type')) return 'type'
  return null
}

/** Finds the first monthly sheet name match (case-insensitive, allows "Jan", "January 2026"). */
export function resolveMonthSheet(sheetName: string): (typeof MONTH_SHEETS)[number] | null {
  const n = sheetName.trim().toLowerCase()
  for (const month of MONTH_SHEETS) {
    const m = month.toLowerCase()
    if (n === m || n === m.slice(0, 3) || n.startsWith(`${m} `) || n.startsWith(`${m.slice(0, 3)} `) || n.startsWith(`${m}-`)) {
      return month
    }
  }
  return null
}

export function normalizeType(value: unknown): TransactionType | null {
  const t = String(value ?? '').trim().toLowerCase()
  if (!t) return null
  if (['income', 'in', 'credit', 'cr', 'inflow', 'earning', 'earnings', 'received', 'revenue'].includes(t)) return 'Income'
  if (['expense', 'expenses', 'exp', 'out', 'debit', 'dr', 'outflow', 'spend', 'spent', 'spending', 'paid', 'payment'].includes(t)) return 'Expense'
  if (t.startsWith('inc')) return 'Income'
  if (t.startsWith('exp')) return 'Expense'
  return null
}

function cleanText(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).replace(/\s+/g, ' ').trim()
}

function isRowEmpty(row: unknown[]): boolean {
  return row.every((cell) => cell == null || String(cell).trim() === '')
}

/** Detects the header row within the first 15 rows of a sheet. */
export function detectLayout(sheetName: string, rows: unknown[][]): SheetLayout | null {
  const limit = Math.min(rows.length, 15)
  let best: SheetLayout | null = null
  for (let r = 0; r < limit; r += 1) {
    const row = rows[r] ?? []
    const columns: Partial<Record<ColumnKey, number>> = {}
    row.forEach((cell, c) => {
      const key = matchHeader(normalizeHeader(cell))
      if (key && columns[key] === undefined) columns[key] = c
    })
    const required = REQUIRED_COLUMNS.filter((k) => columns[k] !== undefined).length
    if (columns.date !== undefined && columns.amount !== undefined && required >= 3) {
      const layout: SheetLayout = { name: sheetName, headerRow: r, columns, dataRows: 0 }
      if (!best || required > REQUIRED_COLUMNS.filter((k) => best!.columns[k] !== undefined).length) best = layout
      if (required === REQUIRED_COLUMNS.length) return layout
    }
  }
  return best
}

/** A 4-digit year in the sheet name ("October 2026", "Oct-2026"), if any. */
function yearFromSheetName(sheetName: string): number | null {
  const match = sheetName.match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/)
  return match ? Number(match[1]) : null
}

/** The year most dated transactions fall in, used to date rows that were entered without a date. */
function dominantYear(transactions: Transaction[]): number | null {
  const counts = new Map<number, number>()
  for (const tx of transactions) {
    if (tx.date) counts.set(yearOfIso(tx.date), (counts.get(yearOfIso(tx.date)) ?? 0) + 1)
  }
  let best: number | null = null
  for (const [year, count] of counts) if (best === null || count > counts.get(best)!) best = year
  return best
}

export function readWorkbookFromBuffer(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: true })
}

export function sheetToRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null, blankrows: true })
}

interface ParseOptions {
  /** Whether to flag records whose date month differs from the sheet month (default true). */
  flagMonthMismatch?: boolean
}

/**
 * Parses every monthly worksheet in the workbook. Invalid rows are never silently discarded:
 * each problem is recorded as a ValidationIssue, and rows that can be recovered are imported
 * with a best-effort value and flagged as `recovered`.
 */
export function parseWorkbook(workbook: XLSX.WorkBook, options: ParseOptions = {}): ParsedWorkbook {
  const { flagMonthMismatch = true } = options
  const transactions: Transaction[] = []
  const issues: ValidationIssue[] = []
  const sheets: SheetLayout[] = []
  const otherSheets: string[] = []
  const foundMonths = new Set<string>()
  /** Rows typed without a date; dated to the 1st of their sheet's month once the workbook year is known. */
  const undated: { tx: Transaction; month: number; sheetYear: number | null }[] = []

  const issue =(partial: Omit<ValidationIssue, 'id'>) => {
    issues.push({ id: createId('issue'), ...partial })
  }

  for (const sheetName of workbook.SheetNames) {
    const month = resolveMonthSheet(sheetName)
    if (!month) {
      otherSheets.push(sheetName)
      continue
    }
    if (foundMonths.has(month)) {
      issue({ severity: 'warning', sheet: sheetName, message: `Duplicate worksheet for ${month}; the first one is used and this sheet is ignored.` })
      continue
    }
    foundMonths.add(month)
    const sheet = workbook.Sheets[sheetName]
    const rows = sheetToRows(sheet)
    const layout = detectLayout(sheetName, rows)
    if (!layout) {
      issue({
        severity: 'error',
        sheet: sheetName,
        message: `Could not find the transaction header row (expected columns like Date, Description, Category, Type, Payment Method, Amount (INR), Notes).`,
      })
      continue
    }
    for (const key of REQUIRED_COLUMNS) {
      if (layout.columns[key] === undefined) {
        issue({ severity: 'warning', sheet: sheetName, field: key, message: `Column "${key}" is missing; values for it will be blank.` })
      }
    }

    const monthIndex = MONTH_SHEETS.indexOf(month) + 1
    const sheetYear = yearFromSheetName(sheetName)
    const seen = new Map<string, number>()

    for (let r = layout.headerRow + 1; r < rows.length; r += 1) {
      const row = rows[r] ?? []
      if (isRowEmpty(row)) continue
      const excelRow = r + 1
      const get = (key: ColumnKey) => (layout.columns[key] === undefined ? null : row[layout.columns[key]!])

      const rawDate = get('date')
      const rawAmount = get('amount')
      const rawType = get('type')
      const description = cleanText(get('description'))
      const category = cleanText(get('category'))
      const paymentMethod = cleanText(get('paymentMethod'))
      const notes = cleanText(get('notes'))

      // Skip rows that are clearly summary/total rows rather than transactions.
      const lowered = description.toLowerCase()
      if (rawDate == null && rawAmount != null && /^(total|sum|balance|net)/.test(lowered)) continue
      if (rawDate == null && rawAmount == null && !description && !category) continue

      let fatal = false

      const date = normalizeDateValue(rawDate)
      const dateEmpty = rawDate == null || String(rawDate).trim() === ''
      // An entry with a description or category but no date (e.g. copied from a paper list) is kept and
      // dated to the start of its sheet's month. Rows with neither stay skipped: they are usually totals.
      const undatedEntry = !date && dateEmpty && Boolean(description || category)
      if (!date && !undatedEntry) {
        if (dateEmpty) {
          issue({ severity: 'error', sheet: sheetName, row: excelRow, field: 'date', message: 'Date is empty. The record was skipped; add a date in Excel and refresh.', rawValue: '' })
        } else {
          issue({ severity: 'error', sheet: sheetName, row: excelRow, field: 'date', message: `Date "${cleanText(rawDate)}" could not be understood. The record was skipped.`, rawValue: cleanText(rawDate) })
        }
        fatal = true
      }

      const parsedAmount = parseAmountValue(rawAmount)
      let amount = parsedAmount
      if (amount == null) {
        issue({ severity: 'error', sheet: sheetName, row: excelRow, field: 'amount', message: `Amount "${cleanText(rawAmount)}" is not a number. The record was skipped.`, rawValue: cleanText(rawAmount) })
        fatal = true
      } else if (amount === 0) {
        issue({ severity: 'warning', sheet: sheetName, row: excelRow, field: 'amount', message: 'Amount is zero.', rawValue: '0', recovered: true })
      }

      let type = normalizeType(rawType)
      if (!type) {
        type = 'Expense'
        issue({
          severity: 'warning',
          sheet: sheetName,
          row: excelRow,
          field: 'type',
          message: rawType == null || String(rawType).trim() === ''
            ? 'Type is empty; treated as Expense. Set it to Income or Expense in Excel.'
            : `Type "${cleanText(rawType)}" is not Income or Expense; treated as Expense.`,
          rawValue: cleanText(rawType),
          recovered: true,
        })
      }
      if (amount != null && amount < 0) {
        issue({ severity: 'warning', sheet: sheetName, row: excelRow, field: 'amount', message: `Negative amount ${amount} was converted to a positive ${type}.`, rawValue: String(rawAmount), recovered: true })
        amount = Math.abs(amount)
      }

      if (fatal || amount == null) continue

      if (!description) {
        issue({ severity: 'warning', sheet: sheetName, row: excelRow, field: 'description', message: 'Description is empty.', recovered: true })
      }
      if (!category) {
        issue({ severity: 'warning', sheet: sheetName, row: excelRow, field: 'category', message: 'Category is empty; shown as "Uncategorized".', recovered: true })
      }

      if (flagMonthMismatch && date && monthOfIso(date) !== monthIndex) {
        issue({
          severity: 'warning',
          sheet: sheetName,
          row: excelRow,
          field: 'date',
          message: `Dated ${date}, which is not in ${month}. It is reported under its own date; saving will move it to the matching month sheet.`,
          recovered: true,
        })
      }

      const key = `${date ?? `undated-${monthIndex}`}|${lowered}|${type}|${roundMoney(amount)}`
      const prevRow = seen.get(key)
      if (prevRow !== undefined) {
        issue({ severity: 'warning', sheet: sheetName, row: excelRow, field: 'row', message: `Possible duplicate of row ${prevRow} (same date, description, type and amount).`, recovered: true })
      } else {
        seen.set(key, excelRow)
      }

      const tx: Transaction = {
        id: createId(),
        date: date ?? '',
        description: description || '(no description)',
        category: category || 'Uncategorized',
        type,
        paymentMethod: paymentMethod || 'Other',
        amount: roundMoney(amount),
        notes,
        sourceSheet: sheetName,
        sourceRow: excelRow,
      }
      transactions.push(tx)
      if (!date) undated.push({ tx, month: monthIndex, sheetYear })
      layout.dataRows += 1
    }
    sheets.push(layout)
  }

  if (undated.length > 0) {
    const fallbackYear = dominantYear(transactions) ?? new Date().getFullYear()
    // One note per sheet: pasting a monthly template with empty dates is a normal way to fill a month.
    const rowsBySheet = new Map<string, number[]>()
    for (const { tx, month, sheetYear } of undated) {
      tx.date = toIsoDate(new Date(sheetYear ?? fallbackYear, month - 1, 1))
      rowsBySheet.set(tx.sourceSheet!, [...(rowsBySheet.get(tx.sourceSheet!) ?? []), tx.sourceRow!])
    }
    for (const [sheet, rows] of rowsBySheet) {
      const date = undated.find((u) => u.tx.sourceSheet === sheet)!.tx.date
      issue({
        severity: 'warning',
        sheet,
        row: rows[0],
        field: 'date',
        message: `${rows.length === 1 ? `Row ${rows[0]} has` : `${rows.length} rows (${rows.join(', ')}) have`} no date; recorded on ${formatDisplayDate(date)} (start of ${sheet}). Add the real date in Excel if it matters.`,
        rawValue: '',
        recovered: true,
      })
    }
  }

  const missingSheets = MONTH_SHEETS.filter((m) => !foundMonths.has(m))
  const result: ParsedWorkbook = { transactions, issues, sheets, missingSheets, otherSheets }
  if (foundMonths.size === 0) {
    result.fatalError = workbook.SheetNames.length === 0
      ? 'The workbook is empty.'
      : `No monthly worksheets (January … December) were found. Sheets present: ${workbook.SheetNames.join(', ')}.`
  } else if (sheets.length === 0) {
    result.fatalError = 'Monthly worksheets were found but none had a recognizable transaction header row.'
  }
  transactions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.sourceRow ?? 0) - (b.sourceRow ?? 0)))
  return result
}

export function parseWorkbookBuffer(buffer: ArrayBuffer): { workbook: XLSX.WorkBook; parsed: ParsedWorkbook } {
  const workbook = readWorkbookFromBuffer(buffer)
  return { workbook, parsed: parseWorkbook(workbook) }
}

import * as XLSX from 'xlsx'
import type { Transaction } from '@/types/finance'
import { EXPECTED_COLUMNS, MONTH_SHEETS, type ColumnKey, type SheetLayout } from '@/types/workbook'
import { isoToExcelSerial, monthOfIso, yearOfIso } from '@/utils/dateFormatter'
import { detectLayout, resolveMonthSheet, sheetToRows, yearFromSheetName } from './workbookReader'

const STANDARD_COLUMNS: ColumnKey[] = ['date', 'description', 'category', 'type', 'paymentMethod', 'amount', 'notes']
const DEFAULT_DATE_FORMAT = 'dd-mmm-yyyy'
const DEFAULT_AMOUNT_FORMAT = '#,##0.00'

export class WorkbookWriteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkbookWriteError'
  }
}

export interface WriteResult {
  workbook: XLSX.WorkBook
  /** Transactions with refreshed sourceSheet / sourceRow after the write. */
  transactions: Transaction[]
  /** Sheets that were created because they did not exist. */
  createdSheets: string[]
}

interface MonthSheetRef {
  name: string
  /** 1-12 */
  month: number
  /** Year in the sheet name ("January 2027"), or null for a plain "January" sheet that takes any year. */
  year: number | null
}

/** The monthly sheets in workbook order; a repeated month + year keeps only the first, like the reader. */
function listMonthSheets(workbook: XLSX.WorkBook): MonthSheetRef[] {
  const refs: MonthSheetRef[] = []
  for (const name of workbook.SheetNames) {
    const month = resolveMonthSheet(name)
    if (!month) continue
    const ref = { name, month: MONTH_SHEETS.indexOf(month) + 1, year: yearFromSheetName(name) }
    if (!refs.some((r) => r.month === ref.month && r.year === ref.year)) refs.push(ref)
  }
  return refs
}

/** A sheet named for the exact month and year wins; otherwise a plain month sheet takes the row. */
function findSheetFor(refs: MonthSheetRef[], year: number, month: number): string | null {
  return (refs.find((r) => r.month === month && r.year === year) ?? refs.find((r) => r.month === month && r.year === null))?.name ?? null
}

const sheetOrder = (year: number | null, month: number) => (year ?? 0) * 100 + month

function createMonthSheet(workbook: XLSX.WorkBook, refs: MonthSheetRef[], year: number, month: number): string {
  // Workbooks that already name sheets by year ("January 2027") get the same style; otherwise "January".
  const withYear = refs.some((r) => r.year !== null)
  const name = withYear ? `${MONTH_SHEETS[month - 1]} ${year}` : MONTH_SHEETS[month - 1]
  const ws = XLSX.utils.aoa_to_sheet([[...EXPECTED_COLUMNS]])
  ws['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 30 }]
  // Keep calendar order: insert before the first later month sheet, otherwise append.
  const order = sheetOrder(withYear ? year : null, month)
  const later = workbook.SheetNames.findIndex((n) => {
    const ref = refs.find((r) => r.name === n)
    return ref !== undefined && sheetOrder(ref.year, ref.month) > order
  })
  workbook.SheetNames.splice(later === -1 ? workbook.SheetNames.length : later, 0, name)
  workbook.Sheets[name] = ws
  refs.push({ name, month, year: withYear ? year : null })
  return name
}

/** Finds an existing number format in a column (first data cell below the header). */
function existingFormat(ws: XLSX.WorkSheet, col: number, headerRow: number, fallback: string, lastRow: number): string {
  for (let r = headerRow + 1; r <= Math.min(lastRow, headerRow + 50); r += 1) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: col })]
    if (cell && cell.z && cell.t !== 's') return String(cell.z)
  }
  return fallback
}

function sortForSheet(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  return (a.sourceRow ?? Number.MAX_SAFE_INTEGER) - (b.sourceRow ?? Number.MAX_SAFE_INTEGER)
}

/**
 * Rewrites the transaction region of every monthly worksheet so that it mirrors the given
 * transaction list. Cells outside the mapped transaction columns (totals, notes, formulas),
 * worksheets that are not monthly sheets, column widths and merges are preserved.
 *
 * The region is rebuilt from scratch on every write, so repeated saves never create duplicates
 * and edits/deletes/month moves are reflected exactly once.
 */
export function applyTransactionsToWorkbook(workbook: XLSX.WorkBook, transactions: Transaction[]): WriteResult {
  const refs = listMonthSheets(workbook)
  const createdSheets: string[] = []
  const bySheet = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    const m = monthOfIso(tx.date)
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      throw new WorkbookWriteError(`Transaction "${tx.description}" has an invalid date (${tx.date}).`)
    }
    let sheetName = findSheetFor(refs, yearOfIso(tx.date), m)
    if (!sheetName) {
      sheetName = createMonthSheet(workbook, refs, yearOfIso(tx.date), m)
      createdSheets.push(sheetName)
    }
    bySheet.set(sheetName, [...(bySheet.get(sheetName) ?? []), tx])
  }

  const updated: Transaction[] = []

  // Every monthly sheet is rebuilt, including ones that end up empty, so deletes and moves are written.
  refs.forEach(({ name: sheetName }) => {
    const list = (bySheet.get(sheetName) ?? []).slice().sort(sortForSheet)
    const ws = workbook.Sheets[sheetName]
    const rows = sheetToRows(ws)
    let layout: SheetLayout | null = detectLayout(sheetName, rows)

    if (!layout) {
      const empty = rows.every((row) => row.every((c) => c == null || String(c).trim() === ''))
      if (!empty) {
        if (list.length === 0) return
        throw new WorkbookWriteError(
          `Worksheet "${sheetName}" has no recognizable header row (Date, Description, Category, Type, Payment Method, Amount (INR), Notes). Add the header row in Excel and try again.`,
        )
      }
      XLSX.utils.sheet_add_aoa(ws, [[...EXPECTED_COLUMNS]], { origin: 'A1' })
      layout = { name: sheetName, headerRow: 0, columns: {}, dataRows: 0 }
      STANDARD_COLUMNS.forEach((key, c) => {
        layout!.columns[key] = c
      })
    }

    const { headerRow } = layout
    const columns = { ...layout.columns }

    // Add any missing standard columns at the end of the header so nothing is lost on save.
    const usedCols = Object.values(columns).filter((c): c is number => c !== undefined)
    let nextCol = usedCols.length ? Math.max(...usedCols) + 1 : 0
    for (const key of STANDARD_COLUMNS) {
      if (columns[key] === undefined) {
        const label = EXPECTED_COLUMNS[STANDARD_COLUMNS.indexOf(key)]
        ws[XLSX.utils.encode_cell({ r: headerRow, c: nextCol })] = { t: 's', v: label }
        columns[key] = nextCol
        nextCol += 1
      }
    }

    const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { s: { r: 0, c: 0 }, e: { r: headerRow, c: nextCol - 1 } }
    const lastExistingRow = Math.max(range.e.r, headerRow)
    const dateFormat = existingFormat(ws, columns.date!, headerRow, DEFAULT_DATE_FORMAT, lastExistingRow)
    const amountFormat = existingFormat(ws, columns.amount!, headerRow, DEFAULT_AMOUNT_FORMAT, lastExistingRow)

    // Clear the transaction columns below the header (keeps unrelated columns such as totals).
    const txCols = STANDARD_COLUMNS.map((k) => columns[k]!)
    for (let r = headerRow + 1; r <= lastExistingRow; r += 1) {
      for (const c of txCols) {
        delete ws[XLSX.utils.encode_cell({ r, c })]
      }
    }

    list.forEach((tx, i) => {
      const r = headerRow + 1 + i
      const put = (key: ColumnKey, cell: XLSX.CellObject | null) => {
        const addr = XLSX.utils.encode_cell({ r, c: columns[key]! })
        if (cell) ws[addr] = cell
        else delete ws[addr]
      }
      put('date', { t: 'n', v: isoToExcelSerial(tx.date), z: dateFormat })
      put('description', { t: 's', v: tx.description })
      put('category', { t: 's', v: tx.category })
      put('type', { t: 's', v: tx.type })
      put('paymentMethod', tx.paymentMethod ? { t: 's', v: tx.paymentMethod } : null)
      put('amount', { t: 'n', v: tx.amount, z: amountFormat })
      put('notes', tx.notes ? { t: 's', v: tx.notes } : null)
      updated.push({ ...tx, sourceSheet: sheetName, sourceRow: r + 1 })
    })

    const lastDataRow = headerRow + list.length
    const newRange = {
      s: { r: Math.min(range.s.r, 0), c: Math.min(range.s.c, 0) },
      e: { r: Math.max(lastDataRow, headerRow, rangeEndRowExcludingTxCols(ws, range, txCols, headerRow)), c: Math.max(range.e.c, nextCol - 1) },
    }
    ws['!ref'] = XLSX.utils.encode_range(newRange)
  })

  // Transactions that could not be placed (should never happen) are returned unchanged.
  const placed = new Set(updated.map((t) => t.id))
  for (const tx of transactions) if (!placed.has(tx.id)) updated.push(tx)

  return { workbook, transactions: updated, createdSheets }
}

/** Highest row that still has a cell outside the transaction columns, so !ref never shrinks over preserved data. */
function rangeEndRowExcludingTxCols(ws: XLSX.WorkSheet, range: XLSX.Range, txCols: number[], headerRow: number): number {
  let max = headerRow
  const txSet = new Set(txCols)
  for (const addr of Object.keys(ws)) {
    if (addr.startsWith('!')) continue
    const { r, c } = XLSX.utils.decode_cell(addr)
    if (r > max && !txSet.has(c) && r <= range.e.r) max = r
  }
  return max
}

export function workbookToBuffer(workbook: XLSX.WorkBook): ArrayBuffer {
  const out = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', cellDates: false, compression: true })
  return out as ArrayBuffer
}

/** Builds a fresh workbook from scratch (used when exporting without a connected file). */
export function buildWorkbookFromTransactions(transactions: Transaction[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  for (const month of MONTH_SHEETS) {
    const ws = XLSX.utils.aoa_to_sheet([[...EXPECTED_COLUMNS]])
    ws['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, ws, month)
  }
  return applyTransactionsToWorkbook(wb, transactions).workbook
}

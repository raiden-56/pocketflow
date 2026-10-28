import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { parseWorkbook, parseWorkbookBuffer, readWorkbookFromBuffer, resolveMonthSheet, normalizeType } from '@/services/excel/workbookReader'
import { applyTransactionsToWorkbook, workbookToBuffer, buildWorkbookFromTransactions } from '@/services/excel/workbookWriter'
import { normalizeDateValue, isoToExcelSerial, excelSerialToDate, toIsoDate } from '@/utils/dateFormatter'
import { parseAmountValue, formatMoney, formatMoneyShort } from '@/utils/currencyFormatter'
import type { Transaction } from '@/types/finance'

const TEMPLATE = resolve(__dirname, '..', 'Personal_Money_Tracker_Template_2026.xlsx')

function loadTemplate() {
  const buf = readFileSync(TEMPLATE)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  return parseWorkbookBuffer(ab)
}

describe('value normalization', () => {
  it('normalizes dates from serials, Date objects and text', () => {
    expect(normalizeDateValue(46023)).toBe('2026-01-01')
    expect(normalizeDateValue(new Date(2026, 2, 15))).toBe('2026-03-15')
    expect(normalizeDateValue('15/03/2026')).toBe('2026-03-15')
    expect(normalizeDateValue('2026-03-15')).toBe('2026-03-15')
    expect(normalizeDateValue('15 Mar 2026')).toBe('2026-03-15')
    expect(normalizeDateValue('15-Mar-2026')).toBe('2026-03-15')
    expect(normalizeDateValue('not a date')).toBeNull()
    expect(normalizeDateValue('')).toBeNull()
    expect(normalizeDateValue(null)).toBeNull()
  })

  it('round-trips ISO dates through Excel serials', () => {
    for (const iso of ['2026-01-01', '2026-02-28', '2026-12-31', '2024-02-29']) {
      expect(toIsoDate(excelSerialToDate(isoToExcelSerial(iso))!)).toBe(iso)
    }
  })

  it('parses amounts with currency symbols and Indian grouping', () => {
    expect(parseAmountValue('₹1,20,000.50')).toBe(120000.5)
    expect(parseAmountValue('Rs. 5,000')).toBe(5000)
    expect(parseAmountValue('(500)')).toBe(-500)
    expect(parseAmountValue(1234.5)).toBe(1234.5)
    expect(parseAmountValue('abc')).toBeNull()
    expect(parseAmountValue('')).toBeNull()
  })

  it('formats INR with Indian grouping', () => {
    expect(formatMoney(50000)).toBe('₹50,000.00')
    expect(formatMoney(1234567.891)).toBe('₹12,34,567.89')
    expect(formatMoney(-250)).toBe('−₹250.00')
    expect(formatMoneyShort(125000)).toBe('₹1.3L')
    expect(formatMoneyShort(4500)).toBe('₹4.5K')
  })

  it('resolves month sheet names loosely', () => {
    expect(resolveMonthSheet('January')).toBe('January')
    expect(resolveMonthSheet('jan')).toBe('January')
    expect(resolveMonthSheet('March 2026')).toBe('March')
    expect(resolveMonthSheet('Summary')).toBeNull()
    expect(normalizeType('income')).toBe('Income')
    expect(normalizeType('DEBIT')).toBe('Expense')
    expect(normalizeType('??')).toBeNull()
  })
})

describe('template workbook parsing', () => {
  it('reads all 12 monthly sheets from the template', () => {
    const { parsed } = loadTemplate()
    expect(parsed.fatalError).toBeUndefined()
    expect(parsed.missingSheets).toEqual([])
    expect(parsed.sheets).toHaveLength(12)
    expect(parsed.otherSheets).toEqual(['Summary'])
    expect(parsed.transactions.length).toBeGreaterThan(100)
    expect(parsed.issues.filter((i) => i.severity === 'error')).toHaveLength(0)
    const jan = parsed.transactions.filter((t) => t.date.startsWith('2026-01'))
    expect(jan.every((t) => t.sourceSheet === 'January')).toBe(true)
    expect(jan.find((t) => t.description === 'Monthly salary')?.amount).toBe(85000)
    expect(parsed.transactions.every((t) => t.amount > 0)).toBe(true)
  })

  it('keeps invalid rows visible as validation issues instead of dropping them silently', () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['Personal tracker'],
      [],
      ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes'],
      ['2026-05-02', 'Coffee', 'Food', 'Expense', 'UPI', '₹120', ''],
      ['bad date', 'Broken', 'Food', 'Expense', 'UPI', 100, ''],
      ['2026-05-04', 'Salary', 'Salary', '', 'Bank', 50000, ''],
      ['2026-05-05', 'Oops', 'Food', 'Expense', 'Card', 'twelve', ''],
      ['2026-05-02', 'Coffee', 'Food', 'Expense', 'UPI', 120, ''],
      [],
      ['2026-06-01', 'June in May sheet', 'Food', 'Expense', 'Cash', 50, ''],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'May')
    const parsed = parseWorkbook(wb)
    expect(parsed.sheets[0].headerRow).toBe(2)
    expect(parsed.transactions.map((t) => t.description)).toEqual(['Coffee', 'Coffee', 'Salary', 'June in May sheet'])
    const errors = parsed.issues.filter((i) => i.severity === 'error')
    expect(errors.map((e) => e.row).sort()).toEqual([5, 7])
    expect(parsed.issues.some((i) => i.field === 'type' && i.row === 6)).toBe(true)
    expect(parsed.issues.some((i) => i.message.includes('duplicate'))).toBe(true)
    expect(parsed.issues.some((i) => i.message.includes('not in May'))).toBe(true)
    expect(parsed.missingSheets).toHaveLength(11)
  })

  it('reports a fatal error when no monthly sheets exist', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a', 'b']]), 'Sheet1')
    const parsed = parseWorkbook(wb)
    expect(parsed.fatalError).toMatch(/No monthly worksheets/)
  })
})

describe('writing changes back to the workbook', () => {
  it('adds, edits, deletes and moves transactions without duplicates and preserves other sheets', () => {
    const { workbook, parsed } = loadTemplate()
    const original = parsed.transactions
    const total = original.length

    const [first] = original.filter((t) => t.sourceSheet === 'January')
    const edited: Transaction = { ...first, description: 'EDITED salary', amount: 90000 }
    const moved = original.find((t) => t.sourceSheet === 'March' && t.description === 'Weekend trip to Coorg')!
    const movedTx: Transaction = { ...moved, date: '2026-04-09' }
    const deleted = original.find((t) => t.sourceSheet === 'February' && t.description === 'Movie night')!
    const added: Transaction = {
      id: 'tx_new',
      date: '2026-11-05',
      description: 'New November item',
      category: 'Food',
      type: 'Expense',
      paymentMethod: 'UPI',
      amount: 345.5,
      notes: 'added by test',
    }

    const next = original
      .filter((t) => t.id !== deleted.id)
      .map((t) => (t.id === first.id ? edited : t.id === moved.id ? movedTx : t))
      .concat(added)

    const result = applyTransactionsToWorkbook(workbook, next)
    const buffer = workbookToBuffer(result.workbook)
    const reread = parseWorkbookBuffer(buffer)

    expect(reread.parsed.fatalError).toBeUndefined()
    expect(reread.parsed.transactions).toHaveLength(total) // -1 deleted +1 added
    expect(reread.parsed.issues.filter((i) => i.severity === 'error')).toHaveLength(0)
    expect(reread.parsed.issues.filter((i) => i.message.includes('duplicate'))).toHaveLength(0)

    const salaryRows = reread.parsed.transactions.filter((t) => t.description === 'EDITED salary')
    expect(salaryRows).toHaveLength(1)
    expect(salaryRows[0].amount).toBe(90000)
    expect(salaryRows[0].sourceSheet).toBe('January')

    const trip = reread.parsed.transactions.filter((t) => t.description === 'Weekend trip to Coorg')
    expect(trip).toHaveLength(1)
    expect(trip[0].sourceSheet).toBe('April')
    expect(trip[0].date).toBe('2026-04-09')

    expect(reread.parsed.transactions.filter((t) => t.description === 'Movie night' && t.sourceSheet === 'February')).toHaveLength(0)
    const nov = reread.parsed.transactions.filter((t) => t.sourceSheet === 'November')
    expect(nov).toHaveLength(1)
    expect(nov[0].notes).toBe('added by test')
    expect(nov[0].amount).toBe(345.5)

    // The Summary sheet with its formulas is preserved untouched.
    expect(reread.workbook.SheetNames[0]).toBe('Summary')
    const summary = reread.workbook.Sheets.Summary
    expect(summary.B2.f).toContain('SUMIF')
    expect(reread.workbook.SheetNames).toHaveLength(13)

    // Refreshed source rows are returned for in-app records.
    const newRow = result.transactions.find((t) => t.id === 'tx_new')
    expect(newRow?.sourceSheet).toBe('November')
    expect(newRow?.sourceRow).toBe(2)

    // Saving the same state twice is idempotent.
    const again = applyTransactionsToWorkbook(reread.workbook, reread.parsed.transactions)
    const reread2 = parseWorkbookBuffer(workbookToBuffer(again.workbook))
    expect(reread2.parsed.transactions).toHaveLength(total)
  })

  it('preserves cells outside the transaction columns and creates missing month sheets', () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes', '', 'Total', { t: 'n', v: 0, f: 'SUM(F2:F100)' }],
      [46023, 'Salary', 'Salary', 'Income', 'Bank', 1000, ''],
      [46024, 'Rent', 'Rent', 'Expense', 'Bank', 400, ''],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'January')
    const parsed = parseWorkbook(wb)
    const next = parsed.transactions.filter((t) => t.description !== 'Rent').concat({
      id: 'x', date: '2026-07-10', description: 'July thing', category: 'Food', type: 'Expense', paymentMethod: 'UPI', amount: 10, notes: '',
    })
    const result = applyTransactionsToWorkbook(wb, next)
    expect(result.createdSheets).toEqual(['July'])
    expect(result.workbook.SheetNames).toEqual(['January', 'July'])
    const jan = result.workbook.Sheets.January
    expect(jan.J1.f).toBe('SUM(F2:F100)')
    expect(jan.I1.v).toBe('Total')
    expect(jan.B3).toBeUndefined()
    const reread = parseWorkbook(readWorkbookFromBuffer(workbookToBuffer(result.workbook)))
    expect(reread.transactions.map((t) => t.description)).toEqual(['Salary', 'July thing'])
  })

  it('builds a complete workbook from scratch for export', () => {
    const wb = buildWorkbookFromTransactions([
      { id: 'a', date: '2026-02-01', description: 'A', category: 'Food', type: 'Expense', paymentMethod: 'Cash', amount: 1, notes: '' },
    ])
    expect(wb.SheetNames).toHaveLength(12)
    const parsed = parseWorkbook(wb)
    expect(parsed.transactions).toHaveLength(1)
    expect(parsed.transactions[0].sourceSheet).toBe('February')
  })
})

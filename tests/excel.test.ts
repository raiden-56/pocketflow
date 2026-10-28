import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { parseWorkbook, parseWorkbookBuffer, readWorkbookFromBuffer, resolveMonthSheet, normalizeType } from '@/services/excel/workbookReader'
import { applyTransactionsToWorkbook, workbookToBuffer, buildWorkbookFromTransactions } from '@/services/excel/workbookWriter'
import { normalizeDateValue, isoToExcelSerial, excelSerialToDate, toIsoDate } from '@/utils/dateFormatter'
import { parseAmountValue, formatMoney, formatMoneyShort } from '@/utils/currencyFormatter'
import { contentSignature, toWorkbookDownloadUrl } from '@/services/excel/sheetLink'
import { isScriptUrl, rowsBySheet, scriptRowsFromWrite, workbookFromScriptSheets } from '@/services/excel/sheetScript'
import { balancesByPerson, cardUsage, lendingTotals } from '@/utils/lendingCalculations'
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

describe('Google Sheet links', () => {
  it('converts published and shared links to .xlsx download URLs', () => {
    expect(toWorkbookDownloadUrl('https://docs.google.com/spreadsheets/d/e/2PACX-1vAbC_d-9/pubhtml')).toBe(
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vAbC_d-9/pub?output=xlsx',
    )
    expect(toWorkbookDownloadUrl(' https://docs.google.com/spreadsheets/d/e/2PACX-1vAbC/pub?gid=0&single=true&output=csv ')).toBe(
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vAbC/pub?output=xlsx',
    )
    expect(toWorkbookDownloadUrl('https://docs.google.com/spreadsheets/d/1AbCdEf_gh-IJ/edit?usp=sharing#gid=0')).toBe(
      'https://docs.google.com/spreadsheets/d/1AbCdEf_gh-IJ/export?format=xlsx',
    )
    expect(toWorkbookDownloadUrl('https://example.com/money.xlsx')).toBe('https://example.com/money.xlsx')
    expect(() => toWorkbookDownloadUrl('not a link')).toThrow(/not a valid link/)
    expect(() => toWorkbookDownloadUrl('http://example.com/money.xlsx')).toThrow(/https/)
  })

  it('changes the content signature only when transaction data changes', () => {
    const { parsed } = loadTemplate()
    const { parsed: again } = loadTemplate()
    expect(contentSignature(again)).toBe(contentSignature(parsed))
    again.transactions[0] = { ...again.transactions[0], amount: again.transactions[0].amount + 1 }
    expect(contentSignature(again)).not.toBe(contentSignature(parsed))
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

  it('dates rows typed without a date to the start of their sheet month instead of skipping them', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes'],
      [46023, 'Salary', 'Salary', 'Income', 'Bank', 50000, ''],
    ]), 'January')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes'],
      ['', 'RD', 'Savings', 'Expense', '', 10000, ''],
      [null, 'SIP', '', '', '', '1,500', ''],
      [null, '', '', '', '', 11500, ''],
    ]), 'October')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes'],
      [null, 'Rent', 'Rent', 'Expense', '', 7000, ''],
    ]), 'November 2025')
    const parsed = parseWorkbook(wb)
    const byDesc = Object.fromEntries(parsed.transactions.map((t) => [t.description, t]))
    expect(byDesc.RD.date).toBe('2026-10-01')
    expect(byDesc.SIP.date).toBe('2026-10-01')
    expect(byDesc.SIP.amount).toBe(1500)
    expect(byDesc.Rent.date).toBe('2025-11-01')
    // An amount on its own (likely a total) is still skipped and reported.
    const errors = parsed.issues.filter((i) => i.severity === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({ sheet: 'October', row: 4, field: 'date' })
    // One grouped note per sheet, not one per row.
    const undatedNotes = parsed.issues.filter((i) => i.field === 'date' && i.recovered)
    expect(undatedNotes.map((i) => i.sheet).sort()).toEqual(['November 2025', 'October'])
    expect(undatedNotes.find((i) => i.sheet === 'October')!.message).toMatch(/^2 rows \(2, 3\) have no date; recorded on 01 Oct 2026/)
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

describe('year-named month sheets', () => {
  const header = ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes']

  it('reads "January 2026" and "January 2027" as separate sheets and writes each row to its own year', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ['2026-01-05', 'Rent', 'Rent', 'Expense', '', 7000, '']]), 'January 2026')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ['2027-01-05', 'Rent', 'Rent', 'Expense', '', 7500, ''], ['2026-01-09', 'Wrong year', 'Food', 'Expense', '', 50, '']]), 'January 2027')
    const parsed = parseWorkbook(wb)
    expect(parsed.issues.some((i) => i.message.includes('Duplicate'))).toBe(false)
    expect(parsed.transactions).toHaveLength(3)
    expect(parsed.issues.some((i) => i.message.includes('not in January 2027'))).toBe(true)

    const added: Transaction = { id: 'n', date: '2027-03-02', description: 'SIP', category: 'Savings', type: 'Expense', paymentMethod: 'UPI', amount: 1500, notes: '' }
    const result = applyTransactionsToWorkbook(wb, [...parsed.transactions, added])
    expect(result.createdSheets).toEqual(['March 2027'])
    expect(result.workbook.SheetNames).toEqual(['January 2026', 'January 2027', 'March 2027'])
    const sheetOf = (d: string) => result.transactions.find((t) => t.description === d)!.sourceSheet
    expect(sheetOf('Wrong year')).toBe('January 2026')
    expect(result.transactions.filter((t) => t.sourceSheet === 'January 2027').map((t) => t.amount)).toEqual([7500])
    expect(sheetOf('SIP')).toBe('March 2027')
  })

  it('keeps plain month sheets for every year in workbooks without year names', () => {
    const { workbook, parsed } = loadTemplate()
    const next: Transaction = { id: 'y', date: '2027-02-01', description: 'Next year', category: 'Food', type: 'Expense', paymentMethod: 'UPI', amount: 10, notes: '' }
    const result = applyTransactionsToWorkbook(workbook, [...parsed.transactions, next])
    expect(result.createdSheets).toEqual([])
    expect(result.transactions.find((t) => t.id === 'y')!.sourceSheet).toBe('February')
  })
})

describe('Lending sheet', () => {
  it('reads people, cashback and paid amounts, using the sheet Remaining column when filled', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes']]), 'January')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date', 'Person', 'Given via', 'Card / account', 'Purpose', 'Amount (INR)', 'Cashback (INR)', 'Paid back (INR)', 'Remaining (INR)', 'Notes'],
      ['2026-11-03', 'Ravi', 'Credit card', 'HDFC Millennia', 'Phone', 20000, 300, 5000, 15000, ''],
      ['2026-11-10', 'ravi ', 'Cash', '', 'Trip', 3000, '', 3000, '', 'settled'],
      ['2026-11-12', 'Anil', 'UPI', '', 'Rent help', 5000, '', '', 4000, 'custom remaining'],
      ['', '', '', '', '', '', '', '', '', ''],
    ]), 'Lending')
    const parsed = parseWorkbook(wb)
    expect(parsed.lending).toHaveLength(3)
    expect(parsed.lending[1]).toMatchObject({ person: 'ravi', amount: 3000, paidBack: 3000, remaining: 0, notes: 'settled' })
    expect(parsed.lending[2].remaining).toBe(4000)
    expect(parsed.otherSheets).toContain('Lending')

    expect(lendingTotals(parsed.lending)).toEqual({ taken: 28000, paidBack: 8000, remaining: 19000, cashback: 300 })
    const people = balancesByPerson(parsed.lending)
    expect(people.map((p) => [p.person, p.entries, p.remaining])).toEqual([['Ravi', 2, 15000], ['Anil', 1, 4000]])
    expect(cardUsage(parsed.lending)).toEqual([{ card: 'HDFC Millennia', entries: 1, taken: 20000, paidBack: 5000, remaining: 15000, cashback: 300 }])
  })

  it('has no lending entries when the workbook has no Lending sheet', () => {
    expect(loadTemplate().parsed.lending).toEqual([])
  })
})

describe('private Google Sheet (Apps Script) round trip', () => {
  it('parses script sheet values and sends back rows for every monthly sheet, including emptied ones', () => {
    const header = ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes']
    const wb = workbookFromScriptSheets([
      { name: 'Summary', rows: [['Month', 'Income'], ['January', 0]] },
      { name: 'November 2026', rows: [header, ['2026-11-01', 'Salary', 'Salary', 'Income', '', 91600, ''], ['2026-11-01', 'Rent', 'Rent', 'Expense', '', 7000, '']] },
      { name: 'December 2026', rows: [header, ['2026-12-01', 'Old', 'Food', 'Expense', '', 10, '']] },
    ])
    const parsed = parseWorkbook(wb)
    expect(parsed.transactions.map((t) => [t.date, t.description, t.amount])).toEqual([
      ['2026-11-01', 'Salary', 91600],
      ['2026-11-01', 'Rent', 7000],
      ['2026-12-01', 'Old', 10],
    ])
    const kept = parsed.transactions.filter((t) => t.description !== 'Old')
    const rows = scriptRowsFromWrite(applyTransactionsToWorkbook(wb, kept))
    expect(Object.keys(rows)).toEqual(['November 2026', 'December 2026'])
    expect(rows['December 2026']).toEqual([])
    expect(rows['November 2026'][0]).toEqual(['2026-11-01', 'Salary', 'Salary', 'Income', '', 91600, ''])
  })

  it('recognizes Apps Script web app URLs', () => {
    expect(isScriptUrl('https://script.google.com/macros/s/AKfycbx-ABC_123/exec')).toBe(true)
    expect(isScriptUrl('https://docs.google.com/spreadsheets/d/e/2PACX-1v/pubhtml')).toBe(false)
  })
})

describe('private Google Sheet saves', () => {
  it('sends only the monthly sheets whose rows changed', () => {
    const header = ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes']
    const wb = workbookFromScriptSheets([
      { name: 'October 2026', rows: [header] },
      { name: 'November 2026', rows: [header, ['2026-11-01', 'Rent', 'Rent', 'Expense', '', 7000, '']] },
    ])
    const parsed = parseWorkbook(wb)
    const before = rowsBySheet(parsed.transactions, wb.SheetNames)
    const added: Transaction = { id: 'a', date: '2026-10-28', description: 'Test', category: 'Food', type: 'Expense', paymentMethod: 'UPI', amount: 1, notes: '' }
    const rows = scriptRowsFromWrite(applyTransactionsToWorkbook(wb, [...parsed.transactions, added]), before)
    expect(rows).toEqual({ 'October 2026': [['2026-10-28', 'Test', 'Food', 'Expense', 'UPI', 1, '']] })
  })
})

describe('sheet key storage', () => {
  it('keeps the private sheet key only in this browser and forgets it on request', async () => {
    const store = new Map<string, string>()
    const fake = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true })
    // A developer's .env.local must not leak into this test.
    vi.stubEnv('VITE_SHEET_URL', '')
    vi.stubEnv('VITE_SHEET_KEY', '')
    vi.resetModules()
    const { rememberSheetKey, sheetKey } = await import('@/app/config')
    expect(sheetKey()).toBe('')
    rememberSheetKey('abc123')
    expect(sheetKey()).toBe('abc123')
    expect([...store.keys()]).toEqual(['pocketflow:sheet-key'])
    rememberSheetKey(null)
    expect(sheetKey()).toBe('')
    expect(store.size).toBe(0)
    vi.unstubAllEnvs()
  })
})

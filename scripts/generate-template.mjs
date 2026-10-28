/**
 * Generates the Excel workbooks used by PocketFlow:
 *   - Personal_Money_Tracker_Template_2026.xlsx  (12 monthly sheets with sample 2026 data + Summary sheet)
 *   - public/PocketFlow_Blank_Template.xlsx     (12 empty monthly sheets, header row only)
 *
 * Run: node scripts/generate-template.mjs
 */
import * as XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const HEADER = ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes']
const COLS = [{ wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 30 }]

function serial(y, m, d) {
  return Math.round(Date.UTC(y, m - 1, d) / 86400000) + 25569
}

const YEAR = 2026
const recurring = (m) => [
  [1, 'Monthly salary', 'Salary', 'Income', 'Bank Transfer', 85000, ''],
  [2, 'House rent', 'Rent', 'Expense', 'Bank Transfer', 18000, ''],
  [3, 'Electricity bill', 'Bills', 'Expense', 'UPI', 1450 + (m % 3) * 230, ''],
  [5, 'Mobile + broadband', 'Bills', 'Expense', 'UPI', 1199, ''],
  [7, 'Bike loan EMI', 'EMI', 'Expense', 'Bank Transfer', 4200, ''],
  [8, 'Weekly groceries', 'Groceries', 'Expense', 'Card', 2650 + (m * 37) % 400, 'BigBasket'],
  [12, 'Metro & auto', 'Transport', 'Expense', 'UPI', 900 + (m * 53) % 500, ''],
  [14, 'Lunch with team', 'Food', 'Expense', 'Card', 640 + (m * 71) % 300, ''],
  [16, 'Weekly groceries', 'Groceries', 'Expense', 'Card', 2410 + (m * 19) % 350, ''],
  [18, 'Movie night', 'Entertainment', 'Expense', 'UPI', 480, ''],
  [20, 'Gym membership', 'Health', 'Expense', 'Card', 1500, ''],
  [22, 'Dinner out', 'Food', 'Expense', 'Card', 1150 + (m * 29) % 600, ''],
  [24, 'Weekly groceries', 'Groceries', 'Expense', 'Card', 2290 + (m * 11) % 300, ''],
  [26, 'Petrol', 'Transport', 'Expense', 'Card', 1800, ''],
]
const extras = {
  1: [[10, 'Freelance logo design', 'Freelance', 'Income', 'Bank Transfer', 12000, 'Client: Arjun'], [25, 'Winter jacket', 'Shopping', 'Expense', 'Card', 3499, '']],
  2: [[13, 'Valentine dinner', 'Food', 'Expense', 'Card', 2400, ''], [27, 'Mutual fund dividend', 'Investment Income', 'Income', 'Bank Transfer', 1850, '']],
  3: [[9, 'Weekend trip to Coorg', 'Travel', 'Expense', 'Card', 9800, '2 nights'], [21, 'Doctor visit', 'Health', 'Expense', 'Cash', 800, '']],
  4: [[4, 'Freelance website', 'Freelance', 'Income', 'Bank Transfer', 22000, ''], [15, 'New headphones', 'Shopping', 'Expense', 'Card', 5999, '']],
  5: [[11, 'Online course', 'Education', 'Expense', 'Card', 3200, 'React Advanced'], [28, 'Birthday gift', 'Shopping', 'Expense', 'UPI', 1500, '']],
  6: [[6, 'AC repair', 'Other Expenses', 'Expense', 'Cash', 2500, ''], [19, 'Concert tickets', 'Entertainment', 'Expense', 'Card', 2800, '']],
  7: [[13, 'Freelance app review', 'Freelance', 'Income', 'Bank Transfer', 8000, ''], [23, 'Monsoon shoes', 'Shopping', 'Expense', 'Card', 2199, '']],
  8: [[10, 'Trip to Goa', 'Travel', 'Expense', 'Card', 14500, 'Flights + stay'], [29, 'Performance bonus', 'Salary', 'Income', 'Bank Transfer', 25000, '']],
  9: [[4, 'Insurance premium', 'Bills', 'Expense', 'Bank Transfer', 6200, 'Annual'], [17, 'Festival shopping', 'Shopping', 'Expense', 'Card', 4800, '']],
  10: [[9, 'Diwali gifts', 'Shopping', 'Expense', 'UPI', 3600, ''], [15, 'Interest credited', 'Investment Income', 'Income', 'Bank Transfer', 940, '']],
}

function monthSheet(m, withData) {
  const rows = [HEADER]
  if (withData && m <= 10) {
    const list = [...recurring(m), ...(extras[m] ?? [])].sort((a, b) => a[0] - b[0])
    for (const [d, desc, cat, type, method, amount, notes] of list) {
      rows.push([{ t: 'n', v: serial(YEAR, m, d), z: 'dd-mmm-yyyy' }, desc, cat, type, method, { t: 'n', v: amount, z: '#,##0.00' }, notes])
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = COLS
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  return ws
}

function summarySheet() {
  const rows = [['Month', 'Income', 'Expenses', 'Net']]
  MONTHS.forEach((name, i) => {
    const r = i + 2
    rows.push([name, { t: 'n', v: 0, f: `SUMIF(${name}!D:D,"Income",${name}!F:F)` }, { t: 'n', v: 0, f: `SUMIF(${name}!D:D,"Expense",${name}!F:F)` }, { t: 'n', v: 0, f: `B${r}-C${r}` }])
  })
  rows.push(['Total', { t: 'n', v: 0, f: 'SUM(B2:B13)' }, { t: 'n', v: 0, f: 'SUM(C2:C13)' }, { t: 'n', v: 0, f: 'SUM(D2:D13)' }])
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
  return ws
}

function build(withData) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, summarySheet(), 'Summary')
  MONTHS.forEach((name, i) => XLSX.utils.book_append_sheet(wb, monthSheet(i + 1, withData), name))
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true })
}

mkdirSync(resolve(root, 'public'), { recursive: true })
writeFileSync(resolve(root, 'Personal_Money_Tracker_Template_2026.xlsx'), build(true))
writeFileSync(resolve(root, 'public', 'PocketFlow_Blank_Template.xlsx'), build(false))
console.log('Wrote Personal_Money_Tracker_Template_2026.xlsx and public/PocketFlow_Blank_Template.xlsx')

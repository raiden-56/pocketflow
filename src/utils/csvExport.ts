import type { Transaction } from '@/types/finance'

function escapeCsv(value: unknown): string {
  const text = value == null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const header = ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes', 'Worksheet']
  const rows = transactions.map((t) => [t.date, t.description, t.category, t.type, t.paymentMethod, t.amount, t.notes, t.sourceSheet ?? ''])
  return toCsv([header, ...rows])
}

export function downloadCsv(content: string, fileName: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

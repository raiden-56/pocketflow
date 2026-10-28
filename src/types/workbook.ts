import type { Transaction } from './finance'

export const MONTH_SHEETS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

export type MonthSheetName = (typeof MONTH_SHEETS)[number]

export const EXPECTED_COLUMNS = [
  'Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes',
] as const

export type ColumnKey = 'date' | 'description' | 'category' | 'type' | 'paymentMethod' | 'amount' | 'notes'

export type IssueSeverity = 'error' | 'warning'

export interface ValidationIssue {
  id: string
  severity: IssueSeverity
  sheet: string
  /** 1-based Excel row number, when applicable. */
  row?: number
  field?: ColumnKey | 'row'
  message: string
  rawValue?: string
  /** Set when the row could still be imported with a best-effort value. */
  recovered?: boolean
}

export interface SheetLayout {
  name: string
  /** 0-based index of the header row. */
  headerRow: number
  /** Map of column key -> 0-based column index. */
  columns: Partial<Record<ColumnKey, number>>
  dataRows: number
}

export interface ParsedWorkbook {
  transactions: Transaction[]
  issues: ValidationIssue[]
  sheets: SheetLayout[]
  missingSheets: string[]
  otherSheets: string[]
  /** Set when the workbook looks completely wrong (no usable monthly sheets). */
  fatalError?: string
}

export type ConnectionMode = 'direct' | 'import'

export type SyncStatus =
  | 'disconnected'
  | 'connected'
  | 'syncing'
  | 'pending'
  | 'synced'
  | 'permission-required'
  | 'failed'
  | 'conflict'

export interface FileFingerprint {
  lastModified: number
  size: number
}

export type PendingChangeKind = 'add' | 'edit' | 'delete'

export interface PendingChange {
  id: string
  kind: PendingChangeKind
  at: string
  transactionId: string
  summary: string
}

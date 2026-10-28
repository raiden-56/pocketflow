export type TransactionType = 'Income' | 'Expense'

export interface Transaction {
  /** Stable in-app identifier (not stored in Excel). */
  id: string
  /** ISO date, yyyy-MM-dd. */
  date: string
  description: string
  category: string
  type: TransactionType
  paymentMethod: string
  /** Always positive; direction is determined by `type`. */
  amount: number
  notes: string
  /** Monthly worksheet the record was read from (undefined for new records). */
  sourceSheet?: string
  /** 1-based Excel row number inside the source worksheet. */
  sourceRow?: number
}

export type TransactionInput = Omit<Transaction, 'id' | 'sourceSheet' | 'sourceRow'>

export interface Category {
  id: string
  name: string
  type: TransactionType
  enabled: boolean
}

export interface BudgetLimit {
  category: string
  /** Monthly limit in the user's currency. */
  limit: number
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  /** ISO date, yyyy-MM-dd. */
  targetDate: string
  notes: string
  createdAt: string
}

export interface PeriodSummary {
  income: number
  expenses: number
  net: number
  /** Percentage; null when income is zero. */
  savingsRate: number | null
  transactionCount: number
}

export interface CategoryTotal {
  category: string
  amount: number
  share: number
}

export interface MonthlySeriesPoint {
  month: number
  label: string
  income: number
  expenses: number
  net: number
  /** False when the month has no transactions at all. */
  hasData: boolean
}

export interface BudgetProgress {
  category: string
  limit: number
  spent: number
  remaining: number
  percent: number
  status: 'ok' | 'warning' | 'exceeded'
}

export interface Insight {
  id: string
  kind: 'fact' | 'suggestion'
  tone: 'positive' | 'neutral' | 'negative'
  text: string
}

export interface ReportingPeriod {
  year: number
  /** 1-12, or null for the whole year. */
  month: number | null
}

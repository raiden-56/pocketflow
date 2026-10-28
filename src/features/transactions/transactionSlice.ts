import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Transaction, TransactionInput } from '@/types/finance'
import type { ParsedWorkbook, PendingChange, SheetLayout, ValidationIssue } from '@/types/workbook'
import { createId } from '@/utils/id'
import { roundMoney } from '@/utils/currencyFormatter'

export interface TransactionState {
  items: Transaction[]
  issues: ValidationIssue[]
  sheets: SheetLayout[]
  missingSheets: string[]
  otherSheets: string[]
  /** True when in-app edits have not been written to the workbook. */
  dirty: boolean
  pendingChanges: PendingChange[]
  loadedAt: string | null
}

const initialState: TransactionState = {
  items: [],
  issues: [],
  sheets: [],
  missingSheets: [],
  otherSheets: [],
  dirty: false,
  pendingChanges: [],
  loadedAt: null,
}

function describe(tx: Transaction): string {
  return `${tx.date} · ${tx.description} · ${tx.type === 'Income' ? '+' : '−'}${tx.amount}`
}

function normalizeInput(input: TransactionInput): TransactionInput {
  return {
    ...input,
    description: input.description.trim(),
    category: input.category.trim(),
    paymentMethod: input.paymentMethod.trim(),
    notes: (input.notes ?? '').trim(),
    amount: roundMoney(Math.abs(input.amount)),
  }
}

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    workbookLoaded(state, action: PayloadAction<{ parsed: ParsedWorkbook; loadedAt: string }>) {
      const { parsed, loadedAt } = action.payload
      state.items = parsed.transactions
      state.issues = parsed.issues
      state.sheets = parsed.sheets
      state.missingSheets = parsed.missingSheets
      state.otherSheets = parsed.otherSheets
      state.dirty = false
      state.pendingChanges = []
      state.loadedAt = loadedAt
    },
    addTransaction: {
      reducer(state, action: PayloadAction<Transaction>) {
        state.items.push(action.payload)
        state.dirty = true
        state.pendingChanges.push({ id: createId('chg'), kind: 'add', at: new Date().toISOString(), transactionId: action.payload.id, summary: describe(action.payload) })
      },
      prepare(input: TransactionInput) {
        return { payload: { id: createId(), ...normalizeInput(input) } as Transaction }
      },
    },
    updateTransaction(state, action: PayloadAction<{ id: string; changes: TransactionInput }>) {
      const idx = state.items.findIndex((t) => t.id === action.payload.id)
      if (idx === -1) return
      const prev = state.items[idx]
      state.items[idx] = { ...prev, ...normalizeInput(action.payload.changes) }
      state.dirty = true
      state.pendingChanges.push({ id: createId('chg'), kind: 'edit', at: new Date().toISOString(), transactionId: prev.id, summary: describe(state.items[idx]) })
    },
    deleteTransaction(state, action: PayloadAction<string>) {
      const idx = state.items.findIndex((t) => t.id === action.payload)
      if (idx === -1) return
      const [removed] = state.items.splice(idx, 1)
      state.dirty = true
      state.pendingChanges.push({ id: createId('chg'), kind: 'delete', at: new Date().toISOString(), transactionId: removed.id, summary: describe(removed) })
    },
    /** Called after a successful write; source rows are refreshed from the writer result. */
    changesSaved(state, action: PayloadAction<{ transactions: Transaction[]; savedAt: string }>) {
      state.items = action.payload.transactions
      state.dirty = false
      state.pendingChanges = []
      state.loadedAt = action.payload.savedAt
      // Row-level issues refer to the previous layout; keep only structural ones.
      state.issues = state.issues.filter((i) => i.row == null)
    },
    clearTransactions() {
      return initialState
    },
  },
})

export const { workbookLoaded, addTransaction, updateTransaction, deleteTransaction, changesSaved, clearTransactions } = transactionSlice.actions
export default transactionSlice.reducer

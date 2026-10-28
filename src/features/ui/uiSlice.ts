import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ReportingPeriod } from '@/types/finance'
import { createId } from '@/utils/id'

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error'

export interface Toast {
  id: string
  message: string
  severity: ToastSeverity
}

export interface UiState {
  period: ReportingPeriod
  toasts: Toast[]
  transactionDialog: { open: boolean; editingId: string | null }
  sidebarCollapsed: boolean
}

const now = new Date()

const initialState: UiState = {
  period: { year: now.getFullYear(), month: now.getMonth() + 1 },
  toasts: [],
  transactionDialog: { open: false, editingId: null },
  sidebarCollapsed: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setPeriod(state, action: PayloadAction<ReportingPeriod>) {
      state.period = action.payload
    },
    setYear(state, action: PayloadAction<number>) {
      state.period.year = action.payload
    },
    setMonth(state, action: PayloadAction<number | null>) {
      state.period.month = action.payload
    },
    showToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload)
        if (state.toasts.length > 4) state.toasts.shift()
      },
      prepare(message: string, severity: ToastSeverity = 'info') {
        return { payload: { id: createId('toast'), message, severity } }
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
    openTransactionDialog(state, action: PayloadAction<string | null | undefined>) {
      state.transactionDialog = { open: true, editingId: action.payload ?? null }
    },
    closeTransactionDialog(state) {
      state.transactionDialog = { open: false, editingId: null }
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
  },
})

export const { setPeriod, setYear, setMonth, showToast, dismissToast, openTransactionDialog, closeTransactionDialog, toggleSidebar } = uiSlice.actions
export default uiSlice.reducer

import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import transactionsReducer from '@/features/transactions/transactionSlice'
import connectionReducer from '@/features/connection/connectionSlice'
import settingsReducer, { SETTINGS_STORAGE_KEY, storageUnavailable } from '@/features/settings/settingsSlice'
import uiReducer from '@/features/ui/uiSlice'
import { isLocalStorageAvailable, loadLocal, saveLocal } from '@/services/storage/localSettings'

const UI_STORAGE_KEY = 'ui'

function loadUiPrefs(): { sidebarCollapsed: boolean } {
  return loadLocal(UI_STORAGE_KEY, { sidebarCollapsed: false })
}

export const store = configureStore({
  reducer: {
    transactions: transactionsReducer,
    connection: connectionReducer,
    settings: settingsReducer,
    ui: uiReducer,
  },
  preloadedState: {
    ui: {
      period: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
      toasts: [],
      transactionDialog: { open: false, editingId: null },
      sidebarCollapsed: loadUiPrefs().sidebarCollapsed,
    },
  },
  middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
})

// Persist settings (categories, budgets, goals, preferences) and UI preferences to localStorage.
// Transactions are deliberately never persisted here: the Excel workbook is the source of truth.
if (!isLocalStorageAvailable()) {
  store.dispatch(storageUnavailable())
} else {
  let lastSettings = store.getState().settings
  let lastSidebar = store.getState().ui.sidebarCollapsed
  store.subscribe(() => {
    const state = store.getState()
    if (state.settings !== lastSettings) {
      lastSettings = state.settings
      const { storageUnavailable: _ignored, ...persisted } = state.settings
      saveLocal(SETTINGS_STORAGE_KEY, persisted)
    }
    if (state.ui.sidebarCollapsed !== lastSidebar) {
      lastSidebar = state.ui.sidebarCollapsed
      saveLocal(UI_STORAGE_KEY, { sidebarCollapsed: lastSidebar })
    }
  })
}

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppThunk<R = void> = (dispatch: AppDispatch, getState: () => RootState) => R

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

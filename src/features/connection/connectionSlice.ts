import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ConnectionMode, SyncStatus } from '@/types/workbook'

export interface SyncError {
  at: string
  message: string
}

export interface ConnectionState {
  mode: ConnectionMode | null
  status: SyncStatus
  fileName: string | null
  lastSyncedAt: string | null
  lastCheckedAt: string | null
  /** Last time an export was generated in import mode. */
  lastExportAt: string | null
  error: string | null
  errorLog: SyncError[]
  externalChangeDetected: boolean
  /** True while restoring a saved connection on startup. */
  restoring: boolean
  /** True while reading or parsing the workbook. */
  loading: boolean
  /** True while a write is in flight. */
  saving: boolean
  /** Human-readable summary from the last parse. */
  loadSummary: string | null
}

const initialState: ConnectionState = {
  mode: null,
  status: 'disconnected',
  fileName: null,
  lastSyncedAt: null,
  lastCheckedAt: null,
  lastExportAt: null,
  error: null,
  errorLog: [],
  externalChangeDetected: false,
  restoring: true,
  loading: false,
  saving: false,
  loadSummary: null,
}

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    restoreStarted(state) {
      state.restoring = true
    },
    restoreFinished(state) {
      state.restoring = false
    },
    connectionStarted(state, action: PayloadAction<{ mode: ConnectionMode; fileName: string }>) {
      state.mode = action.payload.mode
      state.fileName = action.payload.fileName
      state.status = 'syncing'
      state.loading = true
      state.error = null
      state.externalChangeDetected = false
    },
    loadSucceeded(state, action: PayloadAction<{ at: string; summary: string }>) {
      state.status = 'synced'
      state.loading = false
      state.lastSyncedAt = action.payload.at
      state.lastCheckedAt = action.payload.at
      state.loadSummary = action.payload.summary
      state.error = null
      state.externalChangeDetected = false
    },
    loadFailed(state, action: PayloadAction<string>) {
      state.status = 'failed'
      state.loading = false
      state.saving = false
      state.error = action.payload
      state.errorLog.unshift({ at: new Date().toISOString(), message: action.payload })
      state.errorLog = state.errorLog.slice(0, 25)
    },
    permissionRequired(state, action: PayloadAction<{ fileName: string }>) {
      state.mode = 'direct'
      state.fileName = action.payload.fileName
      state.status = 'permission-required'
      state.loading = false
      state.error = null
    },
    changesPending(state) {
      if (state.status !== 'conflict') state.status = 'pending'
    },
    savingStarted(state) {
      state.saving = true
      state.status = 'syncing'
      state.error = null
    },
    saveSucceeded(state, action: PayloadAction<{ at: string }>) {
      state.saving = false
      state.status = 'synced'
      state.lastSyncedAt = action.payload.at
      state.lastCheckedAt = action.payload.at
      state.error = null
      state.externalChangeDetected = false
    },
    exportGenerated(state, action: PayloadAction<{ at: string }>) {
      state.saving = false
      state.status = 'connected'
      state.lastExportAt = action.payload.at
      state.error = null
    },
    saveFailed(state, action: PayloadAction<string>) {
      state.saving = false
      state.status = 'failed'
      state.error = action.payload
      state.errorLog.unshift({ at: new Date().toISOString(), message: action.payload })
      state.errorLog = state.errorLog.slice(0, 25)
    },
    checked(state, action: PayloadAction<{ at: string }>) {
      state.lastCheckedAt = action.payload.at
    },
    conflictDetected(state) {
      state.externalChangeDetected = true
      state.status = 'conflict'
      state.loading = false
      state.saving = false
    },
    conflictDismissed(state, action: PayloadAction<{ dirty: boolean }>) {
      state.externalChangeDetected = false
      state.status = action.payload.dirty ? 'pending' : 'synced'
    },
    syncErrorLogged(state, action: PayloadAction<string>) {
      state.errorLog.unshift({ at: new Date().toISOString(), message: action.payload })
      state.errorLog = state.errorLog.slice(0, 25)
    },
    errorsCleared(state) {
      state.errorLog = []
      state.error = null
    },
    disconnected() {
      return { ...initialState, restoring: false }
    },
  },
})

export const {
  restoreStarted,
  restoreFinished,
  connectionStarted,
  loadSucceeded,
  loadFailed,
  permissionRequired,
  changesPending,
  savingStarted,
  saveSucceeded,
  exportGenerated,
  saveFailed,
  checked,
  conflictDetected,
  conflictDismissed,
  syncErrorLogged,
  errorsCleared,
  disconnected,
} = connectionSlice.actions
export default connectionSlice.reducer

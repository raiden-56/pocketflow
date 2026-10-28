import type { AppThunk } from '@/app/store'
import type { FileFingerprint } from '@/types/workbook'
import {
  FileAccessError,
  downloadBuffer,
  getFileFingerprint,
  isFileSystemAccessSupported,
  pickFileViaInput,
  pickWorkbookHandle,
  queryPermission,
  readHandle,
  requestPermission,
  writeHandle,
} from '@/services/excel/excelFileAccess'
import { parseWorkbookBuffer } from '@/services/excel/workbookReader'
import { applyTransactionsToWorkbook, buildWorkbookFromTransactions, WorkbookWriteError, workbookToBuffer } from '@/services/excel/workbookWriter'
import { assessWorkbook } from '@/services/excel/workbookValidator'
import { detectExternalChange, fingerprintsEqual } from '@/services/excel/syncManager'
import { workbookSession } from '@/services/excel/workbookSession'
import { clearWorkbookHandle, loadWorkbookHandle, saveWorkbookHandle } from '@/services/storage/handleStore'
import { loadLocal, removeLocal, saveLocal } from '@/services/storage/localSettings'
import { changesSaved, clearTransactions, workbookLoaded } from '@/features/transactions/transactionSlice'
import { showToast } from '@/features/ui/uiSlice'
import {
  checked,
  conflictDetected,
  conflictDismissed,
  connectionStarted,
  disconnected,
  exportGenerated,
  loadFailed,
  loadSucceeded,
  permissionRequired,
  restoreFinished,
  restoreStarted,
  saveFailed,
  saveSucceeded,
  savingStarted,
  syncErrorLogged,
} from './connectionSlice'

const CONNECTION_META_KEY = 'connection'

interface ConnectionMeta {
  mode: 'direct' | 'import'
  fileName: string
  lastSyncedAt: string | null
}

function errorMessage(err: unknown): string {
  if (err instanceof FileAccessError || err instanceof WorkbookWriteError) return err.message
  if (err instanceof Error) return err.message
  return String(err)
}

function timestampedName(fileName: string, suffix: string): string {
  const base = fileName.replace(/\.(xlsx|xlsm|xls)$/i, '')
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `${base}_${suffix}_${stamp}.xlsx`
}

/** Parses a buffer and loads it into the store. Returns false when the workbook is unusable. */
function loadBuffer(buffer: ArrayBuffer, fileName: string, mode: 'direct' | 'import', fingerprint: FileFingerprint | null): AppThunk<boolean> {
  return (dispatch) => {
    dispatch(connectionStarted({ mode, fileName }))
    try {
      const { workbook, parsed } = parseWorkbookBuffer(buffer)
      const health = assessWorkbook(parsed)
      if (!health.ok) {
        dispatch(loadFailed(`${fileName}: ${health.headline}`))
        return false
      }
      workbookSession.setWorkbook(workbook, buffer)
      workbookSession.setFingerprint(fingerprint)
      const at = new Date().toISOString()
      dispatch(workbookLoaded({ parsed, loadedAt: at }))
      dispatch(loadSucceeded({ at, summary: [health.headline, ...health.structural].join(' ') }))
      saveLocal<ConnectionMeta>(CONNECTION_META_KEY, { mode, fileName, lastSyncedAt: at })
      return true
    } catch (err) {
      dispatch(loadFailed(`Could not read "${fileName}": ${errorMessage(err)}. Make sure it is a valid .xlsx workbook.`))
      return false
    }
  }
}

function readAndLoadHandle(handle: FileSystemFileHandle): AppThunk<Promise<boolean>> {
  return async (dispatch) => {
    try {
      const { buffer, fingerprint, name } = await readHandle(handle)
      return dispatch(loadBuffer(buffer, name, 'direct', fingerprint))
    } catch (err) {
      if (err instanceof FileAccessError && err.code === 'permission') {
        dispatch(permissionRequired({ fileName: handle.name }))
      } else {
        dispatch(loadFailed(errorMessage(err)))
      }
      return false
    }
  }
}

/** Mode 1: pick a workbook with the File System Access API and keep its handle. */
export function connectDirect(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    try {
      const handle = await pickWorkbookHandle()
      const perm = await requestPermission(handle, 'readwrite')
      if (perm !== 'granted') {
        // Fall back to read-only access; saving will prompt again.
        const readPerm = await requestPermission(handle, 'read')
        if (readPerm !== 'granted') {
          dispatch(loadFailed('Permission to read the workbook was not granted.'))
          return
        }
      }
      workbookSession.setHandle(handle)
      await saveWorkbookHandle(handle)
      const ok = await dispatch(readAndLoadHandle(handle))
      if (ok) dispatch(showToast(`Connected to ${handle.name}`, 'success'))
    } catch (err) {
      if (err instanceof FileAccessError && err.code === 'cancelled') return
      dispatch(loadFailed(errorMessage(err)))
    }
  }
}

/** Mode 2: import a workbook through a file input (no persistent file access). */
export function importWorkbook(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    try {
      const file = await pickFileViaInput()
      const buffer = await file.arrayBuffer()
      workbookSession.setHandle(null)
      await clearWorkbookHandle()
      const ok = dispatch(loadBuffer(buffer, file.name, 'import', { lastModified: file.lastModified, size: file.size }))
      if (ok) dispatch(showToast(`Imported ${file.name}. Changes stay in memory until you export.`, 'info'))
    } catch (err) {
      if (err instanceof FileAccessError && err.code === 'cancelled') return
      dispatch(loadFailed(errorMessage(err)))
    }
  }
}

/** On startup: restore the saved handle when the browser still allows it. */
export function restoreConnection(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    dispatch(restoreStarted())
    try {
      if (!isFileSystemAccessSupported()) {
        const meta = loadLocal<ConnectionMeta | null>(CONNECTION_META_KEY, null)
        if (meta?.mode === 'import') removeLocal(CONNECTION_META_KEY)
        return
      }
      const handle = await loadWorkbookHandle()
      if (!handle) return
      workbookSession.setHandle(handle)
      const perm = await queryPermission(handle, 'readwrite')
      if (perm === 'granted') {
        await dispatch(readAndLoadHandle(handle))
      } else {
        const readPerm = await queryPermission(handle, 'read')
        if (readPerm === 'granted') await dispatch(readAndLoadHandle(handle))
        else dispatch(permissionRequired({ fileName: handle.name }))
      }
    } finally {
      dispatch(restoreFinished())
    }
  }
}

/** Re-request permission for the remembered handle (needs a user gesture), or pick a file again. */
export function reconnect(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    const handle = workbookSession.handle
    if (!handle) {
      await dispatch(connectDirect())
      return
    }
    const perm = await requestPermission(handle, 'readwrite')
    if (perm !== 'granted') {
      const readPerm = await requestPermission(handle, 'read')
      if (readPerm !== 'granted') {
        dispatch(permissionRequired({ fileName: handle.name }))
        dispatch(syncErrorLogged('Permission was not granted when reconnecting.'))
        return
      }
    }
    const ok = await dispatch(readAndLoadHandle(handle))
    if (ok) dispatch(showToast(`Reconnected to ${handle.name}`, 'success'))
  }
}

/**
 * Re-reads the workbook. When there are unsaved in-app edits, refuses unless `force` is set so the
 * caller can confirm discarding them first.
 */
export function refreshFromExcel(options: { force?: boolean; silent?: boolean } = {}): AppThunk<Promise<'ok' | 'blocked' | 'failed'>> {
  return async (dispatch, getState) => {
    const { connection, transactions } = getState()
    if (transactions.dirty && !options.force) {
      dispatch(conflictDetected())
      return 'blocked'
    }
    if (connection.mode === 'import') {
      await dispatch(importWorkbook())
      return getState().connection.status === 'failed' ? 'failed' : 'ok'
    }
    const handle = workbookSession.handle
    if (!handle) {
      dispatch(loadFailed('No workbook is connected.'))
      return 'failed'
    }
    const ok = await dispatch(readAndLoadHandle(handle))
    if (ok && !options.silent) dispatch(showToast('Workbook refreshed from Excel', 'success'))
    return ok ? 'ok' : 'failed'
  }
}

/** Polling / focus check: reloads automatically unless there are unsaved edits (then flags a conflict). */
export function checkForExternalChanges(): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const { connection, transactions } = getState()
    const handle = workbookSession.handle
    if (connection.mode !== 'direct' || !handle || connection.loading || connection.saving) return
    if (connection.status === 'permission-required' || connection.status === 'conflict') return
    try {
      const { changed } = await detectExternalChange(handle, workbookSession.fingerprint)
      dispatch(checked({ at: new Date().toISOString() }))
      if (!changed) return
      if (transactions.dirty) {
        dispatch(conflictDetected())
        dispatch(showToast('The workbook changed in Excel while you have unsaved edits.', 'warning'))
      } else {
        const ok = await dispatch(readAndLoadHandle(handle))
        if (ok) dispatch(showToast('Workbook changed externally. Latest data loaded.', 'info'))
      }
    } catch (err) {
      if (err instanceof FileAccessError && err.code === 'permission') {
        dispatch(permissionRequired({ fileName: handle.name }))
      } else {
        dispatch(syncErrorLogged(`Change check failed: ${errorMessage(err)}`))
      }
    }
  }
}

/** Writes pending changes to the connected file (direct mode) or downloads an updated workbook (import mode). */
export function saveChanges(options: { overwriteExternal?: boolean } = {}): AppThunk<Promise<boolean>> {
  return async (dispatch, getState) => {
    const { connection, transactions } = getState()
    if (!connection.mode) return false
    const items = transactions.items

    if (connection.mode === 'import') {
      try {
        const base = workbookSession.workbook ?? buildWorkbookFromTransactions([])
        const result = applyTransactionsToWorkbook(base, items)
        const buffer = workbookToBuffer(result.workbook)
        workbookSession.setWorkbook(result.workbook, buffer)
        downloadBuffer(buffer, timestampedName(connection.fileName ?? 'PocketFlow', 'updated'))
        const at = new Date().toISOString()
        dispatch(changesSaved({ transactions: result.transactions, savedAt: at }))
        dispatch(exportGenerated({ at }))
        dispatch(showToast('Updated workbook downloaded. Replace your original file with it to keep the changes.', 'success'))
        return true
      } catch (err) {
        dispatch(saveFailed(`Export failed: ${errorMessage(err)}. Your changes are still in memory and have NOT been saved.`))
        return false
      }
    }

    const handle = workbookSession.handle
    const base = workbookSession.workbook
    if (!handle || !base) {
      dispatch(saveFailed('No workbook is connected. Your changes are still in memory and have NOT been saved.'))
      return false
    }

    dispatch(savingStarted())
    try {
      const perm = await requestPermission(handle, 'readwrite')
      if (perm !== 'granted') {
        dispatch(saveFailed('Write permission was not granted. Your changes are still in memory and have NOT been saved to Excel.'))
        return false
      }
      if (!options.overwriteExternal) {
        const current = await getFileFingerprint(handle)
        if (!fingerprintsEqual(current, workbookSession.fingerprint)) {
          dispatch(conflictDetected())
          dispatch(showToast('The workbook changed in Excel since it was loaded. Review the conflict before saving.', 'warning'))
          return false
        }
      }
      const result = applyTransactionsToWorkbook(base, items)
      const buffer = workbookToBuffer(result.workbook)
      const fingerprint = await writeHandle(handle, buffer)
      workbookSession.setWorkbook(result.workbook, buffer)
      workbookSession.setFingerprint(fingerprint)
      const at = new Date().toISOString()
      dispatch(changesSaved({ transactions: result.transactions, savedAt: at }))
      dispatch(saveSucceeded({ at }))
      saveLocal<ConnectionMeta>(CONNECTION_META_KEY, { mode: 'direct', fileName: handle.name, lastSyncedAt: at })
      dispatch(showToast(result.createdSheets.length ? `Saved to Excel. Created sheet${result.createdSheets.length > 1 ? 's' : ''}: ${result.createdSheets.join(', ')}.` : 'Saved to Excel', 'success'))
      return true
    } catch (err) {
      dispatch(saveFailed(`${errorMessage(err)} Your changes are still in memory and have NOT been saved to Excel.`))
      return false
    }
  }
}

/** Conflict resolution: discard in-app edits and reload the latest workbook. */
export function resolveConflictReload(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    const result = await dispatch(refreshFromExcel({ force: true }))
    if (result === 'ok') dispatch(showToast('Reloaded the latest workbook. Unsaved in-app edits were discarded.', 'info'))
  }
}

/** Conflict resolution: keep in-app edits, overwrite the external version. */
export function resolveConflictOverwrite(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    await dispatch(saveChanges({ overwriteExternal: true }))
  }
}

/** Conflict resolution: keep reviewing; nothing is written. */
export function dismissConflict(): AppThunk {
  return (dispatch, getState) => {
    dispatch(conflictDismissed({ dirty: getState().transactions.dirty }))
  }
}

export function disconnectWorkbook(): AppThunk<Promise<void>> {
  return async (dispatch) => {
    workbookSession.reset()
    await clearWorkbookHandle()
    removeLocal(CONNECTION_META_KEY)
    dispatch(clearTransactions())
    dispatch(disconnected())
  }
}

/** Downloads a copy of the workbook as last read from disk (or, if never read, a workbook built from the current data). */
export function exportBackup(): AppThunk {
  return (dispatch, getState) => {
    const { connection, transactions } = getState()
    try {
      const buffer = workbookSession.lastBuffer ?? workbookToBuffer(buildWorkbookFromTransactions(transactions.items))
      downloadBuffer(buffer, timestampedName(connection.fileName ?? 'PocketFlow', 'backup'))
      dispatch(showToast('Backup copy downloaded', 'success'))
    } catch (err) {
      dispatch(syncErrorLogged(`Backup failed: ${errorMessage(err)}`))
      dispatch(showToast(`Backup failed: ${errorMessage(err)}`, 'error'))
    }
  }
}

/** Downloads the current in-app data (including unsaved edits) as a fresh workbook. */
export function exportCurrentWorkbook(): AppThunk {
  return (dispatch, getState) => {
    const { connection, transactions } = getState()
    try {
      const base = workbookSession.workbook ?? buildWorkbookFromTransactions([])
      const result = applyTransactionsToWorkbook(base, transactions.items)
      downloadBuffer(workbookToBuffer(result.workbook), timestampedName(connection.fileName ?? 'PocketFlow', 'export'))
      dispatch(showToast('Workbook exported', 'success'))
    } catch (err) {
      dispatch(showToast(`Export failed: ${errorMessage(err)}`, 'error'))
    }
  }
}

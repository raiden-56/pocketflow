import { useCallback, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store'
import {
  connectDirect,
  connectLink,
  disconnectWorkbook,
  dismissConflict,
  exportBackup,
  exportCurrentWorkbook,
  importWorkbook,
  reconnect,
  refreshFromExcel,
  resolveConflictOverwrite,
  resolveConflictReload,
  saveChanges,
} from '@/features/connection/connectionThunks'
import { errorsCleared } from '@/features/connection/connectionSlice'
import { isFileSystemAccessSupported } from '@/services/excel/excelFileAccess'

/** Exposes the connection state and every Excel action to UI components. */
export function useExcelConnection() {
  const dispatch = useAppDispatch()
  const connection = useAppSelector((s) => s.connection)
  const dirty = useAppSelector((s) => s.transactions.dirty)
  const pendingChanges = useAppSelector((s) => s.transactions.pendingChanges)
  const supportsDirectAccess = useMemo(() => isFileSystemAccessSupported(), [])

  const connect = useCallback(() => dispatch(supportsDirectAccess ? connectDirect() : importWorkbook()), [dispatch, supportsDirectAccess])
  const importFile = useCallback(() => dispatch(importWorkbook()), [dispatch])
  const connectSheetLink = useCallback((url: string) => dispatch(connectLink(url)), [dispatch])
  const refresh = useCallback((force = false) => dispatch(refreshFromExcel({ force })), [dispatch])
  const save = useCallback(() => dispatch(saveChanges()), [dispatch])
  const disconnect = useCallback(() => dispatch(disconnectWorkbook()), [dispatch])
  const reconnectFile = useCallback(() => dispatch(reconnect()), [dispatch])
  const backup = useCallback(() => dispatch(exportBackup()), [dispatch])
  const exportWorkbook = useCallback(() => dispatch(exportCurrentWorkbook()), [dispatch])
  const clearErrors = useCallback(() => dispatch(errorsCleared()), [dispatch])
  const conflictReload = useCallback(() => dispatch(resolveConflictReload()), [dispatch])
  const conflictOverwrite = useCallback(() => dispatch(resolveConflictOverwrite()), [dispatch])
  const conflictDismiss = useCallback(() => dispatch(dismissConflict()), [dispatch])

  return {
    ...connection,
    dirty,
    pendingChanges,
    supportsDirectAccess,
    isConnected: connection.mode != null && connection.status !== 'disconnected',
    connect,
    importFile,
    connectLink: connectSheetLink,
    refresh,
    save,
    disconnect,
    reconnect: reconnectFile,
    backup,
    exportWorkbook,
    clearErrors,
    conflictReload,
    conflictOverwrite,
    conflictDismiss,
  }
}

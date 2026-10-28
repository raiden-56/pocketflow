import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { checkForExternalChanges, restoreConnection } from '@/features/connection/connectionThunks'
import { changesPending } from '@/features/connection/connectionSlice'
import { createChangePoller } from '@/services/excel/syncManager'

/**
 * Restores the saved connection on startup, polls the connected file for external changes while the
 * app is visible, re-checks on focus/visibility, and keeps the sync status in step with unsaved edits.
 */
export function useWorkbookSync() {
  const dispatch = useAppDispatch()
  const mode = useAppSelector((s) => s.connection.mode)
  const status = useAppSelector((s) => s.connection.status)
  const dirty = useAppSelector((s) => s.transactions.dirty)
  const pollInterval = useAppSelector((s) => s.settings.preferences.pollIntervalSeconds)
  const restored = useRef(false)

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    void dispatch(restoreConnection())
  }, [dispatch])

  useEffect(() => {
    if (mode !== 'direct' && mode !== 'link' && mode !== 'gsheet') return
    // A Google Sheet is re-downloaded in full on every check, so poll it less often than a local file.
    const stop = createChangePoller({
      intervalMs: Math.max(mode === 'direct' ? 5 : 60, pollInterval) * 1000,
      onTick: () => dispatch(checkForExternalChanges()),
    })
    return stop
  }, [dispatch, mode, pollInterval])

  useEffect(() => {
    if (dirty && (status === 'synced' || status === 'connected')) dispatch(changesPending())
  }, [dirty, status, dispatch])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
}

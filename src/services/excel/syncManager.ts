import type { FileFingerprint } from '@/types/workbook'
import { getFileFingerprint } from './excelFileAccess'

export function fingerprintsEqual(a: FileFingerprint | null, b: FileFingerprint | null): boolean {
  if (!a || !b) return false
  return a.lastModified === b.lastModified && a.size === b.size
}

/**
 * Returns true when the file on disk differs from what the app last read.
 * Throws a FileAccessError when the file can no longer be accessed.
 */
export async function detectExternalChange(handle: FileSystemFileHandle, lastKnown: FileFingerprint | null): Promise<{ changed: boolean; current: FileFingerprint }> {
  const current = await getFileFingerprint(handle)
  return { changed: !fingerprintsEqual(lastKnown, current), current }
}

export interface PollerOptions {
  /** Interval while the page is visible and focused. */
  intervalMs: number
  /** Called on each tick; returning a promise pauses the next tick until it settles. */
  onTick: () => Promise<void> | void
}

/**
 * Polls while the document is visible, and re-checks immediately when the window regains focus
 * or becomes visible again. Polling is suspended while the app is in the background.
 */
export function createChangePoller({ intervalMs, onTick }: PollerOptions): () => void {
  let timer: number | null = null
  let running = false
  let disposed = false

  const tick = async () => {
    if (running || disposed || document.visibilityState !== 'visible') return
    running = true
    try {
      await onTick()
    } finally {
      running = false
    }
  }

  const start = () => {
    if (timer != null || disposed) return
    timer = window.setInterval(() => void tick(), intervalMs)
  }
  const stop = () => {
    if (timer != null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      start()
      void tick()
    } else {
      stop()
    }
  }
  const onFocus = () => void tick()

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', onFocus)
  if (document.visibilityState === 'visible') start()

  return () => {
    disposed = true
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', onFocus)
  }
}

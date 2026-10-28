import type * as XLSX from 'xlsx'
import type { FileFingerprint } from '@/types/workbook'

/**
 * Non-serializable workbook session state that must not live in Redux:
 * the file handle, the parsed SheetJS workbook (kept to preserve unrelated sheets on write)
 * and the fingerprint of the last version the app read or wrote.
 */
interface SessionState {
  handle: FileSystemFileHandle | null
  workbook: XLSX.WorkBook | null
  fingerprint: FileFingerprint | null
  /** The raw bytes last read, used for "Export backup copy". */
  lastBuffer: ArrayBuffer | null
  /** Link mode: signature of the data last loaded, to detect edits made in Google Sheets. */
  contentSignature: string | null
}

const session: SessionState = { handle: null, workbook: null, fingerprint: null, lastBuffer: null, contentSignature: null }

export const workbookSession = {
  get handle() {
    return session.handle
  },
  get workbook() {
    return session.workbook
  },
  get fingerprint() {
    return session.fingerprint
  },
  get lastBuffer() {
    return session.lastBuffer
  },
  get contentSignature() {
    return session.contentSignature
  },
  setContentSignature(signature: string | null) {
    session.contentSignature = signature
  },
  setHandle(handle: FileSystemFileHandle | null) {
    session.handle = handle
  },
  setWorkbook(workbook: XLSX.WorkBook | null, buffer: ArrayBuffer | null) {
    session.workbook = workbook
    session.lastBuffer = buffer
  },
  setFingerprint(fp: FileFingerprint | null) {
    session.fingerprint = fp
  },
  reset() {
    session.handle = null
    session.workbook = null
    session.fingerprint = null
    session.lastBuffer = null
    session.contentSignature = null
  },
}

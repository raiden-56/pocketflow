import type { FileFingerprint } from '@/types/workbook'

export const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const ACCEPTED_EXTENSIONS = ['.xlsx', '.xlsm', '.xls']

export class FileAccessError extends Error {
  code: 'unsupported' | 'permission' | 'not-found' | 'read' | 'write' | 'cancelled' | 'invalid'
  constructor(code: FileAccessError['code'], message: string) {
    super(message)
    this.name = 'FileAccessError'
    this.code = code
  }
}

/** True when the File System Access API (direct read/write to a local file) is available. */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.showOpenFilePicker === 'function' &&
    window.isSecureContext
  )
}

export function isExcelFileName(name: string): boolean {
  const lower = name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export async function pickWorkbookHandle(): Promise<FileSystemFileHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new FileAccessError('unsupported', 'Direct file access is not supported in this browser.')
  }
  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      excludeAcceptAllOption: false,
      types: [{ description: 'Excel workbook', accept: { [EXCEL_MIME]: ['.xlsx', '.xlsm'] } }],
    })
    if (!isExcelFileName(handle.name)) {
      throw new FileAccessError('invalid', `"${handle.name}" is not an Excel workbook (.xlsx).`)
    }
    return handle
  } catch (err) {
    if (err instanceof FileAccessError) throw err
    if ((err as DOMException)?.name === 'AbortError') throw new FileAccessError('cancelled', 'File selection was cancelled.')
    throw new FileAccessError('read', (err as Error)?.message ?? 'Could not open the file picker.')
  }
}

export type PermissionResult = 'granted' | 'denied' | 'prompt'

/** Checks permission without prompting the user. */
export async function queryPermission(handle: FileSystemFileHandle, mode: 'read' | 'readwrite'): Promise<PermissionResult> {
  try {
    const state = await handle.queryPermission({ mode })
    return state as PermissionResult
  } catch {
    return 'prompt'
  }
}

/** Requests permission; must be called from a user gesture in most browsers. */
export async function requestPermission(handle: FileSystemFileHandle, mode: 'read' | 'readwrite'): Promise<PermissionResult> {
  try {
    const current = await handle.queryPermission({ mode })
    if (current === 'granted') return 'granted'
    const state = await handle.requestPermission({ mode })
    return state as PermissionResult
  } catch {
    return 'denied'
  }
}

export function fingerprintOf(file: File): FileFingerprint {
  return { lastModified: file.lastModified, size: file.size }
}

export async function getFileFingerprint(handle: FileSystemFileHandle): Promise<FileFingerprint> {
  try {
    const file = await handle.getFile()
    return fingerprintOf(file)
  } catch (err) {
    throw classifyHandleError(err, 'read')
  }
}

export async function readHandle(handle: FileSystemFileHandle): Promise<{ buffer: ArrayBuffer; fingerprint: FileFingerprint; name: string }> {
  let file: File
  try {
    file = await handle.getFile()
  } catch (err) {
    throw classifyHandleError(err, 'read')
  }
  try {
    const buffer = await file.arrayBuffer()
    return { buffer, fingerprint: fingerprintOf(file), name: file.name }
  } catch (err) {
    throw new FileAccessError('read', `Could not read "${handle.name}": ${(err as Error)?.message ?? 'unknown error'}`)
  }
}

export async function writeHandle(handle: FileSystemFileHandle, buffer: ArrayBuffer): Promise<FileFingerprint> {
  let writable: FileSystemWritableFileStream
  try {
    writable = await handle.createWritable({ keepExistingData: false })
  } catch (err) {
    throw classifyHandleError(err, 'write')
  }
  try {
    await writable.write(buffer)
    await writable.close()
  } catch (err) {
    try {
      await writable.abort()
    } catch {
      /* ignore */
    }
    throw new FileAccessError(
      'write',
      `Could not write "${handle.name}". ${isLikelyLocked(err) ? 'The file may be open in Excel; close it and try again.' : (err as Error)?.message ?? ''}`.trim(),
    )
  }
  return getFileFingerprint(handle)
}

function isLikelyLocked(err: unknown): boolean {
  const name = (err as DOMException)?.name
  const msg = String((err as Error)?.message ?? '').toLowerCase()
  return name === 'NoModificationAllowedError' || name === 'InvalidStateError' || msg.includes('lock') || msg.includes('in use')
}

function classifyHandleError(err: unknown, op: 'read' | 'write'): FileAccessError {
  const name = (err as DOMException)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new FileAccessError('permission', 'Permission to access the workbook is required. Click "Reconnect" to grant access again.')
  }
  if (name === 'NotFoundError') {
    return new FileAccessError('not-found', 'The workbook could not be found. It may have been moved, renamed or deleted.')
  }
  if (name === 'NoModificationAllowedError') {
    return new FileAccessError('write', 'The workbook is locked. If it is open in Excel, close it and try again.')
  }
  return new FileAccessError(op, (err as Error)?.message ?? `Could not ${op} the workbook.`)
}

/** Fallback for browsers without the File System Access API: opens a plain file input. */
export function pickFileViaInput(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xlsm,.xls,' + EXCEL_MIME
    input.style.display = 'none'
    document.body.appendChild(input)
    const cleanup = () => input.remove()
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      cleanup()
      if (!file) return reject(new FileAccessError('cancelled', 'File selection was cancelled.'))
      if (!isExcelFileName(file.name)) return reject(new FileAccessError('invalid', `"${file.name}" is not an Excel workbook (.xlsx).`))
      resolve(file)
    })
    input.addEventListener('cancel', () => {
      cleanup()
      reject(new FileAccessError('cancelled', 'File selection was cancelled.'))
    })
    input.click()
  })
}

export function downloadBuffer(buffer: ArrayBuffer | Blob, fileName: string, mime = EXCEL_MIME): void {
  const blob = buffer instanceof Blob ? buffer : new Blob([buffer], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

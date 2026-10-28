/**
 * Minimal IndexedDB key/value store used to persist the FileSystemFileHandle between sessions.
 * Handles are structured-cloneable, so they can be stored directly.
 */
const DB_NAME = 'pocketflow'
const STORE = 'handles'
const KEY = 'workbook'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Could not open IndexedDB.'))
    req.onblocked = () => reject(new Error('IndexedDB is blocked.'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed.'))
    })
  } finally {
    db.close()
  }
}

export async function saveWorkbookHandle(handle: FileSystemFileHandle): Promise<void> {
  try {
    await withStore('readwrite', (s) => s.put(handle, KEY))
  } catch (err) {
    console.warn('PocketFlow: could not persist the workbook handle.', err)
  }
}

export async function loadWorkbookHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const value = await withStore<FileSystemFileHandle | undefined>('readonly', (s) => s.get(KEY))
    return value ?? null
  } catch {
    return null
  }
}

export async function clearWorkbookHandle(): Promise<void> {
  try {
    await withStore('readwrite', (s) => s.delete(KEY))
  } catch {
    /* ignore */
  }
}

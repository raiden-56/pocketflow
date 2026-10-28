import { loadLocal, removeLocal, saveLocal } from '@/services/storage/localSettings'

/**
 * The workbook this install always opens, set in .env.local (never committed) for local development:
 *   VITE_SHEET_URL  a Google Sheets "Publish to web" link, or the /exec URL of the PocketFlow Apps Script
 *   VITE_SHEET_KEY  the key the Apps Script expects (only for the /exec URL)
 * When set, the app connects to it on startup and Settings does not offer to change the link.
 * Never set VITE_SHEET_KEY on a public host: Vite builds it into the JavaScript anyone can download.
 */
export const FIXED_SHEET = {
  url: (import.meta.env.VITE_SHEET_URL as string | undefined)?.trim() || null,
  key: (import.meta.env.VITE_SHEET_KEY as string | undefined)?.trim() || null,
}

const SHEET_KEY_STORAGE = 'sheet-key'

/** The Apps Script key: from .env.local in development, otherwise the one entered on this device. */
export function sheetKey(): string {
  return FIXED_SHEET.key ?? loadLocal<string>(SHEET_KEY_STORAGE, '')
}

/** Keeps the key typed into the connect form in this browser only (it never leaves the device except to Google). */
export function rememberSheetKey(key: string | null): void {
  if (key) saveLocal(SHEET_KEY_STORAGE, key)
  else removeLocal(SHEET_KEY_STORAGE)
}

/**
 * The workbook this install always opens, set in .env.local (never committed):
 *   VITE_SHEET_URL  a Google Sheets "Publish to web" link, or the /exec URL of the PocketFlow Apps Script
 *   VITE_SHEET_KEY  the key the Apps Script expects (only for the /exec URL)
 * When set, the app connects to it on startup and Settings does not offer to change the link.
 */
export const FIXED_SHEET = {
  url: (import.meta.env.VITE_SHEET_URL as string | undefined)?.trim() || null,
  key: (import.meta.env.VITE_SHEET_KEY as string | undefined)?.trim() || null,
}

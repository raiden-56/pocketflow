import { format, isValid, parse, parseISO } from 'date-fns'

export type DateFormatPreference = 'dd/MM/yyyy' | 'dd MMM yyyy' | 'yyyy-MM-dd' | 'MM/dd/yyyy'

export const DATE_FORMAT_OPTIONS: { value: DateFormatPreference; label: string }[] = [
  { value: 'dd/MM/yyyy', label: '31/12/2026' },
  { value: 'dd MMM yyyy', label: '31 Dec 2026' },
  { value: 'yyyy-MM-dd', label: '2026-12-31' },
  { value: 'MM/dd/yyyy', label: '12/31/2026' },
]

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3))

/** Converts a Date to a yyyy-MM-dd string using local time. */
export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

export function parseIsoDate(iso: string): Date {
  return parseISO(iso)
}

export function isValidIsoDate(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && isValid(parseISO(iso))
}

export function formatDisplayDate(iso: string, pattern: DateFormatPreference = 'dd MMM yyyy'): string {
  const d = parseISO(iso)
  return isValid(d) ? format(d, pattern) : iso
}

export function formatLongDate(date: Date): string {
  return format(date, 'EEEE, d MMMM yyyy')
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'd MMM yyyy, HH:mm:ss') : iso
}

export function monthOfIso(iso: string): number {
  return Number(iso.slice(5, 7))
}

export function yearOfIso(iso: string): number {
  return Number(iso.slice(0, 4))
}

export function monthLabel(month: number, short = false): string {
  return (short ? MONTH_SHORT : MONTH_NAMES)[month - 1] ?? ''
}

/** Converts an Excel serial date number to a local Date. */
export function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 0 || serial > 2958465) return null
  // Excel epoch (1899-12-30). Build the date from UTC parts so DST never shifts the day.
  const utcMs = Math.round((serial - 25569) * 86400 * 1000)
  const utc = new Date(utcMs)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

/** Converts an ISO date to the Excel serial number (whole days). */
export function isoToExcelSerial(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const utcMs = Date.UTC(y, m - 1, d)
  return Math.round(utcMs / 86400000) + 25569
}

const TEXT_DATE_FORMATS = [
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'd/M/yyyy',
  'dd-MM-yyyy',
  'd-M-yyyy',
  'dd.MM.yyyy',
  'd.M.yyyy',
  'dd MMM yyyy',
  'd MMM yyyy',
  'dd MMMM yyyy',
  'd MMMM yyyy',
  'dd-MMM-yyyy',
  'd-MMM-yyyy',
  'dd-MMM-yy',
  'MMM d, yyyy',
  'MMMM d, yyyy',
  'dd/MM/yy',
  'd/M/yy',
  'yyyy/MM/dd',
  'MM/dd/yyyy',
  "yyyy-MM-dd'T'HH:mm:ss.SSSX",
  "yyyy-MM-dd'T'HH:mm:ssX",
]

/**
 * Normalizes a raw cell value (Date, Excel serial, or text) to an ISO yyyy-MM-dd string.
 * Returns null when the value cannot be interpreted as a date.
 */
export function normalizeDateValue(value: unknown): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return isValid(value) ? toIsoDate(value) : null
  }
  if (typeof value === 'number') {
    const d = excelSerialToDate(value)
    return d ? toIsoDate(d) : null
  }
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return null
    if (/^\d+(\.\d+)?$/.test(text)) {
      const d = excelSerialToDate(Number(text))
      return d ? toIsoDate(d) : null
    }
    for (const fmt of TEXT_DATE_FORMATS) {
      const d = parse(text, fmt, new Date())
      if (isValid(d) && d.getFullYear() > 1900 && d.getFullYear() < 2200) return toIsoDate(d)
    }
    const fallback = new Date(text)
    if (isValid(fallback) && fallback.getFullYear() > 1900 && fallback.getFullYear() < 2200) {
      return toIsoDate(fallback)
    }
  }
  return null
}

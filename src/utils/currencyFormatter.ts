export type NumberFormatPreference = 'indian' | 'international'
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP'

export const CURRENCY_OPTIONS: { value: CurrencyCode; label: string; symbol: string }[] = [
  { value: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
]

export interface MoneyFormatOptions {
  currency?: CurrencyCode
  numberFormat?: NumberFormatPreference
  /** Hide the fractional part. */
  compact?: boolean
  /** Prefix a sign (+ / −) explicitly. */
  signed?: boolean
}

const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(currency: CurrencyCode, numberFormat: NumberFormatPreference, fractionDigits: number) {
  const locale = numberFormat === 'indian' ? 'en-IN' : 'en-US'
  const key = `${locale}|${currency}|${fractionDigits}`
  let fmt = formatterCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
    formatterCache.set(key, fmt)
  }
  return fmt
}

/** Formats money, e.g. ₹50,000.00 or ₹1,00,000.00 with Indian grouping. */
export function formatMoney(amount: number, options: MoneyFormatOptions = {}): string {
  const { currency = 'INR', numberFormat = 'indian', compact = false, signed = false } = options
  const safe = Number.isFinite(amount) ? amount : 0
  const fmt = getFormatter(currency, numberFormat, compact ? 0 : 2)
  const text = fmt.format(Math.abs(safe))
  if (signed) return safe < 0 ? `−${text}` : `+${text}`
  return safe < 0 ? `−${text}` : text
}

/** Short axis labels: ₹1.2L, ₹45K, ₹2.3Cr (Indian) or ₹1.2M (international). */
export function formatMoneyShort(amount: number, options: MoneyFormatOptions = {}): string {
  const { currency = 'INR', numberFormat = 'indian' } = options
  const symbol = CURRENCY_OPTIONS.find((c) => c.value === currency)?.symbol ?? ''
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '−' : ''
  const trim = (n: number) => (Number.isInteger(n) ? n.toString() : n.toFixed(1).replace(/\.0$/, ''))
  if (numberFormat === 'indian') {
    if (abs >= 1e7) return `${sign}${symbol}${trim(abs / 1e7)}Cr`
    if (abs >= 1e5) return `${sign}${symbol}${trim(abs / 1e5)}L`
    if (abs >= 1e3) return `${sign}${symbol}${trim(abs / 1e3)}K`
    return `${sign}${symbol}${trim(abs)}`
  }
  if (abs >= 1e9) return `${sign}${symbol}${trim(abs / 1e9)}B`
  if (abs >= 1e6) return `${sign}${symbol}${trim(abs / 1e6)}M`
  if (abs >= 1e3) return `${sign}${symbol}${trim(abs / 1e3)}K`
  return `${sign}${symbol}${trim(abs)}`
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

/** Parses "₹1,20,000.50", "Rs 1 200", "(500)" or plain numbers to a finite number, else null. */
export function parseAmountValue(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return null
  let text = String(value).trim()
  if (!text) return null
  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true
    text = text.slice(1, -1)
  }
  text = text.replace(/[₹$€£]|rs\.?|inr/gi, '').replace(/[,\s_]/g, '')
  if (text.startsWith('-')) {
    negative = !negative
    text = text.slice(1)
  } else if (text.startsWith('+')) {
    text = text.slice(1)
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return null
  const n = Number(text)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

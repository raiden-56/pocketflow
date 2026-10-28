import type { ParsedWorkbook } from '@/types/workbook'
import { FileAccessError } from './excelFileAccess'

const PUBLISHED = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/([\w-]+)/
const SHARED = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/

const NOT_PUBLISHED_HELP =
  'In Google Sheets choose File → Share → Publish to web, select "Entire document", click Publish, and paste that link here.'

/**
 * Turns a Google Sheets link into a URL that downloads the whole spreadsheet as .xlsx.
 * "Publish to web" links (…/d/e/…/pubhtml) are preferred because Google serves them to any browser;
 * a normal sharing link (…/d/<id>/edit) is converted to its export URL as a best effort.
 * Any other https link is used as is (for example a direct .xlsx download link).
 */
export function toWorkbookDownloadUrl(input: string): string {
  const text = input.trim()
  let url: URL
  try {
    url = new URL(text)
  } catch {
    throw new FileAccessError('invalid', `"${text}" is not a valid link. ${NOT_PUBLISHED_HELP}`)
  }
  if (url.protocol !== 'https:') throw new FileAccessError('invalid', 'The link must start with https://')
  const published = text.match(PUBLISHED)
  if (published) return `https://docs.google.com/spreadsheets/d/e/${published[1]}/pub?output=xlsx`
  const shared = text.match(SHARED)
  if (shared) return `https://docs.google.com/spreadsheets/d/${shared[1]}/export?format=xlsx`
  return url.toString()
}

export function isGoogleSheetsUrl(input: string): boolean {
  return SHARED.test(input.trim())
}

function fileNameFrom(response: Response): string | null {
  const header = response.headers.get('content-disposition') ?? ''
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded) return decodeURIComponent(encoded[1])
  return header.match(/filename="?([^";]+)"?/i)?.[1] ?? null
}

/** Downloads the spreadsheet behind a link. Throws a FileAccessError with a fix-it hint on failure. */
export async function fetchWorkbookFromLink(link: string): Promise<{ buffer: ArrayBuffer; name: string }> {
  const downloadUrl = toWorkbookDownloadUrl(link)
  let response: Response
  try {
    response = await fetch(downloadUrl, { cache: 'no-store', redirect: 'follow' })
  } catch {
    throw new FileAccessError(
      'read',
      `Could not download the sheet (network error or the sheet is not public). ${NOT_PUBLISHED_HELP}`,
    )
  }
  if (!response.ok) {
    throw new FileAccessError(
      response.status === 404 ? 'not-found' : 'read',
      `The link returned HTTP ${response.status}. ${NOT_PUBLISHED_HELP}`,
    )
  }
  const buffer = await response.arrayBuffer()
  // .xlsx files are zip archives ("PK"); anything else is usually a Google sign-in page.
  const bytes = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength))
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new FileAccessError('invalid', `The link did not return a spreadsheet. ${NOT_PUBLISHED_HELP}`)
  }
  const name = fileNameFrom(response) ?? (isGoogleSheetsUrl(link) ? 'Google Sheet' : 'Linked workbook')
  return { buffer, name }
}

/** A string that changes only when the transaction data changes (Google regenerates the file bytes on every download). */
export function contentSignature(parsed: ParsedWorkbook): string {
  return parsed.transactions
    .map((t) => [t.date, t.description, t.category, t.type, t.paymentMethod, t.amount, t.notes, t.sourceSheet].join('\u0001'))
    .concat(parsed.issues.map((i) => `${i.sheet}|${i.row ?? ''}|${i.message}`))
    .join('\n')
}

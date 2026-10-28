import * as XLSX from 'xlsx'
import type { Transaction } from '@/types/finance'
import type { WriteResult } from './workbookWriter'
import { FileAccessError } from './excelFileAccess'
import { resolveMonthSheet } from './workbookReader'

/**
 * Client for the PocketFlow Apps Script bound to a private Google Sheet
 * (scripts/google-apps-script/Code.gs). Every request is a POST carrying the shared key in the body,
 * so the key never appears in a URL; text/plain avoids a CORS preflight, which Apps Script cannot answer.
 */

const SCRIPT_URL = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/

export function isScriptUrl(url: string): boolean {
  return SCRIPT_URL.test(url.trim())
}

export interface ScriptSheet {
  name: string
  rows: unknown[][]
}

interface ScriptReply {
  ok: boolean
  error?: string
  title?: string
  sheets?: ScriptSheet[]
}

/** Rebuilds a workbook from the script's sheet values so the normal Excel reader can parse it. */
export function workbookFromScriptSheets(sheets: ScriptSheet[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  for (const { name, rows } of sheets) {
    // Excel limits sheet names to 31 characters; such sheets cannot be monthly or lending sheets anyway.
    if (name.length > 31) continue
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows.length ? rows : [[]]), name)
  }
  return wb
}

type SheetRows = Record<string, (string | number)[][]>

/**
 * Transaction rows per monthly sheet, in the standard column order
 * (Date, Description, Category, Type, Payment Method, Amount, Notes). Every monthly sheet in `sheetNames`
 * is present, so sheets that end up empty are cleared in Google Sheets too.
 */
export function rowsBySheet(transactions: Transaction[], sheetNames: string[]): SheetRows {
  const rows: SheetRows = {}
  for (const name of sheetNames) if (resolveMonthSheet(name)) rows[name] = []
  const ordered = [...transactions].sort((a, b) => (a.sourceRow ?? 0) - (b.sourceRow ?? 0))
  for (const tx of ordered) {
    if (!tx.sourceSheet || !rows[tx.sourceSheet]) continue
    // The reader shows a blank payment method as "Other"; keep it blank so a save does not fill every empty cell.
    rows[tx.sourceSheet].push([tx.date, tx.description, tx.category, tx.type, tx.paymentMethod === 'Other' ? '' : tx.paymentMethod, tx.amount, tx.notes])
  }
  return rows
}

/** The rows to send after a write: all monthly sheets, or only those that differ from `before` when given. */
export function scriptRowsFromWrite(result: WriteResult, before?: SheetRows): SheetRows {
  const after = rowsBySheet(result.transactions, result.workbook.SheetNames)
  if (!before) return after
  const changed: SheetRows = {}
  for (const [name, rows] of Object.entries(after)) {
    if (JSON.stringify(rows) !== JSON.stringify(before[name] ?? [])) changed[name] = rows
  }
  return changed
}

async function call(url: string, body: Record<string, unknown>): Promise<ScriptReply> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
      cache: 'no-store',
    })
  } catch {
    throw new FileAccessError('read', 'Could not reach your Google Sheet. Check your internet connection and try again.')
  }
  if (!response.ok) throw new FileAccessError('read', `Your Google Sheet answered with HTTP ${response.status}. Try again in a moment.`)
  let reply: ScriptReply
  try {
    reply = (await response.json()) as ScriptReply
  } catch {
    throw new FileAccessError('read', 'The Google Sheet script did not answer as expected. Check that it is deployed as a web app with access "Anyone".')
  }
  if (!reply.ok) {
    if (reply.error === 'unauthorized') {
      throw new FileAccessError('permission', 'Your Google Sheet did not accept the secret key. Disconnect, then connect again with the KEY from your PocketFlow Apps Script.')
    }
    throw new FileAccessError('read', `Google Sheet error: ${reply.error ?? 'unknown error'}`)
  }
  return reply
}

function toResult(reply: ScriptReply): { workbook: XLSX.WorkBook; name: string } {
  return { workbook: workbookFromScriptSheets(reply.sheets ?? []), name: reply.title || 'Google Sheet' }
}

export async function readViaScript(url: string, key: string): Promise<{ workbook: XLSX.WorkBook; name: string }> {
  return toResult(await call(url, { key, action: 'read' }))
}

/** Rewrites the given monthly sheets in Google Sheets and returns the sheet as it is afterwards. */
export async function writeViaScript(url: string, key: string, sheets: Record<string, (string | number)[][]>): Promise<{ workbook: XLSX.WorkBook; name: string }> {
  try {
    return toResult(await call(url, { key, action: 'write', sheets }))
  } catch (err) {
    if (err instanceof FileAccessError) throw new FileAccessError('write', err.message)
    throw err
  }
}

import type { ParsedWorkbook, ValidationIssue } from '@/types/workbook'

export interface WorkbookHealth {
  ok: boolean
  /** Human readable headline describing the overall state. */
  headline: string
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  structural: string[]
}

/** Summarizes parse results so the UI can explain workbook problems without hiding data. */
export function assessWorkbook(parsed: ParsedWorkbook): WorkbookHealth {
  const errors = parsed.issues.filter((i) => i.severity === 'error')
  const warnings = parsed.issues.filter((i) => i.severity === 'warning')
  const structural: string[] = []

  if (parsed.fatalError) {
    return { ok: false, headline: parsed.fatalError, errors, warnings, structural }
  }
  if (parsed.missingSheets.length > 0) {
    structural.push(
      parsed.missingSheets.length === 12
        ? 'No monthly worksheets were found.'
        : `Missing monthly worksheets: ${parsed.missingSheets.join(', ')}. They will be created automatically when a transaction for that month is saved.`,
    )
  }
  if (parsed.otherSheets.length > 0) {
    structural.push(`Other worksheets are preserved but not read as transactions: ${parsed.otherSheets.join(', ')}.`)
  }
  if (parsed.transactions.length === 0 && errors.length === 0) {
    structural.push('The workbook has no transactions yet. Add your first one with "Add transaction".')
  }

  let headline = `Loaded ${parsed.transactions.length} transaction${parsed.transactions.length === 1 ? '' : 's'} from ${parsed.sheets.length} monthly sheet${parsed.sheets.length === 1 ? '' : 's'}.`
  if (errors.length) headline += ` ${errors.length} row${errors.length === 1 ? '' : 's'} could not be read.`
  if (warnings.length) headline += ` ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`

  return { ok: true, headline, errors, warnings, structural }
}

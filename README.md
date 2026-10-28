# PocketFlow · Personal Money Tracker

A private, Excel-powered personal finance tracker. Your Excel workbook is the only place transactions are stored: no database, no backend, nothing uploaded.

- React 19 + Vite + TypeScript, Material UI, Redux Toolkit, Recharts, Framer Motion, React Hook Form + Zod, SheetJS (`xlsx`), date-fns.
- Reads the 12 monthly worksheets (January … December), builds a dashboard, lets you add / edit / delete transactions and writes them back to the same workbook.

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`) in **Chrome or Edge** for the full experience, then click **Connect Excel file** and pick `Personal_Money_Tracker_Template_2026.xlsx` from this folder (it contains sample 2026 data) or a blank copy from `public/PocketFlow_Blank_Template.xlsx`.

Other commands:

```bash
npm test          # unit tests for the Excel layer and calculations (vitest)
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
node scripts/generate-template.mjs   # regenerate the template workbooks
```

## Workbook format

One worksheet per month named `January` … `December` (short names like `Jan` or `March 2026` are also recognised). Each sheet has a header row with these columns, in any order:

| Date | Description | Category | Type | Payment Method | Amount (INR) | Notes |
|------|-------------|----------|------|----------------|--------------|-------|

- **Date**: a real Excel date, or text such as `15/03/2026`, `2026-03-15`, `15 Mar 2026`.
- **Type**: `Income` or `Expense` (also understands `credit`/`debit`). Amounts are always positive; Type sets the direction.
- **Amount**: a number. Text like `₹1,20,000.50` is understood when reading.
- The header row can be anywhere in the first 15 rows, so a title row above it is fine.
- Empty rows are ignored. Any other worksheet (for example a `Summary` sheet with formulas) is preserved untouched.
- A transaction is reported under its own date. If a row sits in the wrong month sheet, the app flags it and moves it to the correct sheet on the next save.

Rows that cannot be read (bad date, non-numeric amount) are **never silently dropped**: they are listed as validation issues in the Dashboard and in Settings so you can fix them in Excel and refresh.

## Two connection modes

| | Direct file connection | Import / Export |
|---|---|---|
| Browsers | Chrome, Edge, other Chromium browsers on desktop (File System Access API) | Everything else (Safari, Firefox, mobile browsers) |
| Reading | Reads the file on disk; remembers it between sessions (re-asks permission after a browser restart) | You pick the file each time |
| External edits | Detected by polling while the tab is visible and on focus; reloaded automatically when there are no unsaved edits | Re-import the file manually |
| Saving | **Save changes to Excel** writes straight back into the same file | **Export updated workbook** downloads a new `.xlsx`; replace your original with it |

In both modes, edits live in the app until you save or export. The status chip in the header shows `Changes pending` until the write has actually succeeded; if a write fails (for example the workbook is open in Excel and locked), the app says so and keeps the edits in memory.

### Conflicts

If the workbook changes on disk while you have unsaved edits, the app stops and shows a conflict dialog listing your pending changes. You choose: **Reload from Excel** (discard in-app edits) or **Save my changes** (rewrite the monthly sheets from the app). Nothing is overwritten without that choice.

### What saving changes in the file

Saving rebuilds the transaction rows of each monthly sheet from the app's data, which is why repeated saves never duplicate rows. Preserved: all other worksheets, formulas and cells outside the transaction columns, column widths, merges, number formats of the Date/Amount columns. Not preserved: cell colours and fonts inside the monthly sheets (a limitation of the open-source SheetJS build).

Use **Settings → Data safety → Export backup copy** before large changes.

## Cross-device use

A file connected on one device is not automatically available on another. Keep the workbook in a cloud-synced folder (OneDrive, Google Drive, Dropbox) and connect it on each device. Automatic background synchronisation between devices would need a separate sync service; PocketFlow does not include one and does not pretend to.

Categories, budgets, savings goals and preferences are stored in the browser's `localStorage` and are also per-device. Transactions are never stored in the browser.

## Project structure

```
src/
  app/            App shell, routes, Redux store
  components/     layout, dashboard, transactions, budget, settings, common
  pages/          Dashboard, Transactions, Reports, Budget & Goals, Settings
  services/excel/ excelFileAccess (File System Access API), workbookReader,
                  workbookWriter, workbookValidator, syncManager, workbookSession
  services/storage/ IndexedDB handle store, localStorage wrapper
  features/       transaction / connection / settings / ui slices + thunks + selectors
  utils/          financeCalculations, currencyFormatter, dateFormatter,
                  transactionValidation (zod), csvExport
  hooks/          useExcelConnection, useWorkbookSync, useFormatters
  theme/          MUI theme (light / dark)
  types/          finance.ts, workbook.ts
tests/            vitest suite run against the template workbook
scripts/          generate-template.mjs
```

## Troubleshooting

- **"Permission required"** after reopening the browser: click *Reconnect* (or *Grant access*) and allow access. Browsers always re-ask after a restart.
- **Save fails / file locked**: close the workbook in Excel, then save again. Your edits are still in the app.
- **"No monthly worksheets found"**: sheet names must be month names. Download the blank template from the welcome screen to see the expected layout.
- **Nothing shows for the current month**: use the month selector in the header; the dashboard defaults to the current month (change the default in Settings → Preferences).
- **Safari / Firefox**: direct file access is not available; use Import / Export mode.

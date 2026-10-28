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

One worksheet per month named `January` … `December` (short names like `Jan` are also recognised). To keep several years in one workbook, name the sheets by year: `January 2026` … `December 2027`; each row is then saved into the sheet for its own month **and** year, and a missing one (say `March 2028`) is created on save. Each sheet has a header row with these columns, in any order:

| Date | Description | Category | Type | Payment Method | Amount (INR) | Notes |
|------|-------------|----------|------|----------------|--------------|-------|

- **Date**: a real Excel date, or text such as `15/03/2026`, `2026-03-15`, `15 Mar 2026`. A row with a description (or category) and an amount but **no date** is recorded on the 1st of its sheet's month and flagged as a warning, so a quick list typed into a month sheet still shows up.
- **Type**: `Income` or `Expense` (also understands `credit`/`debit`). Amounts are always positive; Type sets the direction.
- **Amount**: a number. Text like `₹1,20,000.50` is understood when reading.
- The header row can be anywhere in the first 15 rows, so a title row above it is fine.
- Empty rows are ignored. Any other worksheet (for example a `Summary` sheet with formulas) is preserved untouched.
- A transaction is reported under its own date. If a row sits in the wrong month sheet, the app flags it and moves it to the correct sheet on the next save.

Rows that cannot be read (bad date, non-numeric amount) are **never silently dropped**: they are listed as validation issues in the Dashboard and in Settings so you can fix them in Excel and refresh.

### Lending sheet (optional)

A sheet named `Lending` tracks money people borrowed from you or spent on your card, shown on the **Lending** page (per-person balances, card spends and cashback). Columns: Date, Person, Given via, Card / account, Purpose, Amount (INR), Cashback (INR), Paid back (INR), Remaining (INR), Notes. Remaining is taken from the sheet when filled (the setup script fills it with *Amount − Paid back*), otherwise calculated the same way. The app only reads this sheet; update it in the workbook.

## Connection modes

| | Direct file connection | Import / Export | Google Sheet link | Private Google Sheet |
|---|---|---|---|---|
| Browsers | Chrome, Edge, other Chromium browsers on desktop (File System Access API) | Everything else (Safari, Firefox, mobile browsers) | Any browser | Any browser |
| Reading | Reads the file on disk; remembers it between sessions (re-asks permission after a browser restart) | You pick the file each time | Downloads a published / public sheet from its link | Reads the sheet through its PocketFlow Apps Script; the sheet itself stays private |
| External edits | Detected by polling while the tab is visible and on focus; reloaded automatically when there are no unsaved edits | Re-import the file manually | Re-checked every minute and on focus | Re-checked every minute and on focus |
| Saving | **Save changes to Excel** writes straight back into the same file | **Export updated workbook** downloads a new `.xlsx`; replace your original with it | Read-only (**Export updated workbook** downloads in-app edits) | **Save** writes straight into the Google Sheet |

In every mode, edits live in the app until you save or export. The status chip in the header shows `Changes pending` until the write has actually succeeded; if a write fails (for example the workbook is open in Excel and locked), the app says so and keeps the edits in memory.

### Private Google Sheet (recommended for Google Sheets)

The sheet stays private to your Google account. A small Apps Script inside the sheet, [`scripts/google-apps-script/Code.gs`](scripts/google-apps-script/Code.gs), answers only requests that carry its secret key. No Google Cloud project or API key is needed.

1. Upload the workbook to Google Drive and open it with Google Sheets (*File → Save as Google Sheets* if it opened in Office mode).
2. *Extensions → Apps Script*: paste `Code.gs`, set `KEY` to a long random string, add the **Google Sheets API** service (*Services → +*), save.
3. Run `setupPocketFlow` once and allow access (Google shows "Google hasn't verified this app" for personal scripts: *Advanced → Go to … (unsafe)*). It names the month tabs by year, adds next year's tabs, Summary rows and the Lending tab.
4. *Deploy → New deployment → Web app*, Execute as **Me**, Who has access **Anyone**, Deploy. Copy the `/exec` URL. After changing the code later, use *Manage deployments → Edit → New version* so the URL stays the same.
5. Create `.env.local` (never committed) and restart `npm run dev`:
   ```
   VITE_SHEET_URL=https://script.google.com/macros/s/…/exec
   VITE_SHEET_KEY=<the KEY from Code.gs>
   ```

With `VITE_SHEET_URL` set, the app opens that sheet on start and Settings does not show or change the link. Anyone who has **both** the URL and the key can read and change the transaction sheets, so keep `.env.local` private, and change `KEY` (and the env value) if it ever leaks. The key is built into the app's JavaScript, so do not host a build of the app on a public website with it.

### Published Google Sheet link (read-only)

*File → Share → Publish to web → Entire document → Publish*, then paste the link into **Google Sheet link** (welcome screen or Settings). Anyone who has a published link can view the sheet, and Google can take up to 5 minutes to refresh it after an edit.

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
  app/            App shell, routes, Redux store, config (fixed sheet from .env.local)
  components/     layout, dashboard, transactions, budget, settings, common
  pages/          Dashboard, Transactions, Reports, Budget & Goals, Lending, Settings
  services/excel/ excelFileAccess (File System Access API), workbookReader,
                  workbookWriter, workbookValidator, syncManager, workbookSession,
                  sheetLink (published links), sheetScript (private sheet), lendingReader
  services/storage/ IndexedDB handle store, localStorage wrapper
  features/       transaction / connection / settings / ui slices + thunks + selectors
  utils/          financeCalculations, currencyFormatter, dateFormatter,
                  transactionValidation (zod), csvExport, lendingCalculations
  hooks/          useExcelConnection, useWorkbookSync, useFormatters, useFillHeight
  theme/          MUI theme (light / dark)
  types/          finance.ts, workbook.ts
tests/            vitest suite run against the template workbook
scripts/          generate-template.mjs, google-apps-script/Code.gs (private Google Sheet bridge)
```

## Troubleshooting

- **"Permission required"** after reopening the browser: click *Reconnect* (or *Grant access*) and allow access. Browsers always re-ask after a restart.
- **Save fails / file locked**: close the workbook in Excel, then save again. Your edits are still in the app.
- **"No monthly worksheets found"**: sheet names must be month names. Download the blank template from the welcome screen to see the expected layout.
- **Nothing shows for the current month**: use the month selector in the header; the dashboard defaults to the current month (change the default in Settings → Preferences).
- **Safari / Firefox**: direct file access is not available; use Import / Export mode or a Google Sheet.
- **Google Sheet: "did not accept this app's key"**: `VITE_SHEET_KEY` in .env.local must match `KEY` in the Apps Script; restart `npm run dev` after changing .env.local.
- **Google Sheet: script changes have no effect**: deploy them with *Manage deployments → Edit → New version*.

import { useState } from 'react'
import { Alert, Box, Button, Chip, Collapse, Divider, Grid, Link, Stack, Typography } from '@mui/material'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import LinkOffOutlinedIcon from '@mui/icons-material/LinkOffOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined'
import { useExcelConnection } from '@/hooks/useExcelConnection'
import { SyncStatusChip } from '@/components/common/SyncStatus'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { formatDateTime } from '@/utils/dateFormatter'
import { SheetLinkForm } from './SheetLinkForm'
import { FIXED_SHEET } from '@/app/config'
import { canSaveBack } from '@/types/workbook'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid container spacing={1} sx={{ py: 0.75 }}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, sm: 8 }}>
        <Typography variant="body2" component="div" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
          {value}
        </Typography>
      </Grid>
    </Grid>
  )
}

export function ExcelConnectionPanel() {
  const c = useExcelConnection()
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const modeLabel =
    c.mode === 'direct' ? 'Direct file connection (reads and writes the file on disk)'
    : c.mode === 'import' ? 'Import / export (changes stay in memory until exported)'
    : c.mode === 'link' ? 'Google Sheet link (read-only, reloads when the sheet changes)'
    : c.mode === 'gsheet' ? 'Private Google Sheet (saves straight into the sheet, reloads when it changes)'
    : '—'
  const saveBack = canSaveBack(c.mode)

  return (
    <Stack spacing={2}>
      {!c.supportsDirectAccess && (
        <Alert severity="info">
          This browser does not support direct file access, so PocketFlow runs in <strong>Import / Export</strong> mode: your workbook is read once, edits live in memory, and you download an updated copy to keep them. Chrome and Edge on desktop support direct connection.
        </Alert>
      )}
      {c.status === 'permission-required' && (
        <Alert severity="warning" action={<Button color="inherit" size="small" startIcon={<LockOpenOutlinedIcon />} onClick={() => void c.reconnect()}>Grant access</Button>}>
          The browser needs your permission again to read <strong>{c.fileName}</strong>. This is normal after restarting the browser.
        </Alert>
      )}
      {c.status === 'failed' && c.error && (
        <Alert severity="error" onClose={c.clearErrors}>
          {c.error}
        </Alert>
      )}
      {c.mode === 'import' && c.isConnected && (
        <Alert severity={c.dirty ? 'warning' : 'info'}>
          {c.dirty
            ? `${c.pendingChanges.length} change${c.pendingChanges.length === 1 ? '' : 's'} exist only in this app's memory. Click "Export updated workbook" and replace your original file to keep them.`
            : 'Imported files are not updated on disk automatically. After editing, export the updated workbook and replace your file.'}
          {c.lastExportAt && ` Last export: ${formatDateTime(c.lastExportAt)}.`}
        </Alert>
      )}
      {c.mode === 'gsheet' && c.isConnected && c.status !== 'failed' && (
        <Alert severity={c.dirty ? 'warning' : 'info'}>
          {c.dirty
            ? `${c.pendingChanges.length} change${c.pendingChanges.length === 1 ? '' : 's'} not saved yet. Click "Save changes to Google Sheet" to write them into your sheet.`
            : 'Your Google Sheet is private. Changes you save here go straight into it, and edits made in Google Sheets show up here within about a minute.'}
        </Alert>
      )}
      {c.mode === 'link' && c.isConnected && c.status !== 'failed' && (
        <Alert severity={c.dirty ? 'warning' : 'info'}>
          {c.dirty
            ? `${c.pendingChanges.length} change${c.pendingChanges.length === 1 ? '' : 's'} exist only in this app's memory. The Google Sheet is read-only from here: make the same edits in Google Sheets, or export the updated workbook.`
            : 'Add and edit transactions in Google Sheets. PocketFlow re-reads the sheet every minute and when you come back to this tab (Google can take up to 5 minutes to update a published sheet).'}
        </Alert>
      )}

      <Box>
        <Row label="Status" value={<SyncStatusChip status={c.status} fileName={c.fileName} lastSyncedAt={c.lastSyncedAt} pendingCount={c.pendingChanges.length} />} />
        <Row label="Workbook" value={c.fileName ?? 'No workbook connected'} />
        <Row label="Connection mode" value={modeLabel} />
        <Row label="Last successful sync" value={formatDateTime(c.lastSyncedAt)} />
        {c.mode !== 'import' && <Row label="Last change check" value={formatDateTime(c.lastCheckedAt)} />}
        <Row label="Unsaved changes" value={c.pendingChanges.length ? <Chip size="small" color="warning" label={`${c.pendingChanges.length} pending`} /> : 'None'} />
        {c.loadSummary && <Row label="Last load" value={c.loadSummary} />}
      </Box>

      <Divider />

      <Stack direction="row" spacing={1.5}  useFlexGap sx={{ flexWrap: 'wrap' }}>
        {c.supportsDirectAccess ? (
          <Button variant="contained" startIcon={<FolderOpenOutlinedIcon />} onClick={() => void c.connect()} disabled={c.loading}>
            {c.isConnected ? 'Connect a different file' : 'Connect Excel file'}
          </Button>
        ) : (
          <Button variant="contained" startIcon={<UploadFileOutlinedIcon />} onClick={() => void c.importFile()} disabled={c.loading}>
            {c.isConnected ? 'Import a different file' : 'Import Excel file'}
          </Button>
        )}
        {c.supportsDirectAccess && (
          <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => void c.importFile()} disabled={c.loading}>
            Import instead (no file access)
          </Button>
        )}
        {c.isConnected && c.mode === 'direct' && (
          <Button variant="outlined" startIcon={<LockOpenOutlinedIcon />} onClick={() => void c.reconnect()} disabled={c.loading}>
            Reconnect
          </Button>
        )}
        {c.isConnected && (
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void c.refresh()} disabled={c.loading || c.saving}>
            {c.mode === 'import' ? 'Re-import from file' : c.mode === 'link' || c.mode === 'gsheet' ? 'Reload from Google Sheet' : 'Refresh from Excel'}
          </Button>
        )}
        {c.isConnected && (
          <Button variant={c.dirty ? 'contained' : 'outlined'} color={c.dirty ? 'warning' : 'primary'} startIcon={<SaveOutlinedIcon />} onClick={() => void c.save()} disabled={!c.dirty || c.saving}>
            {c.mode === 'gsheet' ? 'Save changes to Google Sheet' : saveBack ? 'Save changes to Excel' : 'Export updated workbook'}
          </Button>
        )}
        {c.isConnected && (
          <Button variant="text" color="error" startIcon={<LinkOffOutlinedIcon />} onClick={() => setConfirmDisconnect(true)}>
            Disconnect
          </Button>
        )}
      </Stack>

      {/* The sheet fixed in .env.local is not changed from here, and its link is never shown. */}
      {!FIXED_SHEET.url && <SheetLinkForm key={c.sourceUrl ?? 'none'} />}

      <Button size="small" color="inherit" startIcon={<HelpOutlineIcon />} onClick={() => setShowHelp((v) => !v)} sx={{ alignSelf: 'flex-start' }}>
        Connection troubleshooting
      </Button>
      <Collapse in={showHelp}>
        <Stack spacing={1} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Typography variant="body2"><strong>Workbook structure.</strong> One worksheet per month named January … December, with a header row containing Date, Description, Category, Type, Payment Method, Amount (INR), Notes. Other sheets are left untouched. <Link href="/PocketFlow_Blank_Template.xlsx" download>Download a blank template</Link>.</Typography>
          <Typography variant="body2"><strong>Permission required.</strong> Browsers ask again for file access after a restart. Click Reconnect and choose Allow. The file is never uploaded anywhere.</Typography>
          <Typography variant="body2"><strong>Save fails or file locked.</strong> Close the workbook in Excel before saving: Excel locks open files. Changes stay in the app until the save succeeds.</Typography>
          <Typography variant="body2"><strong>Formatting.</strong> Saving rewrites the transaction rows of the monthly sheets. Cell values, formulas elsewhere, column widths and other sheets are preserved, but custom cell colours and fonts in the monthly sheets are not.</Typography>
          <Typography variant="body2"><strong>Other devices.</strong> A file connected on this device is not automatically available elsewhere. Keep the workbook in a cloud-synced folder (OneDrive, Google Drive, Dropbox) and connect it on each device. Automatic cross-device sync would need a separate sync service; PocketFlow does not include one.</Typography>
          <Typography variant="body2"><strong>Google Sheets.</strong> In Google Sheets choose File → Share → Publish to web, pick "Entire document", click Publish and paste the link above. Anyone who has a published link can view the sheet, so share it carefully. The app reads it but cannot write to it: add transactions in Google Sheets.</Typography>
          <Typography variant="body2"><strong>Unsupported browser.</strong> Safari and Firefox lack the File System Access API. Use Import / Export mode there, or Chrome / Edge for direct connection.</Typography>
        </Stack>
      </Collapse>

      <ConfirmDialog
        open={confirmDisconnect}
        title="Disconnect workbook?"
        message={c.dirty ? `You have ${c.pendingChanges.length} unsaved change(s). Disconnecting discards them. Your Excel file itself is not changed.` : 'The app will forget this file. Your Excel file itself is not changed. Local settings, budgets and goals are kept.'}
        confirmLabel="Disconnect"
        destructive
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={() => {
          setConfirmDisconnect(false)
          void c.disconnect()
        }}
      />
    </Stack>
  )
}

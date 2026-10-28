import { useState } from 'react'
import { Alert, Button, List, ListItem, ListItemText, Stack, Typography } from '@mui/material'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import TableViewOutlinedIcon from '@mui/icons-material/TableViewOutlined'
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { useExcelConnection } from '@/hooks/useExcelConnection'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { resetSettings } from '@/features/settings/settingsSlice'
import { showToast } from '@/features/ui/uiSlice'
import { clearAllLocal } from '@/services/storage/localSettings'
import { downloadCsv, transactionsToCsv } from '@/utils/csvExport'
import { formatDateTime } from '@/utils/dateFormatter'

export function DataSafetyPanel() {
  const dispatch = useAppDispatch()
  const c = useExcelConnection()
  const transactions = useAppSelector((s) => s.transactions.items)
  const [confirmClear, setConfirmClear] = useState(false)

  const exportCsv = () => {
    downloadCsv(transactionsToCsv(transactions), `PocketFlow_transactions_${new Date().toISOString().slice(0, 10)}.csv`)
    dispatch(showToast('Transactions CSV downloaded', 'success'))
  }

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">
        There is no cloud backup in PocketFlow. Your workbook is your data: keep it in a folder that is backed up (for example a OneDrive or Google Drive folder) and download a backup copy before large changes.
      </Alert>
      <Stack direction="row" spacing={1.5}  useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={c.backup} disabled={!c.isConnected}>
          Export backup copy of workbook
        </Button>
        <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={c.exportWorkbook} disabled={!c.isConnected}>
          Export workbook with unsaved edits
        </Button>
        <Button variant="outlined" startIcon={<TableViewOutlinedIcon />} onClick={exportCsv} disabled={transactions.length === 0}>
          Export transactions as CSV
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        "Backup copy" downloads the workbook exactly as it was last read from disk. "With unsaved edits" builds a new workbook from the app's current data, including changes not yet saved.
      </Typography>

      <Stack spacing={1}>
        <Stack direction="row"   sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2">Synchronisation errors</Typography>
          {c.errorLog.length > 0 && (
            <Button size="small" color="inherit" onClick={c.clearErrors}>
              Clear log
            </Button>
          )}
        </Stack>
        {c.errorLog.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No errors recorded in this session.
          </Typography>
        ) : (
          <List dense disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 2, maxHeight: 240, overflow: 'auto' }}>
            {c.errorLog.map((e, i) => (
              <ListItem key={`${e.at}-${i}`} divider>
                <ListItemText primary={e.message} secondary={formatDateTime(e.at)}   slotProps={{ primary: { variant: 'body2' } }} />
              </ListItem>
            ))}
          </List>
        )}
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">Reset</Typography>
        <Button variant="outlined" color="error" startIcon={<DeleteSweepOutlinedIcon />} onClick={() => setConfirmClear(true)} sx={{ alignSelf: 'flex-start' }}>
          Clear local application settings
        </Button>
        <Typography variant="caption" color="text.secondary">
          Removes categories, budgets, goals, preferences and the remembered workbook connection from this browser. Your Excel file is never touched.
        </Typography>
      </Stack>

      <ConfirmDialog
        open={confirmClear}
        title="Clear local settings?"
        destructive
        confirmLabel="Clear everything"
        message="Categories, budgets, savings goals, preferences and the remembered file connection will be removed from this browser. Your Excel workbook is not modified."
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          setConfirmClear(false)
          await c.disconnect()
          clearAllLocal()
          dispatch(resetSettings())
          dispatch(showToast('Local settings cleared', 'success'))
        }}
      />
    </Stack>
  )
}

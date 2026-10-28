import { useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { useExcelConnection } from '@/hooks/useExcelConnection'
import { formatDateTime } from '@/utils/dateFormatter'
import { canSaveBack } from '@/types/workbook'

/**
 * Shown when the workbook changed externally while there are unsaved in-app edits, or when the user
 * asks to refresh with unsaved edits. Nothing is written or discarded without an explicit choice.
 */
export function ConflictDialog() {
  const { status, externalChangeDetected, pendingChanges, fileName, lastSyncedAt, conflictReload, conflictOverwrite, conflictDismiss, mode, saving, loading } = useExcelConnection()
  const [busy, setBusy] = useState(false)
  const open = status === 'conflict'
  const working = busy || saving || loading

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={working ? undefined : conflictDismiss} maxWidth="sm" fullWidth aria-labelledby="conflict-title">
      <DialogTitle id="conflict-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberOutlinedIcon color="warning" />
        {externalChangeDetected ? 'Workbook changed outside the app' : 'You have unsaved changes'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="warning">
            {externalChangeDetected ? (
              <>
                <strong>{fileName}</strong> was modified after it was loaded here (last sync {formatDateTime(lastSyncedAt)}), and you also have{' '}
                <strong>{pendingChanges.length}</strong> unsaved {pendingChanges.length === 1 ? 'change' : 'changes'}. Nothing has been overwritten.
              </>
            ) : (
              <>
                Reloading will discard <strong>{pendingChanges.length}</strong> unsaved {pendingChanges.length === 1 ? 'change' : 'changes'} made in the app.
              </>
            )}
          </Alert>
          <Typography variant="subtitle2">Pending changes</Typography>
          <List dense disablePadding sx={{ maxHeight: 220, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
            {pendingChanges.map((c) => (
              <ListItem key={c.id} divider>
                <Chip size="small" label={c.kind} color={c.kind === 'delete' ? 'error' : c.kind === 'add' ? 'success' : 'primary'} sx={{ mr: 1.5, minWidth: 60 }} />
                <ListItemText primary={c.summary} secondary={formatDateTime(c.at)}   slotProps={{ primary: { variant: 'body2' } }} />
              </ListItem>
            ))}
            {pendingChanges.length === 0 && (
              <ListItem>
                <ListItemText primary="No pending changes." />
              </ListItem>
            )}
          </List>
          <Typography variant="body2" color="text.secondary">
            <strong>Reload from Excel</strong> keeps the file as it is on disk and discards the in-app edits above.{' '}
            {canSaveBack(mode) && (
              <>
                <strong>Save my changes</strong> rewrites the workbook from the app's current data, replacing the external edits in the monthly sheets.
              </>
            )}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={conflictDismiss} disabled={working} color="inherit">
          Keep reviewing
        </Button>
        <Button onClick={() => run(conflictReload)} disabled={working} variant="outlined" color="warning">
          Reload from Excel (discard mine)
        </Button>
        {canSaveBack(mode) && (
          <Button onClick={() => run(conflictOverwrite)} disabled={working || pendingChanges.length === 0} variant="contained">
            Save my changes (overwrite)
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

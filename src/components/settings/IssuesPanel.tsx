import { useState } from 'react'
import { Alert, AlertTitle, Box, Button, Chip, Collapse, List, ListItem, ListItemText, Stack, Typography } from '@mui/material'
import { useAppSelector } from '@/app/store'

/** Shows workbook validation warnings/errors so the user can fix them in Excel. */
export function IssuesPanel({ compact = false }: { compact?: boolean }) {
  const issues = useAppSelector((s) => s.transactions.issues)
  const missing = useAppSelector((s) => s.transactions.missingSheets)
  const [open, setOpen] = useState(!compact)
  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')
  if (issues.length === 0 && missing.length === 0) return null

  return (
    <Alert severity={errors.length ? 'error' : 'warning'} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
      <AlertTitle sx={{ fontWeight: 600 }}>
        {errors.length ? `${errors.length} row${errors.length === 1 ? '' : 's'} could not be read` : 'Workbook warnings'}
        {warnings.length > 0 && ` · ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`}
      </AlertTitle>
      <Typography variant="body2">
        {errors.length
          ? 'Rows with unreadable dates or amounts are not shown or saved. Fix them in Excel and refresh; nothing is deleted automatically.'
          : 'These records were imported with a best-effort interpretation. Review them in Excel if something looks off.'}
        {missing.length > 0 && missing.length < 12 && ` Missing sheets (${missing.join(', ')}) are created automatically when needed.`}
      </Typography>
      {issues.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Button size="small" color="inherit" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide details' : `Show ${issues.length} detail${issues.length === 1 ? '' : 's'}`}
          </Button>
          <Collapse in={open}>
            <List dense disablePadding sx={{ mt: 1, maxHeight: 260, overflow: 'auto', bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
              {issues.slice(0, 200).map((i) => (
                <ListItem key={i.id} divider>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip size="small" label={i.severity} color={i.severity === 'error' ? 'error' : 'warning'} sx={{ height: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {i.sheet}
                          {i.row ? ` · row ${i.row}` : ''}
                          {i.field && i.field !== 'row' ? ` · ${i.field}` : ''}
                        </Typography>
                      </Stack>
                    }
                    secondary={i.message}
                  />
                </ListItem>
              ))}
              {issues.length > 200 && (
                <ListItem>
                  <ListItemText primary={`…and ${issues.length - 200} more.`} />
                </ListItem>
              )}
            </List>
          </Collapse>
        </Box>
      )}
    </Alert>
  )
}

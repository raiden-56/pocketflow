import { Alert, Box, Button, Card, CardContent, Grid, Link, Stack, Typography } from '@mui/material'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined'
import { motion } from 'framer-motion'
import { useExcelConnection } from '@/hooks/useExcelConnection'
import { palette } from '@/theme/theme'
import { SheetLinkForm } from './SheetLinkForm'
import { FIXED_SHEET } from '@/app/config'

const MotionCard = motion.create(Card)

/** First-run screen shown until a workbook is connected. */
export function ConnectWorkbookEmptyState() {
  const c = useExcelConnection()
  const steps = [
    { icon: <TableChartOutlinedIcon />, title: 'One sheet per month', text: 'January … December sheets with Date, Description, Category, Type, Payment Method, Amount (INR) and Notes columns.' },
    { icon: <ShieldOutlinedIcon />, title: 'Private by design', text: 'Everything runs in your browser. No database, no server, nothing uploaded. Your workbook stays the source of truth.' },
    { icon: <SyncOutlinedIcon />, title: 'Edit and save back', text: c.supportsDirectAccess ? 'Add, edit and delete transactions, then save straight back into the same file.' : 'Edit in the app and export an updated workbook to keep your changes.' },
  ]
  return (
    <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto', pt: { xs: 1, md: 4 } }}>
      <MotionCard
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{ background: `linear-gradient(135deg, ${palette.navy} 0%, ${palette.royal} 100%)`, color: '#fff', border: 0, overflow: 'hidden' }}
      >
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: '0.12em' }}>
            Welcome to PocketFlow
          </Typography>
          <Typography variant="h4" component="h1" sx={{ mt: 0.5, mb: 1.5, color: '#fff' }}>
            Connect your Excel workbook to get started
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 620, mb: 3 }}>
            PocketFlow reads your monthly transaction sheets, builds your dashboard, and writes changes back to the same workbook. No accounts, no cloud, no database.
          </Typography>
          {c.status === 'permission-required' ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}  sx={{ alignItems: { sm: 'center' } }}>
              <Button size="large" variant="contained" color="inherit" startIcon={<LockOpenOutlinedIcon />} onClick={() => void c.reconnect()} sx={{ color: palette.navy, bgcolor: '#fff', '&:hover': { bgcolor: '#E2E8F0' } }}>
                Grant access to {c.fileName}
              </Button>
              <Button variant="text" color="inherit" onClick={() => void c.connect()} sx={{ opacity: 0.9 }}>
                Choose a different file
              </Button>
            </Stack>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                size="large"
                variant="contained"
                color="inherit"
                startIcon={c.supportsDirectAccess ? <FolderOpenOutlinedIcon /> : <UploadFileOutlinedIcon />}
                onClick={() => void c.connect()}
                disabled={c.loading}
                sx={{ color: palette.navy, bgcolor: '#fff', '&:hover': { bgcolor: '#E2E8F0' } }}
              >
                {c.supportsDirectAccess ? 'Connect Excel file' : 'Import Excel file'}
              </Button>
              {c.supportsDirectAccess && (
                <Button size="large" variant="outlined" color="inherit" startIcon={<UploadFileOutlinedIcon />} onClick={() => void c.importFile()} disabled={c.loading} sx={{ borderColor: 'rgba(255,255,255,0.5)' }}>
                  Import instead
                </Button>
              )}
            </Stack>
          )}
          {!FIXED_SHEET.url && (
            <>
              <Typography variant="body2" sx={{ mt: 3, mb: 1, opacity: 0.9 }}>
                Or read it from Google Sheets:
              </Typography>
              <SheetLinkForm onDark />
            </>
          )}
          <Typography variant="caption" sx={{ display: 'block', mt: 2, opacity: 0.8 }}>
            Don't have a workbook yet?{' '}
            <Link href="/PocketFlow_Blank_Template.xlsx" download color="inherit" underline="always">
              Download the blank template
            </Link>{' '}
            and connect it.
          </Typography>
        </CardContent>
      </MotionCard>

      {c.status === 'failed' && c.error && (
        <Alert severity="error" onClose={c.clearErrors}>
          {c.error}
        </Alert>
      )}
      {!c.supportsDirectAccess && (
        <Alert severity="info">
          This browser cannot keep a live link to a local file, so PocketFlow will use Import / Export mode. Changes you make are kept in memory until you export an updated workbook. For direct read/write, use Chrome or Edge on desktop.
        </Alert>
      )}

      <Grid container spacing={2}>
        {steps.map((s, i) => (
          <Grid key={s.title} size={{ xs: 12, md: 4 }}>
            <MotionCard initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ color: 'primary.main', mb: 1 }}>{s.icon}</Box>
                <Typography variant="subtitle1">{s.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {s.text}
                </Typography>
              </CardContent>
            </MotionCard>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

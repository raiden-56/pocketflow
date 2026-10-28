import { useNavigate } from 'react-router-dom'
import { AppBar, Box, Button, IconButton, MenuItem, Select, Stack, Toolbar, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { openTransactionDialog, setMonth, setYear, toggleSidebar } from '@/features/ui/uiSlice'
import { selectYears } from '@/features/transactions/selectors'
import { useExcelConnection } from '@/hooks/useExcelConnection'
import { SyncStatusChip } from '@/components/common/SyncStatus'
import { MONTH_NAMES, formatLongDate } from '@/utils/dateFormatter'
import { Logo } from './Sidebar'

export function Header() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const period = useAppSelector((s) => s.ui.period)
  const years = useAppSelector(selectYears)
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed)
  const { status, fileName, lastSyncedAt, pendingChanges, isConnected, dirty, loading, saving, refresh, save, mode } = useExcelConnection()

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(8px)' }}
    >
      <Toolbar sx={{ gap: 1.5, minHeight: { xs: 60, md: 72 }, px: { xs: 2, sm: 3, lg: 4 } }}>
        {!isDesktop && <Logo compact={isMobile} />}
        {isDesktop && collapsed && (
          <IconButton onClick={() => dispatch(toggleSidebar())} aria-label="Expand sidebar" edge="start">
            <MenuIcon />
          </IconButton>
        )}
        {isDesktop && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
              Your Money Overview
            </Typography>
            <Typography variant="caption">{formatLongDate(new Date())}</Typography>
          </Box>
        )}
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1}  sx={{ alignItems: 'center' }}>
          {!isMobile && (
            <>
              <Select
                size="small"
                value={period.year}
                onChange={(e) => dispatch(setYear(Number(e.target.value)))}
                
                sx={{ minWidth: 92, '& .MuiSelect-select': { py: 0.9 } }}
               slotProps={{ input: { 'aria-label': 'Select year' } }}>
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
              <Select
                size="small"
                value={period.month ?? 0}
                onChange={(e) => dispatch(setMonth(Number(e.target.value) === 0 ? null : Number(e.target.value)))}
                
                sx={{ minWidth: 130, '& .MuiSelect-select': { py: 0.9 } }}
               slotProps={{ input: { 'aria-label': 'Select month' } }}>
                <MenuItem value={0}>Whole year</MenuItem>
                {MONTH_NAMES.map((m, i) => (
                  <MenuItem key={m} value={i + 1}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </>
          )}
          {isConnected && (
            <SyncStatusChip status={status} fileName={fileName} lastSyncedAt={lastSyncedAt} pendingCount={pendingChanges.length} onClick={() => navigate('/settings')} />
          )}
          {isConnected && !isMobile && (
            <>
              <Tooltip title={mode === 'import' ? 'Import the workbook again' : 'Refresh from Excel'}>
                <span>
                  <IconButton onClick={() => void refresh()} disabled={loading || saving} aria-label="Refresh from Excel">
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={mode === 'import' ? 'Export updated workbook' : 'Save changes to Excel'}>
                <span>
                  <Button
                    variant={dirty ? 'contained' : 'outlined'}
                    color={dirty ? 'warning' : 'inherit'}
                    startIcon={<SaveOutlinedIcon />}
                    onClick={() => void save()}
                    disabled={!dirty || saving}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {mode === 'import' ? 'Export' : 'Save'}
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
          <Button
            variant="contained"
            startIcon={!isMobile ? <AddIcon /> : undefined}
            onClick={() => dispatch(openTransactionDialog(null))}
            disabled={!isConnected}
            aria-label="Add transaction"
            sx={{ whiteSpace: 'nowrap', minWidth: isMobile ? 40 : undefined, px: isMobile ? 1.25 : 2 }}
          >
            {isMobile ? <AddIcon /> : 'Add transaction'}
          </Button>
        </Stack>
      </Toolbar>
      {isMobile && isConnected && (
        <Stack direction="row" spacing={1} sx={{ px: 2, pb: 1.25 }}>
          <Select size="small" value={period.year} onChange={(e) => dispatch(setYear(Number(e.target.value)))}  sx={{ flex: 1 }} slotProps={{ input: { 'aria-label': 'Select year' } }}>
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={period.month ?? 0}
            onChange={(e) => dispatch(setMonth(Number(e.target.value) === 0 ? null : Number(e.target.value)))}
            
            sx={{ flex: 1.4 }}
           slotProps={{ input: { 'aria-label': 'Select month' } }}>
            <MenuItem value={0}>Whole year</MenuItem>
            {MONTH_NAMES.map((m, i) => (
              <MenuItem key={m} value={i + 1}>
                {m}
              </MenuItem>
            ))}
          </Select>
          <Tooltip title="Refresh from Excel">
            <span>
              <IconButton onClick={() => void refresh()} disabled={loading || saving} aria-label="Refresh from Excel">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={mode === 'import' ? 'Export updated workbook' : 'Save changes to Excel'}>
            <span>
              <IconButton color={dirty ? 'warning' : 'default'} onClick={() => void save()} disabled={!dirty || saving} aria-label="Save changes">
                <SaveOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      )}
    </AppBar>
  )
}

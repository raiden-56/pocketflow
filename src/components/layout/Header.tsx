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
import { canSaveBack } from '@/types/workbook'
import { Logo } from './Sidebar'

export function Header() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  // Full-width labels only where they fit next to the sidebar; below that the actions become icons.
  const isWide = useMediaQuery(theme.breakpoints.up('lg'))
  const showTitle = useMediaQuery(theme.breakpoints.up('xl'))
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const period = useAppSelector((s) => s.ui.period)
  const years = useAppSelector(selectYears)
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed)
  const { status, fileName, lastSyncedAt, pendingChanges, isConnected, dirty, loading, saving, refresh, save, mode } = useExcelConnection()
  const onGoogleSheet = mode === 'link' || mode === 'gsheet'
  const refreshLabel = mode === 'import' ? 'Import the workbook again' : onGoogleSheet ? 'Reload from Google Sheet' : 'Refresh from Excel'
  const saveLabel = mode === 'gsheet' ? 'Save changes to Google Sheet' : canSaveBack(mode) ? 'Save changes to Excel' : 'Export updated workbook'

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(8px)' }}
    >
      <Toolbar sx={{ gap: { xs: 1, sm: 1.5 }, minHeight: { xs: 60, md: 72 }, px: { xs: 2, sm: 3, lg: 4 } }}>
        {!isDesktop && <Logo compact />}
        {isDesktop && collapsed && (
          <IconButton onClick={() => dispatch(toggleSidebar())} aria-label="Expand sidebar" edge="start">
            <MenuIcon />
          </IconButton>
        )}
        {showTitle && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ lineHeight: 1.2 }}>
              Your Money Overview
            </Typography>
            <Typography variant="caption" noWrap component="div">{formatLongDate(new Date())}</Typography>
          </Box>
        )}
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          {!isMobile && (
            <>
              <Select
                size="small"
                value={period.year}
                onChange={(e) => dispatch(setYear(Number(e.target.value)))}
                sx={{ minWidth: 84, '& .MuiSelect-select': { py: 0.9 } }}
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
                sx={{ minWidth: { sm: 116, lg: 130 }, '& .MuiSelect-select': { py: 0.9 } }}
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
              <Tooltip title={refreshLabel}>
                <span>
                  <IconButton onClick={() => void refresh()} disabled={loading || saving} aria-label={refreshLabel}>
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={saveLabel}>
                <span>
                  {isWide ? (
                    <Button
                      variant={dirty ? 'contained' : 'outlined'}
                      color={dirty ? 'warning' : 'inherit'}
                      startIcon={<SaveOutlinedIcon />}
                      onClick={() => void save()}
                      disabled={!dirty || saving}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {canSaveBack(mode) ? 'Save' : 'Export'}
                    </Button>
                  ) : (
                    <IconButton color={dirty ? 'warning' : 'default'} onClick={() => void save()} disabled={!dirty || saving} aria-label={saveLabel}>
                      <SaveOutlinedIcon />
                    </IconButton>
                  )}
                </span>
              </Tooltip>
            </>
          )}
          <Tooltip title={isWide ? '' : 'Add transaction'}>
            <span>
              <Button
                variant="contained"
                startIcon={isWide ? <AddIcon /> : undefined}
                onClick={() => dispatch(openTransactionDialog(null))}
                disabled={!isConnected}
                aria-label="Add transaction"
                sx={{ whiteSpace: 'nowrap', minWidth: isWide ? undefined : 40, px: isWide ? 2 : 1.25 }}
              >
                {isWide ? 'Add transaction' : <AddIcon />}
              </Button>
            </span>
          </Tooltip>
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
          <Tooltip title={refreshLabel}>
            <span>
              <IconButton onClick={() => void refresh()} disabled={loading || saving} aria-label={refreshLabel}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={saveLabel}>
            <span>
              <IconButton color={dirty ? 'warning' : 'default'} onClick={() => void save()} disabled={!dirty || saving} aria-label={saveLabel}>
                <SaveOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      )}
    </AppBar>
  )
}

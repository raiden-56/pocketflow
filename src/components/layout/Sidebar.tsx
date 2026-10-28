import { NavLink } from 'react-router-dom'
import { Box, Divider, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip, Typography } from '@mui/material'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { toggleSidebar } from '@/features/ui/uiSlice'
import { NAV_ITEMS } from '@/app/routes'
import { SyncStatusChip } from '@/components/common/SyncStatus'
import { palette } from '@/theme/theme'

export const SIDEBAR_WIDTH = 248
export const SIDEBAR_COLLAPSED_WIDTH = 76

export const NAV_ICONS: Record<(typeof NAV_ITEMS)[number]['key'], React.ReactElement> = {
  dashboard: <DashboardOutlinedIcon />,
  transactions: <ReceiptLongOutlinedIcon />,
  reports: <AssessmentOutlinedIcon />,
  budget: <SavingsOutlinedIcon />,
  lending: <HandshakeOutlinedIcon />,
  settings: <SettingsOutlinedIcon />,
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Stack direction="row"  spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Box
        aria-hidden
        sx={{
          width: 36,
          height: 36,
          borderRadius: '11px',
          flexShrink: 0,
          background: `linear-gradient(135deg, ${palette.navy} 0%, ${palette.royal} 100%)`,
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: '-0.03em',
        }}
      >
        PF
      </Box>
      {!compact && (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ lineHeight: 1.1, fontWeight: 700, letterSpacing: '-0.01em' }}>
            PocketFlow
          </Typography>
          <Typography variant="caption" sx={{ lineHeight: 1 }}>
            Excel-powered tracker
          </Typography>
        </Box>
      )}
    </Stack>
  )
}

export function Sidebar() {
  const dispatch = useAppDispatch()
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed)
  const connection = useAppSelector((s) => s.connection)
  const pending = useAppSelector((s) => s.transactions.pendingChanges.length)
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        width,
        position: 'fixed',
        inset: '0 auto 0 0',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        transition: (t) => t.transitions.create('width', { duration: t.transitions.duration.shorter }),
        zIndex: (t) => t.zIndex.appBar + 1,
        overflow: 'hidden',
      }}
    >
      <Stack direction="row"   sx={{ alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', px: collapsed ? 1 : 2, py: 2, minHeight: 72 }}>
        <Logo compact={collapsed} />
        {!collapsed && (
          <IconButton size="small" onClick={() => dispatch(toggleSidebar())} aria-label="Collapse sidebar">
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Stack>
      <Divider />
      <List sx={{ px: 1.25, py: 1.5, flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <Tooltip key={item.key} title={collapsed ? item.label : ''} placement="right">
            <ListItemButton
              component={NavLink}
              to={item.path}
              end={item.path === '/'}
              sx={{
                borderRadius: 2.5,
                mb: 0.5,
                minHeight: 44,
                px: collapsed ? 1.5 : 2,
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: 'text.secondary',
                '&.active': {
                  bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(96,165,250,0.14)' : '#EFF6FF'),
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                  fontWeight: 600,
                },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, color: 'inherit', justifyContent: 'center' }}>{NAV_ICONS[item.key]}</ListItemIcon>
              {!collapsed && <ListItemText primary={item.label}   slotProps={{ primary: { sx: { fontWeight: 'inherit', fontSize: '0.925rem' } } }} />}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: collapsed ? 1 : 2, display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch', gap: 1 }}>
        {!collapsed ? (
          <>
            <SyncStatusChip status={connection.status} fileName={connection.fileName} lastSyncedAt={connection.lastSyncedAt} pendingCount={pending} />
            <Typography variant="caption" noWrap title={connection.fileName ?? undefined}>
              {connection.fileName ?? 'Connect a workbook in Settings'}
            </Typography>
          </>
        ) : (
          <IconButton size="small" onClick={() => dispatch(toggleSidebar())} aria-label="Expand sidebar">
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  )
}

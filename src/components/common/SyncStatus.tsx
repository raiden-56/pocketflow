import { Chip, CircularProgress, Tooltip, type ChipProps } from '@mui/material'
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined'
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import type { SyncStatus as Status } from '@/types/workbook'
import { formatDateTime } from '@/utils/dateFormatter'

interface SyncStatusProps {
  status: Status
  fileName?: string | null
  lastSyncedAt?: string | null
  pendingCount?: number
  size?: ChipProps['size']
  onClick?: () => void
}

const META: Record<Status, { label: string; color: ChipProps['color']; icon: React.ReactElement }> = {
  disconnected: { label: 'No workbook', color: 'default', icon: <CloudOffOutlinedIcon fontSize="small" /> },
  connected: { label: 'Connected', color: 'primary', icon: <LinkOutlinedIcon fontSize="small" /> },
  syncing: { label: 'Syncing', color: 'primary', icon: <CircularProgress size={14} color="inherit" /> },
  pending: { label: 'Changes pending', color: 'warning', icon: <PendingActionsOutlinedIcon fontSize="small" /> },
  synced: { label: 'Synced', color: 'success', icon: <CloudDoneOutlinedIcon fontSize="small" /> },
  'permission-required': { label: 'Permission required', color: 'warning', icon: <LockOutlinedIcon fontSize="small" /> },
  failed: { label: 'Sync failed', color: 'error', icon: <ErrorOutlineIcon fontSize="small" /> },
  conflict: { label: 'Conflict', color: 'error', icon: <WarningAmberOutlinedIcon fontSize="small" /> },
}

export function SyncStatusChip({ status, fileName, lastSyncedAt, pendingCount = 0, size = 'small', onClick }: SyncStatusProps) {
  const meta = META[status]
  const label = status === 'pending' && pendingCount > 0 ? `${pendingCount} unsaved` : meta.label
  const tooltip = [fileName ? `Workbook: ${fileName}` : 'No workbook connected', `Last sync: ${formatDateTime(lastSyncedAt)}`].join(' · ')
  return (
    <Tooltip title={tooltip}>
      <Chip
        size={size}
        color={meta.color}
        variant={status === 'synced' || status === 'connected' ? 'outlined' : 'filled'}
        icon={meta.icon}
        label={label}
        onClick={onClick}
        aria-label={`Excel sync status: ${label}`}
        sx={{ fontWeight: 600, '& .MuiChip-icon': { ml: 0.75 } }}
      />
    </Tooltip>
  )
}

import type { ReactNode } from 'react'
import { Alert, AlertTitle, Button, Stack } from '@mui/material'

interface ErrorStateProps {
  title?: string
  message: ReactNode
  onRetry?: () => void
  retryLabel?: string
  actions?: ReactNode
  severity?: 'error' | 'warning'
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Try again', actions, severity = 'error' }: ErrorStateProps) {
  return (
    <Alert severity={severity} role="alert" sx={{ alignItems: 'flex-start' }}>
      <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>
      {message}
      {(onRetry || actions) && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1.5 }}  useFlexGap>
          {onRetry && (
            <Button size="small" variant="outlined" color="inherit" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {actions}
        </Stack>
      )}
    </Alert>
  )
}

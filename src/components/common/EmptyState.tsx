import type { ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  actions?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon, title, description, actions, compact = false }: EmptyStateProps) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
      <Stack   spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: compact ? 4 : 8, px: 2 }}>
        {icon && (
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '20px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(96,165,250,0.12)' : '#EFF6FF'),
              color: 'primary.main',
              '& svg': { fontSize: 32 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
            {description}
          </Typography>
        )}
        {actions && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1, width: { xs: '100%', sm: 'auto' } }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </motion.div>
  )
}

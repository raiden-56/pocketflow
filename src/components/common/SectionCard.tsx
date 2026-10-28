import type { ReactNode } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { motion } from 'framer-motion'
import { fadeUp } from './PageTransition'

interface SectionCardProps {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  minHeight?: number
  animate?: boolean
  disablePadding?: boolean
  sx?: object
}

const MotionCard = motion.create(Card)

export function SectionCard({ title, subtitle, action, children, minHeight, animate = true, disablePadding = false, sx }: SectionCardProps) {
  const header = (title || action) && (
    <Stack direction="row"   spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', px: disablePadding ? 2.5 : 0, pt: disablePadding ? 2.5 : 0, mb: 1.5 }}>
      <Box>
        {title && (
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  )
  const body = (
    <CardContent sx={{ p: disablePadding ? 0 : 2.5, '&:last-child': { pb: disablePadding ? 0 : 2.5 }, display: 'flex', flexDirection: 'column', flex: 1 }}>
      {header}
      {children}
    </CardContent>
  )
  const style = { minHeight, height: '100%', display: 'flex', flexDirection: 'column' as const, ...sx }
  return animate ? (
    <MotionCard variants={fadeUp} initial="hidden" animate="show" sx={style}>
      {body}
    </MotionCard>
  ) : (
    <Card sx={style}>{body}</Card>
  )
}

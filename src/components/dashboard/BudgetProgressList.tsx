import { Box, LinearProgress, Stack, Typography } from '@mui/material'
import { motion } from 'framer-motion'
import type { BudgetProgress } from '@/types/finance'

interface Props {
  items: BudgetProgress[]
  format: (n: number) => string
  compact?: boolean
}

export function BudgetProgressList({ items, format, compact = false }: Props) {
  return (
    <Stack spacing={compact ? 1.5 : 2.25} component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {items.map((b, i) => {
        const color = b.status === 'exceeded' ? 'error' : b.status === 'warning' ? 'warning' : 'success'
        return (
          <Box component="li" key={b.category}>
            <Stack direction="row"   spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {b.category}
              </Typography>
              <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {format(b.spent)} / {format(b.limit)}
              </Typography>
            </Stack>
            <motion.div initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, b.percent)}
                color={color}
                aria-label={`${b.category} budget ${b.percent.toFixed(0)} percent used`}
              />
            </motion.div>
            <Stack direction="row"  sx={{ justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color={b.status === 'exceeded' ? 'error.main' : b.status === 'warning' ? 'warning.main' : 'text.secondary'} sx={{ fontWeight: b.status === 'ok' ? 400 : 600 }}>
                {b.status === 'exceeded' ? `Over by ${format(b.spent - b.limit)}` : b.status === 'warning' ? `${format(b.remaining)} left · approaching limit` : `${format(b.remaining)} left`}
              </Typography>
              <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {b.percent.toFixed(0)}%
              </Typography>
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}

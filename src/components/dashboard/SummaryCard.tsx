import type { ReactNode } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { motion } from 'framer-motion'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { fadeUp } from '@/components/common/PageTransition'

interface SummaryCardProps {
  label: string
  value: number
  format: (n: number) => string
  icon: ReactNode
  tone: 'income' | 'expense' | 'primary' | 'neutral'
  hint?: ReactNode
  /** Direct string rendering (used for savings rate). */
  valueText?: string
}

const MotionCard = motion.create(Card)

export function SummaryCard({ label, value, format, icon, tone, hint, valueText }: SummaryCardProps) {
  const colorMap = {
    income: { fg: 'income.main', bg: 'income.light' },
    expense: { fg: 'expense.main', bg: 'expense.light' },
    primary: { fg: 'primary.main', bg: (t: { palette: { mode: string } }) => (t.palette.mode === 'dark' ? 'rgba(96,165,250,0.16)' : '#EFF6FF') },
    neutral: { fg: 'text.secondary', bg: 'action.hover' },
  } as const
  const colors = colorMap[tone]
  return (
    <MotionCard variants={fadeUp} whileHover={{ y: -2 }} sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row"   spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {label}
            </Typography>
            <Typography
              variant="h5"
              component="p"
              sx={{ mt: 0.75, fontVariantNumeric: 'tabular-nums', color: tone === 'neutral' ? 'text.primary' : colors.fg, fontSize: { xs: '1.35rem', md: '1.5rem' }, wordBreak: 'break-word' }}
            >
              {valueText ?? <AnimatedNumber value={value} format={format} />}
            </Typography>
            {hint && (
              <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
                {hint}
              </Typography>
            )}
          </Box>
          <Box
            aria-hidden
            sx={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              color: colors.fg,
              bgcolor: colors.bg,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </MotionCard>
  )
}

import { Box, Chip, Stack, Typography } from '@mui/material'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { motion } from 'framer-motion'
import type { Insight } from '@/types/finance'
import { EmptyState } from '@/components/common/EmptyState'
import { fadeUp, staggerContainer } from '@/components/common/PageTransition'

export function FinancialInsights({ insights }: { insights: Insight[] }) {
  if (!insights.length) {
    return <EmptyState compact icon={<LightbulbOutlinedIcon />} title="Not enough data for insights yet" description="Insights appear once a period has at least a few transactions." />
  }
  return (
    <Stack component={motion.ul} variants={staggerContainer} initial="hidden" animate="show" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {insights.map((ins) => {
        const color = ins.tone === 'positive' ? 'income.main' : ins.tone === 'negative' ? 'expense.main' : 'primary.main'
        const Icon = ins.kind === 'suggestion' ? LightbulbOutlinedIcon : ins.tone === 'positive' ? TrendingUpIcon : ins.tone === 'negative' ? TrendingDownIcon : InfoOutlinedIcon
        return (
          <Stack
            component={motion.li}
            variants={fadeUp}
            key={ins.id}
            direction="row"
            spacing={1.5}
            
            sx={{ alignItems: 'flex-start', p: 1.5, borderRadius: 2.5, bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC'), border: 1, borderColor: 'divider' }}>
            <Box sx={{ color, mt: 0.25, display: 'flex' }} aria-hidden>
              <Icon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2">{ins.text}</Typography>
            </Box>
            <Chip size="small" label={ins.kind === 'fact' ? 'Calculated' : 'Suggestion'} variant="outlined" sx={{ height: 20, fontSize: '0.68rem', flexShrink: 0 }} />
          </Stack>
        )
      })}
    </Stack>
  )
}

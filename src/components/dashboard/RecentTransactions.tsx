import { Box, Chip, Stack, Typography } from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import { motion } from 'framer-motion'
import type { Transaction } from '@/types/finance'
import { staggerContainer, fadeUp } from '@/components/common/PageTransition'

interface Props {
  items: Transaction[]
  money: (n: number) => string
  date: (iso: string) => string
  onSelect?: (id: string) => void
}

export function RecentTransactions({ items, money, date, onSelect }: Props) {
  return (
    <Stack component={motion.ul} variants={staggerContainer} initial="hidden" animate="show" spacing={0} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {items.map((tx) => {
        const income = tx.type === 'Income'
        return (
          <Stack
            component={motion.li}
            variants={fadeUp}
            key={tx.id}
            direction="row"
            
            spacing={1.5}
            onClick={onSelect ? () => onSelect(tx.id) : undefined}
            sx={{ alignItems: 'center', py: 1.25,
              borderBottom: 1,
              borderColor: 'divider',
              '&:last-of-type': { borderBottom: 0 },
              cursor: onSelect ? 'pointer' : 'default',
              borderRadius: 1,
              '&:hover': onSelect ? { bgcolor: 'action.hover' } : undefined, }}>
            <Box
              aria-hidden
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: income ? 'income.main' : 'expense.main',
                bgcolor: income ? 'income.light' : 'expense.light',
              }}
            >
              {income ? <ArrowDownwardIcon fontSize="small" /> : <ArrowUpwardIcon fontSize="small" />}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={tx.description}>
                {tx.description}
              </Typography>
              <Stack direction="row" spacing={1}  sx={{ alignItems: 'center', mt: 0.25 }}>
                <Typography variant="caption" noWrap>
                  {date(tx.date)}
                </Typography>
                <Chip size="small" label={tx.category} variant="outlined" sx={{ height: 20, fontSize: '0.7rem', maxWidth: 140 }} />
              </Stack>
            </Box>
            <Box  sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: income ? 'income.main' : 'text.primary' }}>
                {income ? '+' : '−'}
                {money(tx.amount)}
              </Typography>
              <Typography variant="caption">{tx.type}</Typography>
            </Box>
          </Stack>
        )
      })}
    </Stack>
  )
}

import { Box, Card, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import { motion } from 'framer-motion'
import type { Transaction } from '@/types/finance'
import { fadeUp } from '@/components/common/PageTransition'

interface Props {
  tx: Transaction
  money: (n: number) => string
  date: (iso: string) => string
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const MotionCard = motion.create(Card)

export function TransactionCard({ tx, money, date, onEdit, onDelete }: Props) {
  const income = tx.type === 'Income'
  return (
    <MotionCard variants={fadeUp} layout sx={{ borderLeft: 4, borderLeftColor: income ? 'income.main' : 'expense.main' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1}  sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap title={tx.description}>
              {tx.description}
            </Typography>
            <Typography variant="caption" component="p">
              {date(tx.date)} · {tx.paymentMethod}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', mt: 1 }}  useFlexGap>
              <Chip size="small" label={tx.category} variant="outlined" sx={{ height: 22 }} />
              <Chip size="small" label={tx.type} sx={{ height: 22, bgcolor: income ? 'income.light' : 'expense.light', color: income ? 'income.dark' : 'expense.dark', fontWeight: 600 }} />
            </Stack>
            {tx.notes && (
              <Typography variant="caption" component="p" sx={{ mt: 1 }} color="text.secondary">
                {tx.notes}
              </Typography>
            )}
          </Box>
          <Box  sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: income ? 'income.main' : 'text.primary' }}>
              {income ? '+' : '−'}
              {money(tx.amount)}
            </Typography>
            <Stack direction="row"  sx={{ justifyContent: 'flex-end', mt: 0.5, mr: -1 }}>
              <IconButton size="small" onClick={() => onEdit(tx.id)} aria-label={`Edit ${tx.description}`}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => onDelete(tx.id)} aria-label={`Delete ${tx.description}`} color="error">
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </MotionCard>
  )
}

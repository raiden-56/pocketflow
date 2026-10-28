import { Typography } from '@mui/material'
import type { Transaction } from '@/types/finance'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

interface Props {
  transaction: Transaction | null
  money: (n: number) => string
  date: (iso: string) => string
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteTransactionDialog({ transaction, money, date, onCancel, onConfirm }: Props) {
  return (
    <ConfirmDialog
      open={transaction != null}
      title="Delete this transaction?"
      destructive
      confirmLabel="Delete"
      onCancel={onCancel}
      onConfirm={onConfirm}
      message={
        transaction && (
          <>
            <Typography variant="body2" component="p" sx={{ mb: 1 }}>
              <strong>{transaction.description}</strong> · {date(transaction.date)} · {transaction.type} · {money(transaction.amount)}
            </Typography>
            <Typography variant="body2" component="p" color="text.secondary">
              It will be removed from the {transaction.sourceSheet ?? 'matching month'} worksheet the next time you save to Excel. Until then it is only removed in the app.
            </Typography>
          </>
        )
      }
    />
  )
}

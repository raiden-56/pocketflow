import { useMemo } from 'react'
import { Dialog, DialogContent, DialogTitle, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { closeTransactionDialog, showToast } from '@/features/ui/uiSlice'
import { addTransaction, updateTransaction } from '@/features/transactions/transactionSlice'
import { selectAllCategoryNames, selectAllPaymentMethods } from '@/features/transactions/selectors'
import type { TransactionInput } from '@/types/finance'
import { canSaveBack } from '@/types/workbook'
import { TransactionForm } from './TransactionForm'

/** Global add/edit dialog driven by ui.transactionDialog (full-screen on phones). */
export function TransactionDialog() {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const dispatch = useAppDispatch()
  const { open, editingId } = useAppSelector((s) => s.ui.transactionDialog)
  const editing = useAppSelector((s) => (editingId ? s.transactions.items.find((t) => t.id === editingId) ?? null : null))
  const categories = useAppSelector((s) => s.settings.categories)
  const extraCategories = useAppSelector(selectAllCategoryNames)
  const paymentMethods = useAppSelector(selectAllPaymentMethods)
  const currency = useAppSelector((s) => s.settings.preferences.currency)
  const mode = useAppSelector((s) => s.connection.mode)

  const initial = useMemo<Partial<TransactionInput> | undefined>(() => {
    if (!editing) return undefined
    const { date, description, category, type, paymentMethod, amount, notes } = editing
    return { date, description, category, type, paymentMethod, amount, notes }
  }, [editing])

  const close = () => dispatch(closeTransactionDialog())

  const submit = (values: TransactionInput) => {
    if (editing) {
      dispatch(updateTransaction({ id: editing.id, changes: values }))
      dispatch(showToast(canSaveBack(mode) ? 'Transaction updated. Click Save to write it to your sheet.' : 'Transaction updated in memory. Export to keep it.', 'success'))
    } else {
      dispatch(addTransaction(values))
      dispatch(showToast(canSaveBack(mode) ? 'Transaction added. Click Save to write it to your sheet.' : 'Transaction added in memory. Export to keep it.', 'success'))
    }
    close()
  }

  return (
    <Dialog open={open} onClose={close} fullScreen={fullScreen} maxWidth="sm" fullWidth aria-labelledby="transaction-dialog-title" keepMounted={false}>
      <DialogTitle id="transaction-dialog-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
        <span>
          {editing ? 'Edit transaction' : 'Add transaction'}
          {editing?.sourceSheet && (
            <Typography variant="caption" component="span" sx={{ ml: 1 }}>
              from {editing.sourceSheet} sheet
            </Typography>
          )}
        </span>
        <IconButton onClick={close} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {open && (
          <TransactionForm
            initial={initial}
            originalDate={editing?.date}
            categories={categories}
            extraCategories={extraCategories}
            paymentMethods={paymentMethods}
            currency={currency}
            onSubmit={submit}
            onCancel={close}
            submitLabel={editing ? 'Update transaction' : 'Add transaction'}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

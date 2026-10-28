import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Grid, InputAdornment, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import type { Category, TransactionInput, TransactionType } from '@/types/finance'
import { transactionSchema, type TransactionFormValues, type TransactionFormOutput } from '@/utils/transactionValidation'
import { todayIso, monthLabel, monthOfIso } from '@/utils/dateFormatter'
import { CURRENCY_OPTIONS, type CurrencyCode } from '@/utils/currencyFormatter'

interface Props {
  initial?: Partial<TransactionInput>
  categories: Category[]
  /** Categories present in the data but not configured (kept selectable when editing). */
  extraCategories?: string[]
  paymentMethods: string[]
  currency: CurrencyCode
  submitting?: boolean
  submitLabel?: string
  onSubmit: (values: TransactionInput) => void
  onCancel: () => void
  /** Original month when editing, so a month change can be explained. */
  originalDate?: string
}

export function TransactionForm({ initial, categories, extraCategories = [], paymentMethods, currency, submitting, submitLabel = 'Save transaction', onSubmit, onCancel, originalDate }: Props) {
  const symbol = CURRENCY_OPTIONS.find((c) => c.value === currency)?.symbol ?? ''
  const defaults: TransactionFormValues = useMemo(
    () => ({
      date: initial?.date ?? todayIso(),
      description: initial?.description ?? '',
      category: initial?.category ?? '',
      type: initial?.type ?? 'Expense',
      paymentMethod: initial?.paymentMethod ?? paymentMethods[0] ?? 'UPI',
      amount: initial?.amount ?? (undefined as unknown as number),
      notes: initial?.notes ?? '',
    }),
    [initial, paymentMethods],
  )

  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<TransactionFormValues, unknown, TransactionFormOutput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  })

  useEffect(() => {
    reset(defaults)
  }, [defaults, reset])

  const type = watch('type') as TransactionType
  const category = watch('category')
  const date = watch('date')

  const options = useMemo(() => {
    const enabled = categories.filter((c) => c.enabled && c.type === type).map((c) => c.name)
    const set = new Set(enabled)
    if (category && !set.has(category)) set.add(category)
    for (const extra of extraCategories) if (!categories.some((c) => c.name === extra)) set.add(extra)
    return [...set]
  }, [categories, type, category, extraCategories])

  // When switching type, drop a category that no longer applies.
  useEffect(() => {
    if (category && !options.includes(category)) setValue('category', '')
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  const monthMoved = originalDate && date && /^\d{4}-\d{2}-\d{2}$/.test(date) && originalDate.slice(0, 7) !== date.slice(0, 7)

  return (
    <Box component="form" noValidate onSubmit={handleSubmit((values) => onSubmit({ ...values, notes: values.notes ?? '' }))}>
      <Stack spacing={2.25}>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={field.value}
              onChange={(_, v) => v && field.onChange(v)}
              aria-label="Transaction type"
              sx={{
                '& .MuiToggleButton-root': { py: 1, fontWeight: 600, borderRadius: 2.5 },
                '& .MuiToggleButton-root.Mui-selected': {
                  bgcolor: field.value === 'Income' ? 'income.light' : 'expense.light',
                  color: field.value === 'Income' ? 'income.dark' : 'expense.dark',
                },
              }}
            >
              <ToggleButton value="Expense">Expense</ToggleButton>
              <ToggleButton value="Income">Income</ToggleButton>
            </ToggleButtonGroup>
          )}
        />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                  label="Amount"
                  type="number"
                  
                  
                  error={!!errors.amount}
                  helperText={errors.amount?.message ?? 'Always positive; Income or Expense sets the direction'}
                  autoFocus
                  required
                 slotProps={{ htmlInput: { min: 0, step: '0.01', inputMode: 'decimal' }, input: { startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> } }} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Date" type="date"  error={!!errors.date} helperText={errors.date?.message ?? (monthMoved ? `Will move to the ${monthLabel(monthOfIso(date))} worksheet on save` : ' ')} required  slotProps={{ inputLabel: { shrink: true } }} />
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <TextField {...field} label="Description" placeholder="e.g. Weekly groceries" error={!!errors.description} helperText={errors.description?.message ?? ' '} required />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Category" error={!!errors.category} helperText={errors.category?.message ?? ' '} required>
                  {options.length === 0 && <MenuItem disabled value="">No {type.toLowerCase()} categories enabled</MenuItem>}
                  {options.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Payment method" error={!!errors.paymentMethod} helperText={errors.paymentMethod?.message ?? ' '} required>
                  {[...new Set([...paymentMethods, field.value].filter(Boolean))].map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => <TextField {...field} label="Notes (optional)" multiline minRows={2} error={!!errors.notes} helperText={errors.notes?.message} />}
            />
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary">
          Saved into the month sheet matching the transaction date when you click Save.
        </Typography>
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5}  sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} color="inherit" disabled={submitting || isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting || isSubmitting} sx={{ minWidth: 160 }}>
            {submitLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

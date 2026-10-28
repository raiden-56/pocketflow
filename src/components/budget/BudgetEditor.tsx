import { useState } from 'react'
import { Button, IconButton, InputAdornment, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { removeBudget, setBudget } from '@/features/settings/settingsSlice'
import { selectAllCategoryNames, selectBudgetProgress } from '@/features/transactions/selectors'
import { useFormatters } from '@/hooks/useFormatters'
import { CURRENCY_OPTIONS } from '@/utils/currencyFormatter'
import { BudgetProgressList } from '@/components/dashboard/BudgetProgressList'
import { EmptyState } from '@/components/common/EmptyState'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'

export function BudgetEditor() {
  const dispatch = useAppDispatch()
  const budgets = useAppSelector((s) => s.settings.budgets)
  const categories = useAppSelector((s) => s.settings.categories)
  const allNames = useAppSelector(selectAllCategoryNames)
  const progress = useAppSelector(selectBudgetProgress)
  const period = useAppSelector((s) => s.ui.period)
  const { money, currency } = useFormatters()
  const symbol = CURRENCY_OPTIONS.find((c) => c.value === currency)?.symbol ?? ''
  const [newCategory, setNewCategory] = useState('')
  const [newLimit, setNewLimit] = useState('')

  const expenseNames = allNames.filter((n) => categories.find((c) => c.name === n)?.type !== 'Income')
  const available = expenseNames.filter((n) => !budgets.some((b) => b.category === n))

  const add = () => {
    const limit = Number(newLimit)
    if (!newCategory || !Number.isFinite(limit) || limit <= 0) return
    dispatch(setBudget({ category: newCategory, limit }))
    setNewCategory('')
    setNewLimit('')
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField select label="Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} sx={{ flex: 1 }}>
          {available.length === 0 && <MenuItem disabled value="">All categories have budgets</MenuItem>}
          {available.map((n) => (
            <MenuItem key={n} value={n}>
              {n}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Monthly limit"
          type="number"
          value={newLimit}
          onChange={(e) => setNewLimit(e.target.value)}
          
          
          onKeyDown={(e) => e.key === 'Enter' && add()}
          sx={{ flex: 1 }}
         slotProps={{ htmlInput: { min: 0, step: 100, inputMode: 'decimal' }, input: { startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> } }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={add} disabled={!newCategory || !(Number(newLimit) > 0)} sx={{ flexShrink: 0 }}>
          Set budget
        </Button>
      </Stack>

      {budgets.length === 0 ? (
        <EmptyState compact icon={<SavingsOutlinedIcon />} title="No budgets yet" description="Set a monthly limit for a category to track how much of it you have used." />
      ) : (
        <>
          <Table size="small" aria-label="Budget limits">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell align="right">Monthly limit</TableCell>
                <TableCell align="right" sx={{ width: 56 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {budgets.map((b) => (
                <TableRow key={b.category}>
                  <TableCell sx={{ fontWeight: 600 }}>{b.category}</TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      value={b.limit}
                      onChange={(e) => dispatch(setBudget({ category: b.category, limit: Math.max(0, Number(e.target.value) || 0) }))}
                      
                      
                      sx={{ width: 170 }}
                     slotProps={{ htmlInput: { min: 0, step: 100, 'aria-label': `${b.category} limit`, style: { textAlign: 'right' } }, input: { startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> } }} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove budget">
                      <IconButton size="small" color="error" onClick={() => dispatch(removeBudget(b.category))} aria-label={`Remove ${b.category} budget`}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">
              Progress for {period.month == null ? `${period.year} (limits × 12)` : `the selected month`}
            </Typography>
            {progress.length ? <BudgetProgressList items={progress} format={money} /> : <Typography variant="body2" color="text.secondary">No spending recorded against these categories yet.</Typography>}
          </Stack>
        </>
      )}
    </Stack>
  )
}

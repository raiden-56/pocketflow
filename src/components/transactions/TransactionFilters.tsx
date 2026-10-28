import { Button, Grid, InputAdornment, MenuItem, TextField } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { MONTH_NAMES } from '@/utils/dateFormatter'
import type { SortDir, SortKey } from './TransactionTable'

export interface TransactionFilterState {
  search: string
  category: string
  type: 'all' | 'Income' | 'Expense'
  paymentMethod: string
  /** 0 = all months. */
  month: number
  /** 0 = all years. */
  year: number
  sortBy: SortKey
  sortDir: SortDir
}

export const DEFAULT_FILTERS: TransactionFilterState = {
  search: '',
  category: '',
  type: 'all',
  paymentMethod: '',
  month: 0,
  year: 0,
  sortBy: 'date',
  sortDir: 'desc',
}

interface Props {
  value: TransactionFilterState
  onChange: (next: TransactionFilterState) => void
  categories: string[]
  paymentMethods: string[]
  years: number[]
}

export function TransactionFilters({ value, onChange, categories, paymentMethods, years }: Props) {
  const set = <K extends keyof TransactionFilterState>(key: K, v: TransactionFilterState[K]) => onChange({ ...value, [key]: v })
  const isDefault = JSON.stringify({ ...value, sortBy: 'date', sortDir: 'desc' }) === JSON.stringify(DEFAULT_FILTERS)

  return (
    <Grid container spacing={1.5}  sx={{ alignItems: 'center' }}>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          value={value.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="Search description or notes"
          
          
         slotProps={{ htmlInput: { 'aria-label': 'Search transactions' }, input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <TextField select label="Type" value={value.type} onChange={(e) => set('type', e.target.value as TransactionFilterState['type'])}>
          <MenuItem value="all">All types</MenuItem>
          <MenuItem value="Income">Income</MenuItem>
          <MenuItem value="Expense">Expense</MenuItem>
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <TextField select label="Category" value={value.category} onChange={(e) => set('category', e.target.value)}>
          <MenuItem value="">All categories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <TextField select label="Payment" value={value.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
          <MenuItem value="">All methods</MenuItem>
          {paymentMethods.map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 1 }}>
        <TextField select label="Year" value={value.year} onChange={(e) => set('year', Number(e.target.value))}>
          <MenuItem value={0}>All</MenuItem>
          {years.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 1 }}>
        <TextField select label="Month" value={value.month} onChange={(e) => set('month', Number(e.target.value))}>
          <MenuItem value={0}>All</MenuItem>
          {MONTH_NAMES.map((m, i) => (
            <MenuItem key={m} value={i + 1}>
              {m.slice(0, 3)}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 'auto' }} sx={{ ml: { md: 'auto' } }}>
        <Button startIcon={<RestartAltIcon />} onClick={() => onChange(DEFAULT_FILTERS)} disabled={isDefault} color="inherit" fullWidth>
          Reset filters
        </Button>
      </Grid>
    </Grid>
  )
}

import { Alert, Grid, MenuItem, TextField, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { setPreference, type DefaultPeriod, type ThemeMode } from '@/features/settings/settingsSlice'
import { CURRENCY_OPTIONS, formatMoney, type CurrencyCode, type NumberFormatPreference } from '@/utils/currencyFormatter'
import { DATE_FORMAT_OPTIONS, type DateFormatPreference } from '@/utils/dateFormatter'

export function PreferencesPanel() {
  const dispatch = useAppDispatch()
  const prefs = useAppSelector((s) => s.settings.preferences)
  const storageUnavailable = useAppSelector((s) => s.settings.storageUnavailable)
  const preview = formatMoney(1234567.5, { currency: prefs.currency, numberFormat: prefs.numberFormat })

  return (
    <Grid container spacing={2}>
      {storageUnavailable && (
        <Grid size={12}>
          <Alert severity="warning">Browser storage is unavailable (private window or blocked). Preferences, budgets and goals will reset when you close this tab.</Alert>
        </Grid>
      )}
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField select label="Currency" value={prefs.currency} onChange={(e) => dispatch(setPreference({ key: 'currency', value: e.target.value as CurrencyCode }))} helperText="Display only; amounts in the workbook are stored as plain numbers.">
          {CURRENCY_OPTIONS.map((c) => (
            <MenuItem key={c.value} value={c.value}>
              {c.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField select label="Number formatting" value={prefs.numberFormat} onChange={(e) => dispatch(setPreference({ key: 'numberFormat', value: e.target.value as NumberFormatPreference }))} helperText={`Preview: ${preview}`}>
          <MenuItem value="indian">Indian (12,34,567.50)</MenuItem>
          <MenuItem value="international">International (1,234,567.50)</MenuItem>
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField select label="Date format" value={prefs.dateFormat} onChange={(e) => dispatch(setPreference({ key: 'dateFormat', value: e.target.value as DateFormatPreference }))}>
          {DATE_FORMAT_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField select label="Default reporting period" value={prefs.defaultPeriod} onChange={(e) => dispatch(setPreference({ key: 'defaultPeriod', value: e.target.value as DefaultPeriod }))} helperText="Applied when the app opens.">
          <MenuItem value="current-month">Current month</MenuItem>
          <MenuItem value="full-year">Whole year</MenuItem>
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField select label="Theme" value={prefs.theme} onChange={(e) => dispatch(setPreference({ key: 'theme', value: e.target.value as ThemeMode }))}>
          <MenuItem value="system">Match system</MenuItem>
          <MenuItem value="light">Light</MenuItem>
          <MenuItem value="dark">Dark</MenuItem>
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          type="number"
          label="Check workbook for changes every (seconds)"
          value={prefs.pollIntervalSeconds}
          onChange={(e) => dispatch(setPreference({ key: 'pollIntervalSeconds', value: Math.max(5, Math.min(600, Number(e.target.value) || 20)) }))}
          
          helperText="Direct connection only. Paused while the tab is in the background."
         slotProps={{ htmlInput: { min: 5, max: 600 } }} />
      </Grid>
      <Grid size={12}>
        <Typography variant="caption" color="text.secondary">
          Preferences, categories, budgets and goals are stored in this browser only. They are not synchronised to other devices, and transactions are never stored here.
        </Typography>
      </Grid>
    </Grid>
  )
}

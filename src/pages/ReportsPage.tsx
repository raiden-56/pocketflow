import { useMemo } from 'react'
import { Box, Button, Chip, Grid, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { selectExpenseBreakdown, selectMonthlySeries, selectPeriodSummary, selectPeriodTransactions, selectPreviousPeriodSummary, selectTransactions, selectYears } from '@/features/transactions/selectors'
import { setMonth, setYear, showToast } from '@/features/ui/uiSlice'
import { useExcelConnection } from '@/hooks/useExcelConnection'
import { useFormatters } from '@/hooks/useFormatters'
import { SectionCard } from '@/components/common/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'
import { PageSkeleton } from '@/components/common/LoadingSkeleton'
import { ConnectWorkbookEmptyState } from '@/components/settings/ConnectWorkbookEmptyState'
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart'
import { ExpenseBreakdownChart } from '@/components/dashboard/ExpenseBreakdownChart'
import { formatPercent } from '@/utils/currencyFormatter'
import { MONTH_NAMES, formatDateTime, monthLabel } from '@/utils/dateFormatter'
import { incomeByCategory, percentChange, previousPeriod, savingsRate, summarize, filterByPeriod } from '@/utils/financeCalculations'
import { downloadCsv, toCsv } from '@/utils/csvExport'

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'income' | 'expense' | 'primary' }) {
  return (
    <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC'), border: 1, borderColor: 'divider' }}>
      <Typography variant="caption">{label}</Typography>
      <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums', color: tone ? `${tone}.main` : 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  )
}

export default function ReportsPage() {
  const dispatch = useAppDispatch()
  const c = useExcelConnection()
  const { money, moneyShort } = useFormatters()
  const period = useAppSelector((s) => s.ui.period)
  const years = useAppSelector(selectYears)
  const all = useAppSelector(selectTransactions)
  const periodTx = useAppSelector(selectPeriodTransactions)
  const summary = useAppSelector(selectPeriodSummary)
  const previous = useAppSelector(selectPreviousPeriodSummary)
  const series = useAppSelector(selectMonthlySeries)
  const breakdown = useAppSelector(selectExpenseBreakdown)
  const lastSyncedAt = useAppSelector((s) => s.connection.lastSyncedAt)
  const annual = useMemo(() => summarize(filterByPeriod(all, { year: period.year, month: null })), [all, period.year])
  const incomeCats = useMemo(() => incomeByCategory(periodTx), [periodTx])

  if (c.restoring || (c.loading && all.length === 0)) return <PageSkeleton />
  if (!c.isConnected || c.status === 'permission-required') return <ConnectWorkbookEmptyState />

  const label = period.month == null ? `${period.year}` : `${monthLabel(period.month)} ${period.year}`
  const prev = previousPeriod(period)
  const prevLabel = prev.month == null ? `${prev.year}` : `${monthLabel(prev.month)} ${prev.year}`
  const activeSeries = series.filter((p) => p.income || p.expenses)

  const exportCsv = () => {
    const rows: (string | number)[][] = [[`PocketFlow report`, label], ['Generated from workbook', c.fileName ?? ''], ['Workbook last synced', formatDateTime(lastSyncedAt)], []]
    rows.push(['Summary', ''], ['Income', summary.income], ['Expenses', summary.expenses], ['Net balance', summary.net], ['Savings rate %', summary.savingsRate ?? ''], [])
    rows.push(['Spending by category', ''], ['Category', 'Amount', 'Share %'])
    breakdown.forEach((b) => rows.push([b.category, b.amount, b.share]))
    rows.push([], ['Income by category', ''], ['Category', 'Amount', 'Share %'])
    incomeCats.forEach((b) => rows.push([b.category, b.amount, b.share]))
    rows.push([], [`Monthly summary ${period.year}`, ''], ['Month', 'Income', 'Expenses', 'Net', 'Savings rate %'])
    series.forEach((p) => rows.push([MONTH_NAMES[p.month - 1], p.income, p.expenses, p.net, savingsRate(p.income, p.expenses) ?? '']))
    rows.push(['Annual total', annual.income, annual.expenses, annual.net, annual.savingsRate ?? ''])
    rows.push([], [`Transactions in ${label}`, ''], ['Date', 'Description', 'Category', 'Type', 'Payment Method', 'Amount', 'Notes'])
    periodTx.forEach((t) => rows.push([t.date, t.description, t.category, t.type, t.paymentMethod, t.amount, t.notes]))
    downloadCsv(toCsv(rows), `PocketFlow_report_${label.replace(/\s+/g, '_')}.csv`)
    dispatch(showToast('Report CSV downloaded', 'success'))
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }}   spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-end' } }}>
        <Box>
          <Typography variant="h4" component="h1">
            Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generated from {c.fileName} · last synced {formatDateTime(lastSyncedAt)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}  sx={{ alignItems: 'center' }}>
          <Select size="small" value={period.year} onChange={(e) => dispatch(setYear(Number(e.target.value)))}  slotProps={{ input: { 'aria-label': 'Report year' } }}>
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
          <Select size="small" value={period.month ?? 0} onChange={(e) => dispatch(setMonth(Number(e.target.value) === 0 ? null : Number(e.target.value)))}  sx={{ minWidth: 130 }} slotProps={{ input: { 'aria-label': 'Report month' } }}>
            <MenuItem value={0}>Whole year</MenuItem>
            {MONTH_NAMES.map((m, i) => (
              <MenuItem key={m} value={i + 1}>
                {m}
              </MenuItem>
            ))}
          </Select>
          <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={exportCsv} disabled={all.length === 0}>
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {all.length === 0 ? (
        <SectionCard>
          <EmptyState icon={<AssessmentOutlinedIcon />} title="Nothing to report yet" description="Reports are built from the transactions in your workbook. Add some and come back." />
        </SectionCard>
      ) : (
        <>
          <SectionCard title={`${period.month == null ? 'Annual' : 'Monthly'} summary · ${label}`} subtitle={`Compared with ${prevLabel}`}>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Stat label="Income" value={money(summary.income)} tone="income" />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Stat label="Expenses" value={money(summary.expenses)} tone="expense" />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Stat label="Net balance" value={money(summary.net, { signed: true })} tone={summary.net >= 0 ? 'primary' : 'expense'} />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Stat label="Savings rate" value={formatPercent(summary.savingsRate)} />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1}  useFlexGap sx={{ flexWrap: 'wrap', mt: 2 }}>
              {(['income', 'expenses', 'net'] as const).map((k) => {
                const ch = percentChange(summary[k], previous[k])
                const good = k === 'expenses' ? (ch ?? 0) <= 0 : (ch ?? 0) >= 0
                return (
                  <Chip
                    key={k}
                    size="small"
                    variant="outlined"
                    color={ch == null ? 'default' : good ? 'success' : 'error'}
                    label={`${k === 'net' ? 'Net' : k[0].toUpperCase() + k.slice(1)}: ${ch == null ? 'no previous data' : `${ch > 0 ? '+' : ''}${ch.toFixed(1)}% vs ${prevLabel}`}`}
                  />
                )
              })}
            </Stack>
          </SectionCard>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <SectionCard title="Income vs expenses" subtitle={`Every month of ${period.year}`}>
                <IncomeExpenseChart data={series} format={money} formatShort={moneyShort} />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <SectionCard title="Spending by category" subtitle={label}>
                <ExpenseBreakdownChart data={breakdown} format={money} total={summary.expenses} maxSlices={8} />
              </SectionCard>
            </Grid>
          </Grid>

          <SectionCard title="Spending by category" subtitle={`All expense categories in ${label}`} disablePadding>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label="Spending by category">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Share</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breakdown.map((b) => (
                    <TableRow key={b.category}>
                      <TableCell sx={{ fontWeight: 600 }}>{b.category}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{money(b.amount)}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{b.share.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  {breakdown.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>No expenses in this period.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </SectionCard>

          <SectionCard title={`Month-over-month · ${period.year}`} subtitle="Aggregated across the monthly worksheets" disablePadding>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label="Monthly comparison" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell align="right">Income</TableCell>
                    <TableCell align="right">Expenses</TableCell>
                    <TableCell align="right">Net</TableCell>
                    <TableCell align="right">Savings rate</TableCell>
                    <TableCell align="right">Expenses vs prev.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeSeries.map((p, i) => {
                    const prevPoint = i > 0 ? activeSeries[i - 1] : null
                    const ch = prevPoint ? percentChange(p.expenses, prevPoint.expenses) : null
                    const selected = period.month === p.month
                    return (
                      <TableRow key={p.month} selected={selected} hover sx={{ cursor: 'pointer' }} onClick={() => dispatch(setMonth(p.month))}>
                        <TableCell sx={{ fontWeight: selected ? 700 : 500 }}>{MONTH_NAMES[p.month - 1]}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'income.main' }}>{money(p.income)}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'expense.main' }}>{money(p.expenses)}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{money(p.net, { signed: true })}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatPercent(savingsRate(p.income, p.expenses))}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: ch == null ? 'text.secondary' : ch > 0 ? 'expense.main' : 'income.main' }}>
                          {ch == null ? '—' : `${ch > 0 ? '+' : ''}${ch.toFixed(1)}%`}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow sx={{ '& td': { fontWeight: 700, borderTop: 2, borderColor: 'divider' } }}>
                    <TableCell>Annual total</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{money(annual.income)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{money(annual.expenses)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{money(annual.net, { signed: true })}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatPercent(annual.savingsRate)}</TableCell>
                    <TableCell align="right">{activeSeries.length} active month{activeSeries.length === 1 ? '' : 's'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </SectionCard>
        </>
      )}
    </Stack>
  )
}

import { useNavigate } from 'react-router-dom'
import { Box, Button, Grid, Stack, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/app/store'
import {
  selectBudgetProgress,
  selectExpenseBreakdown,
  selectInsights,
  selectMonthlySeries,
  selectPeriodSummary,
  selectPreviousPeriodSummary,
  selectRecentTransactions,
} from '@/features/transactions/selectors'
import { openTransactionDialog } from '@/features/ui/uiSlice'
import { useExcelConnection } from '@/hooks/useExcelConnection'
import { useFormatters } from '@/hooks/useFormatters'
import { SummaryCard } from '@/components/dashboard/SummaryCard'
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart'
import { ExpenseBreakdownChart } from '@/components/dashboard/ExpenseBreakdownChart'
import { FinancialTrendChart } from '@/components/dashboard/FinancialTrendChart'
import { BudgetProgressList } from '@/components/dashboard/BudgetProgressList'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { FinancialInsights } from '@/components/dashboard/FinancialInsights'
import { SectionCard } from '@/components/common/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { DashboardSkeleton } from '@/components/common/LoadingSkeleton'
import { staggerContainer } from '@/components/common/PageTransition'
import { ConnectWorkbookEmptyState } from '@/components/settings/ConnectWorkbookEmptyState'
import { IssuesPanel } from '@/components/settings/IssuesPanel'
import { formatPercent } from '@/utils/currencyFormatter'
import { monthLabel } from '@/utils/dateFormatter'
import { percentChange } from '@/utils/financeCalculations'

export default function DashboardPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { money, moneyShort, date } = useFormatters()
  const c = useExcelConnection()
  const period = useAppSelector((s) => s.ui.period)
  const summary = useAppSelector(selectPeriodSummary)
  const previous = useAppSelector(selectPreviousPeriodSummary)
  const series = useAppSelector(selectMonthlySeries)
  const breakdown = useAppSelector(selectExpenseBreakdown)
  const budgets = useAppSelector(selectBudgetProgress)
  const recent = useAppSelector(selectRecentTransactions)
  const insights = useAppSelector(selectInsights)
  const totalCount = useAppSelector((s) => s.transactions.items.length)

  if (c.restoring || (c.loading && totalCount === 0)) return <DashboardSkeleton />
  if (!c.isConnected || c.status === 'permission-required') return <ConnectWorkbookEmptyState />

  const periodLabel = period.month == null ? `${period.year}` : `${monthLabel(period.month)} ${period.year}`
  const expenseChange = percentChange(summary.expenses, previous.expenses)
  const incomeChange = percentChange(summary.income, previous.income)
  const changeHint = (v: number | null, invert = false) =>
    v == null ? 'No data for the previous period' : `${v > 0 ? '▲' : v < 0 ? '▼' : '•'} ${Math.abs(v).toFixed(1)}% vs previous ${period.month == null ? 'year' : 'month'}${invert && v > 0 ? '' : ''}`

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }}   spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}>
        <Box>
          <Typography variant="h4" component="h1">
            Your Money Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {periodLabel} · {summary.transactionCount} transaction{summary.transactionCount === 1 ? '' : 's'} · from {c.fileName}
          </Typography>
        </Box>
      </Stack>

      {c.status === 'failed' && c.error && <ErrorState title="Excel sync problem" message={c.error} onRetry={() => void c.refresh()} retryLabel="Refresh from Excel" />}
      <IssuesPanel compact />

      {totalCount === 0 ? (
        <SectionCard>
          <EmptyState
            icon={<ReceiptLongOutlinedIcon />}
            title="Your workbook has no transactions yet"
            description="Add your first income or expense and save it to Excel. The dashboard fills in as your data grows."
            actions={<Button variant="contained" onClick={() => dispatch(openTransactionDialog(null))}>Add first transaction</Button>}
          />
        </SectionCard>
      ) : (
        <>
          <Grid container spacing={2} component={motion.div} variants={staggerContainer} initial="hidden" animate="show">
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <SummaryCard label="Total income" value={summary.income} format={money} icon={<TrendingUpIcon />} tone="income" hint={changeHint(incomeChange)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <SummaryCard label="Total expenses" value={summary.expenses} format={money} icon={<TrendingDownIcon />} tone="expense" hint={changeHint(expenseChange, true)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <SummaryCard label="Net balance (this period)" value={summary.net} format={(n) => money(n, { signed: true })} icon={<AccountBalanceWalletOutlinedIcon />} tone={summary.net >= 0 ? 'primary' : 'expense'} hint="Income minus expenses, not your bank balance" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <SummaryCard
                label="Savings rate"
                value={summary.savingsRate ?? 0}
                format={(n) => formatPercent(n)}
                valueText={summary.savingsRate == null ? '—' : formatPercent(summary.savingsRate)}
                icon={<SavingsOutlinedIcon />}
                tone={summary.savingsRate == null ? 'neutral' : summary.savingsRate >= 20 ? 'income' : summary.savingsRate >= 0 ? 'primary' : 'expense'}
                hint={summary.savingsRate == null ? 'No income recorded in this period' : '(Income − Expenses) ÷ Income'}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <SectionCard title="Income vs expenses" subtitle={`Monthly totals for ${period.year}`}>
                <IncomeExpenseChart data={series} format={money} formatShort={moneyShort} highlightMonth={period.month} />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <SectionCard title="Expense breakdown" subtitle={`By category · ${periodLabel}`}>
                <ExpenseBreakdownChart data={breakdown} format={money} total={summary.expenses} />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 7 }}>
              <SectionCard title="Financial trend" subtitle={`Income, expenses and net balance across ${period.year}`}>
                <FinancialTrendChart data={series} format={money} formatShort={moneyShort} />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <SectionCard
                title="Budget progress"
                subtitle={period.month == null ? 'Monthly limits × 12 for the year' : 'Monthly limits'}
                action={
                  <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/budget')}>
                    Manage
                  </Button>
                }
              >
                {budgets.length ? (
                  <BudgetProgressList items={budgets} format={money} compact />
                ) : (
                  <EmptyState compact icon={<SavingsOutlinedIcon />} title="No budgets configured" description="Set monthly limits in Budget & Goals to see progress here." />
                )}
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 7 }}>
              <SectionCard
                title="Recent transactions"
                subtitle={`Latest in ${periodLabel}`}
                action={
                  <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/transactions')}>
                    View all
                  </Button>
                }
              >
                {recent.length ? (
                  <RecentTransactions items={recent} money={money} date={date} onSelect={(id) => dispatch(openTransactionDialog(id))} />
                ) : (
                  <EmptyState compact icon={<ReceiptLongOutlinedIcon />} title={`No transactions in ${periodLabel}`} description="Pick another month or add a transaction." actions={<Button variant="outlined" onClick={() => dispatch(openTransactionDialog(null))}>Add transaction</Button>} />
                )}
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <SectionCard title="Financial insights" subtitle="Calculated from your workbook">
                <FinancialInsights insights={insights} />
              </SectionCard>
            </Grid>
          </Grid>
        </>
      )}
    </Stack>
  )
}

import { Alert, Box, Grid, Stack, Typography } from '@mui/material'
import { useAppSelector } from '@/app/store'
import { useExcelConnection } from '@/hooks/useExcelConnection'
import { SectionCard } from '@/components/common/SectionCard'
import { BudgetEditor } from '@/components/budget/BudgetEditor'
import { GoalsPanel } from '@/components/budget/GoalsPanel'
import { monthLabel } from '@/utils/dateFormatter'

export default function BudgetGoalsPage() {
  const c = useExcelConnection()
  const period = useAppSelector((s) => s.ui.period)
  const storageUnavailable = useAppSelector((s) => s.settings.storageUnavailable)
  const label = period.month == null ? `${period.year}` : `${monthLabel(period.month)} ${period.year}`

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" component="h1">
          Budget & Goals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monthly spending limits and savings targets. Stored in this browser, not in your workbook.
        </Typography>
      </Box>
      {storageUnavailable && <Alert severity="warning">Browser storage is unavailable, so budgets and goals will not survive a page reload.</Alert>}
      {!c.isConnected && <Alert severity="info">Connect your workbook to see actual spending against these budgets. Limits and goals can be configured now.</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Monthly budgets" subtitle={`Spending in ${label} against your limits · income is never counted as spending`}>
            <BudgetEditor />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Savings goals" subtitle="Track progress towards what you are saving for">
            <GoalsPanel />
          </SectionCard>
        </Grid>
      </Grid>
    </Stack>
  )
}

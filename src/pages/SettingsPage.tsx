import { Box, Stack, Typography } from '@mui/material'
import { SectionCard } from '@/components/common/SectionCard'
import { ExcelConnectionPanel } from '@/components/settings/ExcelConnectionPanel'
import { CategoriesPanel } from '@/components/settings/CategoriesPanel'
import { PreferencesPanel } from '@/components/settings/PreferencesPanel'
import { DataSafetyPanel } from '@/components/settings/DataSafetyPanel'
import { IssuesPanel } from '@/components/settings/IssuesPanel'

export default function SettingsPage() {
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 980 }}>
      <Box>
        <Typography variant="h4" component="h1">
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Excel connection, categories, preferences and data safety.
        </Typography>
      </Box>
      <SectionCard title="Excel connection" subtitle="Your workbook is the only place transactions are stored.">
        <ExcelConnectionPanel />
      </SectionCard>
      <IssuesPanel />
      <SectionCard title="Categories & payment methods" subtitle="Used by forms, filters and budgets.">
        <CategoriesPanel />
      </SectionCard>
      <SectionCard title="Preferences" subtitle="Display options for this browser.">
        <PreferencesPanel />
      </SectionCard>
      <SectionCard title="Data safety" subtitle="Backups, exports and the error log.">
        <DataSafetyPanel />
      </SectionCard>
    </Stack>
  )
}

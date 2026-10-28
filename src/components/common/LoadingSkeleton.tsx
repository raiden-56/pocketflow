import { Box, Card, CardContent, Grid, Skeleton, Stack } from '@mui/material'

export function CardSkeleton({ height = 120 }: { height?: number }) {
  return (
    <Card>
      <CardContent>
        <Skeleton width="40%" height={18} />
        <Skeleton width="70%" height={34} sx={{ mt: 1 }} />
        <Skeleton variant="rounded" height={height - 80} sx={{ mt: 1.5 }} />
      </CardContent>
    </Card>
  )
}

export function DashboardSkeleton() {
  return (
    <Stack spacing={2.5} aria-busy="true" aria-label="Loading workbook">
      <Grid container spacing={2}>
        {[0, 1, 2, 3].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
            <CardSkeleton height={110} />
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <CardSkeleton height={320} />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <CardSkeleton height={320} />
        </Grid>
      </Grid>
      <CardSkeleton height={280} />
    </Stack>
  )
}

export function PageSkeleton() {
  return (
    <Box sx={{ pt: 1 }}>
      <Skeleton width={220} height={36} />
      <Skeleton width={320} height={20} sx={{ mb: 2 }} />
      <DashboardSkeleton />
    </Box>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Stack spacing={1.2} sx={{ p: 2 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={44} />
      ))}
    </Stack>
  )
}

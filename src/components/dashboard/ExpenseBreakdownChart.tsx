import { Box, Stack, Typography, useTheme } from '@mui/material'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryTotal } from '@/types/finance'
import { chartColors } from '@/theme/theme'
import { ChartTooltip } from './ChartTooltip'
import { EmptyState } from '@/components/common/EmptyState'
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutlined'

interface Props {
  data: CategoryTotal[]
  format: (n: number) => string
  total: number
  height?: number
  maxSlices?: number
}

export function ExpenseBreakdownChart({ data, format, total, height = 240, maxSlices = 7 }: Props) {
  const theme = useTheme()
  if (!data.length) {
    return <EmptyState compact icon={<PieChartOutlineIcon />} title="No expenses in this period" description="Expense categories will appear here once there is spending to show." />
  }
  const top = data.slice(0, maxSlices)
  const rest = data.slice(maxSlices)
  const slices = rest.length
    ? [...top, { category: 'Other', amount: rest.reduce((s, c) => s + c.amount, 0), share: rest.reduce((s, c) => s + c.share, 0) }]
    : top

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }}  spacing={2} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: { xs: '100%', sm: '55%' }, position: 'relative' }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={slices} dataKey="amount" nameKey="category" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke={theme.palette.background.paper} strokeWidth={2} isAnimationActive>
              {slices.map((_, i) => (
                <Cell key={i} fill={chartColors.categories[i % chartColors.categories.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip format={format} extra={(e) => (e.payload?.share != null ? `${Number(e.payload.share).toFixed(1)}%` : null)} />} />
          </PieChart>
        </ResponsiveContainer>
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <Box  sx={{ textAlign: 'center' }}>
            <Typography variant="caption">Total</Typography>
            <Typography variant="subtitle1" sx={{ lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
              {format(total)}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Stack component="ul" spacing={0.75} sx={{ listStyle: 'none', m: 0, p: 0, width: { xs: '100%', sm: '45%' } }} aria-label="Expense categories">
        {slices.map((c, i) => (
          <Stack component="li" key={c.category} direction="row"  spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: chartColors.categories[i % chartColors.categories.length], flexShrink: 0 }} />
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={c.category}>
              {c.category}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {c.share.toFixed(0)}%
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  )
}

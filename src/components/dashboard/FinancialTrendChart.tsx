import { useMemo } from 'react'
import { useTheme } from '@mui/material'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlySeriesPoint } from '@/types/finance'
import { chartColors } from '@/theme/theme'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  data: MonthlySeriesPoint[]
  format: (n: number) => string
  formatShort: (n: number) => string
  height?: number
}

export function FinancialTrendChart({ data, format, formatShort, height = 280 }: Props) {
  const theme = useTheme()
  const axis = theme.palette.text.secondary
  // Months without any transactions are drawn as gaps rather than zero.
  const plotted = useMemo(() => data.map((p) => (p.hasData ? p : { ...p, income: null, expenses: null, net: null })), [data])
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={plotted} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={theme.palette.divider} />
        <XAxis dataKey="label" tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatShort} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
        <ReferenceLine y={0} stroke={theme.palette.divider} />
        <Tooltip content={<ChartTooltip format={format} />} />
        <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line type="monotone" dataKey="income" name="Income" stroke={chartColors.income} strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} connectNulls={false} />
        <Line type="monotone" dataKey="expenses" name="Expenses" stroke={chartColors.expense} strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} connectNulls={false} />
        <Line type="monotone" dataKey="net" name="Net balance" stroke={chartColors.net} strokeWidth={2.2} strokeDasharray="5 4" dot={false} activeDot={{ r: 5 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

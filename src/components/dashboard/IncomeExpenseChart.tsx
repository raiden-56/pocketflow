import { useTheme } from '@mui/material'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlySeriesPoint } from '@/types/finance'
import { chartColors } from '@/theme/theme'
import { ChartTooltip } from './ChartTooltip'

interface Props {
  data: MonthlySeriesPoint[]
  format: (n: number) => string
  formatShort: (n: number) => string
  /** When set, other months are dimmed so the selected month stands out. */
  highlightMonth?: number | null
  height?: number
}

export function IncomeExpenseChart({ data, format, formatShort, highlightMonth, height = 280 }: Props) {
  const theme = useTheme()
  const axis = theme.palette.text.secondary
  const opacity = (month: number) => (highlightMonth && month !== highlightMonth ? 0.4 : 1)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={theme.palette.divider} />
        <XAxis dataKey="label" tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatShort} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
        <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: theme.palette.action.hover }} />
        <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="income" name="Income" fill={chartColors.income} radius={[6, 6, 0, 0]} maxBarSize={28}>
          {data.map((p) => (
            <Cell key={p.month} fillOpacity={opacity(p.month)} />
          ))}
        </Bar>
        <Bar dataKey="expenses" name="Expenses" fill={chartColors.expense} radius={[6, 6, 0, 0]} maxBarSize={28}>
          {data.map((p) => (
            <Cell key={p.month} fillOpacity={opacity(p.month)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

import { Box, Stack, Typography } from '@mui/material'

interface TooltipEntry {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  format: (n: number) => string
  /** Optional extra line computed from the payload (e.g. share %). */
  extra?: (entry: TooltipEntry) => string | null
}

export function ChartTooltip({ active, payload, label, format, extra }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <Box
      role="tooltip"
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        px: 1.5,
        py: 1,
        boxShadow: 3,
        minWidth: 160,
      }}
    >
      {label != null && (
        <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.primary' }}>
          {label}
        </Typography>
      )}
      <Stack spacing={0.4}>
        {payload.map((entry, i) => (
          <Stack key={i} direction="row"   spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row"  spacing={0.75} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: entry.color ?? 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {entry.name}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {typeof entry.value === 'number' ? format(entry.value) : entry.value}
              {extra && extra(entry) ? ` · ${extra(entry)}` : ''}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

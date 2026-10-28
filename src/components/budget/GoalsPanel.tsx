import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Card, CardContent, Chip, Dialog, DialogContent, DialogTitle, Grid, IconButton, InputAdornment, LinearProgress, Stack, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { addGoal, removeGoal, updateGoal } from '@/features/settings/settingsSlice'
import { useFormatters } from '@/hooks/useFormatters'
import { goalSchema, type GoalFormOutput, type GoalFormValues } from '@/utils/transactionValidation'
import { CURRENCY_OPTIONS } from '@/utils/currencyFormatter'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { fadeUp } from '@/components/common/PageTransition'
import { palette } from '@/theme/theme'
import type { SavingsGoal } from '@/types/finance'

const MotionCard = motion.create(Card)
const GOAL_IDEAS = ['Emergency Fund', 'New Phone', 'Motorcycle', 'Travel', 'General Savings']

function GoalForm({ initial, onSubmit, onCancel }: { initial?: SavingsGoal; onSubmit: (v: GoalFormOutput) => void; onCancel: () => void }) {
  const { currency } = useFormatters()
  const symbol = CURRENCY_OPTIONS.find((c) => c.value === currency)?.symbol ?? ''
  const { control, handleSubmit, setValue, formState: { errors } } = useForm<GoalFormValues, unknown, GoalFormOutput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: initial?.name ?? '',
      targetAmount: initial?.targetAmount ?? (undefined as unknown as number),
      savedAmount: initial?.savedAmount ?? 0,
      targetDate: initial?.targetDate ?? '',
      notes: initial?.notes ?? '',
    },
  })
  return (
    <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2}>
        {!initial && (
          <Stack direction="row" spacing={0.75}  useFlexGap sx={{ flexWrap: 'wrap' }}>
            {GOAL_IDEAS.map((g) => (
              <Chip key={g} label={g} size="small" onClick={() => setValue('name', g, { shouldValidate: true })} />
            ))}
          </Stack>
        )}
        <Controller name="name" control={control} render={({ field }) => <TextField {...field} label="Goal name" error={!!errors.name} helperText={errors.name?.message} autoFocus required />} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="targetAmount"
              control={control}
              render={({ field }) => (
                <TextField {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} type="number" label="Target amount"   error={!!errors.targetAmount} helperText={errors.targetAmount?.message} required  slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> } }} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="savedAmount"
              control={control}
              render={({ field }) => (
                <TextField {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} type="number" label="Saved so far"   error={!!errors.savedAmount} helperText={errors.savedAmount?.message}  slotProps={{ htmlInput: { min: 0, step: '0.01' }, input: { startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> } }} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="targetDate" control={control} render={({ field }) => <TextField {...field} type="date" label="Target date (optional)"  error={!!errors.targetDate} helperText={errors.targetDate?.message}  slotProps={{ inputLabel: { shrink: true } }} />} />
          </Grid>
          <Grid size={12}>
            <Controller name="notes" control={control} render={({ field }) => <TextField {...field} label="Notes (optional)" multiline minRows={2} />} />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={1.5}  sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained">
            {initial ? 'Update goal' : 'Create goal'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

export function GoalsPanel() {
  const dispatch = useAppDispatch()
  const goals = useAppSelector((s) => s.settings.goals)
  const { money, date } = useFormatters()
  const [dialog, setDialog] = useState<{ open: boolean; goal?: SavingsGoal }>({ open: false })
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null)

  const submit = (v: GoalFormOutput) => {
    if (dialog.goal) dispatch(updateGoal({ id: dialog.goal.id, changes: v }))
    else dispatch(addGoal(v))
    setDialog({ open: false })
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row"   sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Goals are stored in this browser only and never change your workbook.
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true })} sx={{ flexShrink: 0 }}>
          New goal
        </Button>
      </Stack>
      {goals.length === 0 ? (
        <EmptyState compact icon={<FlagOutlinedIcon />} title="No savings goals yet" description="Create a goal like an emergency fund or a trip and track how close you are." />
      ) : (
        <Grid container spacing={2}>
          {goals.map((g, i) => {
            const percent = g.targetAmount ? Math.min(100, (g.savedAmount / g.targetAmount) * 100) : 0
            const remaining = Math.max(0, g.targetAmount - g.savedAmount)
            const done = remaining === 0
            const days = g.targetDate ? differenceInCalendarDays(parseISO(g.targetDate), new Date()) : null
            const featured = i === 0
            return (
              <Grid key={g.id} size={{ xs: 12, md: 6 }}>
                <MotionCard
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  sx={featured ? { background: `linear-gradient(135deg, ${palette.navy} 0%, ${palette.royal} 100%)`, color: '#fff', border: 0 } : undefined}
                >
                  <CardContent>
                    <Stack direction="row"   spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" noWrap sx={{ color: 'inherit' }}>
                          {g.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: featured ? 'rgba(255,255,255,0.8)' : 'text.secondary' }}>
                          {g.targetDate ? `Target ${date(g.targetDate)}${days != null ? (days >= 0 ? ` · ${days} days left` : ` · ${Math.abs(days)} days overdue`) : ''}` : 'No target date'}
                        </Typography>
                      </Box>
                      <Stack direction="row" sx={{ mr: -1, color: 'inherit' }}>
                        <IconButton size="small" color="inherit" aria-label={`Edit ${g.name}`} onClick={() => setDialog({ open: true, goal: g })}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="inherit" aria-label={`Delete ${g.name}`} onClick={() => setDeleting(g)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                    <Typography variant="h5" sx={{ mt: 1.5, color: 'inherit', fontVariantNumeric: 'tabular-nums' }}>
                      {money(g.savedAmount)}{' '}
                      <Typography component="span" variant="body2" sx={{ color: featured ? 'rgba(255,255,255,0.8)' : 'text.secondary' }}>
                        of {money(g.targetAmount)}
                      </Typography>
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      aria-label={`${g.name} ${percent.toFixed(0)} percent`}
                      sx={{ mt: 1.5, ...(featured ? { bgcolor: 'rgba(255,255,255,0.25)', '& .MuiLinearProgress-bar': { bgcolor: '#fff' } } : {}) }}
                      color={done ? 'success' : 'primary'}
                    />
                    <Stack direction="row"  sx={{ justifyContent: 'space-between', mt: 0.75 }}>
                      <Typography variant="caption" sx={{ color: featured ? 'rgba(255,255,255,0.85)' : 'text.secondary' }}>
                        {done ? 'Goal reached 🎉' : `${money(remaining)} to go`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: featured ? 'rgba(255,255,255,0.85)' : 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                        {percent.toFixed(0)}%
                      </Typography>
                    </Stack>
                    {g.notes && (
                      <Typography variant="body2" sx={{ mt: 1, color: featured ? 'rgba(255,255,255,0.85)' : 'text.secondary' }}>
                        {g.notes}
                      </Typography>
                    )}
                  </CardContent>
                </MotionCard>
              </Grid>
            )
          })}
        </Grid>
      )}

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false })} maxWidth="sm" fullWidth aria-labelledby="goal-dialog-title">
        <DialogTitle id="goal-dialog-title">{dialog.goal ? 'Edit savings goal' : 'New savings goal'}</DialogTitle>
        <DialogContent>{dialog.open && <GoalForm initial={dialog.goal} onSubmit={submit} onCancel={() => setDialog({ open: false })} />}</DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleting != null}
        title="Delete this goal?"
        destructive
        confirmLabel="Delete"
        message={deleting ? `"${deleting.name}" will be removed from this browser. Your workbook is not affected.` : ''}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) dispatch(removeGoal(deleting.id))
          setDeleting(null)
        }}
      />
    </Stack>
  )
}

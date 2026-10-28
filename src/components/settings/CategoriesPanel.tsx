import { useState } from 'react'
import { Alert, Box, Button, Chip, IconButton, List, ListItem, MenuItem, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { addCategory, addPaymentMethod, removeCategory, removePaymentMethod, renameCategory, setCategoryType, toggleCategory } from '@/features/settings/settingsSlice'
import type { TransactionType } from '@/types/finance'

export function CategoriesPanel() {
  const dispatch = useAppDispatch()
  const categories = useAppSelector((s) => s.settings.categories)
  const paymentMethods = useAppSelector((s) => s.settings.paymentMethods)
  const transactions = useAppSelector((s) => s.transactions.items)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<TransactionType>('Expense')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newMethod, setNewMethod] = useState('')

  const usage = new Map<string, number>()
  for (const tx of transactions) usage.set(tx.category, (usage.get(tx.category) ?? 0) + 1)

  const submitNew = () => {
    if (!newName.trim()) return
    dispatch(addCategory({ name: newName, type: newType }))
    setNewName('')
  }

  const groups: TransactionType[] = ['Income', 'Expense']

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">
        Categories only affect the dropdowns and budgets in this app. Renaming or disabling a category never rewrites transactions already in your workbook; existing records keep the name stored in Excel.
      </Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField label="New category" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitNew()} />
        <TextField select label="Type" value={newType} onChange={(e) => setNewType(e.target.value as TransactionType)} sx={{ minWidth: 140 }}>
          <MenuItem value="Expense">Expense</MenuItem>
          <MenuItem value="Income">Income</MenuItem>
        </TextField>
        <Button variant="contained" startIcon={<AddIcon />} onClick={submitNew} disabled={!newName.trim()} sx={{ flexShrink: 0 }}>
          Add
        </Button>
      </Stack>
      {groups.map((type) => (
        <Box key={type}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            {type} categories
          </Typography>
          <List dense disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <ListItem key={c.id} divider sx={{ gap: 1, flexWrap: 'wrap' }}>
                  {editingId === c.id ? (
                    <>
                      <TextField value={editName} onChange={(e) => setEditName(e.target.value)} size="small" sx={{ flex: 1, minWidth: 160 }} autoFocus onKeyDown={(e) => {
                        if (e.key === 'Enter') { dispatch(renameCategory({ id: c.id, name: editName })); setEditingId(null) }
                        if (e.key === 'Escape') setEditingId(null)
                      }} />
                      <IconButton size="small" color="primary" aria-label="Save name" onClick={() => { dispatch(renameCategory({ id: c.id, name: editName })); setEditingId(null) }}>
                        <CheckIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="Cancel" onClick={() => setEditingId(null)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500, opacity: c.enabled ? 1 : 0.5, minWidth: 120 }}>
                        {c.name}
                      </Typography>
                      {usage.get(c.name) ? <Chip size="small" variant="outlined" label={`${usage.get(c.name)} used`} /> : null}
                      <TextField select size="small" value={c.type} onChange={(e) => dispatch(setCategoryType({ id: c.id, type: e.target.value as TransactionType }))} sx={{ width: 120 }}  slotProps={{ htmlInput: { 'aria-label': `${c.name} type` } }}>
                        <MenuItem value="Expense">Expense</MenuItem>
                        <MenuItem value="Income">Income</MenuItem>
                      </TextField>
                      <Tooltip title={c.enabled ? 'Enabled' : 'Disabled (hidden from forms)'}>
                        <Switch size="small" checked={c.enabled} onChange={(e) => dispatch(toggleCategory({ id: c.id, enabled: e.target.checked }))}   slotProps={{ input: { 'aria-label': `Enable ${c.name}` } }} />
                      </Tooltip>
                      <IconButton size="small" aria-label={`Rename ${c.name}`} onClick={() => { setEditingId(c.id); setEditName(c.name) }}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <Tooltip title={usage.get(c.name) ? 'In use by transactions; disable instead of deleting' : 'Remove'}>
                        <span>
                          <IconButton size="small" color="error" aria-label={`Remove ${c.name}`} disabled={!!usage.get(c.name)} onClick={() => dispatch(removeCategory(c.id))}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )}
                </ListItem>
              ))}
          </List>
        </Box>
      ))}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Payment methods
        </Typography>
        <Stack direction="row" spacing={1}  useFlexGap sx={{ flexWrap: 'wrap', mb: 1.5 }}>
          {paymentMethods.map((m) => (
            <Chip key={m} label={m} onDelete={paymentMethods.length > 1 ? () => dispatch(removePaymentMethod(m)) : undefined} />
          ))}
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <TextField label="New payment method" value={newMethod} onChange={(e) => setNewMethod(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { dispatch(addPaymentMethod(newMethod)); setNewMethod('') } }} />
          <Button variant="outlined" onClick={() => { dispatch(addPaymentMethod(newMethod)); setNewMethod('') }} disabled={!newMethod.trim()} sx={{ flexShrink: 0 }}>
            Add
          </Button>
        </Stack>
      </Box>
    </Stack>
  )
}

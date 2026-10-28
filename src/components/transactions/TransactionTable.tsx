import { Box, Chip, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Tooltip, Typography } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import type { Transaction } from '@/types/finance'

export type SortKey = 'date' | 'amount'
export type SortDir = 'asc' | 'desc'

interface Props {
  items: Transaction[]
  money: (n: number) => string
  date: (iso: string) => string
  sortBy: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  /** Fixed height; rows then scroll inside the table under a sticky header. */
  height?: number
}

export function TransactionTable({ items, money, date, sortBy, sortDir, onSort, onEdit, onDelete, height }: Props) {
  return (
    <TableContainer sx={{ overflow: 'auto', height }}>
      <Table size="medium" stickyHeader aria-label="Transactions" sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            <TableCell sortDirection={sortBy === 'date' ? sortDir : false}>
              <TableSortLabel active={sortBy === 'date'} direction={sortBy === 'date' ? sortDir : 'desc'} onClick={() => onSort('date')}>
                Date
              </TableSortLabel>
            </TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Payment</TableCell>
            <TableCell align="right" sortDirection={sortBy === 'amount' ? sortDir : false}>
              <TableSortLabel active={sortBy === 'amount'} direction={sortBy === 'amount' ? sortDir : 'desc'} onClick={() => onSort('amount')}>
                Amount
              </TableSortLabel>
            </TableCell>
            <TableCell align="right" sx={{ width: 96 }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((tx) => {
            const income = tx.type === 'Income'
            return (
              <TableRow key={tx.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{date(tx.date)}</TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={tx.description}>
                    {tx.description}
                  </Typography>
                  {tx.notes && (
                    <Typography variant="caption" noWrap component="p" title={tx.notes} sx={{ maxWidth: 300 }}>
                      {tx.notes}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip size="small" label={tx.category} variant="outlined" />
                </TableCell>
                <TableCell>
                  <Box
                    component="span"
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 1.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      bgcolor: income ? 'income.light' : 'expense.light',
                      color: income ? 'income.dark' : 'expense.dark',
                    }}
                  >
                    {tx.type}
                  </Box>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{tx.paymentMethod}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: income ? 'income.main' : 'text.primary' }}>
                  {income ? '+' : '−'}
                  {money(tx.amount)}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(tx.id)} aria-label={`Edit ${tx.description}`}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => onDelete(tx.id)} aria-label={`Delete ${tx.description}`}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

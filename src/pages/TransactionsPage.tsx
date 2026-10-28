import { useMemo, useState } from 'react'
import { Badge, Box, Button, Collapse, IconButton, Pagination, Stack, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { deleteTransaction } from '@/features/transactions/transactionSlice'
import { selectAllCategoryNames, selectAllPaymentMethods, selectYears } from '@/features/transactions/selectors'
import { openTransactionDialog, showToast } from '@/features/ui/uiSlice'
import { useExcelConnection } from '@/hooks/useExcelConnection'
import { useFormatters } from '@/hooks/useFormatters'
import { useFillHeight } from '@/hooks/useFillHeight'
import { SectionCard } from '@/components/common/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import { staggerContainer } from '@/components/common/PageTransition'
import { ConnectWorkbookEmptyState } from '@/components/settings/ConnectWorkbookEmptyState'
import { TransactionFilters, DEFAULT_FILTERS, activeFilterCount, type TransactionFilterState } from '@/components/transactions/TransactionFilters'
import { TransactionTable, type SortKey } from '@/components/transactions/TransactionTable'
import { TransactionCard } from '@/components/transactions/TransactionCard'
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog'
import { monthOfIso, yearOfIso } from '@/utils/dateFormatter'
import { summarize } from '@/utils/financeCalculations'
import { canSaveBack } from '@/types/workbook'

const PAGE_SIZE = 10
/** Space kept below the list: the pagination bar plus the page's bottom padding (larger above the phone navigation). */
const PAGINATION_HEIGHT = 56

export default function TransactionsPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [listRef, listHeight] = useFillHeight(PAGINATION_HEIGHT + (isMobile ? 88 : 32))
  const dispatch = useAppDispatch()
  const c = useExcelConnection()
  const { money, date } = useFormatters()
  const items = useAppSelector((s) => s.transactions.items)
  const categories = useAppSelector(selectAllCategoryNames)
  const paymentMethods = useAppSelector(selectAllPaymentMethods)
  const years = useAppSelector(selectYears)
  const period = useAppSelector((s) => s.ui.period)
  const [filters, setFilters] = useState<TransactionFilterState>({ ...DEFAULT_FILTERS, year: period.year, month: period.month ?? 0 })
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterCount = activeFilterCount(filters)

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    const list = items.filter((t) => {
      if (q && !t.description.toLowerCase().includes(q) && !t.notes.toLowerCase().includes(q)) return false
      if (filters.category && t.category !== filters.category) return false
      if (filters.type !== 'all' && t.type !== filters.type) return false
      if (filters.paymentMethod && t.paymentMethod !== filters.paymentMethod) return false
      if (filters.year && yearOfIso(t.date) !== filters.year) return false
      if (filters.month && monthOfIso(t.date) !== filters.month) return false
      return true
    })
    const dir = filters.sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      if (filters.sortBy === 'amount') return (a.amount - b.amount) * dir || (a.date < b.date ? -1 : 1)
      return (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.sourceRow ?? 0) - (b.sourceRow ?? 0)) * dir
    })
    return list
  }, [items, filters])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const totals = useMemo(() => summarize(filtered), [filtered])
  const deleting = deletingId ? items.find((t) => t.id === deletingId) ?? null : null

  const updateFilters = (next: TransactionFilterState) => {
    setFilters(next)
    setPage(1)
  }
  const onSort = (key: SortKey) => updateFilters({ ...filters, sortBy: key, sortDir: filters.sortBy === key && filters.sortDir === 'desc' ? 'asc' : 'desc' })

  if (c.restoring || (c.loading && items.length === 0)) return <TableSkeleton rows={8} />
  if (!c.isConnected || c.status === 'permission-required') return <ConnectWorkbookEmptyState />

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }}   spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}>
        <Box>
          <Typography variant="h4" component="h1">
            Transactions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} of {items.length} shown · income {money(totals.income)} · expenses {money(totals.expenses)} · net {money(totals.net, { signed: true })}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Tooltip title={filtersOpen ? 'Hide filters' : 'Show filters'}>
            <IconButton
              onClick={() => setFiltersOpen((open) => !open)}
              color={filtersOpen ? 'primary' : 'default'}
              aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
              aria-expanded={filtersOpen}
              aria-controls="transaction-filters"
              sx={{ border: 1, borderColor: filtersOpen ? 'primary.main' : 'divider', borderRadius: 2 }}
            >
              <Badge badgeContent={filterCount} color="primary">
                <FilterListIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => dispatch(openTransactionDialog(null))} sx={{ flexGrow: { xs: 1, sm: 0 } }}>
            Add transaction
          </Button>
        </Stack>
      </Stack>

      <Collapse in={filtersOpen} id="transaction-filters" sx={{ mt: '0 !important' }}>
        <Box sx={{ pt: 2.5 }}>
          <SectionCard animate={false}>
            <TransactionFilters value={filters} onChange={updateFilters} categories={categories} paymentMethods={paymentMethods} years={years} />
          </SectionCard>
        </Box>
      </Collapse>

      {filtered.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={<ReceiptLongOutlinedIcon />}
            title={items.length === 0 ? 'No transactions in your workbook yet' : 'No transactions match these filters'}
            description={items.length === 0 ? 'Add your first transaction to get started.' : 'Try a different month, year or category, or reset the filters.'}
            actions={
              items.length === 0 ? (
                <Button variant="contained" onClick={() => dispatch(openTransactionDialog(null))}>Add transaction</Button>
              ) : (
                <Button variant="outlined" onClick={() => updateFilters(DEFAULT_FILTERS)}>Reset filters</Button>
              )
            }
          />
        </SectionCard>
      ) : (
        // The list scrolls inside its own box so the pagination bar always sits at the bottom of the screen.
        <Box>
          {isMobile ? (
            <Box ref={listRef} key={safePage} sx={{ height: listHeight, overflowY: 'auto', overscrollBehavior: 'contain', mx: -0.5, px: 0.5 }}>
              <Stack component={motion.div} variants={staggerContainer} initial="hidden" animate="show" spacing={1.5} sx={{ pb: 0.5 }}>
                {visible.map((tx) => (
                  <TransactionCard key={tx.id} tx={tx} money={money} date={date} onEdit={(id) => dispatch(openTransactionDialog(id))} onDelete={setDeletingId} />
                ))}
              </Stack>
            </Box>
          ) : (
            <SectionCard disablePadding animate={false}>
              <Box ref={listRef}>
                <TransactionTable key={safePage} height={listHeight} items={visible} money={money} date={date} sortBy={filters.sortBy} sortDir={filters.sortDir} onSort={onSort} onEdit={(id) => dispatch(openTransactionDialog(id))} onDelete={setDeletingId} />
              </Box>
            </SectionCard>
          )}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', height: PAGINATION_HEIGHT, pt: 1.5 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </Typography>
            <Pagination
              count={pageCount}
              page={safePage}
              onChange={(_, p) => setPage(p)}
              color="primary"
              shape="rounded"
              size={isMobile ? 'small' : 'medium'}
              siblingCount={isMobile ? 0 : 1}
            />
          </Stack>
        </Box>
      )}

      <DeleteTransactionDialog
        transaction={deleting}
        money={money}
        date={date}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) {
            dispatch(deleteTransaction(deletingId))
            dispatch(showToast(canSaveBack(c.mode) ? 'Transaction removed. Click Save to update your sheet.' : 'Transaction removed in memory. Export to keep the change.', 'success'))
          }
          setDeletingId(null)
        }}
      />
    </Stack>
  )
}

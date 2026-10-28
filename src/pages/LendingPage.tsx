import { useMemo, useState } from 'react'
import {
  Box,
  Chip,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined'
import CallReceivedIcon from '@mui/icons-material/CallReceived'
import HourglassBottomOutlinedIcon from '@mui/icons-material/HourglassBottomOutlined'
import RedeemOutlinedIcon from '@mui/icons-material/RedeemOutlined'
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined'
import { useAppSelector } from '@/app/store'
import { useExcelConnection } from '@/hooks/useExcelConnection'
import { useFormatters } from '@/hooks/useFormatters'
import { SectionCard } from '@/components/common/SectionCard'
import { EmptyState } from '@/components/common/EmptyState'
import { PageSkeleton } from '@/components/common/LoadingSkeleton'
import { SummaryCard } from '@/components/dashboard/SummaryCard'
import { ConnectWorkbookEmptyState } from '@/components/settings/ConnectWorkbookEmptyState'
import { balancesByPerson, cardUsage, lendingTotals } from '@/utils/lendingCalculations'
import type { LendingEntry } from '@/types/finance'

const LENDING_COLUMNS = 'Date, Person, Given via, Card / account, Purpose, Amount (INR), Cashback (INR), Paid back (INR), Remaining (INR), Notes'

function StatusChip({ remaining, money }: { remaining: number; money: (n: number) => string }) {
  if (remaining <= 0) return <Chip size="small" color="success" label="Settled" />
  return <Chip size="small" color="warning" label={`Owes ${money(remaining)}`} />
}

/** Money people borrowed from you or spent on your card, read from the workbook's "Lending" sheet. */
export default function LendingPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const c = useExcelConnection()
  const { money, date } = useFormatters()
  const entries = useAppSelector((s) => s.transactions.lending)
  const [person, setPerson] = useState('')

  const totals = useMemo(() => lendingTotals(entries), [entries])
  const people = useMemo(() => balancesByPerson(entries), [entries])
  const cards = useMemo(() => cardUsage(entries), [entries])
  const shown = useMemo(
    () => entries.filter((e) => !person || e.person.trim().toLowerCase() === person).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.sourceRow - a.sourceRow)),
    [entries, person],
  )

  if (c.restoring || (c.loading && entries.length === 0)) return <PageSkeleton />
  if (!c.isConnected || c.status === 'permission-required') return <ConnectWorkbookEmptyState />

  const header = (
    <Box>
      <Typography variant="h4" component="h1">
        Lending
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Money people borrowed from you or spent on your card. Update it in the <strong>Lending</strong> tab of your sheet; this page follows it.
      </Typography>
    </Box>
  )

  if (entries.length === 0) {
    return (
      <Stack spacing={2.5}>
        {header}
        <SectionCard>
          <EmptyState
            icon={<HandshakeOutlinedIcon />}
            title="Nothing in your Lending tab yet"
            description={
              <>
                Add a row to the <strong>Lending</strong> tab of your sheet each time someone borrows money or uses your card. Columns: {LENDING_COLUMNS}. It shows up here within a minute.
              </>
            }
          />
        </SectionCard>
      </Stack>
    )
  }

  const entryMeta = (e: LendingEntry) => [e.via, e.card].filter(Boolean).join(' · ')

  return (
    <Stack spacing={2.5}>
      {header}

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, lg: 3 }}>
          <SummaryCard label="Given" value={totals.taken} format={money} icon={<HandshakeOutlinedIcon />} tone="primary" hint={`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <SummaryCard label="Paid back" value={totals.paidBack} format={money} icon={<CallReceivedIcon />} tone="income" />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <SummaryCard label="Still to get back" value={totals.remaining} format={money} icon={<HourglassBottomOutlinedIcon />} tone={totals.remaining > 0 ? 'expense' : 'income'} hint={`${people.filter((p) => p.remaining > 0).length} people owe you`} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <SummaryCard label="Cashback earned" value={totals.cashback} format={money} icon={<RedeemOutlinedIcon />} tone="neutral" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: cards.length ? 7 : 12 }}>
          <SectionCard title="Who owes you" subtitle="Per person, largest balance first" disablePadding={!isMobile}>
            {isMobile ? (
              <Stack spacing={1}>
                {people.map((p) => (
                  <Stack key={p.person} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>{p.person}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Took {money(p.taken)} · paid {money(p.paidBack)}
                      </Typography>
                    </Box>
                    <StatusChip remaining={p.remaining} money={money} />
                  </Stack>
                ))}
              </Stack>
            ) : (
              <TableContainer>
                <Table size="small" aria-label="Balances by person">
                  <TableHead>
                    <TableRow>
                      <TableCell>Person</TableCell>
                      <TableCell align="right">Times</TableCell>
                      <TableCell align="right">Took</TableCell>
                      <TableCell align="right">Paid back</TableCell>
                      <TableCell align="right">Remaining</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {people.map((p) => (
                      <TableRow key={p.person} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{p.person}</TableCell>
                        <TableCell align="right">{p.entries}</TableCell>
                        <TableCell align="right">{money(p.taken)}</TableCell>
                        <TableCell align="right">{money(p.paidBack)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: p.remaining > 0 ? 'expense.main' : 'income.main' }}>{money(p.remaining)}</TableCell>
                        <TableCell align="right"><StatusChip remaining={p.remaining} money={money} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </Grid>
        {cards.length > 0 && (
          <Grid size={{ xs: 12, lg: 5 }}>
            <SectionCard title="Your cards used by others" subtitle="Spends on your cards and the cashback they earned">
              <Stack spacing={1}>
                {cards.map((card) => (
                  <Stack key={card.card} direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                    <CreditCardOutlinedIcon color="primary" />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>{card.card}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {card.entries} spend{card.entries === 1 ? '' : 's'} · {money(card.taken)} · cashback {money(card.cashback)}
                      </Typography>
                    </Box>
                    <StatusChip remaining={card.remaining} money={money} />
                  </Stack>
                ))}
              </Stack>
            </SectionCard>
          </Grid>
        )}
      </Grid>

      <SectionCard
        title="All entries"
        subtitle={`${shown.length} of ${entries.length}`}
        disablePadding={!isMobile}
        action={
          <TextField select size="small" label="Person" value={person} onChange={(e) => setPerson(e.target.value)} sx={{ minWidth: 160, mr: isMobile ? 0 : 2.5 }}>
            <MenuItem value="">Everyone</MenuItem>
            {people.map((p) => (
              <MenuItem key={p.person} value={p.person.toLowerCase()}>
                {p.person}
              </MenuItem>
            ))}
          </TextField>
        }
      >
        {isMobile ? (
          <Stack spacing={1}>
            {shown.map((e) => (
              <Box key={e.id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="subtitle2" noWrap>{e.person}</Typography>
                  <Typography variant="subtitle2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{money(e.amount)}</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" component="div">
                  {[e.date ? date(e.date) : '', e.purpose, entryMeta(e)].filter(Boolean).join(' · ')}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
                  <Chip size="small" variant="outlined" label={`Paid ${money(e.paidBack)}`} />
                  {e.cashback > 0 && <Chip size="small" variant="outlined" label={`Cashback ${money(e.cashback)}`} />}
                  <StatusChip remaining={e.remaining} money={money} />
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="Lending entries" sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Person</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell>Given via</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Cashback</TableCell>
                  <TableCell align="right">Paid back</TableCell>
                  <TableCell align="right">Remaining</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{e.date ? date(e.date) : '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{e.person}</TableCell>
                    <TableCell>
                      {e.purpose || '—'}
                      {e.notes && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          {e.notes}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{entryMeta(e) || '—'}</TableCell>
                    <TableCell align="right">{money(e.amount)}</TableCell>
                    <TableCell align="right">{e.cashback ? money(e.cashback) : '—'}</TableCell>
                    <TableCell align="right">{money(e.paidBack)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: e.remaining > 0 ? 'expense.main' : 'income.main' }}>{money(e.remaining)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>
    </Stack>
  )
}

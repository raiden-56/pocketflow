import type {
  BudgetLimit,
  BudgetProgress,
  CategoryTotal,
  Insight,
  MonthlySeriesPoint,
  PeriodSummary,
  ReportingPeriod,
  Transaction,
} from '@/types/finance'
import { monthLabel, monthOfIso, yearOfIso } from './dateFormatter'
import { roundMoney } from './currencyFormatter'

export function isInPeriod(tx: Transaction, period: ReportingPeriod): boolean {
  if (yearOfIso(tx.date) !== period.year) return false
  return period.month == null || monthOfIso(tx.date) === period.month
}

export function filterByPeriod(transactions: Transaction[], period: ReportingPeriod): Transaction[] {
  return transactions.filter((tx) => isInPeriod(tx, period))
}

export function sumByType(transactions: Transaction[]): { income: number; expenses: number } {
  let income = 0
  let expenses = 0
  for (const tx of transactions) {
    if (tx.type === 'Income') income += tx.amount
    else expenses += tx.amount
  }
  return { income: roundMoney(income), expenses: roundMoney(expenses) }
}

/** Savings Rate = ((Income − Expenses) / Income) × 100. Null when income is zero. */
export function savingsRate(income: number, expenses: number): number | null {
  if (!income || income <= 0) return null
  return roundMoney(((income - expenses) / income) * 100)
}

export function summarize(transactions: Transaction[]): PeriodSummary {
  const { income, expenses } = sumByType(transactions)
  return {
    income,
    expenses,
    net: roundMoney(income - expenses),
    savingsRate: savingsRate(income, expenses),
    transactionCount: transactions.length,
  }
}

export function summarizePeriod(transactions: Transaction[], period: ReportingPeriod): PeriodSummary {
  return summarize(filterByPeriod(transactions, period))
}

export function expensesByCategory(transactions: Transaction[]): CategoryTotal[] {
  const totals = new Map<string, number>()
  let total = 0
  for (const tx of transactions) {
    if (tx.type !== 'Expense') continue
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount)
    total += tx.amount
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount: roundMoney(amount), share: total ? roundMoney((amount / total) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

export function incomeByCategory(transactions: Transaction[]): CategoryTotal[] {
  const totals = new Map<string, number>()
  let total = 0
  for (const tx of transactions) {
    if (tx.type !== 'Income') continue
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount)
    total += tx.amount
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount: roundMoney(amount), share: total ? roundMoney((amount / total) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

/** Income / expenses / net for each of the 12 months of a year. */
export function monthlySeries(transactions: Transaction[], year: number): MonthlySeriesPoint[] {
  const points: MonthlySeriesPoint[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: monthLabel(i + 1, true),
    income: 0,
    expenses: 0,
    net: 0,
    hasData: false,
  }))
  for (const tx of transactions) {
    if (yearOfIso(tx.date) !== year) continue
    const p = points[monthOfIso(tx.date) - 1]
    if (!p) continue
    p.hasData = true
    if (tx.type === 'Income') p.income += tx.amount
    else p.expenses += tx.amount
  }
  for (const p of points) {
    p.income = roundMoney(p.income)
    p.expenses = roundMoney(p.expenses)
    p.net = roundMoney(p.income - p.expenses)
  }
  return points
}

/** Months (1-12) that have at least one transaction in the year. */
export function activeMonths(transactions: Transaction[], year: number): number[] {
  const set = new Set<number>()
  for (const tx of transactions) if (yearOfIso(tx.date) === year) set.add(monthOfIso(tx.date))
  return [...set].sort((a, b) => a - b)
}

export function availableYears(transactions: Transaction[], fallbackYear: number): number[] {
  const set = new Set<number>([fallbackYear])
  for (const tx of transactions) set.add(yearOfIso(tx.date))
  return [...set].sort((a, b) => b - a)
}

export function previousPeriod(period: ReportingPeriod): ReportingPeriod {
  if (period.month == null) return { year: period.year - 1, month: null }
  return period.month === 1 ? { year: period.year - 1, month: 12 } : { year: period.year, month: period.month - 1 }
}

export function budgetProgress(transactions: Transaction[], period: ReportingPeriod, limits: BudgetLimit[]): BudgetProgress[] {
  const periodTx = filterByPeriod(transactions, period)
  const months = period.month == null ? 12 : 1
  const spentBy = new Map<string, number>()
  for (const tx of periodTx) {
    if (tx.type !== 'Expense') continue
    spentBy.set(tx.category, (spentBy.get(tx.category) ?? 0) + tx.amount)
  }
  return limits
    .filter((b) => b.limit > 0)
    .map((b) => {
      const limit = roundMoney(b.limit * months)
      const spent = roundMoney(spentBy.get(b.category) ?? 0)
      const percent = limit ? roundMoney((spent / limit) * 100) : 0
      const status: BudgetProgress['status'] = percent >= 100 ? 'exceeded' : percent >= 80 ? 'warning' : 'ok'
      return { category: b.category, limit, spent, remaining: roundMoney(limit - spent), percent, status }
    })
    .sort((a, b) => b.percent - a.percent)
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return roundMoney(((current - previous) / previous) * 100)
}

/**
 * Generates plain-language insights from the data. Facts are computed values;
 * suggestions are clearly labelled as such. Returns an empty list when data is insufficient.
 */
export function generateInsights(
  transactions: Transaction[],
  period: ReportingPeriod,
  limits: BudgetLimit[],
  format: (n: number) => string,
): Insight[] {
  const current = filterByPeriod(transactions, period)
  if (current.length < 3) return []
  const insights: Insight[] = []
  const summary = summarize(current)
  const prevPeriod = previousPeriod(period)
  const previous = filterByPeriod(transactions, prevPeriod)
  const prevSummary = summarize(previous)
  const label = period.month == null ? `${period.year}` : monthLabel(period.month)
  const prevLabel = prevPeriod.month == null ? `${prevPeriod.year}` : monthLabel(prevPeriod.month)

  const categories = expensesByCategory(current)
  if (categories.length) {
    const top = categories[0]
    insights.push({
      id: 'top-category',
      kind: 'fact',
      tone: 'neutral',
      text: `${top.category} is your highest spending category in ${label}: ${format(top.amount)} (${top.share.toFixed(0)}% of expenses).`,
    })
  }

  if (previous.length >= 3 && prevSummary.expenses > 0) {
    const change = percentChange(summary.expenses, prevSummary.expenses)
    if (change != null) {
      const up = change > 0
      insights.push({
        id: 'spend-vs-previous',
        kind: 'fact',
        tone: up ? (change > 15 ? 'negative' : 'neutral') : 'positive',
        text: `Spending in ${label} is ${Math.abs(change).toFixed(1)}% ${up ? 'higher' : 'lower'} than ${prevLabel} (${format(summary.expenses)} vs ${format(prevSummary.expenses)}).`,
      })
    }
    const prevCats = new Map(expensesByCategory(previous).map((c) => [c.category, c.amount]))
    const increased = categories
      .filter((c) => c.amount > (prevCats.get(c.category) ?? 0) * 1.2 && c.amount - (prevCats.get(c.category) ?? 0) > 500)
      .slice(0, 3)
    if (increased.length) {
      insights.push({
        id: 'categories-up',
        kind: 'fact',
        tone: 'negative',
        text: `Spending increased in ${increased.map((c) => `${c.category} (+${format(c.amount - (prevCats.get(c.category) ?? 0))})`).join(', ')} compared with ${prevLabel}.`,
      })
    }
  }

  if (summary.savingsRate != null) {
    const rate = summary.savingsRate
    insights.push({
      id: 'savings-rate',
      kind: 'fact',
      tone: rate >= 20 ? 'positive' : rate >= 0 ? 'neutral' : 'negative',
      text: rate < 0
        ? `You spent ${format(summary.expenses - summary.income)} more than you earned in ${label} (savings rate ${rate.toFixed(1)}%).`
        : `Your savings rate for ${label} is ${rate.toFixed(1)}%: you kept ${format(summary.net)} of ${format(summary.income)} earned.`,
    })
    if (rate >= 0 && rate < 20 && summary.income > 0) {
      insights.push({
        id: 'savings-suggestion',
        kind: 'suggestion',
        tone: 'neutral',
        text: `A common target is saving 20% of income. Reaching it in ${label} would mean spending about ${format(Math.max(0, summary.expenses - summary.income * 0.8))} less.`,
      })
    }
  } else if (summary.expenses > 0) {
    insights.push({ id: 'no-income', kind: 'fact', tone: 'neutral', text: `No income was recorded in ${label}, so a savings rate cannot be calculated.` })
  }

  const budgets = budgetProgress(transactions, period, limits)
  const exceeded = budgets.filter((b) => b.status === 'exceeded')
  const warning = budgets.filter((b) => b.status === 'warning')
  if (exceeded.length) {
    insights.push({
      id: 'budget-exceeded',
      kind: 'fact',
      tone: 'negative',
      text: `Over budget: ${exceeded.map((b) => `${b.category} by ${format(b.spent - b.limit)}`).join(', ')}.`,
    })
  } else if (warning.length) {
    insights.push({
      id: 'budget-warning',
      kind: 'fact',
      tone: 'neutral',
      text: `Close to the limit: ${warning.map((b) => `${b.category} (${b.percent.toFixed(0)}% used)`).join(', ')}.`,
    })
  }

  return insights
}

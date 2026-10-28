import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import {
  activeMonths,
  availableYears,
  budgetProgress,
  expensesByCategory,
  filterByPeriod,
  generateInsights,
  monthlySeries,
  previousPeriod,
  summarize,
} from '@/utils/financeCalculations'
import { formatMoney } from '@/utils/currencyFormatter'

export const selectTransactions = (s: RootState) => s.transactions.items
export const selectPeriod = (s: RootState) => s.ui.period
export const selectBudgets = (s: RootState) => s.settings.budgets
export const selectPreferences = (s: RootState) => s.settings.preferences
export const selectCategories = (s: RootState) => s.settings.categories

export const selectPeriodTransactions = createSelector([selectTransactions, selectPeriod], (items, period) =>
  filterByPeriod(items, period).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
)

export const selectPeriodSummary = createSelector([selectPeriodTransactions], (items) => summarize(items))

export const selectPreviousPeriodSummary = createSelector([selectTransactions, selectPeriod], (items, period) =>
  summarize(filterByPeriod(items, previousPeriod(period))),
)

export const selectMonthlySeries = createSelector([selectTransactions, selectPeriod], (items, period) => monthlySeries(items, period.year))

export const selectActiveMonths = createSelector([selectTransactions, selectPeriod], (items, period) => activeMonths(items, period.year))

export const selectExpenseBreakdown = createSelector([selectPeriodTransactions], (items) => expensesByCategory(items))

export const selectBudgetProgress = createSelector([selectTransactions, selectPeriod, selectBudgets], (items, period, budgets) =>
  budgetProgress(items, period, budgets),
)

export const selectYears = createSelector([selectTransactions, selectPeriod], (items, period) => availableYears(items, period.year))

export const selectRecentTransactions = createSelector([selectPeriodTransactions], (items) => items.slice(0, 8))

export const selectInsights = createSelector([selectTransactions, selectPeriod, selectBudgets, selectPreferences], (items, period, budgets, prefs) =>
  generateInsights(items, period, budgets, (n) => formatMoney(n, { currency: prefs.currency, numberFormat: prefs.numberFormat })),
)

export const selectIssueCounts = createSelector([(s: RootState) => s.transactions.issues], (issues) => ({
  errors: issues.filter((i) => i.severity === 'error').length,
  warnings: issues.filter((i) => i.severity === 'warning').length,
}))

export const selectEnabledCategories = createSelector([selectCategories], (cats) => cats.filter((c) => c.enabled))

/** Categories used in the data but missing from settings, so filters/forms can still offer them. */
export const selectAllCategoryNames = createSelector([selectTransactions, selectCategories], (items, cats) => {
  const names = new Set(cats.map((c) => c.name))
  for (const tx of items) names.add(tx.category)
  return [...names].sort((a, b) => a.localeCompare(b))
})

export const selectAllPaymentMethods = createSelector([selectTransactions, (s: RootState) => s.settings.paymentMethods], (items, methods) => {
  const names = new Set(methods)
  for (const tx of items) if (tx.paymentMethod) names.add(tx.paymentMethod)
  return [...names]
})

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { BudgetLimit, Category, SavingsGoal, TransactionType } from '@/types/finance'
import type { CurrencyCode, NumberFormatPreference } from '@/utils/currencyFormatter'
import type { DateFormatPreference } from '@/utils/dateFormatter'
import { loadLocal } from '@/services/storage/localSettings'
import { createId } from '@/utils/id'
import { DEFAULT_PAYMENT_METHODS } from '@/utils/transactionValidation'

export type ThemeMode = 'light' | 'dark' | 'system'
export type DefaultPeriod = 'current-month' | 'full-year'

export interface Preferences {
  currency: CurrencyCode
  dateFormat: DateFormatPreference
  defaultPeriod: DefaultPeriod
  theme: ThemeMode
  numberFormat: NumberFormatPreference
  /** Polling interval for external change detection, in seconds. */
  pollIntervalSeconds: number
}

export interface SettingsState {
  categories: Category[]
  paymentMethods: string[]
  budgets: BudgetLimit[]
  goals: SavingsGoal[]
  preferences: Preferences
  /** Set when localStorage could not be used; settings are then session-only. */
  storageUnavailable: boolean
}

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business Income', 'Investment Income', 'Other Income']
const EXPENSE_CATEGORIES = ['Rent', 'Food', 'Groceries', 'Transport', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Travel', 'Education', 'EMI', 'Other Expenses']

export function defaultCategories(): Category[] {
  return [
    ...INCOME_CATEGORIES.map((name) => ({ id: `cat_in_${name.toLowerCase().replace(/\s+/g, '-')}`, name, type: 'Income' as const, enabled: true })),
    ...EXPENSE_CATEGORIES.map((name) => ({ id: `cat_ex_${name.toLowerCase().replace(/\s+/g, '-')}`, name, type: 'Expense' as const, enabled: true })),
  ]
}

export const DEFAULT_BUDGETS: BudgetLimit[] = [
  { category: 'Food', limit: 6000 },
  { category: 'Shopping', limit: 5000 },
  { category: 'Transport', limit: 4000 },
  { category: 'Entertainment', limit: 2500 },
  { category: 'Travel', limit: 8000 },
  { category: 'Other Expenses', limit: 3000 },
]

export const DEFAULT_PREFERENCES: Preferences = {
  currency: 'INR',
  dateFormat: 'dd MMM yyyy',
  defaultPeriod: 'current-month',
  theme: 'system',
  numberFormat: 'indian',
  pollIntervalSeconds: 20,
}

export const SETTINGS_STORAGE_KEY = 'settings'

function loadInitial(): SettingsState {
  const stored = loadLocal<Partial<SettingsState> | null>(SETTINGS_STORAGE_KEY, null)
  return {
    categories: stored?.categories?.length ? stored.categories : defaultCategories(),
    paymentMethods: stored?.paymentMethods?.length ? stored.paymentMethods : DEFAULT_PAYMENT_METHODS,
    budgets: stored?.budgets ?? DEFAULT_BUDGETS,
    goals: stored?.goals ?? [],
    preferences: { ...DEFAULT_PREFERENCES, ...(stored?.preferences ?? {}) },
    storageUnavailable: false,
  }
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadInitial,
  reducers: {
    setPreference<K extends keyof Preferences>(state: SettingsState, action: PayloadAction<{ key: K; value: Preferences[K] }>) {
      state.preferences[action.payload.key] = action.payload.value
    },
    addCategory(state, action: PayloadAction<{ name: string; type: TransactionType }>) {
      const name = action.payload.name.trim()
      if (!name) return
      if (state.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return
      state.categories.push({ id: createId('cat'), name, type: action.payload.type, enabled: true })
    },
    renameCategory(state, action: PayloadAction<{ id: string; name: string }>) {
      const cat = state.categories.find((c) => c.id === action.payload.id)
      const name = action.payload.name.trim()
      if (!cat || !name) return
      if (state.categories.some((c) => c.id !== cat.id && c.name.toLowerCase() === name.toLowerCase())) return
      const oldName = cat.name
      cat.name = name
      state.budgets.forEach((b) => {
        if (b.category === oldName) b.category = name
      })
    },
    setCategoryType(state, action: PayloadAction<{ id: string; type: TransactionType }>) {
      const cat = state.categories.find((c) => c.id === action.payload.id)
      if (cat) cat.type = action.payload.type
    },
    toggleCategory(state, action: PayloadAction<{ id: string; enabled: boolean }>) {
      const cat = state.categories.find((c) => c.id === action.payload.id)
      if (cat) cat.enabled = action.payload.enabled
    },
    removeCategory(state, action: PayloadAction<string>) {
      state.categories = state.categories.filter((c) => c.id !== action.payload)
    },
    setBudget(state, action: PayloadAction<BudgetLimit>) {
      const existing = state.budgets.find((b) => b.category === action.payload.category)
      if (existing) existing.limit = action.payload.limit
      else state.budgets.push(action.payload)
    },
    removeBudget(state, action: PayloadAction<string>) {
      state.budgets = state.budgets.filter((b) => b.category !== action.payload)
    },
    addGoal(state, action: PayloadAction<Omit<SavingsGoal, 'id' | 'createdAt'>>) {
      state.goals.push({ ...action.payload, id: createId('goal'), createdAt: new Date().toISOString() })
    },
    updateGoal(state, action: PayloadAction<{ id: string; changes: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>> }>) {
      const goal = state.goals.find((g) => g.id === action.payload.id)
      if (goal) Object.assign(goal, action.payload.changes)
    },
    removeGoal(state, action: PayloadAction<string>) {
      state.goals = state.goals.filter((g) => g.id !== action.payload)
    },
    addPaymentMethod(state, action: PayloadAction<string>) {
      const name = action.payload.trim()
      if (name && !state.paymentMethods.some((m) => m.toLowerCase() === name.toLowerCase())) state.paymentMethods.push(name)
    },
    removePaymentMethod(state, action: PayloadAction<string>) {
      state.paymentMethods = state.paymentMethods.filter((m) => m !== action.payload)
    },
    storageUnavailable(state) {
      state.storageUnavailable = true
    },
    resetSettings() {
      return {
        categories: defaultCategories(),
        paymentMethods: DEFAULT_PAYMENT_METHODS,
        budgets: DEFAULT_BUDGETS,
        goals: [],
        preferences: DEFAULT_PREFERENCES,
        storageUnavailable: false,
      }
    },
  },
})

export const {
  setPreference,
  addCategory,
  renameCategory,
  setCategoryType,
  toggleCategory,
  removeCategory,
  setBudget,
  removeBudget,
  addGoal,
  updateGoal,
  removeGoal,
  addPaymentMethod,
  removePaymentMethod,
  storageUnavailable,
  resetSettings,
} = settingsSlice.actions
export default settingsSlice.reducer

import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { PageTransition } from '@/components/common/PageTransition'
import { PageSkeleton } from '@/components/common/LoadingSkeleton'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const BudgetGoalsPage = lazy(() => import('@/pages/BudgetGoalsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', key: 'dashboard' },
  { path: '/transactions', label: 'Transactions', key: 'transactions' },
  { path: '/reports', label: 'Reports', key: 'reports' },
  { path: '/budget', label: 'Budget & Goals', key: 'budget' },
  { path: '/settings', label: 'Settings', key: 'settings' },
] as const

export function AppRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<PageSkeleton />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />
          <Route path="/transactions" element={<PageTransition><TransactionsPage /></PageTransition>} />
          <Route path="/reports" element={<PageTransition><ReportsPage /></PageTransition>} />
          <Route path="/budget" element={<PageTransition><BudgetGoalsPage /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}

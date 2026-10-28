import { useEffect, useMemo } from 'react'
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material'
import { MotionConfig } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { buildTheme } from '@/theme/theme'
import { useWorkbookSync } from '@/hooks/useWorkbookSync'
import { AppLayout } from '@/components/layout/AppLayout'
import { AppRoutes } from '@/app/routes'
import { ToastHost } from '@/components/common/ToastHost'
import { TransactionDialog } from '@/components/transactions/TransactionDialog'
import { ConflictDialog } from '@/components/common/ConflictDialog'
import { setPeriod } from '@/features/ui/uiSlice'

export default function App() {
  const themeMode = useAppSelector((s) => s.settings.preferences.theme)
  const defaultPeriod = useAppSelector((s) => s.settings.preferences.defaultPeriod)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const dispatch = useAppDispatch()
  const resolvedMode = themeMode === 'system' ? (prefersDark ? 'dark' : 'light') : themeMode
  const theme = useMemo(() => buildTheme(resolvedMode), [resolvedMode])

  useWorkbookSync()

  // Apply the default reporting period preference once on startup.
  useEffect(() => {
    const now = new Date()
    dispatch(setPeriod({ year: now.getFullYear(), month: defaultPeriod === 'full-year' ? null : now.getMonth() + 1 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedMode === 'dark' ? '#0B1220' : '#172554')
  }, [resolvedMode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MotionConfig reducedMotion="user" transition={{ duration: 0.25, ease: 'easeOut' }}>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
        <TransactionDialog />
        <ConflictDialog />
        <ToastHost />
      </MotionConfig>
    </ThemeProvider>
  )
}

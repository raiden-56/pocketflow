import { useLocation, useNavigate } from 'react-router-dom'
import { BottomNavigation, BottomNavigationAction, Paper, useMediaQuery, useTheme } from '@mui/material'
import { NAV_ITEMS } from '@/app/routes'
import { NAV_ICONS } from './Sidebar'

/** Shorter labels so six items fit a phone's bottom bar; tablets keep the full names. */
const MOBILE_LABELS: Partial<Record<(typeof NAV_ITEMS)[number]['key'], string>> = { dashboard: 'Home', transactions: 'Entries', budget: 'Budget' }

export function MobileNavigation() {
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const location = useLocation()
  const navigate = useNavigate()
  const current = NAV_ITEMS.find((i) => (i.path === '/' ? location.pathname === '/' : location.pathname.startsWith(i.path)))?.path ?? '/'

  return (
    <Paper
      component="nav"
      aria-label="Main navigation"
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: (t) => t.zIndex.appBar, borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0, pb: 'env(safe-area-inset-bottom)' }}
    >
      <BottomNavigation value={current} onChange={(_, value) => navigate(value)} showLabels sx={{ height: 64 }}>
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.key}
            label={(isPhone && MOBILE_LABELS[item.key]) || item.label}
            value={item.path}
            icon={NAV_ICONS[item.key]}
            sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.7rem' } }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}

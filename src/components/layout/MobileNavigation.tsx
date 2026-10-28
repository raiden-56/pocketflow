import { useLocation, useNavigate } from 'react-router-dom'
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import { NAV_ITEMS } from '@/app/routes'
import { NAV_ICONS } from './Sidebar'

export function MobileNavigation() {
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
            label={item.key === 'budget' ? 'Budget' : item.label}
            value={item.path}
            icon={NAV_ICONS[item.key]}
            sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: '0.7rem' } }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}

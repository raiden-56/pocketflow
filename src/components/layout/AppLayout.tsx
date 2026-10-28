import type { ReactNode } from 'react'
import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useAppSelector } from '@/app/store'
import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar'
import { Header } from './Header'
import { MobileNavigation } from './MobileNavigation'

export function AppLayout({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed)
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: -9999,
          top: 8,
          zIndex: 2000,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          px: 2,
          py: 1,
          borderRadius: 1,
          '&:focus': { left: 8 },
        }}
      >
        Skip to content
      </Box>
      {isDesktop && <Sidebar />}
      <Box
        component="div"
        sx={{
          flex: 1,
          minWidth: 0,
          ml: isDesktop ? `${sidebarWidth}px` : 0,
          transition: theme.transitions.create('margin-left', { duration: theme.transitions.duration.shorter }),
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header />
        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{
            flex: 1,
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 2, sm: 3 },
            pb: { xs: 11, md: 4 },
            maxWidth: 1440,
            width: '100%',
            mx: 'auto',
            outline: 'none',
          }}
        >
          {children}
        </Box>
      </Box>
      {!isDesktop && <MobileNavigation />}
    </Box>
  )
}

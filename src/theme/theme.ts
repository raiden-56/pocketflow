import { alpha, createTheme, type Theme } from '@mui/material/styles'

export const palette = {
  navy: '#172554',
  royal: '#2563EB',
  income: '#16A34A',
  incomeBg: '#DCFCE7',
  expense: '#DC2626',
  expenseBg: '#FEE2E2',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  warning: '#D97706',
  warningBg: '#FEF3C7',
}

export const chartColors = {
  income: palette.income,
  expense: palette.expense,
  net: palette.royal,
  categories: ['#2563EB', '#16A34A', '#DC2626', '#D97706', '#7C3AED', '#0891B2', '#DB2777', '#65A30D', '#EA580C', '#475569', '#0D9488', '#9333EA'],
}

declare module '@mui/material/styles' {
  interface Palette {
    income: Palette['primary']
    expense: Palette['primary']
  }
  interface PaletteOptions {
    income?: PaletteOptions['primary']
    expense?: PaletteOptions['primary']
  }
}

const fontFamily = ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'].join(',')

export function buildTheme(mode: 'light' | 'dark'): Theme {
  const dark = mode === 'dark'
  const bg = dark ? '#0B1220' : palette.background
  const cardBg = dark ? '#111A2E' : palette.card
  const border = dark ? '#1F2A44' : palette.border
  const textPrimary = dark ? '#E2E8F0' : palette.text
  const textSecondary = dark ? '#94A3B8' : palette.textSecondary

  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? '#60A5FA' : palette.royal, dark: palette.navy, contrastText: '#FFFFFF' },
      secondary: { main: palette.navy },
      success: { main: palette.income, light: palette.incomeBg },
      error: { main: palette.expense, light: palette.expenseBg },
      warning: { main: palette.warning, light: palette.warningBg },
      info: { main: palette.royal },
      income: { main: palette.income, light: dark ? alpha(palette.income, 0.18) : palette.incomeBg, dark: '#15803D', contrastText: '#FFFFFF' },
      expense: { main: palette.expense, light: dark ? alpha(palette.expense, 0.18) : palette.expenseBg, dark: '#B91C1C', contrastText: '#FFFFFF' },
      background: { default: bg, paper: cardBg },
      text: { primary: textPrimary, secondary: textSecondary },
      divider: border,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily,
      h4: { fontWeight: 700, fontSize: '1.6rem', letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, fontSize: '1.05rem' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600, color: textSecondary },
      body2: { fontSize: '0.875rem' },
      caption: { color: textSecondary },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: bg, color: textPrimary },
          '*:focus-visible': { outline: `2px solid ${palette.royal}`, outlineOffset: 2 },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none', border: `1px solid ${border}`, borderRadius: 16 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { border: `1px solid ${border}`, borderRadius: 16, boxShadow: 'none', backgroundImage: 'none' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, paddingInline: 16, minHeight: 40 },
          sizeSmall: { minHeight: 34 },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
      },
      MuiTextField: {
        defaultProps: { size: 'small', fullWidth: true },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: 10, backgroundColor: dark ? alpha('#FFFFFF', 0.02) : '#FFFFFF' } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 18 } },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { fontSize: '0.8rem', borderRadius: 8 } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: border },
          head: { color: textSecondary, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
        },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: 999, height: 8, backgroundColor: dark ? alpha('#FFFFFF', 0.08) : '#EEF2F7' }, bar: { borderRadius: 999 } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 12 } },
      },
    },
  })
}

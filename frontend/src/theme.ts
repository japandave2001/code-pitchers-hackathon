import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: { main: '#1565C0' },
    secondary: { main: '#FF6F00' },
    background: { default: '#F0F4F8', paper: '#ffffff' },
    success: { main: '#2E7D32' },
    warning: { main: '#E65100' },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 12 },
      },
    },
  },
})

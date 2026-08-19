import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#2596be', light: '#21cbe6', dark: '#1b7d9c', contrastText: '#ffffff' },
    secondary: { main: '#e91e63', light: '#f06292', dark: '#c2185b', contrastText: '#ffffff' },
    background: { default: '#e9f7fb', paper: '#ffffff' },
    text: { primary: '#123c4a', secondary: '#3f6a7a' },
    divider: 'rgba(37, 150, 190, 0.16)',
    // Clave personalizada: createTheme sólo augmenta primary/secondary/error/
    // warning/info/success, así que este objeto pasa intacto.
    custom: {
      brand: { dark: '#2596be', light: '#21cbe6' },
      tint: { 50: '#f6fcfd', 100: '#e9f7fb', 200: '#d3eff6', 300: '#b9e6f1' },
      header: {
        bg: '#d3eff6',
        border: 'rgba(37, 150, 190, 0.22)',
        text: '#18617c',
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(37, 150, 190, 0.16)',
          boxShadow: '0 1px 2px rgba(18, 51, 63, 0.04), 0 4px 12px rgba(18, 51, 63, 0.04)',
        },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': { color: '#2596be' },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: '#2596be' },
        },
      },
    },
  },
});

export default theme;

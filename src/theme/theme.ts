import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

export function createAppTheme(darkMode: boolean) {
  return createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      ...(darkMode
        ? {
            primary: { main: tokens.color.accent },
            secondary: { main: tokens.color.muted },
            error: { main: tokens.color.destructive },
            background: {
              default: tokens.color.canvas,
              paper: tokens.color.card,
            },
            text: {
              primary: tokens.text.primary,
              secondary: tokens.text.secondary,
            },
            divider: tokens.color.border,
          }
        : {
            primary: { main: '#2563EB' },
            secondary: { main: tokens.light.muted },
            error: { main: tokens.color.destructive },
            background: {
              default: tokens.light.canvas,
              paper: tokens.light.card,
            },
            text: {
              primary: tokens.light.text.primary,
              secondary: tokens.light.text.secondary,
            },
            divider: tokens.light.border,
          }),
    },
    typography: {
      fontFamily: tokens.font.body,
      h3: {
        fontFamily: tokens.font.heading,
        fontWeight: 700,
        fontSize: '1.5rem',
      },
      h4: {
        fontFamily: tokens.font.heading,
        fontWeight: 600,
        fontSize: '1.25rem',
      },
      h5: {
        fontFamily: tokens.font.heading,
        fontWeight: 600,
        fontSize: '1.125rem',
      },
      h6: {
        fontFamily: tokens.font.heading,
        fontWeight: 500,
        fontSize: '1rem',
      },
      body1: {
        fontFamily: tokens.font.body,
        fontSize: '0.875rem',
      },
      body2: {
        fontFamily: tokens.font.body,
        fontSize: '0.8125rem',
      },
      button: {
        fontFamily: tokens.font.heading,
        fontWeight: 500,
        textTransform: 'none' as const,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none' as const,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
          },
        },
      },
    },
  });
}

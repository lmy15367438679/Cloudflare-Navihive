import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

export function createAppTheme(darkMode: boolean) {
  const isDark = darkMode;
  const c = isDark ? tokens.color : tokens.light;
  const t = isDark ? tokens.text : tokens.light.text;

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: c.accent,
        contrastText: t.onAccent,
      },
      secondary: { main: c.muted },
      error: { main: c.destructive },
      success: { main: c.success },
      warning: { main: c.warning },
      info: { main: c.info },
      background: {
        default: c.canvas,
        paper: c.card,
      },
      text: {
        primary: t.primary,
        secondary: t.secondary,
        disabled: t.disabled,
      },
      divider: c.border,
      action: {
        hover: c.cardHover,
        selected: c.accentDim,
        focus: c.accentDim,
      },
    },
    shape: {
      borderRadius: 10,
    },
    typography: {
      fontFamily: tokens.font.body,
      h1: { fontFamily: tokens.font.heading, fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontFamily: tokens.font.heading, fontWeight: 700, letterSpacing: '-0.02em' },
      h3: {
        fontFamily: tokens.font.heading,
        fontWeight: 700,
        fontSize: '1.5rem',
        lineHeight: 1.35,
        letterSpacing: '-0.01em',
        textWrap: 'balance' as const,
      },
      h4: {
        fontFamily: tokens.font.heading,
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
        textWrap: 'balance' as const,
      },
      h5: {
        fontFamily: tokens.font.heading,
        fontWeight: 600,
        fontSize: '1.125rem',
        lineHeight: 1.4,
        letterSpacing: '-0.005em',
      },
      h6: {
        fontFamily: tokens.font.heading,
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: 1.5,
        letterSpacing: '-0.005em',
      },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      body1: {
        fontFamily: tokens.font.body,
        fontSize: '0.875rem',
        lineHeight: 1.6,
      },
      body2: {
        fontFamily: tokens.font.body,
        fontSize: '0.8125rem',
        lineHeight: 1.6,
      },
      button: {
        fontFamily: tokens.font.heading,
        fontWeight: 500,
        textTransform: 'none' as const,
        letterSpacing: '0.01em',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: 'var(--color-canvas)',
            color: 'var(--text-primary)',
            fontFamily: tokens.font.body,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
        },
      },
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
            borderRadius: 'var(--radius-md)',
            textTransform: 'none' as const,
            minHeight: 36,
            fontWeight: 500,
          },
          sizeSmall: {
            minHeight: 32,
          },
          containedPrimary: {
            '&:hover': {
              backgroundColor: c.accentHover,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 'var(--radius-md)',
            transition: 'background-color 150ms ease, color 150ms ease',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            transition: 'background-color 150ms ease, color 150ms ease',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontFamily: tokens.font.heading,
            fontWeight: 600,
            fontSize: '1.0625rem',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: {
            borderColor: 'var(--color-border)',
          },
          root: {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-border-strong)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-focus-ring)',
              borderWidth: 2,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            backgroundColor: 'var(--color-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-md)',
          },
        },
      },
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            borderRadius: 'var(--radius-md)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: 'var(--color-border)',
          },
        },
      },
    },
  });
}

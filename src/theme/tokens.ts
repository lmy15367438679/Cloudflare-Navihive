export const tokens = {
  color: {
    canvas: '#020617',
    surface: '#0F111A',
    card: '#151720',
    cardHover: '#1A1C27',
    elevated: '#1C1F2B',
    accent: '#22C55E',
    accentDim: '#166534',
    destructive: '#EF4444',
    muted: '#94A3B8',
    border: '#334155',
  },
  text: {
    primary: '#F1F5F9',
    secondary: '#CBD5E1',
    tertiary: '#64748B',
  },
  light: {
    canvas: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardHover: '#F1F5F9',
    elevated: '#FFFFFF',
    border: '#CBD5E1',
    muted: '#64748B',
    text: {
      primary: '#0F172A',
      secondary: '#334155',
      tertiary: '#64748B',
    },
    shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    shadowMd: '0 4px 6px rgba(0, 0, 0, 0.07)',
    shadowLg: '0 10px 25px rgba(0, 0, 0, 0.1)',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
  },
  font: {
    heading: "'Poppins', sans-serif",
    body: "'Open Sans', sans-serif",
  },
} as const;

export const cssVariables = `
:root {
  --color-canvas: ${tokens.color.canvas};
  --color-surface: ${tokens.color.surface};
  --color-card: ${tokens.color.card};
  --color-card-hover: ${tokens.color.cardHover};
  --color-elevated: ${tokens.color.elevated};
  --color-accent: ${tokens.color.accent};
  --color-accent-dim: ${tokens.color.accentDim};
  --color-destructive: ${tokens.color.destructive};
  --color-muted: ${tokens.color.muted};
  --color-border: ${tokens.color.border};
  --text-primary: ${tokens.text.primary};
  --text-secondary: ${tokens.text.secondary};
  --text-tertiary: ${tokens.text.tertiary};
  --font-heading: ${tokens.font.heading};
  --font-body: ${tokens.font.body};
  --radius-sm: ${tokens.radius.sm};
  --radius-md: ${tokens.radius.md};
  --radius-lg: ${tokens.radius.lg};
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.5);
  --sidebar-width: 240px;
}

.light {
  --color-canvas: ${tokens.light.canvas};
  --color-surface: ${tokens.light.surface};
  --color-card: ${tokens.light.card};
  --color-card-hover: ${tokens.light.cardHover};
  --color-elevated: ${tokens.light.elevated};
  --color-border: ${tokens.light.border};
  --color-muted: ${tokens.light.muted};
  --text-primary: ${tokens.light.text.primary};
  --text-secondary: ${tokens.light.text.secondary};
  --text-tertiary: ${tokens.light.text.tertiary};
  --shadow-sm: ${tokens.light.shadowSm};
  --shadow-md: ${tokens.light.shadowMd};
  --shadow-lg: ${tokens.light.shadowLg};
}
`;

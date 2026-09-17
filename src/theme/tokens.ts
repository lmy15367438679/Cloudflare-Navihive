/**
 * 设计令牌（Design Tokens）——单一事实来源
 *
 * 深色（默认）与浅色两套语义色板 + 圆角/间距/字体/阴影体系。
 * 所有组件统一通过 CSS 变量（--color-* / --text-* / --radius-* / --spacing-* / --shadow-*）
 * 或 tokens 对象引用，禁止在组件内硬编码色值。
 *
 * 可访问性约定：
 * - 正文/重要文本对比度 ≥ 4.5:1
 * - 次要/辅助文本对比度 ≥ 3:1
 * - 键盘焦点环使用 --color-focus-ring
 * - 模态遮罩使用 --color-overlay（40-60% 不透明度）
 */
export const tokens = {
  color: {
    canvas: '#181816', // 温和墨黑页面底色
    surface: '#1F1F1C', // 侧栏 / 顶栏
    card: '#242420', // 卡片
    cardHover: '#2A2925', // 卡片 hover
    elevated: '#292824', // 弹窗 / 菜单
    elevatedHover: '#302F2A', // 浮层 hover
    accent: '#E29A70', // 陶土色品牌强调
    accentDim: 'rgba(226, 154, 112, 0.13)',
    accentHover: '#EAA983',
    accentMuted: 'rgba(226, 154, 112, 0.34)',
    destructive: '#EF4444',
    destructiveDim: 'rgba(239, 68, 68, 0.12)',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#38BDF8',
    muted: '#A39E94',
    border: 'rgba(224, 216, 202, 0.11)',
    borderStrong: 'rgba(224, 216, 202, 0.22)',
    focusRing: '#E29A70',
    overlay: 'rgba(17, 16, 14, 0.62)',
  },
  text: {
    primary: '#F3EFE7',
    secondary: '#C9C2B6',
    tertiary: '#9F988D',
    disabled: '#716C64',
    onAccent: '#25150E',
  },
  light: {
    canvas: '#F3F0E9',
    surface: '#EAE6DD',
    card: '#FBF9F5',
    cardHover: '#FFFFFF',
    elevated: '#FFFEFB',
    elevatedHover: '#F8F5EF',
    border: 'rgba(55, 49, 40, 0.1)',
    borderStrong: 'rgba(55, 49, 40, 0.2)',
    muted: '#756F66',
    accent: '#9A4F2E',
    accentHover: '#7E3E24',
    accentDim: 'rgba(154, 79, 46, 0.1)',
    accentMuted: 'rgba(154, 79, 46, 0.3)',
    destructive: '#DC2626',
    destructiveDim: 'rgba(239, 68, 68, 0.1)',
    success: '#16A34A',
    warning: '#B45309',
    info: '#0369A1',
    focusRing: '#9A4F2E',
    overlay: 'rgba(42, 36, 28, 0.42)',
    text: {
      primary: '#292620',
      secondary: '#565149',
      tertiary: '#746E64',
      disabled: '#A39D92',
      onAccent: '#FFFFFF',
    },
    shadowSm: '0 1px 2px rgba(48, 39, 29, 0.05)',
    shadowMd: '0 10px 30px rgba(48, 39, 29, 0.09)',
    shadowLg: '0 20px 52px rgba(48, 39, 29, 0.14)',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
    16: '64px',
  },
  font: {
    heading: "'Avenir Next', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    body: "'Avenir Next', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
  },
  layout: {
    topbarHeight: '64px',
    sidebarWidth: '264px',
  },
} as const;

export const cssVariables = `
:root {
  color-scheme: dark;
  --color-canvas: ${tokens.color.canvas};
  --color-surface: ${tokens.color.surface};
  --color-card: ${tokens.color.card};
  --color-card-hover: ${tokens.color.cardHover};
  --color-elevated: ${tokens.color.elevated};
  --color-elevated-hover: ${tokens.color.elevatedHover};
  --color-accent: ${tokens.color.accent};
  --color-accent-dim: ${tokens.color.accentDim};
  --color-accent-hover: ${tokens.color.accentHover};
  --color-accent-muted: ${tokens.color.accentMuted};
  --color-destructive: ${tokens.color.destructive};
  --color-destructive-dim: ${tokens.color.destructiveDim};
  --color-success: ${tokens.color.success};
  --color-warning: ${tokens.color.warning};
  --color-info: ${tokens.color.info};
  --color-muted: ${tokens.color.muted};
  --color-border: ${tokens.color.border};
  --color-border-strong: ${tokens.color.borderStrong};
  --color-focus-ring: ${tokens.color.focusRing};
  --color-overlay: ${tokens.color.overlay};
  --color-disabled: ${tokens.text.disabled};
  --text-primary: ${tokens.text.primary};
  --text-secondary: ${tokens.text.secondary};
  --text-tertiary: ${tokens.text.tertiary};
  --text-on-accent: ${tokens.text.onAccent};
  --font-heading: ${tokens.font.heading};
  --font-body: ${tokens.font.body};
  --radius-sm: ${tokens.radius.sm};
  --radius-md: ${tokens.radius.md};
  --radius-lg: ${tokens.radius.lg};
  --radius-xl: ${tokens.radius.xl};
  --radius-full: ${tokens.radius.full};
  --spacing-1: ${tokens.spacing[1]};
  --spacing-2: ${tokens.spacing[2]};
  --spacing-3: ${tokens.spacing[3]};
  --spacing-4: ${tokens.spacing[4]};
  --spacing-6: ${tokens.spacing[6]};
  --spacing-8: ${tokens.spacing[8]};
  --spacing-12: ${tokens.spacing[12]};
  --spacing-16: ${tokens.spacing[16]};
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.16);
  --shadow-md: 0 10px 28px rgba(0, 0, 0, 0.22);
  --shadow-lg: 0 20px 48px rgba(0, 0, 0, 0.28);
  --sidebar-width: ${tokens.layout.sidebarWidth};
  --topbar-height: ${tokens.layout.topbarHeight};
}

.light {
  color-scheme: light;
  --color-canvas: ${tokens.light.canvas};
  --color-surface: ${tokens.light.surface};
  --color-card: ${tokens.light.card};
  --color-card-hover: ${tokens.light.cardHover};
  --color-elevated: ${tokens.light.elevated};
  --color-elevated-hover: ${tokens.light.elevatedHover};
  --color-accent: ${tokens.light.accent};
  --color-accent-hover: ${tokens.light.accentHover};
  --color-accent-dim: ${tokens.light.accentDim};
  --color-accent-muted: ${tokens.light.accentMuted};
  --color-destructive: ${tokens.light.destructive};
  --color-destructive-dim: ${tokens.light.destructiveDim};
  --color-success: ${tokens.light.success};
  --color-warning: ${tokens.light.warning};
  --color-info: ${tokens.light.info};
  --color-border: ${tokens.light.border};
  --color-border-strong: ${tokens.light.borderStrong};
  --color-focus-ring: ${tokens.light.focusRing};
  --color-overlay: ${tokens.light.overlay};
  --color-disabled: ${tokens.light.text.disabled};
  --color-muted: ${tokens.light.muted};
  --text-primary: ${tokens.light.text.primary};
  --text-secondary: ${tokens.light.text.secondary};
  --text-tertiary: ${tokens.light.text.tertiary};
  --text-on-accent: ${tokens.light.text.onAccent};
  --shadow-sm: ${tokens.light.shadowSm};
  --shadow-md: ${tokens.light.shadowMd};
  --shadow-lg: ${tokens.light.shadowLg};
}
`;

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
    canvas: '#020617', // 页面底色
    surface: '#0F111A', // 侧栏 / 顶栏
    card: '#151720', // 卡片
    cardHover: '#1A1C27', // 卡片 hover
    elevated: '#1C1F2B', // 弹窗 / 菜单
    elevatedHover: '#242733', // 浮层 hover
    accent: '#22C55E', // 品牌主色（绿）
    accentDim: '#166534', // 主色弱化底（选中态 / 文字强调底）
    accentHover: '#16A34A', // 主色 hover
    destructive: '#EF4444',
    destructiveDim: 'rgba(239, 68, 68, 0.12)',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#38BDF8',
    muted: '#94A3B8',
    border: 'rgba(148, 163, 184, 0.15)', // 柔和低透边框（与浅色一致的 premium 质感）
    borderStrong: 'rgba(148, 163, 184, 0.28)',
    focusRing: '#22C55E', // 键盘焦点环
    overlay: 'rgba(2, 6, 23, 0.55)', // 模态 scrim
  },
  text: {
    primary: '#F1F5F9',
    secondary: '#CBD5E1',
    tertiary: '#94A3B8', // 已提升对比度（深底上 ≥4.5:1）
    disabled: '#64748B',
    onAccent: '#052E16', // 主色按钮上的文字（深绿底）
  },
  light: {
    canvas: '#F1F5F9', // 比纯白略灰，增强与白色卡片的层次
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardHover: '#F8FAFC',
    elevated: '#FFFFFF',
    elevatedHover: '#F8FAFC',
    border: 'rgba(15, 23, 42, 0.08)', // 柔和低透边框（premium 质感，替代生硬实色）
    borderStrong: 'rgba(15, 23, 42, 0.14)',
    muted: '#64748B',
    accent: '#15803D', // 浅色主色（绿-700，白底对比度 ≥4.5:1）
    accentHover: '#166534',
    accentDim: 'rgba(34, 197, 94, 0.12)', // 浅色选中底
    destructive: '#DC2626',
    destructiveDim: 'rgba(239, 68, 68, 0.1)',
    success: '#16A34A',
    warning: '#B45309',
    info: '#0369A1',
    focusRing: '#16A34A',
    overlay: 'rgba(15, 23, 42, 0.4)',
    text: {
      primary: '#0F172A',
      secondary: '#334155',
      tertiary: '#475569',
      disabled: '#94A3B8',
      onAccent: '#FFFFFF',
    },
    shadowSm: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
    shadowMd: '0 4px 8px rgba(15, 23, 42, 0.04), 0 8px 16px rgba(15, 23, 42, 0.06)',
    shadowLg: '0 8px 16px rgba(15, 23, 42, 0.06), 0 16px 32px rgba(15, 23, 42, 0.08)',
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
    heading: "'Poppins', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    body: "'Open Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
  },
  layout: {
    topbarHeight: '56px',
    sidebarWidth: '240px',
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
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.25);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.35), 0 16px 32px rgba(0, 0, 0, 0.3);
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

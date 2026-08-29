import { useState, useCallback, useEffect, cloneElement, isValidElement } from 'react';
import { Box, Drawer } from '@mui/material';
import type { ReactNode } from 'react';
import ParticlesBackground from '../Effects/ParticlesBackground';
import { OPEN_MOBILE_DRAWER_EVENT, requestSearchFocus } from '../../hooks/useSearchShortcut';

interface AppLayoutProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  children: ReactNode;
  backgroundImage?: string;
  backgroundOpacity?: string;
  /** 背景图虚化（site.backgroundBlur） */
  backgroundBlur?: boolean;
  /** 粒子背景（site.particlesEnabled） */
  particles?: boolean;
}

export default function AppLayout({
  sidebar,
  topBar,
  children,
  backgroundImage,
  backgroundOpacity = '0.15',
  backgroundBlur = false,
  particles = false,
}: AppLayoutProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleMobileMenuOpen = useCallback(() => setMobileDrawerOpen(true), []);
  const handleMobileMenuClose = useCallback(() => setMobileDrawerOpen(false), []);

  // 快捷键（⌘K / Ctrl+K / /）在移动端同样要能唤出搜索：Drawer 关闭时子树不挂载，
  // 顶层首次派发的 FOCUS_SEARCH_EVENT 必然落空，故打开抽屉后再走一次统一的聚焦派发
  //（requestSearchFocus：立即 + 双 rAF 等抽屉渲染挂载 + timeout 兜底，接收端 SearchBox
  // 还会校验焦点是否真正落上并按帧重试）。桌面端由 hover 侧栏负责，此处只接管移动端。
  useEffect(() => {
    const onOpenDrawer = () => {
      // MUI v7 默认 md 断点为 900px，与下方 Drawer 的 display: { xs: 'block', md: 'none' } 一致
      if (window.matchMedia('(min-width:900px)').matches) return;
      setMobileDrawerOpen(true);
      requestSearchFocus();
    };
    window.addEventListener(OPEN_MOBILE_DRAWER_EVENT, onOpenDrawer);
    return () => window.removeEventListener(OPEN_MOBILE_DRAWER_EVENT, onOpenDrawer);
  }, []);

  const topBarWithMobile = isValidElement(topBar)
    ? cloneElement(topBar as React.ReactElement<{ onMobileMenuOpen?: () => void }>, {
        onMobileMenuOpen: handleMobileMenuOpen,
      })
    : topBar;

  const sidebarForDrawer = isValidElement(sidebar)
    ? cloneElement(sidebar as React.ReactElement<{ variant?: 'hover' | 'static' }>, {
        variant: 'static',
      })
    : sidebar;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'var(--color-canvas)',
        color: 'var(--text-primary)',
        position: 'relative',
      }}
    >
      {backgroundImage && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 0,
            // Chrome 不会像 Safari 那样自动把 fixed 元素提升为合成层：
            // 不加 will-change 时，滚动内容每帧都会在它上方重绘合成 → 掉帧。
            willChange: 'transform',
            ...(backgroundBlur
              ? {
                  // 背景虚化（site.backgroundBlur）：blur 会扩大渲染范围到画布边缘，轻微
                  // scale(1.02) 防止露出底色；背景本身是静态低频重绘，仅开启时才有成本
                  filter: 'blur(10px) scale(1.02)',
                }
              : {}),
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: `rgba(0, 0, 0, ${1 - Number(backgroundOpacity)})`,
              zIndex: 1,
            },
          }}
        />
      )}

      {/* 粒子背景装饰层（site.particlesEnabled）：canvas 全屏 fixed，z-index 1
          位于背景壁纸之上、内容之下；pointer-events: none 不挡任何交互 */}
      {particles && <ParticlesBackground />}

      {topBarWithMobile}

      {/* 桌面端侧边栏 (hover 触发) */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>{sidebar}</Box>

      {/* 移动端抽屉 */}
      <Drawer
        anchor='left'
        open={mobileDrawerOpen}
        onClose={handleMobileMenuClose}
        sx={{ display: { xs: 'block', md: 'none' } }}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
          },
        }}
      >
        {sidebarForDrawer}
      </Drawer>

      <Box
        component='main'
        sx={{
          position: 'relative',
          zIndex: 2,
          ml: 0,
          minHeight: 'calc(100vh - var(--topbar-height))',
          // 注意：不给 main 加 will-change——内容含几百张卡片、总高可达上万像素，
          // 对 Chrome 而言是超大型合成层，超出上限会被放弃合成甚至反复重试（有害）。
          // 滚动流畅的关键是消除 hover/动画/backdrop-filter/contain 等逐帧重绘源，
          // 让 Chrome 走默认 tile 合成即可。
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

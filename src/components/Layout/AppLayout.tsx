import { useState, useCallback, cloneElement, isValidElement } from 'react';
import { Box, Drawer } from '@mui/material';
import type { ReactNode } from 'react';

interface AppLayoutProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  children: ReactNode;
  backgroundImage?: string;
  backgroundOpacity?: string;
}

export default function AppLayout({
  sidebar,
  topBar,
  children,
  backgroundImage,
  backgroundOpacity = '0.15',
}: AppLayoutProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleMobileMenuOpen = useCallback(() => setMobileDrawerOpen(true), []);
  const handleMobileMenuClose = useCallback(() => setMobileDrawerOpen(false), []);

  const topBarWithMobile =
    isValidElement(topBar)
      ? cloneElement(topBar as React.ReactElement<any>, { onMobileMenuOpen: handleMobileMenuOpen })
      : topBar;

  const sidebarForDrawer =
    isValidElement(sidebar)
      ? cloneElement(sidebar as React.ReactElement<any>, { variant: 'static' })
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

      {topBarWithMobile}

      {/* 桌面端侧边栏 (hover 触发) */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>{sidebar}</Box>

      {/* 移动端抽屉 */}
      <Drawer
        anchor="left"
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
        component="main"
        sx={{
          position: 'relative',
          zIndex: 2,
          ml: 0,
          minHeight: 'calc(100vh - 48px)',
          // 让 Chrome 把滚动内容提升为合成层（合成器驱动滚动，等价移动端/正文层滚动）：
          // 不加时 Chrome 滚动走主线程逐帧重绘，Safari 自动合成所以流畅。
          willChange: 'transform',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

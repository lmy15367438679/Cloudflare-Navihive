import { Box, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MenuIcon from '@mui/icons-material/Menu';
import ThemeToggle from '../ThemeToggle';
import { useState } from 'react';

interface TopBarProps {
  title: string;
  darkMode: boolean;
  isAuthenticated: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onOpenLinkChecker: () => void;
  onOpenBookmarklet: () => void;
  onOpenBatchMove: () => void;
  onOpenEnhancedSettings: () => void;
  onLogout: () => void;
  onMobileMenuOpen?: () => void;
}

export default function TopBar({
  title,
  darkMode,
  isAuthenticated,
  onToggleTheme,
  onOpenSettings,
  onOpenExport,
  onOpenImport,
  onOpenLinkChecker,
  onOpenBookmarklet,
  onOpenBatchMove,
  onOpenEnhancedSettings,
  onLogout,
}: TopBarProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        px: 2,
        bgcolor: 'var(--color-canvas)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton
          size="small"
          onClick={onMobileMenuOpen}
          sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'var(--text-secondary)' }}
        >
          <MenuIcon fontSize="small" />
        </IconButton>
        <Typography
          variant="h6"
          component="span"
          sx={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: '16px',
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <ThemeToggle darkMode={darkMode} onToggle={onToggleTheme} />

        {isAuthenticated && (
          <>
            <IconButton
              size="small"
              onClick={onOpenSettings}
              sx={{ color: 'var(--text-secondary)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </IconButton>

            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ color: 'var(--text-secondary)' }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              slotProps={{ paper: { sx: { bgcolor: 'var(--color-elevated)', border: '1px solid var(--color-border)' } } }}
            >
              <MenuItem onClick={() => { setMenuAnchor(null); onOpenLinkChecker(); }}>
                <ListItemText>链接检测</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); onOpenBookmarklet(); }}>
                <ListItemText>一键收藏</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); onOpenBatchMove(); }}>
                <ListItemText>批量移动</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); onOpenEnhancedSettings(); }}>
                <ListItemText>个性化设置</ListItemText>
              </MenuItem>
              <Divider sx={{ borderColor: 'var(--color-border)' }} />
              <MenuItem onClick={() => { setMenuAnchor(null); onOpenExport(); }}>
                <ListItemText>导出数据</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); onOpenImport(); }}>
                <ListItemText>导入数据</ListItemText>
              </MenuItem>
              <Divider sx={{ borderColor: 'var(--color-border)' }} />
              <MenuItem onClick={() => { setMenuAnchor(null); onLogout(); }} sx={{ color: 'var(--color-destructive)' }}>
                <ListItemText>退出登录</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>
    </Box>
  );
}

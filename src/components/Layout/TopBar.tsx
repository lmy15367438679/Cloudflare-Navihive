import { Box, Typography, IconButton, Menu, MenuItem, ListItemText, Divider } from '@mui/material';
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
  onMobileMenuOpen,
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
              <MenuItem onClick={() => { setMenuAnchor(null); onOpenSettings(); }}>
                <ListItemText>网站设置</ListItemText>
              </MenuItem>
              <Divider sx={{ borderColor: 'var(--color-border)' }} />
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

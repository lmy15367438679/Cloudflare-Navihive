import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  Divider,
  Tooltip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ThemeToggle from '../ThemeToggle';
import { useState } from 'react';

interface TopBarProps {
  title: string;
  darkMode: boolean;
  isAuthenticated: boolean;
  /** 是否处于游客会话（只读浏览公开内容） */
  isGuestMode?: boolean;
  onToggleTheme: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onOpenLinkChecker: () => void;
  onOpenBookmarklet: () => void;
  onOpenBatchMove: () => void;
  onOpenEnhancedSettings: () => void;
  onLogout: () => void;
  onMobileMenuOpen?: () => void;
  /** 一键回到全部分组 */
  onShowAll?: () => void;
  /** 当前是否处于某个分组视图（用于显示“回到全部”按钮） */
  isGroupView?: boolean;
}

export default function TopBar({
  title,
  darkMode,
  isAuthenticated,
  isGuestMode = false,
  onToggleTheme,
  onOpenExport,
  onOpenImport,
  onOpenLinkChecker,
  onOpenBookmarklet,
  onOpenBatchMove,
  onOpenEnhancedSettings,
  onLogout,
  onMobileMenuOpen,
  onShowAll,
  isGroupView = false,
}: TopBarProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box
      component='header'
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 'var(--topbar-height)',
        px: { xs: 1.5, sm: 2.5, md: 4 },
        bgcolor: 'color-mix(in srgb, var(--color-canvas) 88%, transparent)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton
          size='small'
          onClick={onMobileMenuOpen}
          sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'var(--text-secondary)' }}
        >
          <MenuIcon fontSize='small' />
        </IconButton>
        <Typography
          variant='h6'
          component='span'
          sx={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: '14px',
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </Typography>
        {isGuestMode && (
          <Box
            sx={{
              ml: 1,
              px: 1,
              py: 0.25,
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              lineHeight: 1.4,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: 'var(--color-accent)',
              bgcolor: 'var(--color-accent-dim)',
              border: '1px solid var(--color-accent-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            游客
          </Box>
        )}
        {isGroupView && (
          <Tooltip title='回到全部'>
            <IconButton
              size='small'
              onClick={onShowAll}
              aria-label='回到全部'
              sx={{
                color: 'var(--text-secondary)',
                '&:hover': {
                  color: 'var(--color-accent)',
                  bgcolor: 'var(--color-accent-dim)',
                },
              }}
            >
              <HomeIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <ThemeToggle darkMode={darkMode} onToggle={onToggleTheme} />

        {isAuthenticated && (
          <>
            <IconButton
              size='small'
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ color: 'var(--text-secondary)' }}
            >
              <MoreVertIcon fontSize='small' />
            </IconButton>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              slotProps={{
                paper: {
                  sx: { bgcolor: 'var(--color-elevated)', border: '1px solid var(--color-border)' },
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onOpenLinkChecker();
                }}
              >
                <ListItemText>链接检测</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onOpenBookmarklet();
                }}
              >
                <ListItemText>一键收藏</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onOpenBatchMove();
                }}
              >
                <ListItemText>批量移动</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onOpenEnhancedSettings();
                }}
              >
                <ListItemText>个性化设置</ListItemText>
              </MenuItem>
              <Divider sx={{ borderColor: 'var(--color-border)' }} />
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onOpenExport();
                }}
              >
                <ListItemText>导出数据</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onOpenImport();
                }}
              >
                <ListItemText>导入数据</ListItemText>
              </MenuItem>
              <Divider sx={{ borderColor: 'var(--color-border)' }} />
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onLogout();
                }}
                sx={{ color: 'var(--color-destructive)' }}
              >
                <ListItemText>退出登录</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>
    </Box>
  );
}

import { useState, useCallback, useRef } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Divider,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import FolderIcon from '@mui/icons-material/Folder';
import SearchBox from '../SearchBox';
import type { Group, Site } from '../../API/http';
import type { SearchResultItem } from '../../utils/search';

interface SidebarProps {
  groups: Group[];
  activeGroupId: number | null;
  isAuthenticated: boolean;
  viewMode: 'authenticated' | 'readonly';
  configs: Record<string, string>;
  variant?: 'hover' | 'static';
  onGroupClick: (groupId: number) => void;
  onAddGroup: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onSearchResultClick: (result: SearchResultItem) => void;
  /** 侧边栏收起时的回调 */
  onSidebarCollapse?: () => void;
}

export default function Sidebar({
  groups,
  activeGroupId,
  isAuthenticated,
  viewMode,
  variant = 'hover',
  onGroupClick,
  onAddGroup,
  onOpenSettings,
  onLogout,
  onSearchResultClick,
  onSidebarCollapse,
}: SidebarProps) {
  const isStatic = variant === 'static';
  const [expanded, setExpanded] = useState(isStatic);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setExpanded(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => {
      setExpanded(false);
      onSidebarCollapse?.();
    }, 200);
  }, [onSidebarCollapse]);

  const sites: Site[] = (groups as Array<Group & { sites?: Site[] }>).flatMap((g) => g.sites || []);

  return (
    <>
      {/* 触发条 - 仅 hover 模式 */}
      {!isStatic && (
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            zIndex: 1200,
            cursor: 'pointer',
          }}
          onMouseEnter={handleMouseEnter}
        />
      )}

      {/* 侧边栏 */}
      <Box
        component="nav"
        onMouseEnter={isStatic ? undefined : handleMouseEnter}
        onMouseLeave={isStatic ? undefined : handleMouseLeave}
        sx={{
          position: isStatic ? 'relative' : 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: isStatic ? '100%' : 'var(--sidebar-width)',
          zIndex: 1199,
          bgcolor: 'var(--color-surface)',
          borderRight: isStatic ? 'none' : '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          ...(isStatic
            ? {}
            : {
                transform: expanded ? 'translateX(0)' : 'translateX(calc(-1 * var(--sidebar-width) + 4px))',
                opacity: expanded ? 1 : 0,
                transition: 'transform 200ms ease-out, opacity 200ms ease-out',
                pointerEvents: expanded ? 'auto' : 'none',
              }),
        }}
      >
        {/* 搜索框 */}
        <Box sx={{ p: 1.5 }}>
          <SearchBox
            groups={groups.map((g) => ({
              id: g.id,
              name: g.name,
              order_num: g.order_num,
              is_public: g.is_public,
              created_at: g.created_at,
              updated_at: g.updated_at,
            }))}
            sites={sites}
            onInternalResultClick={(result) => {
              onSearchResultClick(result);
              setExpanded(false);
              onSidebarCollapse?.();
            }}
          />
        </Box>

        <Divider sx={{ borderColor: 'var(--color-border)' }} />

        {/* 分组列表 */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 0.5 }}>
          <List dense>
            {groups.map((group) => (
              <Tooltip
                key={group.id}
                title={group.name.length > 12 ? group.name : ''}
                placement="right"
              >
                <ListItemButton
                  onClick={() => onGroupClick(group.id as number)}
                  selected={activeGroupId === group.id}
                  sx={{
                    borderRadius: 'var(--radius-md)',
                    mx: 0.5,
                    mb: 0.25,
                    minHeight: 44,
                    '&.Mui-selected': {
                      bgcolor: 'var(--color-accent-dim)',
                      color: 'var(--color-accent)',
                      borderLeft: '3px solid var(--color-accent)',
                      '&:hover': {
                        bgcolor: 'var(--color-accent-dim)',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                    <FolderIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={group.name}
                    primaryTypographyProps={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '14px',
                      fontWeight: 500,
                      noWrap: true,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'var(--font-body)',
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
                      bgcolor: 'var(--color-border)',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '10px',
                      minWidth: 22,
                      textAlign: 'center',
                      fontWeight: 500,
                    }}
                  >
                    {((group as Group & { sites?: Site[] }).sites?.length) || 0}
                  </Typography>
                </ListItemButton>
              </Tooltip>
            ))}
          </List>
        </Box>

        {/* 底部操作区 */}
        <Divider sx={{ borderColor: 'var(--color-border)' }} />
        <Box sx={{ p: 1 }}>
          {isAuthenticated && (
            <ListItemButton
              onClick={onAddGroup}
              sx={{
                borderRadius: 'var(--radius-md)',
                mb: 0.5,
                color: 'var(--color-accent)',
                '&:hover': { bgcolor: 'var(--color-accent-dim)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="新增分组"
                primaryTypographyProps={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          )}

          {isAuthenticated && (
            <ListItemButton
              onClick={onOpenSettings}
              sx={{
                borderRadius: 'var(--radius-md)',
                mb: 0.5,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'var(--text-secondary)' }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="网站设置"
                primaryTypographyProps={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                }}
              />
            </ListItemButton>
          )}

          {viewMode === 'readonly' ? (
            <ListItemButton
              onClick={onLogout}
              sx={{
                borderRadius: 'var(--radius-md)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'var(--text-secondary)' }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="管理员登录"
                primaryTypographyProps={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                }}
              />
            </ListItemButton>
          ) : (
            <ListItemButton
              onClick={onLogout}
              sx={{
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-destructive)',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="退出登录"
                primaryTypographyProps={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          )}
        </Box>
      </Box>
    </>
  );
}

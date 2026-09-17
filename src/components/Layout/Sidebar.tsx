import { memo, useMemo } from 'react';
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
import AppsIcon from '@mui/icons-material/Apps';
import SearchBox from '../SearchBox';
import type { Group, Site } from '../../API/http';
import type { SearchResultItem } from '../../utils/search';

interface SidebarProps {
  groups: Group[];
  activeGroupId: number | null;
  isAuthenticated: boolean;
  viewMode: 'authenticated' | 'readonly';
  /** 是否处于游客会话（只读浏览公开内容） */
  isGuestMode?: boolean;
  configs: Record<string, string>;
  onGroupClick: (groupId: number) => void;
  onAddGroup: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onSearchResultClick: (result: SearchResultItem) => void;
  /** 展示全部分组 */
  onShowAll: () => void;
  /** 移动端完成选择后关闭抽屉 */
  onSidebarCollapse?: () => void;
}

const Sidebar = memo(function Sidebar({
  groups,
  activeGroupId,
  isAuthenticated,
  viewMode,
  isGuestMode = false,
  configs,
  onGroupClick,
  onAddGroup,
  onOpenSettings,
  onLogout,
  onSearchResultClick,
  onShowAll,
  onSidebarCollapse,
}: SidebarProps) {
  const sites: Site[] = useMemo(
    () => (groups as Array<Group & { sites?: Site[] }>).flatMap((g) => g.sites || []),
    [groups]
  );

  // 搜索框显隐由个性化设置控制（site.searchBoxEnabled）：总开关关闭则管理员也看不到；
  // 访客（readonly）视图还需 site.searchBoxGuestEnabled 允许
  const showSearchBox =
    configs['site.searchBoxEnabled'] !== 'false' &&
    (isAuthenticated || configs['site.searchBoxGuestEnabled'] !== 'false');

  return (
    <Box
      component='nav'
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        bgcolor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          minHeight: 76,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Box
          aria-hidden='true'
          sx={{
            width: 34,
            height: 34,
            borderRadius: '11px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'var(--color-accent)',
            color: 'var(--text-on-accent)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 750,
            fontSize: '15px',
            boxShadow: '0 5px 16px var(--color-accent-muted)',
          }}
        >
          N
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            noWrap
            sx={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '15px',
              letterSpacing: '-0.01em',
            }}
          >
            {configs['site.name'] || 'Navihive'}
          </Typography>
          <Typography sx={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>
            个人导航目录
          </Typography>
        </Box>
      </Box>

      {/* 搜索框（site.searchBoxEnabled / site.searchBoxGuestEnabled） */}
      {showSearchBox && (
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
              onSidebarCollapse?.();
            }}
          />
        </Box>
      )}

      <Divider sx={{ borderColor: 'var(--color-border)' }} />

      {/* 分组列表 */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 0.5 }}>
        <List dense>
          <ListItemButton
            onClick={onShowAll}
            selected={activeGroupId === null}
            sx={{
              borderRadius: 'var(--radius-md)',
              mx: 0.5,
              mb: 0.25,
              minHeight: 44,
              '&.Mui-selected': {
                bgcolor: 'var(--color-accent-dim)',
                color: 'var(--color-accent)',
                boxShadow: 'inset 3px 0 0 var(--color-accent)',
                '&:hover': {
                  bgcolor: 'var(--color-accent-dim)',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
              <AppsIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText
              primary='全部站点'
              primaryTypographyProps={{
                fontFamily: 'var(--font-heading)',
                fontSize: '14px',
                fontWeight: 500,
                noWrap: true,
              }}
            />
          </ListItemButton>
          {groups.map((group) => (
            <Tooltip
              key={group.id}
              title={group.name.length > 12 ? group.name : ''}
              placement='right'
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
                    boxShadow: 'inset 3px 0 0 var(--color-accent)',
                    '&:hover': {
                      bgcolor: 'var(--color-accent-dim)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                  <FolderIcon fontSize='small' />
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
                  variant='caption'
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
                  {(group as Group & { sites?: Site[] }).sites?.length || 0}
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
              <AddIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText
              primary='新增分组'
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
              <SettingsIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText
              primary='个性化设置'
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
          <>
            {isGuestMode && (
              <Box
                sx={{
                  px: 1,
                  py: 0.75,
                  mb: 0.5,
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: 'var(--color-accent)',
                  bgcolor: 'var(--color-accent-dim)',
                  border: '1px solid var(--color-accent-muted)',
                }}
              >
                游客模式 · 仅浏览公开内容
              </Box>
            )}
            <ListItemButton
              onClick={onLogout}
              sx={{
                borderRadius: 'var(--radius-md)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'var(--text-secondary)' }}>
                <SettingsIcon fontSize='small' />
              </ListItemIcon>
              <ListItemText
                primary={isGuestMode ? '登录管理员' : '管理员登录'}
                primaryTypographyProps={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                }}
              />
            </ListItemButton>
          </>
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
              <LogoutIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText
              primary='退出登录'
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
  );
});

export default Sidebar;

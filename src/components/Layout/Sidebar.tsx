import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
import { EXPAND_SIDEBAR_EVENT } from '../../hooks/useSearchShortcut';

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
  /** 展示全部分组 */
  onShowAll: () => void;
  /** 侧边栏收起时的回调 */
  onSidebarCollapse?: () => void;
}

const Sidebar = memo(function Sidebar({
  groups,
  activeGroupId,
  isAuthenticated,
  viewMode,
  configs,
  variant = 'hover',
  onGroupClick,
  onAddGroup,
  onOpenSettings,
  onLogout,
  onSearchResultClick,
  onShowAll,
  onSidebarCollapse,
}: SidebarProps) {
  const isStatic = variant === 'static';
  const [expanded, setExpanded] = useState(isStatic);
  const navRef = useRef<HTMLDivElement | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 侧栏内是否有「正在输入」的焦点（搜索框等） */
  const isTypingInsideNav = useCallback(() => {
    const nav = navRef.current;
    const active = document.activeElement;
    return Boolean(
      nav &&
        active &&
        nav.contains(active) &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
    );
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setExpanded(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // 快捷键（⌘K / Ctrl+K / /）展开侧栏后用户仍在搜索框内输入时，不因鼠标掠过而收起，
    // 否则输入框会带着焦点消失（焦点还在、内容看不见）。此时的收起交由下方 focusout 驱动。
    if (isTypingInsideNav()) return;
    leaveTimerRef.current = setTimeout(() => {
      setExpanded(false);
      onSidebarCollapse?.();
    }, 200);
  }, [isTypingInsideNav, onSidebarCollapse]);

  const sites: Site[] = useMemo(
    () => (groups as Array<Group & { sites?: Site[] }>).flatMap((g) => g.sites || []),
    [groups]
  );

  // 搜索框显隐由个性化设置控制（site.searchBoxEnabled）：总开关关闭则管理员也看不到；
  // 访客（readonly）视图还需 site.searchBoxGuestEnabled 允许
  const showSearchBox =
    configs['site.searchBoxEnabled'] !== 'false' &&
    (isAuthenticated || configs['site.searchBoxGuestEnabled'] !== 'false');

  // 响应顶层派发的展开事件（⌘K / Ctrl+K / /）：hover 模式侧栏初始收起，先展开再聚焦搜索框。
  // 展开与聚焦解耦：事件为同步派发，聚焦由派发侧延迟一帧再发（见 hooks/useSearchShortcut）。
  useEffect(() => {
    const onExpandSidebar = () => setExpanded(true);
    window.addEventListener(EXPAND_SIDEBAR_EVENT, onExpandSidebar);
    return () => window.removeEventListener(EXPAND_SIDEBAR_EVENT, onExpandSidebar);
  }, []);

  // 焦点驱动收起：快捷键展开后焦点落在搜索框内，一旦焦点离开侧栏（点搜索结果 / 点别处 / Tab 离开），
  // 延迟收起——面板跟着焦点走，不会出现「焦点还在、面板却已经消失」的错位状态。
  // 焦点从未进入侧栏时 focusout 不会触发，因此普通 hover 展开的交互完全不受影响。
  useEffect(() => {
    if (isStatic) return;
    const nav = navRef.current;
    if (!nav) return;
    const onFocusOut = (e: FocusEvent) => {
      if (nav.contains(e.relatedTarget as Node | null)) return;
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = setTimeout(() => {
        setExpanded(false);
        onSidebarCollapse?.();
      }, 200);
    };
    nav.addEventListener('focusout', onFocusOut);
    return () => nav.removeEventListener('focusout', onFocusOut);
  }, [isStatic, onSidebarCollapse]);

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
        component='nav'
        ref={navRef}
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
                transform: expanded
                  ? 'translateX(0)'
                  : 'translateX(calc(-1 * var(--sidebar-width) + 4px))',
                opacity: expanded ? 1 : 0,
                transition: 'transform 200ms ease-out, opacity 200ms ease-out',
                pointerEvents: expanded ? 'auto' : 'none',
              }),
        }}
      >
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
                setExpanded(false);
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
                  borderLeft: '3px solid var(--color-accent)',
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
                      borderLeft: '3px solid var(--color-accent)',
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
                primary='管理员登录'
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
    </>
  );
});

export default Sidebar;

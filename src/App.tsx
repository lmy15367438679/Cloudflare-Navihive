import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import { NavigationClient } from './API/client';
import { MockNavigationClient } from './API/mock';
import { Site, Group } from './API/http';
import GroupCard from './components/GroupCard';
import LoginForm from './components/LoginForm';
import LinkChecker from './components/NewFeatures/LinkChecker';
import BookmarkletGuide from './components/NewFeatures/BookmarkletGuide';
import BookmarkletAddPanel from './components/NewFeatures/BookmarkletAddPanel';
import BatchMoveDialog from './components/NewFeatures/BatchMoveDialog';
import EnhancedSettings from './components/NewFeatures/EnhancedSettings';
import LoadingSkeleton from './components/LoadingSkeleton';
import { sanitizeCSS, isSecureUrl, extractDomain } from './utils/url';
import { SearchResultItem } from './utils/search';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import { useMusicPlayer } from './hooks/useMusicPlayer';
import AppLayout from './components/Layout/AppLayout';
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import PerformanceMonitor from './components/PerformanceMonitor';
import './App.css';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableGroupItem from './components/SortableGroupItem';
// Material UI 导入
import { createAppTheme } from './theme/theme';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Paper,
  ThemeProvider,
  CssBaseline,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  InputAdornment,
  Slider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

// 根据环境选择使用真实API还是模拟API
const isDevEnvironment = import.meta.env.DEV;
const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true';

const api =
  isDevEnvironment && !useRealApi
    ? new MockNavigationClient()
    : new NavigationClient(isDevEnvironment ? 'http://localhost:8788/api' : '/api');

// 排序模式枚举
enum SortMode {
  None,
  GroupSort,
  SiteSort,
}

// 默认配置
const DEFAULT_CONFIGS = {
  'site.title': '导航站',
  'site.name': '导航站',
  'site.customCss': '',
  'site.backgroundImage': '',
  'site.backgroundOpacity': '0.15',
  'site.iconApi': 'https://www.faviconextractor.com/favicon/{domain}?larger=true',
  'site.searchBoxEnabled': 'true',
  'site.searchBoxGuestEnabled': 'true',
};

function App() {
  // ========== 主题 ==========
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const theme = useMemo(() => createAppTheme(darkMode), [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  // ========== 错误提示 ==========
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [importResultMessage, setImportResultMessage] = useState('');

  const handleError = useCallback((errorMessage: string) => {
    setSnackbarMessage(errorMessage);
    setSnackbarOpen(true);
    console.error(errorMessage);
  }, []);

  const handleCloseSnackbar = () => setSnackbarOpen(false);

  // ========== 数据层 ==========
  const {
    groups,
    setGroups,
    loading,
    fetchData,
    handleSiteUpdate,
    handleSiteDelete,
    handleMoveGroup,
    handleGroupUpdate,
    handleGroupDelete,
    handleCreateGroup,
    handleCreateSite,
    handleExportData,
    handleImportData,
  } = useData({ api, onError: handleError });

  // ========== 认证层 ==========
  const {
    isAuthChecking,
    isAuthRequired,
    isAuthenticated,
    loginError,
    loginLoading,
    viewMode,
    checkAuthStatus,
    handleLogin,
    handleLogout,
  } = useAuth({
    api,
    onLoginSuccess: async () => {
      await fetchData();
      await fetchConfigs();
    },
    onLogout: async () => {
      await fetchData();
      await fetchConfigs();
    },
  });

  // ========== 音乐播放器 ==========
  const {
    globalMusicPlaying,
    globalMusicUrl,
    globalVolume,
    setGlobalVolume,
    showMusicPlayer,
    handlePlayMusic,
    togglePlayPause,
    closePlayer,
    cleanup,
  } = useMusicPlayer();

  // ========== 排序 ==========
  const [sortMode, setSortMode] = useState<SortMode>(SortMode.None);
  const [currentSortingGroupId, setCurrentSortingGroupId] = useState<number | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

  // 选中分组的“自动展开”信号：每次点击侧栏分组/搜索结果时携带新时间戳，
  // 对应 GroupCard 收到后自动展开（即使该组此前被折叠）
  const [expandSignal, setExpandSignal] = useState<{ id: number; n: number } | null>(null);

  const handleSidebarGroupClick = useCallback((groupId: number) => {
    setActiveGroupId(groupId);
    setExpandSignal({ id: groupId, n: Date.now() });
    const el = document.getElementById(`group-${groupId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleShowAllGroups = useCallback(() => {
    setActiveGroupId(null);
    setExpandSignal(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearchResultClick = useCallback((result: SearchResultItem) => {
    if (result.type === 'group') {
      setActiveGroupId(result.id);
      setExpandSignal({ id: result.id, n: Date.now() });
      const el = document.getElementById(`group-${result.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (result.type === 'site' && result.groupId) {
      setActiveGroupId(result.groupId);
      setExpandSignal({ id: result.groupId, n: Date.now() });
      const el = document.getElementById(`group-${result.groupId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 1, delay: 0 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 3 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSaveGroupOrder = async () => {
    try {
      const groupOrders = groups.map((group, index) => ({
        id: group.id as number,
        order_num: index,
      }));
      const result = await api.updateGroupOrder(groupOrders);
      if (result) {
        await fetchData();
      } else {
        throw new Error('分组排序更新失败');
      }
      setSortMode(SortMode.None);
      setCurrentSortingGroupId(null);
    } catch (error) {
      handleError('更新分组排序失败: ' + (error as Error).message);
    }
  };

  const handleSaveSiteOrder = async (_groupId: number, sites: Site[]) => {
    try {
      const siteOrders = sites.map((site, index) => ({
        id: site.id as number,
        order_num: index,
      }));
      const result = await api.updateSiteOrder(siteOrders);
      if (result) {
        await fetchData();
      } else {
        throw new Error('站点排序更新失败');
      }
      setSortMode(SortMode.None);
      setCurrentSortingGroupId(null);
    } catch (error) {
      handleError('更新站点排序失败: ' + (error as Error).message);
    }
  };

  const startSiteSort = (groupId: number) => {
    setSortMode(SortMode.SiteSort);
    setCurrentSortingGroupId(groupId);
  };

  const cancelSort = () => {
    setSortMode(SortMode.None);
    setCurrentSortingGroupId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = groups.findIndex((group) => group.id.toString() === active.id);
      const newIndex = groups.findIndex((group) => group.id.toString() === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setGroups(arrayMove(groups, oldIndex, newIndex));
      }
    }
  };

  // ========== 配置 ==========
  const [configs, setConfigs] = useState<Record<string, string>>(DEFAULT_CONFIGS);
  const [openConfig, setOpenConfig] = useState(false);
  const [tempConfigs, setTempConfigs] = useState<Record<string, string>>(DEFAULT_CONFIGS);

  const fetchConfigs = async () => {
    try {
      const configsData = await api.getConfigs();
      setConfigs({ ...DEFAULT_CONFIGS, ...configsData });
      setTempConfigs({ ...DEFAULT_CONFIGS, ...configsData });
    } catch {
      // 使用默认配置
    }
  };

  const handleOpenConfig = () => {
    setTempConfigs({ ...configs });
    setOpenConfig(true);
  };

  const handleCloseConfig = () => setOpenConfig(false);

  const handleConfigInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempConfigs({ ...tempConfigs, [e.target.name]: e.target.value });
  };

  const handleSaveConfig = async () => {
    try {
      for (const [key, value] of Object.entries(tempConfigs)) {
        if (configs[key] !== value) {
          await api.setConfig(key, value);
        }
      }
      setConfigs({ ...tempConfigs });
      handleCloseConfig();
    } catch (error) {
      handleError('保存配置失败: ' + (error as Error).message);
    }
  };

  // ========== 新增分组/站点对话框 ==========
  const [openAddGroup, setOpenAddGroup] = useState(false);
  const [openAddSite, setOpenAddSite] = useState(false);
  const [newGroup, setNewGroup] = useState<Partial<Group>>({
    name: '',
    order_num: 0,
    is_public: 1,
  });
  const [newSite, setNewSite] = useState<Partial<Site>>({
    name: '',
    url: '',
    icon: '',
    description: '',
    notes: '',
    order_num: 0,
    group_id: 0,
    is_public: 1,
  });

  const handleOpenAddGroup = () => {
    setNewGroup({ name: '', order_num: groups.length, is_public: 1 });
    setOpenAddGroup(true);
  };

  const handleCloseAddGroup = () => setOpenAddGroup(false);

  const handleGroupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGroup({ ...newGroup, [e.target.name]: e.target.value });
  };

  const handleCreateGroupClick = async () => {
    if (!newGroup.name) {
      handleError('分组名称不能为空');
      return;
    }
    await handleCreateGroup(newGroup as Group);
    handleCloseAddGroup();
    setNewGroup({ name: '', order_num: 0 });
  };

  const handleOpenAddSite = (groupId: number) => {
    const group = groups.find((g) => g.id === groupId);
    const maxOrderNum = group?.sites.length
      ? Math.max(...group.sites.map((s) => s.order_num)) + 1
      : 0;
    setNewSite({
      name: '',
      url: '',
      icon: '',
      description: '',
      notes: '',
      group_id: groupId,
      order_num: maxOrderNum,
      is_public: 1,
    });
    setOpenAddSite(true);
  };

  const handleCloseAddSite = () => setOpenAddSite(false);

  const handleSiteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSite({ ...newSite, [e.target.name]: e.target.value });
  };

  const handleCreateSiteClick = async () => {
    if (!newSite.name || !newSite.url) {
      handleError('站点名称和URL不能为空');
      return;
    }
    await handleCreateSite(newSite as Site);
    handleCloseAddSite();
  };

  // ========== 导入导出 ==========
  const [openImport, setOpenImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const handleOpenImport = () => {
    setImportFile(null);
    setImportError(null);
    setOpenImport(true);
  };

  const handleCloseImport = () => setOpenImport(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        setImportFile(selectedFile);
        setImportError(null);
      }
    }
  };

  const handleImportDataClick = async () => {
    if (!importFile) {
      handleError('请选择要导入的文件');
      return;
    }
    setImportLoading(true);
    setImportError(null);

    const result = await handleImportData(importFile);

    if (result.success && result.message) {
      setImportResultMessage(result.message);
      setImportResultOpen(true);
      await fetchConfigs();
      handleCloseImport();
    } else if (!result.success) {
      setImportError('导入失败');
    }
    setImportLoading(false);
  };

  // ========== 新增功能对话框状态 ==========
  const [openLinkChecker, setOpenLinkChecker] = useState(false);
  const [openBookmarklet, setOpenBookmarklet] = useState(false);
  const [openBatchMove, setOpenBatchMove] = useState(false);
  const [openEnhancedSettings, setOpenEnhancedSettings] = useState(false);

  // ========== 书签脚本弹窗模式 ==========
  const [bookmarkletData, setBookmarkletData] = useState<{
    title: string;
    url: string;
    icon: string;
    description: string;
  } | null>(null);

  // ========== useEffect ==========
  useEffect(() => {
    checkAuthStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.get('add_bookmark') === 'true') {
      setBookmarkletData({
        title: params.get('title') || '',
        url: params.get('url') || '',
        icon: params.get('icon') || '',
        description: params.get('description') || '',
      });
    }

    setSortMode(SortMode.None);
    setCurrentSortingGroupId(null);

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    document.title = configs['site.title'] || '导航站';
  }, [configs]);

  useEffect(() => {
    const customCss = configs['site.customCss'];
    let styleElement = document.getElementById('custom-style');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'custom-style';
      document.head.appendChild(styleElement);
    }
    const sanitized = sanitizeCSS(customCss || '');
    styleElement.textContent = sanitized;
    return () => {
      const el = document.getElementById('custom-style');
      if (el) el.remove();
    };
  }, [configs]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // BroadcastChannel 跨标签页自动刷新
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('navihive-updates');
      channel.onmessage = (event) => {
        if (event.data?.type === 'bookmark-added' || event.data?.type === 'data-changed') {
          // 静默刷新：不触发骨架屏，避免整页闪烁
          fetchData({ silent: true });
        }
      };
    } catch {
      // BroadcastChannel 不受支持
    }
    return () => {
      channel?.close();
    };
  }, []);

  // 页面可见性变化自动刷新
  const isFirstVisibleRef = useRef(true);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isFirstVisibleRef.current) {
          isFirstVisibleRef.current = false;
          return;
        }
        // 静默刷新：切回标签页时后台更新，避免骨架屏闪烁
        fetchData({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ========== 渲染 ==========

  // 认证检查中
  if (isAuthChecking) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'var(--color-canvas)',
          }}
        >
          <CircularProgress size={60} thickness={4} />
        </Box>
      </ThemeProvider>
    );
  }

  // 需要登录
  if (isAuthRequired && !isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'var(--color-canvas)',
          }}
        >
          <LoginForm onLogin={handleLogin} loading={loginLoading} error={loginError} />
        </Box>
      </ThemeProvider>
    );
  }

  // 书签脚本弹窗模式
  if (bookmarkletData) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BookmarkletAddPanel
          initialData={bookmarkletData}
          groups={groups}
          configs={configs}
          onSave={async (siteData) => {
            await api.createSite(siteData);
          }}
          onClose={() => window.close()}
          handleError={handleError}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* 错误提示 Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity='error'
          variant='filled'
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* 导入结果提示 Snackbar */}
      <Snackbar
        open={importResultOpen}
        autoHideDuration={6000}
        onClose={() => setImportResultOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setImportResultOpen(false)}
          severity='success'
          variant='filled'
          sx={{
            width: '100%',
            whiteSpace: 'pre-line',
            bgcolor: 'var(--color-success)',
            color: '#fff',
            '& .MuiAlert-icon': { color: '#fff' },
          }}
        >
          {importResultMessage}
        </Alert>
      </Snackbar>

      <AppLayout
        backgroundImage={
          configs['site.backgroundImage'] && isSecureUrl(configs['site.backgroundImage'])
            ? configs['site.backgroundImage']
            : undefined
        }
        backgroundOpacity={configs['site.backgroundOpacity']}
        sidebar={
          <Sidebar
            groups={groups}
            activeGroupId={activeGroupId}
            isAuthenticated={isAuthenticated}
            viewMode={isAuthenticated ? 'authenticated' : 'readonly'}
            configs={configs}
            onGroupClick={handleSidebarGroupClick}
            onAddGroup={handleOpenAddGroup}
            onOpenSettings={handleOpenConfig}
            onLogout={handleLogout}
            onSearchResultClick={handleSearchResultClick}
            onShowAll={handleShowAllGroups}
          />
        }
        topBar={
          <TopBar
            title={configs['site.name'] ?? ''}
            darkMode={darkMode}
            isAuthenticated={isAuthenticated}
            onToggleTheme={toggleTheme}
            onOpenSettings={handleOpenConfig}
            onOpenExport={() => handleExportData(groups, configs)}
            onOpenImport={handleOpenImport}
            onOpenLinkChecker={() => setOpenLinkChecker(true)}
            onOpenBookmarklet={() => setOpenBookmarklet(true)}
            onOpenBatchMove={() => setOpenBatchMove(true)}
            onOpenEnhancedSettings={() => setOpenEnhancedSettings(true)}
            onLogout={handleLogout}
            onShowAll={handleShowAllGroups}
            isGroupView={activeGroupId !== null}
          />
        }
      >
        <Container
          maxWidth='lg'
          sx={{
            py: 4,
            px: { xs: 2, sm: 3, md: 4 },
            position: 'relative',
            zIndex: 2,
          }}
        >

          {/* 排序模式工具栏 */}
          {sortMode !== SortMode.None && (
            <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'center' }}>
              <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: '14px', color: 'var(--text-secondary)', flex: 1 }}>
                {sortMode === SortMode.GroupSort ? '拖拽分组以重新排序' : '拖拽站点以重新排序'}
              </Typography>
              {sortMode === SortMode.GroupSort && (
                <Button variant="contained" size="small" onClick={handleSaveGroupOrder} sx={{ bgcolor: 'var(--color-accent)', '&:hover': { bgcolor: 'var(--color-accent-dim)' } }}>
                  保存
                </Button>
              )}
              <Button variant="outlined" size="small" onClick={cancelSort} sx={{ borderColor: 'var(--color-border)', color: 'var(--text-secondary)' }}>
                取消
              </Button>
            </Box>
          )}

          {loading && <LoadingSkeleton />}

          {!loading && groups.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 10,
                px: 3,
                textAlign: 'center',
                animation: 'contentIn 350ms ease-out',
                '@keyframes contentIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'var(--color-accent-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 3,
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </Box>
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--text-primary)', mb: 1 }}>
                还没有任何内容
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', maxWidth: 360 }}>
                {isAuthenticated ? '点击左下角「新增分组」开始创建你的导航站' : '管理员登录后即可添加导航内容'}
              </Typography>
            </Box>
          )}

          {!loading && groups.length > 0 && (
            <Box
              sx={{
                '& > *': { mb: 3 },
                minHeight: '100px',
              }}
            >
              {sortMode === SortMode.GroupSort ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={groups.map((group) => group.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    <Stack spacing={2} sx={{ '& > *': { transition: 'none' } }}>
                      {groups.map((group) => (
                        <SortableGroupItem key={group.id} id={group.id.toString()} group={group} />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
              ) : (
                <Stack spacing={3}>
                  {(activeGroupId
                    ? groups.filter((g) => g.id === activeGroupId)
                    : groups
                  ).map((group) => (
                    <Box key={`group-${group.id}`} id={`group-${group.id}`}>
                      <GroupCard
                        group={group}
                        expandSignal={expandSignal}
                        sortMode={sortMode === SortMode.None ? 'None' : 'SiteSort'}
                        currentSortingGroupId={currentSortingGroupId}
                        viewMode={viewMode}
                        onUpdate={handleSiteUpdate}
                        onDelete={handleSiteDelete}
                        onSaveSiteOrder={handleSaveSiteOrder}
                        onStartSiteSort={startSiteSort}
                        onAddSite={handleOpenAddSite}
                        onUpdateGroup={handleGroupUpdate}
                        onDeleteGroup={handleGroupDelete}
                        configs={configs}
                        groups={groups}
                        onMoveGroup={handleMoveGroup}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* 新增分组对话框 */}
          <Dialog open={openAddGroup} onClose={handleCloseAddGroup} maxWidth='md' fullWidth
            slotProps={{ paper: { sx: { bgcolor: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' } } }}
          >
            <DialogTitle>
              新增分组
              <IconButton aria-label='close' onClick={handleCloseAddGroup} sx={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>请输入新分组的信息</DialogContentText>
              <TextField
                autoFocus margin='dense' id='group-name' name='name' label='分组名称'
                type='text' fullWidth variant='outlined'
                value={newGroup.name} onChange={handleGroupInputChange} sx={{ mb: 2 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={newGroup.is_public !== 0}
                    onChange={(e) => setNewGroup({ ...newGroup, is_public: e.target.checked ? 1 : 0 })}
                    color='primary'
                  />
                }
                label={
                  <Box>
                    <Typography variant='body1'>{newGroup.is_public !== 0 ? '公开分组' : '私密分组'}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {newGroup.is_public !== 0 ? '所有访客都可以看到此分组' : '只有管理员登录后才能看到此分组'}
                    </Typography>
                  </Box>
                }
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseAddGroup} variant='outlined'>取消</Button>
              <Button onClick={handleCreateGroupClick} variant='contained' color='primary'>创建</Button>
            </DialogActions>
          </Dialog>

          {/* 新增站点对话框 */}
          <Dialog open={openAddSite} onClose={handleCloseAddSite} maxWidth='md' fullWidth
            slotProps={{ paper: { sx: { bgcolor: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' } } }}
          >
            <DialogTitle>
              新增站点
              <IconButton aria-label='close' onClick={handleCloseAddSite} sx={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>请输入新站点的信息</DialogContentText>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField autoFocus margin='dense' id='site-name' name='name' label='站点名称'
                      type='text' fullWidth variant='outlined' value={newSite.name} onChange={handleSiteInputChange} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField margin='dense' id='site-url' name='url' label='站点URL'
                      type='url' fullWidth variant='outlined' value={newSite.url} onChange={handleSiteInputChange} />
                  </Box>
                </Box>
                <TextField margin='dense' id='site-icon' name='icon' label='图标URL'
                  type='url' fullWidth variant='outlined' value={newSite.icon} onChange={handleSiteInputChange}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          onClick={() => {
                            if (!newSite.url) { handleError('请先输入站点URL'); return; }
                            const domain = extractDomain(newSite.url);
                            if (domain) {
                              const actualIconApi = configs['site.iconApi'] ||
                                'https://www.faviconextractor.com/favicon/{domain}?larger=true';
                              setNewSite({ ...newSite, icon: actualIconApi.replace('{domain}', domain) });
                            } else { handleError('无法从URL中获取域名'); }
                          }}
                          edge='end' title='自动获取图标'
                        >
                          <AutoFixHighIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField margin='dense' id='site-description' name='description' label='站点描述'
                  type='text' fullWidth variant='outlined' value={newSite.description} onChange={handleSiteInputChange} />
                <TextField margin='dense' id='site-notes' name='notes' label='备注'
                  type='text' fullWidth multiline rows={2} variant='outlined' value={newSite.notes} onChange={handleSiteInputChange} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newSite.is_public !== 0}
                      onChange={(e) => setNewSite({ ...newSite, is_public: e.target.checked ? 1 : 0 })}
                      color='primary'
                    />
                  }
                  label={
                    <Box>
                      <Typography variant='body1'>{newSite.is_public !== 0 ? '公开站点' : '私密站点'}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {newSite.is_public !== 0 ? '所有访客都可以看到此站点' : '只有管理员登录后才能看到此站点'}
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseAddSite} variant='outlined'>取消</Button>
              <Button onClick={handleCreateSiteClick} variant='contained' color='primary'>创建</Button>
            </DialogActions>
          </Dialog>

          {/* 网站设置对话框 */}
          <Dialog open={openConfig} onClose={handleCloseConfig} maxWidth='md' fullWidth
            slotProps={{ paper: { sx: { bgcolor: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' } } }}
          >
            <DialogTitle>
              网站设置
              <IconButton aria-label='close' onClick={handleCloseConfig} sx={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>自定义导航站的名称、样式和功能</DialogContentText>
              <Stack spacing={2}>
                <TextField autoFocus margin='dense' name='site.title' label='网站标题'
                  type='text' fullWidth variant='outlined' value={tempConfigs['site.title'] || ''}
                  onChange={handleConfigInputChange} />
                <TextField margin='dense' name='site.name' label='网站名称'
                  type='text' fullWidth variant='outlined' value={tempConfigs['site.name'] || ''}
                  onChange={handleConfigInputChange} />
                <TextField margin='dense' name='site.customCss' label='自定义CSS'
                  type='text' fullWidth multiline rows={4} variant='outlined'
                  value={tempConfigs['site.customCss'] || ''} onChange={handleConfigInputChange} />
                <TextField margin='dense' name='site.iconApi' label='图标API地址'
                  type='text' fullWidth variant='outlined' value={tempConfigs['site.iconApi'] || ''}
                  onChange={handleConfigInputChange}
                  helperText='使用 {domain} 作为域名占位符' />
                <FormControlLabel
                  control={
                    <Switch
                      checked={tempConfigs['site.searchBoxEnabled'] === 'true'}
                      onChange={(e) => setTempConfigs({ ...tempConfigs, 'site.searchBoxEnabled': e.target.checked ? 'true' : 'false' })}
                    />
                  }
                  label='启用搜索框'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={tempConfigs['site.searchBoxGuestEnabled'] === 'true'}
                      onChange={(e) => setTempConfigs({ ...tempConfigs, 'site.searchBoxGuestEnabled': e.target.checked ? 'true' : 'false' })}
                    />
                  }
                  label='访客也可使用搜索框'
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseConfig} variant='outlined'>取消</Button>
              <Button onClick={handleSaveConfig} variant='contained' color='primary'>保存</Button>
            </DialogActions>
          </Dialog>

          {/* 导入数据对话框 */}
          <Dialog open={openImport} onClose={handleCloseImport} maxWidth='sm' fullWidth
            slotProps={{ paper: { sx: { bgcolor: 'var(--color-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' } } }}
          >
            <DialogTitle>
              导入数据
              <IconButton aria-label='close' onClick={handleCloseImport} sx={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                选择之前导出的 JSON 文件来恢复导航站数据。导入会合并现有数据，不会覆盖已有内容。
              </DialogContentText>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button variant='outlined' component='label'>
                  选择文件
                  <input type='file' hidden accept='.json' onChange={handleFileSelect} />
                </Button>
                {importFile && (
                  <Alert severity='info'>
                    已选择文件: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </Alert>
                )}
                {importError && (
                  <Alert severity='error'>{importError}</Alert>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseImport} variant='outlined'>取消</Button>
              <Button onClick={handleImportDataClick} variant='contained' color='primary'
                disabled={!importFile || importLoading}>
                {importLoading ? '导入中...' : '开始导入'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* 链接检测对话框 */}
          <LinkChecker
            open={openLinkChecker}
            onClose={() => setOpenLinkChecker(false)}
            sites={groups.flatMap((g) => g.sites || [])}
          />

          {/* 一键收藏对话框 */}
          <BookmarkletGuide
            open={openBookmarklet}
            onClose={() => setOpenBookmarklet(false)}
          />

          {/* 批量移动对话框 */}
          <BatchMoveDialog
            open={openBatchMove}
            onClose={() => setOpenBatchMove(false)}
            sites={groups.flatMap((g) => g.sites || [])}
            groups={groups}
            onBatchMove={async (siteIds: number[], targetGroupId: number) => {
              try {
                await api.batchMoveSites(siteIds, targetGroupId);
                await fetchData();
              } catch (err) {
                handleError('批量移动失败: ' + (err as Error).message);
              }
            }}
          />

          {/* 个性化设置对话框 */}
          <EnhancedSettings
            open={openEnhancedSettings}
            onClose={() => setOpenEnhancedSettings(false)}
            configs={configs}
            onSaveConfig={async (key, value) => {
              await api.setConfig(key, value);
              setConfigs((prev) => ({ ...prev, [key]: value }));
            }}
            onMusicPlay={handlePlayMusic}
          />

          {/* 全局音乐播放器 */}
          {showMusicPlayer && globalMusicUrl && (
            <Paper
              elevation={0}
              sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                zIndex: 9999,
                p: 2,
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                maxWidth: 320,
                bgcolor: 'var(--color-elevated)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-lg)',
                // 性能：不用 backdrop-filter（毛玻璃）。backdrop-filter 会让 Chrome
                // 每帧重采样面板背后整个视口内容 → 滚动持续掉帧。背景已用不透明
                // --color-elevated，纯色 + 阴影即可表达层级，视觉几乎无差别。
              }}
            >
              <IconButton
                onClick={togglePlayPause}
                size='small'
                aria-label={globalMusicPlaying ? '暂停音乐' : '播放音乐'}
              >
                {globalMusicPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant='caption' noWrap>
                  {globalMusicUrl.split('/').pop() || '背景音乐'}
                </Typography>
              </Box>
              <VolumeUpIcon fontSize='small' />
              <Slider
                value={globalVolume}
                onChange={(_, v) => setGlobalVolume(v as number)}
                min={0}
                max={1}
                step={0.01}
                sx={{ width: 60 }}
              />
              <IconButton
                onClick={closePlayer}
                size='small'
                aria-label='关闭音乐播放器'
              >
                <CloseIcon fontSize='small' />
              </IconButton>
            </Paper>
          )}
        </Container>
      </AppLayout>
      {/* 性能监控：默认仅开发环境显示；生产如需排查，构建时设置 VITE_SHOW_PERF=true */}
      {(import.meta.env.DEV || import.meta.env.VITE_SHOW_PERF === 'true') && <PerformanceMonitor />}
    </ThemeProvider>
  );
}

export default App;

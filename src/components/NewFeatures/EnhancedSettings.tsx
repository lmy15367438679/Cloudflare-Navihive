/**
 * 增强个性化设置组件
 * 壁纸、动态效果、性能优化、开发者选项
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Switch,
  FormControlLabel,
  Slider,
  Divider,
  IconButton,
  Tab,
  Tabs,
  Alert,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import AnimationIcon from '@mui/icons-material/Animation';
import SpeedIcon from '@mui/icons-material/Speed';
import BugReportIcon from '@mui/icons-material/BugReport';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role='tabpanel' hidden={value !== index} sx={{ py: 2 }}>
      {value === index && children}
    </Box>
  );
}

export interface DevOptions {
  /** 帧率监测面板（FPS） */
  fps: boolean;
  /** 调试日志面板 */
  log: boolean;
}

interface EnhancedSettingsProps {
  open: boolean;
  onClose: () => void;
  configs: Record<string, string>;
  onSaveConfig: (key: string, value: string) => Promise<void>;
  /** 按域名自动分组：返回结果描述字符串（由 App 端执行数据操作并刷新） */
  onAutoGroup?: () => Promise<string>;
  /** 开发者选项（仅本机 localStorage，与 D1 全局配置无关） */
  devOptions?: DevOptions;
  onDevOptionsChange?: (key: keyof DevOptions, value: boolean) => void;
}

// 预设壁纸列表
const PRESET_WALLPAPERS = [
  { name: '无', url: '' },
  { name: '极光', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80' },
  { name: '星空', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80' },
  { name: '山脉', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
  { name: '海洋', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80' },
  { name: '森林', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80' },
  { name: '城市', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80' },
  { name: '渐变', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80' },
];

export default function EnhancedSettings({
  open,
  onClose,
  configs,
  onSaveConfig,
  onAutoGroup,
  devOptions = { fps: false, log: false },
  onDevOptionsChange,
}: EnhancedSettingsProps) {
  const [tabValue, setTabValue] = useState(0);
  const [tempConfigs, setTempConfigs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTempConfigs({ ...configs });
    }
  }, [open, configs]);

  const handleConfigChange = (key: string, value: string) => {
    setTempConfigs((prev) => ({ ...prev, [key]: value }));
  };

  // 自动分组：由 App 端执行数据处理并返回结果文案
  const [autoGrouping, setAutoGrouping] = useState(false);
  const [autoGroupMsg, setAutoGroupMsg] = useState('');
  const [autoGroupError, setAutoGroupError] = useState('');

  const handleAutoGroupClick = async () => {
    setAutoGroupMsg('');
    setAutoGroupError('');
    if (!onAutoGroup) return;
    if (
      !window.confirm(
        '将按 URL 域名把所有站点自动归入同名分组（必要时自动创建分组）。\n原分组会保留，但其中站点会移出并按域名重新归档。是否继续？'
      )
    ) {
      return;
    }
    setAutoGrouping(true);
    try {
      setAutoGroupMsg(await onAutoGroup());
    } catch (err) {
      setAutoGroupError((err as Error).message || '自动分组失败');
    } finally {
      setAutoGrouping(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(tempConfigs)) {
        if (configs[key] !== value) {
          await onSaveConfig(key, value);
        }
      }
      onClose();
    } catch (err) {
      console.error('保存设置失败:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          },
        },
      }}
    >
      <DialogTitle>
        <Box display='flex' justifyContent='space-between' alignItems='center'>
          <Typography variant='h6' fontWeight='600'>
            个性化设置
          </Typography>
          <IconButton onClick={onClose} size='small'>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />

      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        variant='scrollable'
        scrollButtons='auto'
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<SettingsIcon />} label='常规' />
        <Tab icon={<WallpaperIcon />} label='壁纸' />
        <Tab icon={<AnimationIcon />} label='动态效果' />
        <Tab icon={<SpeedIcon />} label='性能优化' />
        <Tab icon={<BugReportIcon />} label='开发者' />
      </Tabs>

      <DialogContent>
        {/* 常规设置（网站设置 + 个性化设置合并后的入口） */}
        <TabPanel value={tabValue} index={0}>
          <Alert severity='info' sx={{ mb: 2 }}>
            网站标题、名称、搜索框等基础配置，以及按域名自动整理收藏。
          </Alert>

          <TextField
            fullWidth
            size='small'
            label='网站标题'
            value={tempConfigs['site.title'] || ''}
            onChange={(e) => handleConfigChange('site.title', e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            size='small'
            label='网站名称'
            value={tempConfigs['site.name'] || ''}
            onChange={(e) => handleConfigChange('site.name', e.target.value)}
            sx={{ mb: 2 }}
          />

          <Typography variant='subtitle2' gutterBottom>
            图标获取API
          </Typography>
          <TextField
            fullWidth
            size='small'
            label='图标API地址'
            value={tempConfigs['site.iconApi'] || ''}
            onChange={(e) => handleConfigChange('site.iconApi', e.target.value)}
            placeholder='https://www.faviconextractor.com/favicon/{domain}?larger=true'
            helperText='使用 {domain} 作为域名占位符；图标默认经 /api/icon 代理并由 Cloudflare 边缘缓存'
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            size='small'
            multiline
            rows={3}
            label='自定义CSS'
            value={tempConfigs['site.customCss'] || ''}
            onChange={(e) => handleConfigChange('site.customCss', e.target.value)}
            helperText='毛玻璃拟态已内置并默认开启（动态效果 → 毛玻璃效果），此处仅用于额外覆盖样式'
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.searchBoxEnabled'] !== 'false'}
                onChange={(e) =>
                  handleConfigChange('site.searchBoxEnabled', e.target.checked ? 'true' : 'false')
                }
              />
            }
            label={
              <Box>
                <Typography variant='body1'>启用搜索框</Typography>
                <Typography variant='caption' color='text.secondary'>
                  关闭后侧边栏不显示站点搜索框
                </Typography>
              </Box>
            }
            sx={{ mb: 1, display: 'flex' }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.searchBoxGuestEnabled'] !== 'false'}
                onChange={(e) =>
                  handleConfigChange(
                    'site.searchBoxGuestEnabled',
                    e.target.checked ? 'true' : 'false'
                  )
                }
              />
            }
            label={
              <Box>
                <Typography variant='body1'>访客也可使用搜索框</Typography>
                <Typography variant='caption' color='text.secondary'>
                  关闭后仅登录管理员可见搜索框
                </Typography>
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant='subtitle2'>自动分组</Typography>
            <Typography variant='caption' color='text.secondary'>
              按每个收藏的 URL 域名自动归类到同名分组：没有对应分组的会自动创建，
              原分组会保留，但其中的站点会被移出并按域名重新归档。
            </Typography>
            <Button
              variant='outlined'
              size='small'
              startIcon={<AutoAwesomeIcon />}
              onClick={handleAutoGroupClick}
              disabled={autoGrouping}
              sx={{
                alignSelf: 'flex-start',
                borderColor: 'var(--color-border)',
                color: 'var(--text-primary)',
              }}
            >
              {autoGrouping ? '整理中...' : '按域名自动分组'}
            </Button>
            {autoGroupMsg && (
              <Alert severity='success' sx={{ mt: 1 }}>
                {autoGroupMsg}
              </Alert>
            )}
            {autoGroupError && (
              <Alert severity='error' sx={{ mt: 1 }}>
                {autoGroupError}
              </Alert>
            )}
          </Box>
        </TabPanel>

        {/* 壁纸设置 */}
        <TabPanel value={tabValue} index={1}>
          <Alert severity='info' sx={{ mb: 2 }}>
            选择或自定义背景壁纸，让导航站更具个性。
          </Alert>

          <Typography variant='subtitle2' gutterBottom>
            预设壁纸
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 1,
              mb: 2,
            }}
          >
            {PRESET_WALLPAPERS.map((wp) => (
              <Paper
                key={wp.name}
                onClick={() => handleConfigChange('site.backgroundImage', wp.url)}
                sx={{
                  height: 70,
                  cursor: 'pointer',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: 2,
                  borderColor:
                    tempConfigs['site.backgroundImage'] === wp.url ? 'primary.main' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: wp.url ? 'transparent' : 'var(--color-card-hover)',
                  backgroundImage: wp.url ? `url(${wp.url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: 3,
                  },
                }}
              >
                <Typography
                  variant='caption'
                  sx={{
                    color: wp.url ? 'white' : 'text.secondary',
                    textShadow: wp.url ? '0 1px 3px rgba(0,0,0,0.8)' : 'none',
                    fontWeight: 500,
                  }}
                >
                  {wp.name}
                </Typography>
              </Paper>
            ))}
          </Box>

          <TextField
            fullWidth
            size='small'
            label='自定义壁纸URL'
            placeholder='https://example.com/wallpaper.jpg'
            value={tempConfigs['site.backgroundImage'] || ''}
            onChange={(e) => handleConfigChange('site.backgroundImage', e.target.value)}
            sx={{ mb: 2 }}
          />

          <Typography variant='body2' color='text.secondary' gutterBottom>
            背景蒙版透明度
          </Typography>
          <Slider
            value={Number(tempConfigs['site.backgroundOpacity'] || '0.15')}
            onChange={(_, v) => handleConfigChange('site.backgroundOpacity', String(v))}
            min={0}
            max={1}
            step={0.01}
            valueLabelDisplay='auto'
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.backgroundBlur'] === 'true'}
                onChange={(e) =>
                  handleConfigChange('site.backgroundBlur', e.target.checked ? 'true' : 'false')
                }
              />
            }
            label='背景模糊效果'
          />
        </TabPanel>

        {/* 动态效果设置 */}
        <TabPanel value={tabValue} index={2}>
          <Alert severity='info' sx={{ mb: 2 }}>
            添加动态效果提升视觉体验。注意：过多动画可能影响性能。
          </Alert>

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.particlesEnabled'] === 'true'}
                onChange={(e) =>
                  handleConfigChange('site.particlesEnabled', e.target.checked ? 'true' : 'false')
                }
              />
            }
            label={
              <Box>
                <Typography variant='body1'>粒子背景效果</Typography>
                <Typography variant='caption' color='text.secondary'>
                  在页面背景显示动态粒子动画
                </Typography>
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.glassEffect'] === 'true'}
                onChange={(e) =>
                  handleConfigChange('site.glassEffect', e.target.checked ? 'true' : 'false')
                }
              />
            }
            label={
              <Box>
                <Typography variant='body1'>毛玻璃效果</Typography>
                <Typography variant='caption' color='text.secondary'>
                  卡片/面板半透明模糊，暗色下白字玻璃质感（默认开启）；
                  书签较多时若感觉滚动掉帧可关闭
                </Typography>
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.cardAnimation'] === 'true'}
                onChange={(e) =>
                  handleConfigChange('site.cardAnimation', e.target.checked ? 'true' : 'false')
                }
              />
            }
            label={
              <Box>
                <Typography variant='body1'>卡片悬浮动画</Typography>
                <Typography variant='caption' color='text.secondary'>
                  鼠标悬停时卡片有上浮和阴影效果
                </Typography>
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.smoothScroll'] === 'true'}
                onChange={(e) =>
                  handleConfigChange('site.smoothScroll', e.target.checked ? 'true' : 'false')
                }
              />
            }
            label={
              <Box>
                <Typography variant='body1'>平滑滚动</Typography>
                <Typography variant='caption' color='text.secondary'>
                  页面滚动时使用平滑过渡效果
                </Typography>
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />
        </TabPanel>

        {/* 性能优化设置 */}
        <TabPanel value={tabValue} index={3}>
          <Alert severity='info' sx={{ mb: 2 }}>
            优化导航站的加载速度和运行性能，减少资源消耗。
          </Alert>

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.lazyLoadImages'] === 'true'}
                onChange={(e) =>
                  handleConfigChange('site.lazyLoadImages', e.target.checked ? 'true' : 'false')
                }
              />
            }
            label={
              <Box>
                <Typography variant='body1'>图片懒加载</Typography>
                <Typography variant='caption' color='text.secondary'>
                  图标和图片在进入视口时才加载，减少初始加载时间
                </Typography>
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.imageCache'] === 'true'}
                onChange={(e) =>
                  handleConfigChange('site.imageCache', e.target.checked ? 'true' : 'false')
                }
              />
            }
            label={
              <Box>
                <Typography variant='body1'>图标缓存</Typography>
                <Typography variant='caption' color='text.secondary'>
                  缓存已加载的图标，减少重复请求
                </Typography>
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.reduceMotion'] === 'true'}
                onChange={(e) =>
                  handleConfigChange('site.reduceMotion', e.target.checked ? 'true' : 'false')
                }
              />
            }
            label={
              <Box>
                <Typography variant='body1'>减少动画</Typography>
                <Typography variant='caption' color='text.secondary'>
                  减少不必要的动画效果，提升低端设备性能
                </Typography>
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.compactMode'] === 'true'}
                onChange={(e) =>
                  handleConfigChange('site.compactMode', e.target.checked ? 'true' : 'false')
                }
              />
            }
            label={
              <Box>
                <Typography variant='body1'>紧凑模式</Typography>
                <Typography variant='caption' color='text.secondary'>
                  减小卡片间距和内边距，一屏显示更多内容
                </Typography>
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />
        </TabPanel>

        {/* 开发者选项（仅本机 localStorage，与全局 D1 配置无关） */}
        <TabPanel value={tabValue} index={4}>
          <Alert severity='warning' sx={{ mb: 2 }}>
            开发者选项仅作用于当前浏览器（localStorage），用于诊断问题，不会保存到网站全局配置，也不影响其他访客。
          </Alert>

          <FormControlLabel
            control={
              <Switch
                checked={devOptions.fps}
                onChange={(e) => onDevOptionsChange?.('fps', e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant='body1'>帧率监测面板（FPS）</Typography>
                <Typography variant='caption' color='text.secondary'>
                  右下角实时显示 FPS / 最低帧 / 均值 / 长任务 /
                  内存，用于检查滚动与动画是否掉帧。开启后快捷键 Shift+P 可随时隐藏或再显示面板。
                </Typography>
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={devOptions.log}
                onChange={(e) => onDevOptionsChange?.('log', e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant='body1'>调试日志面板</Typography>
                <Typography variant='caption' color='text.secondary'>
                  捕获页面的 console 输出与 JS 报错，右下角浮层实时查看，便于不打开 DevTools
                  也能快速排查问题。
                </Typography>
              </Box>
            }
            sx={{ display: 'flex' }}
          />
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant='outlined'>
          取消
        </Button>
        <Button onClick={handleSave} variant='contained' color='primary' disabled={saving}>
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

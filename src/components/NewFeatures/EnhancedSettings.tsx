/**
 * 增强个性化设置组件
 * 音乐播放器、壁纸、动态效果、性能优化
 */
import { useState, useEffect, useRef } from 'react';
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
  Chip,
  Alert,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import AnimationIcon from '@mui/icons-material/Animation';
import SpeedIcon from '@mui/icons-material/Speed';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';


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

interface EnhancedSettingsProps {
  open: boolean;
  onClose: () => void;
  configs: Record<string, string>;
  onSaveConfig: (key: string, value: string) => Promise<void>;
  onMusicPlay?: (url: string) => void; // 通知全局播放器播放音乐
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

// 预设音乐列表
const PRESET_MUSIC = [
  { name: '无', url: '' },
  { name: '轻音乐 - 雨声', url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_b0c0b0b0b0.mp3' },
  { name: '轻音乐 - 钢琴', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_8a0b0b0b0b.mp3' },
  { name: '轻音乐 - 吉他', url: 'https://cdn.pixabay.com/download/audio/2022/03/21/audio_6a0b0b0b0b.mp3' },
];

export default function EnhancedSettings({
  open,
  onClose,
  configs,
  onSaveConfig,
  onMusicPlay,
}: EnhancedSettingsProps) {
  const [tabValue, setTabValue] = useState(0);
  const [tempConfigs, setTempConfigs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // 音乐播放器状态
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMusicUrl, setCurrentMusicUrl] = useState('');
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    if (open) {
      setTempConfigs({ ...configs });
      setCurrentMusicUrl(configs['site.musicUrl'] || '');
    }
  }, [open, configs]);

  // 音乐播放控制 - 通知全局播放器
  const handlePlayMusic = (url: string) => {
    if (!url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setCurrentMusicUrl('');
      // 通知全局播放器停止
      if (onMusicPlay) onMusicPlay('');
      return;
    }

    // 通知全局播放器播放
    if (onMusicPlay) {
      onMusicPlay(url);
    }
    
    // 本地也更新状态用于UI显示
    setCurrentMusicUrl(url);
    setIsPlaying(true);
  };

  const handleVolumeChange = (_: Event, newValue: number | number[]) => {
    const vol = newValue as number;
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  // 关闭对话框时不清理音频，让全局播放器接管
  // 注意：此组件卸载时不应清理音频，由 App.tsx 中的全局播放器管理


  const handleConfigChange = (key: string, value: string) => {
    setTempConfigs((prev) => ({ ...prev, [key]: value }));
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
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
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
        variant='fullWidth'
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<MusicNoteIcon />} label='背景音乐' />
        <Tab icon={<WallpaperIcon />} label='壁纸' />
        <Tab icon={<AnimationIcon />} label='动态效果' />
        <Tab icon={<SpeedIcon />} label='性能优化' />
      </Tabs>

      <DialogContent>
        {/* 背景音乐设置 */}
        <TabPanel value={tabValue} index={0}>
          <Alert severity='info' sx={{ mb: 2 }}>
            添加背景音乐，让导航站更有氛围。建议使用轻音乐或白噪音。
          </Alert>

          <Typography variant='subtitle2' gutterBottom>
            预设音乐
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {PRESET_MUSIC.map((music) => (
              <Chip
                key={music.name}
                label={music.name}
                onClick={() => {
                  handlePlayMusic(music.url);
                  handleConfigChange('site.musicUrl', music.url);
                }}
                color={currentMusicUrl === music.url && isPlaying ? 'primary' : 'default'}
                variant={currentMusicUrl === music.url ? 'filled' : 'outlined'}
                icon={currentMusicUrl === music.url && isPlaying ? <PauseIcon /> : <MusicNoteIcon />}
              />
            ))}
          </Box>

          <TextField
            fullWidth
            size='small'
            label='自定义音乐URL'
            placeholder='https://example.com/music.mp3'
            value={tempConfigs['site.musicUrl'] || ''}
            onChange={(e) => handleConfigChange('site.musicUrl', e.target.value)}
            sx={{ mb: 2 }}
          />

          {currentMusicUrl && (
            <Paper variant='outlined' sx={{ p: 2, mb: 2 }}>
              <Box display='flex' alignItems='center' gap={2}>
                <IconButton
                  color='primary'
                  onClick={() => handlePlayMusic(currentMusicUrl)}
                >
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <Box flex={1}>
                  <Typography variant='body2' noWrap>
                    {currentMusicUrl.split('/').pop() || '未知音乐'}
                  </Typography>
                </Box>
                <VolumeUpIcon fontSize='small' />
                <Slider
                  value={volume}
                  onChange={handleVolumeChange}
                  min={0}
                  max={1}
                  step={0.01}
                  sx={{ width: 100 }}
                />
              </Box>
            </Paper>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.musicAutoPlay'] === 'true'}
                onChange={(e) => handleConfigChange('site.musicAutoPlay', e.target.checked ? 'true' : 'false')}
              />
            }
            label='自动播放音乐（部分浏览器可能阻止自动播放）'
          />
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
                  borderColor: tempConfigs['site.backgroundImage'] === wp.url ? 'primary.main' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: wp.url ? 'transparent' : 'action.hover',
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
                onChange={(e) => handleConfigChange('site.backgroundBlur', e.target.checked ? 'true' : 'false')}
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
                onChange={(e) => handleConfigChange('site.particlesEnabled', e.target.checked ? 'true' : 'false')}
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
                onChange={(e) => handleConfigChange('site.glassEffect', e.target.checked ? 'true' : 'false')}
              />
            }
            label={
              <Box>
                <Typography variant='body1'>毛玻璃效果</Typography>
                <Typography variant='caption' color='text.secondary'>
                  卡片和面板使用毛玻璃模糊效果
                </Typography>
              </Box>
            }
            sx={{ mb: 2, display: 'flex' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={tempConfigs['site.cardAnimation'] === 'true'}
                onChange={(e) => handleConfigChange('site.cardAnimation', e.target.checked ? 'true' : 'false')}
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
                onChange={(e) => handleConfigChange('site.smoothScroll', e.target.checked ? 'true' : 'false')}
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
                onChange={(e) => handleConfigChange('site.lazyLoadImages', e.target.checked ? 'true' : 'false')}
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
                onChange={(e) => handleConfigChange('site.imageCache', e.target.checked ? 'true' : 'false')}
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
                onChange={(e) => handleConfigChange('site.reduceMotion', e.target.checked ? 'true' : 'false')}
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
                onChange={(e) => handleConfigChange('site.compactMode', e.target.checked ? 'true' : 'false')}
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

          <Divider sx={{ my: 2 }} />

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
            helperText='使用 {domain} 作为域名占位符'
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

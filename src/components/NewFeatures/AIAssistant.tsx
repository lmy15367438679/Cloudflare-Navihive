// src/components/NewFeatures/AIAssistant.tsx
// AI 智能助手：右上角悬浮入口弹出的对话窗口（含管理员设置面板）。
// 安全设计：API 密钥在服务端 AES-256-GCM 加密存储，前端永不接触明文。
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import { AISettings, AISettingsInput, AIMessage, AIChatResponse } from '../../API/ai';

// 最小接口：NavigationClient（真实 Worker）与 MockNavigationClient（本地模拟）均满足
interface AIAPI {
  getAISettings(): Promise<AISettings>;
  saveAISettings(data: AISettingsInput): Promise<{ success: boolean; message?: string }>;
  aiChat(messages: AIMessage[]): Promise<AIChatResponse>;
}

interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  api: AIAPI;
  /** 设置保存成功后回调，用于同步 App 中的 configs（影响访客入口开关） */
  onEnabledChange?: (enabled: boolean) => void;
}

// 开场快捷提问
const SUGGESTIONS = [
  '帮我推荐几个效率工具网站',
  '怎么把网站加入这个导航站？',
  '想找编程学习资源，推荐去哪里',
];

export default function AIAssistant({
  open,
  onClose,
  isAuthenticated,
  api,
  onEnabledChange,
}: AIAssistantProps) {
  const [view, setView] = useState<'chat' | 'settings'>('chat');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ---- 设置表单状态 ----
  const [settings, setSettings] = useState<AISettings>({
    enabled: false,
    baseUrl: '',
    model: '',
    systemPrompt: '',
    hasKey: false,
    maskedKey: '',
  });
  const [apiKey, setApiKey] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const settingsLoadedRef = useRef(false);
  // 用 ref 同步最新设置，避免 effect 在依赖数组中引入 settings 造成循环
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // 打开弹窗时：管理员拉取一次当前 AI 设置（同会话内不重复请求）；
  // 若 AI 尚未启用，则默认展示设置面板，确保管理员能直接看到并开启功能
  useEffect(() => {
    if (open) {
      if (!isAuthenticated) {
        setView('chat');
      } else if (settingsLoadedRef.current) {
        // 设置已加载过：未启用进设置面板，已启用进对话
        setView(settingsRef.current.enabled ? 'chat' : 'settings');
      } else {
        settingsLoadedRef.current = true;
        setSettingsLoading(true);
        api
          .getAISettings()
          .then((s) => {
            setSettings(s);
            setView(s.enabled ? 'chat' : 'settings');
          })
          .catch(() => setSaveMsg({ type: 'error', text: '读取 AI 设置失败，请稍后重试' }))
          .finally(() => setSettingsLoading(false));
      }
    } else {
      // 关闭时清空错误，保持当前视图状态以便下次打开复用
      setChatError(null);
    }
  }, [open, isAuthenticated, api]);

  // 新消息时自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setChatError(null);
    const userMessage: AIMessage = { role: 'user', content };
    const history = [...messages, userMessage];
    setMessages(history);
    setLoading(true);
    const res = await api.aiChat(history);
    if (res.success && res.reply) {
      const reply = res.reply;
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } else {
      setChatError(res.message || 'AI 请求失败，请稍后重试');
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveMsg(null);
    const res = await api.saveAISettings({
      enabled: settings.enabled,
      baseUrl: settings.baseUrl,
      model: settings.model,
      systemPrompt: settings.systemPrompt,
      // 留空 = 保持服务端已保存的密钥不变
      apiKey: apiKey || undefined,
    });
    if (res.success) {
      setApiKey('');
      setSaveMsg({ type: 'success', text: res.message || 'AI 设置已保存' });
      // 回读最新状态（含服务器生成的掩码），并同步全局开关
      let nowEnabled = settings.enabled;
      try {
        const fresh = await api.getAISettings();
        setSettings(fresh);
        nowEnabled = fresh.enabled;
      } catch {
        setSettings((prev) => ({
          ...prev,
          enabled: settings.enabled,
          hasKey: !!(apiKey.trim() || prev.hasKey),
        }));
      }
      // 保存成功后：开启 → 回到对话；仍为关闭 → 留在设置面板继续操作
      setView(nowEnabled ? 'chat' : 'settings');
      onEnabledChange?.(nowEnabled);
    } else {
      setSaveMsg({ type: 'error', text: res.message || '保存失败，请重试' });
    }
    setSaving(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='sm'
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            height: 'min(72vh, 620px)',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* ===== 头部 ===== */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.25,
          borderBottom: '1px solid var(--color-border)',
          bgcolor: 'var(--color-elevated)',
          borderTopLeftRadius: 'inherit',
          borderTopRightRadius: 'inherit',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: 'var(--color-accent)' }} fontSize='small' />
          <Typography
            sx={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: '15px',
              color: 'var(--text-primary)',
            }}
          >
            {view === 'settings' ? 'AI 助手设置' : 'AI 智能助手'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isAuthenticated && (
            <Tooltip title={view === 'settings' ? '返回对话' : '助手设置'}>
              <IconButton
                size='small'
                onClick={() => setView(view === 'settings' ? 'chat' : 'settings')}
                sx={{ color: 'var(--text-secondary)' }}
              >
                {view === 'settings' ? (
                  <AutoAwesomeIcon fontSize='small' />
                ) : (
                  <SettingsIcon fontSize='small' />
                )}
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            size='small'
            onClick={onClose}
            aria-label='关闭'
            sx={{ color: 'var(--text-secondary)' }}
          >
            <CloseIcon fontSize='small' />
          </IconButton>
        </Box>
      </Box>

      <DialogContent
        sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {view === 'settings' ? (
          /* ===== 设置面板（仅管理员可见） ===== */
          <Box sx={{ p: 2, overflowY: 'auto', color: 'var(--text-primary)' }}>
            {settingsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Stack spacing={2}>
                <Alert severity='info' sx={{ '& .MuiAlert-message': { fontSize: '12px' } }}>
                  开启后，所有访客的右上角都会显示 AI 助手入口。API 密钥将在服务端用 AES-256-GCM
                  加密后存储，前端与数据导出均不会出现密钥明文。
                </Alert>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enabled}
                      onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                      color='primary'
                    />
                  }
                  label='启用 AI 辅助'
                />

                <TextField
                  label='API 接口地址（Base URL）'
                  placeholder='https://api.openai.com/v1'
                  fullWidth
                  size='small'
                  value={settings.baseUrl}
                  onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                  helperText='任意 OpenAI 兼容服务的 Base URL，如 DeepSeek / 硅基流动 / Groq 等'
                />

                <TextField
                  label='模型名称'
                  placeholder='gpt-4o-mini'
                  fullWidth
                  size='small'
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                />

                <TextField
                  label='API 密钥'
                  type='password'
                  fullWidth
                  size='small'
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings.hasKey ? '' : 'sk-...'}
                  helperText={
                    settings.hasKey
                      ? `已保存密钥（${settings.maskedKey || '****'}），输入新值可替换，留空保持不变`
                      : '密钥仅加密存储于服务端，前端不会保存'
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <SettingsIcon fontSize='small' sx={{ color: 'var(--text-secondary)' }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label='系统提示词（可选）'
                  fullWidth
                  size='small'
                  multiline
                  minRows={3}
                  maxRows={6}
                  value={settings.systemPrompt}
                  onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                  helperText='留空则使用内置默认提示词（NaviHive 管家式助手）'
                />

                {saveMsg && (
                  <Alert severity={saveMsg.type} onClose={() => setSaveMsg(null)}>
                    {saveMsg.text}
                  </Alert>
                )}

                <Box>
                  <Button
                    variant='contained'
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={14} /> : null}
                    onClick={handleSaveSettings}
                    sx={{
                      bgcolor: 'var(--color-accent)',
                      color: 'var(--text-on-accent)',
                      '&:hover': { bgcolor: 'var(--color-accent-hover)' },
                    }}
                  >
                    保存设置
                  </Button>
                </Box>
              </Stack>
            )}
          </Box>
        ) : (
          /* ===== 对话视图 ===== */
          <>
            <Box
              sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, bgcolor: 'var(--color-canvas)' }}
            >
              {messages.length === 0 && !loading ? (
                <Box sx={{ textAlign: 'center', py: 4, px: 1 }}>
                  <AutoAwesomeIcon
                    sx={{ fontSize: 40, color: 'var(--color-accent)', mb: 1, opacity: 0.85 }}
                  />
                  <Typography variant='body2' sx={{ color: 'var(--text-primary)', mb: 0.5 }}>
                    你好，我是 NaviHive 智能助手 👋
                  </Typography>
                  <Typography variant='caption' sx={{ color: 'var(--text-secondary)' }}>
                    由站长配置的 AI 模型提供服务，可以帮忙找网站、推荐工具或解答问题。
                  </Typography>
                  <Stack
                    direction='row'
                    spacing={0}
                    sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 1, mt: 2 }}
                  >
                    {SUGGESTIONS.map((s) => (
                      <Chip
                        key={s}
                        label={s}
                        size='small'
                        onClick={() => handleSend(s)}
                        sx={{
                          bgcolor: 'var(--color-elevated)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--text-primary)',
                          '&:hover': { bgcolor: 'var(--color-card-hover)' },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              ) : (
                messages.map((m, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '82%',
                        px: 1.5,
                        py: 1,
                        borderRadius: 'var(--radius-md)',
                        bgcolor:
                          m.role === 'user' ? 'var(--color-accent)' : 'var(--color-elevated)',
                        color: m.role === 'user' ? 'var(--text-on-accent)' : 'var(--text-primary)',
                        border: m.role === 'user' ? 'none' : '1px solid var(--color-border)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '14px',
                        lineHeight: 1.6,
                      }}
                    >
                      {m.content}
                    </Box>
                  </Box>
                ))
              )}
              {loading && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    color: 'var(--text-secondary)',
                    py: 0.5,
                  }}
                >
                  <CircularProgress size={16} />
                  <Typography variant='caption'>正在思考…</Typography>
                </Box>
              )}
              <div ref={bottomRef} />
            </Box>

            {chatError && (
              <Alert severity='error' sx={{ mx: 2, mt: 1 }} onClose={() => setChatError(null)}>
                {chatError}
              </Alert>
            )}

            {/* ===== 输入区 ===== */}
            <Box
              sx={{
                p: 1.5,
                borderTop: '1px solid var(--color-border)',
                bgcolor: 'var(--color-elevated)',
                borderBottomLeftRadius: 'inherit',
                borderBottomRightRadius: 'inherit',
              }}
            >
              <TextField
                fullWidth
                size='small'
                variant='outlined'
                placeholder='输入消息，回车发送（Shift+回车换行）'
                value={input}
                disabled={loading}
                multiline
                maxRows={4}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        size='small'
                        color='primary'
                        disabled={loading || !input.trim()}
                        onClick={() => handleSend()}
                        aria-label='发送'
                      >
                        <SendIcon fontSize='small' />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  bgcolor: 'var(--color-canvas)',
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'var(--color-border)' },
                    '&:hover fieldset': { borderColor: 'var(--color-accent)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--color-accent)' },
                  },
                }}
              />
              <Typography
                variant='caption'
                sx={{ display: 'block', mt: 0.5, color: 'var(--text-secondary)', px: 0.5 }}
              >
                回答由 {settings.model || 'AI 模型'} 生成，请自行甄别准确性。
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * 调试日志浮层（开发者选项）
 * - 捕获 window error / unhandledrejection 与 console 输出
 * - 环形缓冲 MAX_LOGS=200 条，界面显示最近 40 条
 * - 可最小化为右下角小圆点、一键清空
 * 仅本机运行（App.tsx 中由 devOptions.log 控制是否挂载），与 D1 全局配置无关。
 */
import { memo, useEffect, useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import RemoveIcon from '@mui/icons-material/Remove';

type LogLevel = 'error' | 'warn' | 'info' | 'log';

interface LogEntry {
  time: number;
  level: LogLevel;
  text: string;
}

const MAX_LOGS = 200;
const VISIBLE_COUNT = 40;

const LEVEL_COLOR: Record<LogLevel, string> = {
  error: '#EF4444',
  warn: '#F59E0B',
  info: '#38BDF8',
  log: 'var(--text-secondary)',
};

function formatArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  if (arg !== null && typeof arg === 'object') {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

const DebugLog = memo(function DebugLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const push = (level: LogLevel, text: string) => {
      setLogs((prev) => [...prev.slice(-(MAX_LOGS - 1)), { time: Date.now(), level, text }]);
    };

    const onError = (e: ErrorEvent) =>
      push('error', `[uncaught] ${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`);
    const onRejection = (e: PromiseRejectionEvent) =>
      push('error', `[unhandledrejection] ${formatArg(e.reason)}`);

    const orig = {
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      log: console.log.bind(console),
    };
    console.error = (...args: unknown[]) => {
      orig.error(...args);
      push('error', args.map(formatArg).join(' '));
    };
    console.warn = (...args: unknown[]) => {
      orig.warn(...args);
      push('warn', args.map(formatArg).join(' '));
    };
    console.info = (...args: unknown[]) => {
      orig.info(...args);
      push('info', args.map(formatArg).join(' '));
    };
    console.log = (...args: unknown[]) => {
      orig.log(...args);
      push('log', args.map(formatArg).join(' '));
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      console.error = orig.error;
      console.warn = orig.warn;
      console.info = orig.info;
      console.log = orig.log;
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  const visibleLogs = logs.slice(-VISIBLE_COUNT);

  if (minimized) {
    return (
      <Box
        onClick={() => setMinimized(false)}
        title='打开调试日志'
        aria-label='打开调试日志'
        sx={{
          position: 'fixed',
          right: 12,
          bottom: 12,
          zIndex: 9998,
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: 'var(--color-elevated)',
          border: '1px solid var(--color-border)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-md)',
          '&:hover': { color: 'var(--text-primary)' },
        }}
      >
        <BugReportIcon sx={{ fontSize: 18 }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 9998,
        width: 360,
        maxHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'var(--color-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5 }}>
        <BugReportIcon sx={{ fontSize: 14, color: 'var(--text-secondary)' }} />
        <Typography
          sx={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1, fontWeight: 600 }}
        >
          调试日志
        </Typography>
        <IconButton size='small' onClick={() => setLogs([])} title='清空日志'>
          <ClearAllIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton size='small' onClick={() => setMinimized(true)} title='最小化'>
          <RemoveIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1,
          pb: 0.5,
          fontSize: '10px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          lineHeight: 1.5,
        }}
      >
        {visibleLogs.length === 0 && (
          <Typography sx={{ fontSize: '10px', color: 'var(--text-tertiary)', px: 0.5, py: 1 }}>
            暂无日志 — console 输出与 JS 报错将实时显示在此。
          </Typography>
        )}
        {visibleLogs.map((l, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              gap: 0.75,
              alignItems: 'flex-start',
              mb: 0.25,
              wordBreak: 'break-all',
            }}
          >
            <Box sx={{ flexShrink: 0, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
              {new Date(l.time).toLocaleTimeString('zh-CN', { hour12: false })}
            </Box>
            <Box
              sx={{
                flexShrink: 0,
                width: 42,
                fontWeight: 700,
                color: LEVEL_COLOR[l.level],
                textTransform: 'uppercase',
              }}
            >
              {l.level}
            </Box>
            <Box sx={{ color: 'var(--text-primary)' }}>{l.text}</Box>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          px: 1,
          py: 0.5,
          borderTop: '1px solid var(--color-border)',
          fontSize: '10px',
          color: 'var(--text-tertiary)',
        }}
      >
        共 {logs.length} 条（环形保留 {MAX_LOGS} 条）
      </Box>
    </Box>
  );
});

export default DebugLog;

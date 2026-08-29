/**
 * 运行时性能监控面板
 * - FPS 采样曲线（requestAnimationFrame）
 * - 长任务（Long Task）记录（PerformanceObserver）
 * - 内存 / INP 估算
 * - 按 Shift+P 切换显隐；生产环境默认可开启
 * 无第三方依赖，~1.5KB gzip。
 */
import { memo, useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SpeedIcon from '@mui/icons-material/Speed';

const SAMPLE_SIZE = 60;
const STORAGE_KEY = 'navihive_perf_monitor';

type Sample = { t: number; fps: number };
type LongTask = { t: number; duration: number };

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        textAlign: 'center',
        bgcolor: 'var(--color-card)',
        borderRadius: '4px',
        py: 0.5,
      }}
    >
      <Box
        sx={{
          fontSize: '14px',
          fontWeight: 600,
          color,
          fontFamily: 'var(--font-heading)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </Box>
      <Box sx={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
        {label}
      </Box>
    </Box>
  );
}

const PerformanceMonitor = memo(function PerformanceMonitor() {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [fps, setFps] = useState(60);
  const [avgFps, setAvgFps] = useState(60);
  const [minFps, setMinFps] = useState(60);
  const [longTasks, setLongTasks] = useState<LongTask[]>([]);
  const [memMB, setMemMB] = useState<number | null>(null);

  const historyRef = useRef<Sample[]>([]);
  const lastFrameRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const minFpsRef = useRef<number>(60);
  const fpsSumRef = useRef<number>(0);
  const fpsCountRef = useRef<number>(0);
  const avgFpsRef = useRef<number>(60);
  const windowStartRef = useRef<number>(0);

  const toggleVisible = (next?: boolean) => {
    setVisible((prev) => {
      const v = next ?? !prev;
      try {
        localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
      } catch {
        // ignore
      }
      return v;
    });
  };

  // 键盘快捷键 Shift+P
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setVisible((prev) => {
          const v = !prev;
          try {
            localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
          } catch {
            // ignore
          }
          return v;
        });
      }
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 打开面板时开始采样
  useEffect(() => {
    if (!visible) return;

    let perfObserver: PerformanceObserver | null = null;
    try {
      if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        perfObserver = new PerformanceObserver((list) => {
          const entries = list.getEntriesByType('longtask') as PerformanceEntry[];
          for (const e of entries) {
            setLongTasks((prev) => {
              const next = [...prev, { t: Date.now(), duration: Math.round(e.duration) }];
              return next.length > 20 ? next.slice(-20) : next;
            });
          }
        });
        perfObserver.observe({ entryTypes: ['longtask'] });
      }
    } catch {
      // 兼容不支持 longtask 的浏览器
    }

    const memoryPerf = performance as unknown as { memory?: { usedJSHeapSize: number } };

    const tick = (now: number) => {
      if (!lastFrameRef.current) {
        lastFrameRef.current = now;
        windowStartRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;
      const frameFps = 1000 / Math.max(delta, 0.01);

      // 累加窗口统计
      fpsSumRef.current += frameFps;
      fpsCountRef.current += 1;
      if (frameFps < minFpsRef.current) minFpsRef.current = frameFps;

      // 每 500ms 更新一次 UI，避免高频 setState 造成额外重绘
      if (now - lastUpdateRef.current > 500) {
        lastUpdateRef.current = now;
        const currentAvg = fpsSumRef.current / Math.max(fpsCountRef.current, 1);
        avgFpsRef.current =
          avgFpsRef.current === 0 ? currentAvg : avgFpsRef.current * 0.5 + currentAvg * 0.5;

        setFps(frameFps);
        setAvgFps(avgFpsRef.current);
        setMinFps(minFpsRef.current);

        if (memoryPerf.memory) {
          setMemMB(memoryPerf.memory.usedJSHeapSize / 1024 / 1024);
        }

        historyRef.current = [...historyRef.current, { t: now, fps: frameFps }].slice(-SAMPLE_SIZE);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      try {
        perfObserver?.disconnect();
      } catch {
        // ignore
      }
    };
  }, [visible]);

  // 曲线绘制（SVG polyline，纯几何数据，无 DOM 回流）
  const history = historyRef.current;
  const points = history
    .map((s, i) => {
      const x = (i / Math.max(SAMPLE_SIZE - 1, 1)) * 100;
      const y = 40 - Math.min(s.fps, 90) * (40 / 90);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const isGood = fps >= 55;
  const isWarn = fps >= 30;
  const color = isGood ? '#22C55E' : isWarn ? '#F59E0B' : '#EF4444';

  if (!visible) {
    return (
      <Box
        onClick={() => toggleVisible(true)}
        title='打开性能监控 (Shift+P)'
        sx={{
          position: 'fixed',
          right: 12,
          bottom: 12,
          zIndex: 9998,
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'var(--color-elevated)',
          border: '1px solid var(--color-border)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          opacity: 0.55,
          transition: 'opacity 150ms ease',
          '&:hover': { opacity: 1 },
        }}
      >
        <SpeedIcon sx={{ fontSize: 16 }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 9999,
        width: 240,
        bgcolor: 'var(--color-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        p: 1.25,
        boxShadow: 'var(--shadow-lg)',
        // 注意：backdrop-filter 会让 Chrome 每帧重采样面板背后内容，
        // 作为诊断面板不该加重渲染负担，故用纯色（--color-elevated 已不透明）即可。
        fontFamily: 'var(--font-body)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <SpeedIcon sx={{ fontSize: 14, color: 'var(--text-secondary)' }} />
        <Typography sx={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1 }}>
          性能监控
        </Typography>
        <Box
          onClick={() => toggleVisible(false)}
          sx={{
            cursor: 'pointer',
            display: 'flex',
            p: 0.25,
            borderRadius: '4px',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          <CloseIcon sx={{ fontSize: 14, color: 'var(--text-secondary)' }} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 0.75 }}>
        <Metric label='FPS' value={Math.round(fps)} color={color} />
        <Metric label='最低' value={Math.round(minFps)} color={color} />
        <Metric label='均值' value={Math.round(avgFps)} color={color} />
      </Box>

      <Box sx={{ bgcolor: 'var(--color-card)', borderRadius: '4px', p: 0.5, mb: 0.5 }}>
        <svg
          viewBox='0 0 100 40'
          preserveAspectRatio='none'
          style={{ width: '100%', height: 36, display: 'block' }}
        >
          <line
            x1='0'
            y1='20'
            x2='100'
            y2='20'
            stroke='var(--color-border)'
            strokeDasharray='2 2'
            strokeWidth='0.5'
          />
          <polyline points={points} fill='none' stroke={color} strokeWidth='1' />
        </svg>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: 'var(--text-secondary)',
          mb: 0.5,
        }}
      >
        <span>长任务: {longTasks.length}</span>
        <span>{memMB !== null ? `内存: ${memMB.toFixed(0)}MB` : '内存: --'}</span>
      </Box>

      {longTasks.length > 0 && (
        <Box
          sx={{
            maxHeight: 60,
            overflowY: 'auto',
            fontSize: '10px',
            color: 'var(--text-secondary)',
          }}
        >
          {longTasks
            .slice(-5)
            .reverse()
            .map((t, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{new Date(t.t).toLocaleTimeString()}</span>
                <span style={{ color: t.duration > 100 ? '#EF4444' : '#F59E0B' }}>
                  {t.duration}ms
                </span>
              </Box>
            ))}
        </Box>
      )}

      <Box sx={{ mt: 0.5, fontSize: '10px', color: 'var(--text-tertiary)' }}>Shift+P 切换</Box>
    </Box>
  );
});

export default PerformanceMonitor;

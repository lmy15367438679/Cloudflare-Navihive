/**
 * 粒子背景（site.particlesEnabled）
 * 轻量粒子漂浮动画，作为页面背景装饰层：
 * - canvas 全屏 fixed + pointer-events: none，位于背景壁纸之上、内容之下
 * - 粒子不连线、不响应交互，数量随视口面积缩放并设上限，
 *   避免书签卡片多时给 Chrome 合成器/主线程增加压力
 * - 尊重 prefers-reduced-motion：命中时只绘制一帧静态画面，不启动 rAF 循环
 */
import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: number;
  alpha: number;
}

export default function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let raf = 0;

    const spawn = () => {
      // 数量上限 70，约每 22000 px² 一个，手机和小窗自然更少
      const count = Math.min(70, Math.floor((width * height) / 22000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 0.6,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        hue: 130 + Math.random() * 40, // 偏绿的微光，呼应 --color-accent
        alpha: Math.random() * 0.45 + 0.15,
      }));
    };

    const paint = (p: Particle) => {
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx!.fillStyle = `hsla(${p.hue}, 60%, 60%, ${p.alpha})`;
      ctx!.fill();
    };

    const drawFrame = () => {
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -4) p.x = width + 4;
        else if (p.x > width + 4) p.x = -4;
        if (p.y < -4) p.y = height + 4;
        else if (p.y > height + 4) p.y = -4;
        paint(p);
      }
      raf = window.requestAnimationFrame(drawFrame);
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawn();
    };

    resize();
    if (reduced) {
      // 只画一帧静态粒子，不循环，避免动画开销
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) paint(p);
    } else {
      raf = window.requestAnimationFrame(drawFrame);
    }

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden='true'
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}

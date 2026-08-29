import { useState, useCallback, useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';

export function useContextMenu() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const popperRef = useRef<HTMLDivElement>(null);

  const open = useCallback((e: ReactMouseEvent | ReactTouchEvent | MouseEvent) => {
    e.preventDefault();
    let clientX: number;
    let clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      const touch = e.touches[0]!;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = 0;
      clientY = 0;
    }
    setPosition({ x: clientX, y: clientY });
  }, []);

  const close = useCallback(() => {
    setPosition(null);
  }, []);

  useEffect(() => {
    const handleClick = () => close();
    if (position) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
    return undefined;
  }, [position, close]);

  return { position, close, open, popperRef };
}

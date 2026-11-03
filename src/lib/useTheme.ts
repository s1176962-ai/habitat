import { useCallback, useEffect, useState } from 'react';
import type { ThemeName } from './shapeTrail/palettes';

const KEY = 'hq-theme';

function initial(): ThemeName {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function useTheme(): { theme: ThemeName; toggle: () => void; set: (t: ThemeName) => void } {
  const [theme, setTheme] = useState<ThemeName>(initial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* 隐私模式忽略 */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const set = useCallback((t: ThemeName) => setTheme(t), []);

  return { theme, toggle, set };
}

/** 响应式：只在客户端读取一次，用于图表等需要知道主题的地方 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

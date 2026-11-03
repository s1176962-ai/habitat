import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import type { ShapeTrailEngine } from '../lib/shapeTrail/engine';

export type Stage = 'login' | 'transition' | 'dashboard';

interface Params {
  engineRef: RefObject<ShapeTrailEngine | null>;
  setStage: (s: Stage) => void;
  setSkeleton: (b: boolean) => void;
}

/** 六边形徽标共享元素 FLIP：登录卡片 ↔ TopBar */
function logoFlip(forward: boolean, duration = 0.8) {
  const src = document.querySelector<HTMLElement>('[data-flip-logo]');
  const dst = document.querySelector<HTMLElement>('[data-flip-target]');
  const slot = document.querySelector<HTMLElement>('[data-flip-logo-slot]');
  if (!src || !dst) return;

  const s = src.getBoundingClientRect();
  const d = dst.getBoundingClientRect();
  if (s.width === 0 || d.width === 0) return;

  const clone = src.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.left = `${s.left}px`;
  clone.style.top = `${s.top}px`;
  clone.style.width = `${s.width}px`;
  clone.style.height = `${s.height}px`;
  clone.style.margin = '0';
  clone.style.opacity = '1';
  clone.style.zIndex = '80';
  clone.style.pointerEvents = 'none';
  clone.removeAttribute('data-flip-logo');
  document.body.appendChild(clone);

  const scale = d.width / s.width;
  const finish = () => {
    clone.remove();
    if (forward) {
      if (slot) slot.style.opacity = '1';
      src.style.opacity = '0';
    } else {
      if (slot) slot.style.opacity = '0';
      src.style.opacity = '1';
    }
  };

  if (forward) {
    src.style.opacity = '0';
    gsap.fromTo(
      clone,
      { x: 0, y: 0, scale: 1 },
      {
        x: d.left - s.left,
        y: d.top - s.top,
        scale,
        duration,
        ease: 'power3.inOut',
        transformOrigin: 'top left',
        onComplete: finish,
      },
    );
  } else {
    if (slot) slot.style.opacity = '0';
    gsap.fromTo(
      clone,
      { x: d.left - s.left, y: d.top - s.top, scale, transformOrigin: 'top left' },
      {
        x: 0,
        y: 0,
        scale: 1,
        duration,
        ease: 'power3.inOut',
        onComplete: finish,
      },
    );
  }
}

export function usePageTransition({ engineRef, setStage, setSkeleton }: Params) {
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  /** 供 ESC 跳过时直接落到终态（幂等） */
  const finishRef = useRef<{ forward: () => void; reverse: () => void } | null>(null);
  const [busy, setBusy] = useState(false);

  const reduced = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** 构建朝向 dashboard 的主时间线（5 个相位，约 2.4s） */
  const build = useCallback(
    (x: number, y: number) => {
      const dash = document.querySelector<HTMLElement>('[data-dashboard]');
      const engine = engineRef.current;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      const finishForward = () => {
        setStage('dashboard');
        setBusy(false);
        setSkeleton(false);
        if (dash) dash.style.pointerEvents = 'auto';
      };
      const finishReverse = () => {
        setStage('login');
        setBusy(false);
        setSkeleton(true);
        if (dash) {
          dash.style.clipPath = `circle(0% at ${x}px ${y}px)`;
          dash.style.pointerEvents = 'none';
        }
        engine?.setAmbientMode(false);
        engine?.setOpacity(1);
      };
      finishRef.current = { forward: finishForward, reverse: finishReverse };

      const tl = gsap.timeline({
        paused: true,
        onComplete: finishForward,
        onReverseComplete: finishReverse,
      });

      /** 只对命中的元素建 tween，避免 GSAP "target not found" 警告 */
      const on = (sel: string, fn: (t: Element[]) => void) => {
        const t = Array.from(document.querySelectorAll(sel));
        if (t.length) fn(t);
      };
      const drawLen = (el: Element) => {
        const p = el as SVGPathElement;
        return typeof p.getTotalLength === 'function' ? p.getTotalLength() : 0;
      };

      /* ---------- Phase 0 · 点击反馈（0 → 0.35s） ---------- */
      tl.call(() => engine?.burst(x, y, { count: 12 }), [], 0);
      on('[data-login-submit]', (t) => {
        tl.to(t, { scale: 0.96, duration: 0.12, ease: 'power2.out' }, 0);
        tl.to(t, { scale: 1, duration: 0.24, ease: 'power2.out' }, 0.12);
      });
      on('[data-login-shimmer]', (t) => {
        tl.fromTo(
          t,
          { xPercent: -130, opacity: 1 },
          {
            xPercent: 130,
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete: () => gsap.set(t, { opacity: 0 }),
          },
          0,
        );
      });

      /* ---------- Phase 1 · 登录内容退场（0.2 → 0.7s） ---------- */
      on('[data-login-sub], [data-login-avatars]', (t) => {
        tl.to(t, { y: -20, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0.1);
      });
      on('[data-login-hint]', (t) => {
        tl.to(t, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.1);
      });
      on('[data-login-char]', (t) => {
        tl.to(
          t,
          {
            y: -14,
            opacity: 0,
            filter: 'blur(8px)',
            duration: 0.5,
            ease: 'power2.in',
            stagger: { each: 0.02, from: 'end' },
          },
          0.2,
        );
      });
      on('[data-login-card]', (t) => {
        tl.to(
          t,
          { y: -28, scale: 0.92, opacity: 0, filter: 'blur(10px)', duration: 0.5, ease: 'power2.in' },
          0.2,
        );
      });

      /* ---------- Phase 2 · 形状汇聚（0.5 → 1.1s） ---------- */
      tl.call(() => engine?.converge(cx, cy, 0.6), [], 0.5);
      tl.call(() => {
        if (!tl.reversed()) engine?.release();
      }, [], 1.15);

      /* ---------- Phase 3 · 圆形揭示（0.9 → 1.6s） ---------- */
      const proxy = { r: 0 };
      if (dash) {
        tl.set(dash, { pointerEvents: 'none' }, 0);
        tl.to(
          proxy,
          {
            r: 150,
            duration: 0.7,
            ease: 'power3.inOut',
            onUpdate: () => {
              dash.style.clipPath = `circle(${proxy.r}% at ${x}px ${y}px)`;
            },
          },
          0.9,
        );
      }
      tl.call(() => logoFlip(!tl.reversed(), 0.8), [], 0.9);
      tl.call(() => setSkeleton(!tl.reversed()), [], 1.5);

      /* ---------- Phase 4 · 工作台入场（1.5 → 2.4s） ---------- */
      on('[data-anim="topbar"]', (t) => {
        tl.fromTo(t, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power4.out' }, 1.5);
      });
      on('[data-anim="greeting"]', (t) => {
        tl.fromTo(t, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power4.out' }, 1.55);
      });
      on('[data-anim="kpi"]', (t) => {
        tl.fromTo(
          t,
          { y: 24, scale: 0.96, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: 'power4.out', stagger: 0.08 },
          1.62,
        );
      });
      tl.call(
        () => {
          if (!tl.reversed()) window.dispatchEvent(new CustomEvent('hq:countup'));
        },
        [],
        1.62,
      );
      // 趋势图：路径描边 → 面积渐显
      on('[data-draw]', (t) => {
        const drawable = t.filter((el) => drawLen(el) > 0);
        if (!drawable.length) return;
        tl.fromTo(
          drawable,
          {
            strokeDasharray: (_i: number, el: Element) => drawLen(el),
            strokeDashoffset: (_i: number, el: Element) => drawLen(el),
          },
          { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.1 },
          1.72,
        );
      });
      on('[data-anim="trend-area"]', (t) => {
        tl.fromTo(t, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 2.05);
      });
      // 雷达：从中心展开 + 顶点依次点亮
      on('[data-radar-scale]', (t) => {
        tl.fromTo(t, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'power4.out' }, 1.85);
      });
      on('[data-radar-dot]', (t) => {
        tl.fromTo(
          t,
          { opacity: 0, scale: 0.2 },
          { opacity: 1, scale: 1, duration: 0.4, ease: 'power4.out', stagger: 0.05 },
          2.0,
        );
      });
      // 直方图 / 错误热点
      on('[data-hist-bar]', (t) => {
        tl.fromTo(t, { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: 'power4.out', stagger: 0.05 }, 1.9);
      });
      on('[data-mistake-row]', (t) => {
        tl.fromTo(
          t,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power4.out', stagger: 0.05 },
          1.95,
        );
      });
      on('[data-mistake-bar]', (t) => {
        tl.fromTo(t, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power4.out', stagger: 0.05 }, 2.0);
      });
      // 其余卡片与表格
      on('[data-anim="panel"]', (t) => {
        tl.fromTo(
          t,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power4.out', stagger: 0.04 },
          1.9,
        );
      });
      on('[data-anim="row"]', (t) => {
        tl.fromTo(
          t,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power4.out', stagger: 0.015 },
          1.95,
        );
      });

      /* ---------- Phase 5 · 收尾：canvas 转为工作台低频背景 ---------- */
      tl.call(
        () => {
          if (tl.reversed()) {
            engine?.setAmbientMode(false);
            engine?.setOpacity(1);
          } else {
            engine?.setAmbientMode(true);
            engine?.setOpacity(0.12);
          }
        },
        [],
        2.2,
      );

      return tl;
    },
    [engineRef, setStage, setSkeleton],
  );

  const play = useCallback(
    (origin: { x: number; y: number }) => {
      originRef.current = origin;

      if (reduced()) {
        const dash = document.querySelector<HTMLElement>('[data-dashboard]');
        if (dash) {
          dash.style.clipPath = 'none';
          dash.style.pointerEvents = 'auto';
        }
        setSkeleton(false);
        setStage('dashboard');
        window.dispatchEvent(new CustomEvent('hq:countup'));
        engineRef.current?.setAmbientMode(true);
        engineRef.current?.setOpacity(0.12);
        return;
      }

      const dash = document.querySelector<HTMLElement>('[data-dashboard]');
      if (dash) dash.style.clipPath = `circle(0% at ${origin.x}px ${origin.y}px)`;
      setBusy(true);
      setSkeleton(true);
      setStage('transition');

      // 重建时间线（每次登录都重新测量元素位置）
      tlRef.current?.kill();
      const tl = build(origin.x, origin.y);
      tlRef.current = tl;
      const submit = document.querySelector('[data-login-submit]');
      if (submit) gsap.set(submit, { scale: 1 });
      tl.play(0);
    },
    [build, engineRef, setStage, setSkeleton],
  );

  const logout = useCallback(() => {
    if (reduced()) {
      const dash = document.querySelector<HTMLElement>('[data-dashboard]');
      if (dash) {
        dash.style.clipPath = `circle(0% at ${originRef.current.x}px ${originRef.current.y}px)`;
        dash.style.pointerEvents = 'none';
      }
      setSkeleton(true);
      setStage('login');
      engineRef.current?.setAmbientMode(false);
      engineRef.current?.setOpacity(1);
      return;
    }
    const tl = tlRef.current;
    if (!tl) {
      setStage('login');
      return;
    }
    setBusy(true);
    engineRef.current?.setAmbientMode(false);
    engineRef.current?.setOpacity(1);
    tl.reverse();
  }, [engineRef, setStage, setSkeleton]);

  /** ESC / 点击：立即跳到终态（正向→工作台，反向→登录） */
  const skip = useCallback(() => {
    const tl = tlRef.current;
    if (!tl || !tl.isActive()) return;
    const back = tl.reversed();
    tl.pause();
    tl.progress(back ? 0 : 1);
    // 兜底：直接落终态（回调本身幂等）
    if (back) finishRef.current?.reverse();
    else finishRef.current?.forward();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip]);

  useEffect(
    () => () => {
      tlRef.current?.kill();
    },
    [],
  );

  return { play, logout, skip, busy };
}

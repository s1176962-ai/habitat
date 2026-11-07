import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import Sparkline from './charts/Sparkline';
import { useI18n } from '../i18n';

interface Props {
  icon: ReactNode;
  label: string;
  sub?: string;
  value: number;
  format: (v: number) => string;
  digits?: number;
  unit?: string;
  delta?: number;
  deltaFormat?: (v: number) => string;
  spark?: number[];
  color: string;
  /** count-up 的吸附步长（默认 10^-digits；比率型数值需显式指定） */
  step?: number;
  /** 实时事件到达时闪一下 */
  flash?: boolean;
}

/** KPI 卡：图标 + 数值（count-up） + 环比 Δ + Sparkline */
export default function KpiCard({
  icon,
  label,
  sub,
  value,
  format,
  digits = 1,
  unit,
  delta,
  deltaFormat,
  spark,
  color,
  step,
  flash = false,
}: Props) {
  const { t } = useI18n();
  const numRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fmtRef = useRef(format);
  fmtRef.current = format;
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    const run = () => {
      if (reduced) {
        el.textContent = fmtRef.current(value);
        return;
      }
      const obj = { v: 0 };
      gsap.to(obj, {
        v: value,
        duration: 0.9,
        ease: 'power4.out',
        snap: { v: step ?? 1 / Math.pow(10, digits) },
        onUpdate: () => {
          el.textContent = fmtRef.current(obj.v);
          if (numRef.current) numRef.current.textContent = fmtRef.current(obj.v);
        },
        // 收尾对齐到精确值，避免吸附步长造成的尾差
        onComplete: () => {
          el.textContent = fmtRef.current(value);
        },
      });
    };
    window.addEventListener('hq:countup', run);
    return () => window.removeEventListener('hq:countup', run);
  }, [value, digits, step, reduced]);

  // 初始值：未播放动画前也显示目标值（避免空态），动画事件触发后从 0 滚上去
  useEffect(() => {
    if (numRef.current && !numRef.current.textContent) numRef.current.textContent = format(value);
  }, [value, format]);

  useEffect(() => {
    if (!flash || !cardRef.current || reduced) return;
    const el = cardRef.current;
    el.classList.remove('hq-flash');
    // 强制重排以重启动画
    void el.offsetWidth;
    el.classList.add('hq-flash');
  }, [flash, reduced]);

  const up = (delta ?? 0) > 0;
  const flat = Math.abs(delta ?? 0) < 1e-9;

  return (
    <div ref={cardRef} data-anim="kpi" className="hq-card hq-card--hover p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}
          >
            <span style={{ color, display: 'inline-flex' }}>{icon}</span>
          </span>
          <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
            {label}
          </span>
        </div>
        {delta !== undefined && !flat && (
          <span
            className="tnum inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
            style={{
              color: up ? 'var(--up)' : 'var(--down)',
              background: up
                ? 'color-mix(in srgb, var(--up) 12%, transparent)'
                : 'color-mix(in srgb, var(--down) 12%, transparent)',
            }}
            title={t('kpi.deltaTitle')}
          >
            {up ? '▲' : '▼'} {deltaFormat ? deltaFormat(delta) : `${up ? '+' : ''}${delta.toFixed(digits)}`}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span
            ref={numRef}
            className="tnum text-[28px] font-semibold leading-none"
            style={{ color: 'var(--foreground)' }}
          >
            {format(value)}
          </span>
          {unit && (
            <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
              {unit}
            </span>
          )}
        </div>
        {spark && spark.length > 1 && <Sparkline data={spark} color={color} />}
      </div>

      {sub && (
        <div className="mt-1.5 text-[11px]" style={{ color: 'var(--muted)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { HABITATS, habitatColorFor, type Habitat } from '../../mock/names';
import { useMeasure } from '../../lib/useMeasure';
import { useI18n } from '../../i18n';

interface Props {
  values: Record<Habitat, number>;
  compare?: Record<Habitat, number>;
  /** 自定义对标系列名；不传则按当前语言取「年级平均 / Grade avg.」 */
  compareLabel?: string;
  size?: number;
  dark?: boolean;
  /** 低于该值视为难点，标签加警示色 */
  warnBelow?: number;
}

const RINGS = [0.25, 0.5, 0.75, 1];

/** 六大栖息地掌握度雷达：本班（实线填充）vs 对标（虚线） */
export default function HabitatRadar({
  values,
  compare,
  compareLabel,
  size = 260,
  dark = false,
  warnBelow = 0.7,
}: Props) {
  const { locale, t } = useI18n();
  const cmpLabel = compareLabel ?? t('radar.compareLabel');
  // 自适应宽度，但设上限，避免横向拉伸导致卡片过高、与同排图表失衡
  const [wrapRef, measured] = useMeasure<HTMLDivElement>();
  const box = Math.max(200, Math.min(measured || size, Math.max(size, 340)));
  const cx = box / 2;
  const cy = box / 2 + 4;
  const R = box * 0.34;

  const geo = useMemo(() => {
    const axes = HABITATS.map((h, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / HABITATS.length;
      return { ...h, angle: a, ux: Math.cos(a), uy: Math.sin(a) };
    });
    const pt = (i: number, v: number) => {
      const ax = axes[i];
      const r = R * Math.max(0.02, Math.min(1, v));
      return [cx + ax.ux * r, cy + ax.uy * r] as const;
    };
    const poly = (vals: Record<Habitat, number>) =>
      axes.map((a, i) => pt(i, vals[a.id] ?? 0).join(',')).join(' ');
    const ring = (k: number) =>
      axes.map((a) => `${cx + a.ux * R * k},${cy + a.uy * R * k}`).join(' ');
    return { axes, pt, poly, ring };
  }, [cx, cy, R]);

  const mainPoly = geo.poly(values);
  const cmpPoly = compare ? geo.poly(compare) : null;

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg
        width={box}
        viewBox={`0 0 ${box} ${box + 8}`}
        style={{
          display: 'block',
          margin: '0 auto',
          maxWidth: '100%',
          height: 'auto',
          overflow: 'visible',
        }}
      >
      {/* 同心多边形网格 */}
      {RINGS.map((k) => (
        <polygon
          key={k}
          points={geo.ring(k)}
          fill="none"
          stroke="var(--grid)"
          strokeWidth={1}
          opacity={k === 1 ? 0.9 : 0.55}
        />
      ))}
      {geo.axes.map((a) => (
        <line
          key={a.id}
          x1={cx}
          y1={cy}
          x2={cx + a.ux * R}
          y2={cy + a.uy * R}
          stroke="var(--grid)"
          strokeWidth={1}
          opacity={0.7}
        />
      ))}

      <g data-radar-scale style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {cmpPoly && (
          <polygon
            points={cmpPoly}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.85}
          />
        )}
        <polygon
          points={mainPoly}
          fill="var(--accent)"
          fillOpacity={dark ? 0.22 : 0.16}
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {geo.axes.map((a, i) => {
          const [x, y] = geo.pt(i, values[a.id] ?? 0);
          const weak = (values[a.id] ?? 0) < warnBelow;
          return (
            <circle
              key={a.id}
              data-radar-dot
              cx={x}
              cy={y}
              r={weak ? 4 : 3}
              fill={weak ? habitatColorFor(a.id, dark) : 'var(--accent)'}
              stroke="var(--surface)"
              strokeWidth={1.5}
            />
          );
        })}
      </g>

      {/* 轴标签 */}
      {geo.axes.map((a) => {
        const lx = cx + a.ux * (R + 24);
        const ly = cy + a.uy * (R + 20);
        const v = values[a.id] ?? 0;
        const weak = v < warnBelow;
        return (
          <g key={a.id}>
            <text
              x={lx}
              y={ly}
              textAnchor={Math.abs(a.ux) < 0.2 ? 'middle' : a.ux > 0 ? 'start' : 'end'}
              fontSize={locale === 'en' ? 10 : 11}
              fill={weak ? habitatColorFor(a.id, dark) : 'var(--foreground)'}
              fontWeight={weak ? 600 : 500}
            >
              {locale === 'en' ? a.en : a.cn}
            </text>
            <text
              x={lx}
              y={ly + 13}
              textAnchor={Math.abs(a.ux) < 0.2 ? 'middle' : a.ux > 0 ? 'start' : 'end'}
              fontSize={10}
              fill="var(--muted)"
              className="tnum"
            >
              {(v * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* 图例 */}
      <g transform={`translate(${cx - (locale === 'en' ? 84 : 62)}, ${box + 2})`}>
        <rect x={0} y={-8} width={10} height={3} rx={1.5} fill="var(--accent)" />
        <text x={15} y={-4} fontSize={10} fill="var(--muted)">
          {t('radar.thisClass')}
        </text>
        {compare && (
          <>
            <rect
              x={locale === 'en' ? 84 : 52}
              y={-8}
              width={10}
              height={3}
              rx={1.5}
              fill="var(--muted)"
              opacity={0.8}
            />
            <text x={locale === 'en' ? 99 : 67} y={-4} fontSize={10} fill="var(--muted)">
              {cmpLabel}
            </text>
          </>
        )}
      </g>
      </svg>
    </div>
  );
}

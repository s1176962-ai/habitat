import { useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { area as d3area, curveMonotoneX, line as d3line } from 'd3-shape';
import { useMeasure } from '../../lib/useMeasure';
import { shortDate, weekdayLabel, pctNum, isWeekend } from '../../lib/format';
import type { TrendPoint } from '../../mock/students';

interface Props {
  trend: TrendPoint[];
  height?: number;
}

const PAD = { top: 18, right: 48, bottom: 28, left: 44 };

const SERIES = [
  { key: 'accuracy' as const, cn: '平均正确率', unit: '%', color: '#C3695C' },
  { key: 'score' as const, cn: '平均得分', unit: '分', color: '#5A8B93' },
];

/** 学习趋势面积图：双系列 + hover 十字准线 + 图例切换 */
export default function TrendArea({ trend, height = 300 }: Props) {
  const [wrapRef, width] = useMeasure<HTMLDivElement>();
  const [visible, setVisible] = useState<{ accuracy: boolean; score: boolean }>({
    accuracy: true,
    score: true,
  });
  const [hover, setHover] = useState<number | null>(null);
  const accPathRef = useRef<SVGPathElement>(null);
  const scorePathRef = useRef<SVGPathElement>(null);

  const data = trend.length ? trend : [];

  const geo = useMemo(() => {
    if (!width || data.length < 2) return null;
    const innerW = Math.max(10, width - PAD.left - PAD.right);
    const innerH = height - PAD.top - PAD.bottom;
    const x = scaleLinear()
      .domain([0, data.length - 1])
      .range([PAD.left, PAD.left + innerW]);

    const accs = data.map((d) => d.accuracy);
    const scores = data.map((d) => d.score);
    const aMin = Math.min(...accs);
    const aMax = Math.max(...accs);
    const sMin = Math.min(...scores);
    const sMax = Math.max(...scores);

    const yAcc = scaleLinear()
      .domain([Math.max(0, aMin - 0.06), Math.min(1, aMax + 0.06)])
      .range([PAD.top + innerH, PAD.top]);
    const yScore = scaleLinear()
      .domain([Math.max(0, sMin - 6), Math.min(100, sMax + 6)])
      .range([PAD.top + innerH, PAD.top]);

    const mk = (ys: (v: number) => number, get: (d: TrendPoint) => number) => {
      const l = d3line<TrendPoint>()
        .x((_, i) => x(i))
        .y((d) => ys(get(d)))
        .curve(curveMonotoneX);
      const a = d3area<TrendPoint>()
        .x((_, i) => x(i))
        .y0(PAD.top + innerH)
        .y1((d) => ys(get(d)))
        .curve(curveMonotoneX);
      return { line: l(data) ?? '', area: a(data) ?? '' };
    };

    return {
      x,
      yAcc,
      yScore,
      innerH,
      acc: mk(yAcc, (d) => d.accuracy),
      score: mk(yScore, (d) => d.score),
      ticks: yAcc.ticks(4),
      scoreTicks: yScore.ticks(4),
    };
  }, [width, height, data]);

  const xLabels = useMemo(() => {
    if (!geo || !data.length) return [];
    const step = Math.max(1, Math.floor(data.length / 6));
    const out: { i: number; x: number; label: string; sub: string }[] = [];
    for (let i = 0; i < data.length; i += step) {
      out.push({
        i,
        x: geo.x(i),
        label: shortDate(data[i].date),
        sub: weekdayLabel(data[i].date),
      });
    }
    return out;
  }, [geo, data]);

  const hoverPoint = hover != null ? data[hover] : null;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      {/* 图例 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        {SERIES.map((s) => {
          const on = visible[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setVisible((v) => ({ ...v, [s.key]: !v[s.key] }))}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all duration-200"
              style={{
                borderColor: on ? s.color : 'var(--border)',
                color: on ? 'var(--foreground)' : 'var(--muted)',
                background: on ? 'var(--panel)' : 'transparent',
                opacity: on ? 1 : 0.55,
              }}
              aria-pressed={on}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: on ? s.color : 'var(--border)',
                  display: 'inline-block',
                }}
              />
              {s.cn}
            </button>
          );
        })}
        <span className="ml-auto text-[11px]" style={{ color: 'var(--muted)' }}>
          {hoverPoint ? shortDate(hoverPoint.date) : '悬停查看每日明细'}
        </span>
      </div>

      {geo && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block', overflow: 'visible' }}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const mx = ((e.clientX - rect.left) / rect.width) * width;
            const t = geo.x.invert(mx);
            const i = Math.max(0, Math.min(data.length - 1, Math.round(t)));
            setHover(i);
          }}
        >
          {/* 网格 + 左右轴 */}
          {geo.ticks.map((t) => {
            const y = geo.yAcc(t);
            return (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="var(--grid)"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="var(--muted)" className="tnum">
                  {(t * 100).toFixed(0)}%
                </text>
                <text x={width - PAD.right + 8} y={y + 4} fontSize={10} fill="var(--muted)" className="tnum" style={{ opacity: visible.score ? 1 : 0.25 }}>
                  {geo.yScore.invert(y).toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* 周末弱化底纹 */}
          {data.map((d, i) =>
            isWeekend(d.date) ? (
              <rect
                key={`we-${i}`}
                x={geo.x(i) - (width - PAD.left - PAD.right) / (data.length - 1) / 2}
                y={PAD.top}
                width={(width - PAD.left - PAD.right) / (data.length - 1)}
                height={geo.innerH}
                fill="var(--foreground)"
                opacity={0.03}
              />
            ) : null,
          )}

          {/* 面积 */}
          {visible.accuracy && (
            <path d={geo.acc.area} fill={SERIES[0].color} opacity={0.1} data-anim="trend-area" />
          )}
          {visible.score && (
            <path d={geo.score.area} fill={SERIES[1].color} opacity={0.08} data-anim="trend-area" />
          )}

          {/* 折线（描边入场） */}
          {visible.accuracy && (
            <path
              ref={accPathRef}
              data-draw
              d={geo.acc.line}
              fill="none"
              stroke={SERIES[0].color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {visible.score && (
            <path
              ref={scorePathRef}
              data-draw
              d={geo.score.line}
              fill="none"
              stroke={SERIES[1].color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X 轴标签 */}
          {xLabels.map((l) => (
            <g key={l.i}>
              <text x={l.x} y={height - 10} textAnchor="middle" fontSize={10} fill="var(--muted)" className="tnum">
                {l.label}
              </text>
              <text x={l.x} y={height - 22} textAnchor="middle" fontSize={9} fill="var(--muted)" opacity={0.6}>
                {l.sub}
              </text>
            </g>
          ))}

          {/* 十字准线 */}
          {hover != null && (
            <g>
              <line
                x1={geo.x(hover)}
                x2={geo.x(hover)}
                y1={PAD.top}
                y2={PAD.top + geo.innerH}
                stroke="var(--muted)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              {visible.accuracy && (
                <circle cx={geo.x(hover)} cy={geo.yAcc(data[hover].accuracy)} r={4} fill={SERIES[0].color} stroke="var(--surface)" strokeWidth={2} />
              )}
              {visible.score && (
                <circle cx={geo.x(hover)} cy={geo.yScore(data[hover].score)} r={4} fill={SERIES[1].color} stroke="var(--surface)" strokeWidth={2} />
              )}
            </g>
          )}
        </svg>
      )}

      {/* Tooltip */}
      {hover != null && hoverPoint && geo && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(Math.max((geo.x(hover) / width) * 100, 4), 74),
            top: 24,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card-hover)',
            padding: '8px 10px',
            fontSize: 11,
            minWidth: 128,
            zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--foreground)' }}>
            {shortDate(hoverPoint.date)} · {weekdayLabel(hoverPoint.date)}
          </div>
          <Row color={SERIES[0].color} label="平均正确率" value={`${pctNum(hoverPoint.accuracy)}%`} show={visible.accuracy} />
          <Row color={SERIES[1].color} label="平均得分" value={hoverPoint.score.toFixed(1)} show={visible.score} />
          <div style={{ color: 'var(--muted)', marginTop: 4 }}>
            {hoverPoint.games} 局 · {hoverPoint.active} 人活跃 · {Math.round(hoverPoint.minutes)} 分钟
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ color, label, value, show }: { color: string; label: string; value: string; show: boolean }) {
  if (!show) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.7 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="tnum" style={{ marginLeft: 'auto', fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

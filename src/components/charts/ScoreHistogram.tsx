import { useMemo, useState } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import { useMeasure } from '../../lib/useMeasure';
import { GAMES, type GameId } from '../../mock/names';
import type { HistogramBin } from '../../mock/students';
import { useI18n } from '../../i18n';
import { gameLabel } from '../../i18n/labels';

interface Props {
  bins: HistogramBin[];
  height?: number;
}

const GAME_COLOR: Record<GameId, string> = {
  'habitat-match': '#6E8B5A',
  'migration-rush': '#C9A24A',
  'biome-builder': '#5A8B93',
};

const PAD = { top: 16, right: 8, bottom: 30, left: 36 };

/** 得分分布直方图：按小游戏分组的堆叠柱状 */
export default function ScoreHistogram({ bins, height = 268 }: Props) {
  const { locale, t } = useI18n();
  const [wrapRef, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (!width || !bins.length) return null;
    const innerW = Math.max(10, width - PAD.left - PAD.right);
    const innerH = height - PAD.top - PAD.bottom;
    const x = scaleBand<string>()
      .domain(bins.map((b) => b.label))
      .range([PAD.left, PAD.left + innerW])
      .padding(0.34);
    const max = Math.max(1, ...bins.map((b) => b.total));
    const y = scaleLinear()
      .domain([0, Math.ceil(max * 1.12)])
      .nice()
      .range([PAD.top + innerH, PAD.top]);
    return { x, y, innerH, innerW, max, ticks: y.ticks(4) };
  }, [width, height, bins]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        {GAMES.map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: GAME_COLOR[g.id], display: 'inline-block' }} />
            {gameLabel(g.id, locale)}
          </span>
        ))}
      </div>

      {geo && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
          {geo.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--grid)" strokeWidth={1} strokeDasharray="3 4" />
              <text x={PAD.left - 8} y={geo.y(t) + 4} textAnchor="end" fontSize={10} fill="var(--muted)" className="tnum">
                {t}
              </text>
            </g>
          ))}

          {bins.map((b, bi) => {
            const bx = geo.x(b.label) ?? PAD.left;
            const bw = geo.x.bandwidth();
            let acc = 0;
            return (
              <g
                key={b.label}
                data-hist-bar
                onMouseEnter={() => setHover(bi)}
                onMouseLeave={() => setHover(null)}
                style={{ transformOrigin: `${bx + bw / 2}px ${PAD.top + geo.innerH}px` }}
              >
                <rect
                  x={bx}
                  y={PAD.top}
                  width={bw}
                  height={geo.innerH}
                  fill="transparent"
                  style={{ cursor: 'default' }}
                />
                {hover === bi && <rect x={bx - 2} y={PAD.top - 2} width={bw + 4} height={geo.innerH + 4} fill="var(--foreground)" opacity={0.04} rx={6} />}
                {GAMES.map((g) => {
                  const v = b.byGame[g.id] ?? 0;
                  if (v <= 0) return null;
                  const y = geo.y(acc + v);
                  acc += v;
                  return (
                    <rect
                      key={g.id}
                      x={bx}
                      y={y}
                      width={bw}
                      height={Math.max(1, (v / geo.max) * geo.innerH)}
                      fill={GAME_COLOR[g.id]}
                      opacity={hover == null || hover === bi ? 0.92 : 0.45}
                    />
                  );
                })}
                <text x={bx + bw / 2} y={height - 12} textAnchor="middle" fontSize={10} fill="var(--muted)" className="tnum">
                  {b.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {hover != null && bins[hover] && geo && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(Math.max((geo.x(bins[hover].label) ?? 0) - 10, 0), Math.max(0, width - 150)),
            top: 30,
            pointerEvents: 'none',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card-hover)',
            padding: '8px 10px',
            fontSize: 11,
            minWidth: 132,
            zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {t('chart.histTooltip', { range: bins[hover].label, total: bins[hover].total })}
          </div>
          {GAMES.map((g) => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: GAME_COLOR[g.id] }} />
              <span style={{ color: 'var(--muted)' }}>{gameLabel(g.id, locale)}</span>
              <span className="tnum" style={{ marginLeft: 'auto', fontWeight: 600 }}>
                {bins[hover].byGame[g.id] ?? 0}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

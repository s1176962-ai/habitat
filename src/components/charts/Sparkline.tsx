import { useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import { area as d3area, curveMonotoneX, line as d3line } from 'd3-shape';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
}

/** KPI 卡内嵌迷你折线 */
export default function Sparkline({
  data,
  width = 84,
  height = 28,
  color = 'var(--accent)',
  fill = true,
  strokeWidth = 1.5,
}: Props) {
  const { linePath, areaPath } = useMemo(() => {
    const vals = data.length ? data : [0, 0];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.15 || Math.max(0.5, Math.abs(max) * 0.1);
    const x = scaleLinear()
      .domain([0, Math.max(1, vals.length - 1)])
      .range([1, width - 1]);
    const y = scaleLinear()
      .domain([min - pad, max + pad])
      .range([height - 3, 3]);
    const l = d3line<number>()
      .x((_, i) => x(i))
      .y((d) => y(d))
      .curve(curveMonotoneX);
    const a = d3area<number>()
      .x((_, i) => x(i))
      .y0(height)
      .y1((d) => y(d))
      .curve(curveMonotoneX);
    return { linePath: l(vals) ?? '', areaPath: a(vals) ?? '' };
  }, [data, width, height]);

  const gid = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gid})`} />
        </>
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

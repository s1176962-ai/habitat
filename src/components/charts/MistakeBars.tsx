import { habitatColorFor, habitatLabel } from '../../mock/names';
import type { Hotspot } from '../../mock/students';

interface Props {
  hotspots: Hotspot[];
  dark?: boolean;
}

/** 错误热点横条：Top 8「动物 → 错误栖息地」配对 */
export default function MistakeBars({ hotspots, dark = false }: Props) {
  if (!hotspots.length) {
    return (
      <div className="flex h-40 items-center justify-center text-[13px]" style={{ color: 'var(--muted)' }}>
        全班最近没有集中的错误 🎉
      </div>
    );
  }
  const max = Math.max(...hotspots.map((h) => h.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {hotspots.map((h) => (
        <div key={h.key} data-mistake-row>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12.5, marginBottom: 5 }}>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{h.animal}</span>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>{h.en}</span>
            <span style={{ color: 'var(--muted)' }}>→</span>
            <span
              style={{
                color: habitatColorFor(h.chosen, dark),
                fontWeight: 600,
              }}
            >
              {habitatLabel(h.chosen)}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>
              （正确：{habitatLabel(h.correct)}）
            </span>
            <span className="tnum" style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 11 }}>
              <b style={{ color: 'var(--foreground)', fontWeight: 600 }}>{h.count}</b> 次 · 错误率{' '}
              {(h.rate * 100).toFixed(0)}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: 'var(--panel)',
              overflow: 'hidden',
            }}
          >
            <div
              data-mistake-bar
              style={{
                width: `${(h.count / max) * 100}%`,
                height: '100%',
                borderRadius: 999,
                background: `linear-gradient(90deg, ${habitatColorFor(h.correct, dark)}, ${habitatColorFor(h.chosen, dark)})`,
                transformOrigin: 'left center',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

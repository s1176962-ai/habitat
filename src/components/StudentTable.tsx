import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Flame } from 'lucide-react';
import AvatarShape from './AvatarShape';
import { relativeTime, pctNum } from '../lib/format';
import { STATUS_META, type Status } from '../mock/names';
import type { Student } from '../mock/generator';

export type FilterKey = 'all' | 'needs-attention' | 'at-risk' | 'inactive';
export type SortKey = 'score' | 'accuracy' | 'lastActive' | 'streak';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'needs-attention', label: '需关注' },
  { key: 'at-risk', label: '落后' },
  { key: 'inactive', label: '未活跃' },
];

const COLUMNS: { key: SortKey; label: string; align?: 'center' | 'right' }[] = [
  { key: 'score', label: '平均得分' },
  { key: 'accuracy', label: '平均正确率' },
  { key: 'streak', label: '连续打卡', align: 'center' },
  { key: 'lastActive', label: '最近活跃', align: 'right' },
];

const STATUS_STYLE: Record<Status, { bg: string; fg: string }> = {
  improving: { bg: 'color-mix(in srgb, var(--down) 14%, transparent)', fg: 'var(--down)' },
  steady: { bg: 'color-mix(in srgb, var(--down) 14%, transparent)', fg: 'var(--down)' },
  'needs-attention': { bg: 'color-mix(in srgb, #C9A24A 20%, transparent)', fg: '#B8892F' },
  'at-risk': { bg: 'color-mix(in srgb, var(--up) 14%, transparent)', fg: 'var(--up)' },
  inactive: { bg: 'var(--panel)', fg: 'var(--muted)' },
};

function accuracyColor(v: number): string {
  if (v >= 0.85) return 'var(--down)';
  if (v >= 0.7) return 'var(--muted)';
  return 'var(--up)';
}

interface Props {
  students: Student[];
  query: string;
  filter: FilterKey;
  onFilter: (f: FilterKey) => void;
  onSelect: (s: Student) => void;
  selectedId?: string | null;
}

export default function StudentTable({ students, query, filter, onFilter, onSelect, selectedId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim();
    let list = students;
    if (filter === 'needs-attention') list = list.filter((s) => s.status === 'needs-attention');
    else if (filter === 'at-risk') list = list.filter((s) => s.status === 'at-risk');
    else if (filter === 'inactive') list = list.filter((s) => s.status === 'inactive');
    if (q) list = list.filter((s) => s.name.includes(q) || s.id.includes(q));
    const dir = asc ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      let d = 0;
      if (sortKey === 'score') d = a.avgScore - b.avgScore;
      else if (sortKey === 'accuracy') d = a.avgAccuracy - b.avgAccuracy;
      else if (sortKey === 'streak') d = a.streakDays - b.streakDays;
      else d = new Date(a.lastActiveAt).getTime() - new Date(b.lastActiveAt).getTime();
      return d * dir;
    });
    return sorted;
  }, [students, query, filter, sortKey, asc]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(false);
    }
    setPage(0);
  };

  return (
    <section data-anim="panel" className="hq-card overflow-hidden">
      {/* 筛选 chips */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          const count =
            f.key === 'all'
              ? students.length
              : students.filter((s) => s.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => {
                onFilter(f.key);
                setPage(0);
              }}
              className="rounded-full border px-3 py-1 text-[12px] transition-all duration-300"
              style={{
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--muted)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {f.label}
              <span className="tnum ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
        <span className="ml-auto text-[11px]" style={{ color: 'var(--muted)' }}>
          共 {filtered.length} 人 · 点击任意行查看学生详情
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr style={{ color: 'var(--muted)' }}>
              <th className="px-4 py-2.5 text-left font-medium">学生</th>
              <th className="px-3 py-2.5 text-center font-medium">等级</th>
              <th className="px-3 py-2.5 text-right font-medium">对局数</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-3 py-2.5 font-medium" style={{ textAlign: c.align ?? 'right' }}>
                  <button
                    onClick={() => toggleSort(c.key)}
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    aria-label={`按${c.label}排序`}
                  >
                    {c.label}
                    {sortKey === c.key &&
                      (asc ? <ArrowUp size={12} strokeWidth={1.5} /> : <ArrowDown size={12} strokeWidth={1.5} />)}
                  </button>
                </th>
              ))}
              <th className="px-4 py-2.5 text-right font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((s, i) => {
              const st = STATUS_META[s.status];
              const ss = STATUS_STYLE[s.status];
              return (
                <tr
                  key={s.id}
                  data-anim="row"
                  data-row-index={i}
                  tabIndex={0}
                  onClick={() => onSelect(s)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(s);
                    }
                  }}
                  className="cursor-pointer border-t border-border outline-none transition-colors duration-200"
                  style={{
                    background: selectedId === s.id ? 'var(--accent-soft)' : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedId !== s.id) e.currentTarget.style.background = 'var(--panel)';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedId !== s.id) e.currentTarget.style.background = '';
                  }}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <AvatarShape name={s.name} idx={s.avatarIdx} size={32} />
                      <div className="leading-tight">
                        <div style={{ color: 'var(--foreground)', fontWeight: 500 }}>{s.name}</div>
                        <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                          Lv.{s.level} · {s.xp} XP
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className="tnum inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
                      style={{ background: 'var(--panel)', color: 'var(--foreground)' }}
                    >
                      {s.level}
                    </span>
                  </td>
                  <td className="tnum px-3 py-2.5 text-right">{s.totalGames}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="tnum" style={{ color: 'var(--foreground)' }}>
                        {s.avgScore.toFixed(1)}
                      </span>
                      <span className="hidden h-1.5 w-14 overflow-hidden rounded-full sm:block" style={{ background: 'var(--panel)' }}>
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.min(100, s.avgScore)}%`,
                            background: 'linear-gradient(90deg, #5A8B93, #6F9C9E)',
                          }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="tnum font-medium" style={{ color: accuracyColor(s.avgAccuracy) }}>
                      {pctNum(s.avgAccuracy)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="tnum inline-flex items-center gap-1" style={{ color: s.streakDays >= 5 ? 'var(--accent)' : 'var(--muted)' }}>
                      {s.streakDays >= 5 && <Flame size={12} strokeWidth={1.5} />}
                      {s.streakDays}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ color: 'var(--muted)' }}>
                    {relativeTime(s.lastActiveAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[11px]"
                      style={{ background: ss.bg, color: ss.fg }}
                    >
                      {st.cn}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
          第 {safePage + 1} / {pageCount} 页
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded-lg border border-border px-2.5 py-1 text-[12px] disabled:opacity-40"
            style={{ color: 'var(--foreground)' }}
          >
            上一页
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            className="rounded-lg border border-border px-2.5 py-1 text-[12px] disabled:opacity-40"
            style={{ color: 'var(--foreground)' }}
          >
            下一页
          </button>
        </div>
      </div>
    </section>
  );
}

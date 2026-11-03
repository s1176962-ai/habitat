import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Activity, Clock, Target, Trophy, Users } from 'lucide-react';
import TopBar from './TopBar';
import KpiCard from './KpiCard';
import StudentTable, { type FilterKey } from './StudentTable';
import StudentDrawer from './StudentDrawer';
import AttentionPanel from './AttentionPanel';
import RealtimeToast from './RealtimeToast';
import TrendArea from './charts/TrendArea';
import HabitatRadar from './charts/HabitatRadar';
import ScoreHistogram from './charts/ScoreHistogram';
import MistakeBars from './charts/MistakeBars';
import { CLASSES, STUDENTS } from '../mock/generator';
import { computeClassMetrics, type RangeKey } from '../mock/students';
import { createRealtimeStream, type RealtimeEvent, type RealtimeStream } from '../mock/realtime';
import { minutesToHours, pctNum } from '../lib/format';
import type { ThemeName } from '../lib/shapeTrail/palettes';
import type { Student } from '../mock/generator';

interface Props {
  theme: ThemeName;
  onToggleTheme: () => void;
  onLogout: () => void;
  skeleton: boolean;
}

function greeting(hour: number): string {
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function Card({
  title,
  sub,
  children,
  className,
  card,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
  card?: string;
}) {
  return (
    <section data-anim="panel" data-card={card} className={`hq-card p-4 ${className ?? ''}`}>
      <div className="mb-3">
        <h3 className="text-[13.5px] font-medium" style={{ color: 'var(--foreground)' }}>
          {title}
        </h3>
        {sub && (
          <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--muted)' }}>
            {sub}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function DashboardPage({ theme, onToggleTheme, onLogout, skeleton }: Props) {
  const dark = theme === 'dark';
  const [className, setClassName] = useState<string>(CLASSES[0]);
  const [range, setRange] = useState<RangeKey>('30d');
  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<Student | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [muted, setMuted] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);
  const [flash, setFlash] = useState(0);

  const streamRef = useRef<RealtimeStream | null>(null);
  const firstRun = useRef(true);

  const metrics = useMemo(() => computeClassMetrics(className, range), [className, range]);
  const students = useMemo(() => STUDENTS.filter((s) => s.className === className), [className]);

  /* ---- 搜索防抖 200ms ---- */
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 200);
    return () => clearTimeout(t);
  }, [rawQuery]);

  /* ---- 切换班级 / 时间范围：重算 + 0.5s 数值过渡 ---- */
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const id = window.setTimeout(() => window.dispatchEvent(new CustomEvent('hq:countup')), 30);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const kpis = Array.from(document.querySelectorAll('[data-anim="kpi"]'));
      if (kpis.length) {
        gsap.fromTo(
          kpis,
          { y: 8, opacity: 0.55 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.05 },
        );
      }
      const drawables = Array.from(document.querySelectorAll('[data-draw]')).filter((el) => {
        const p = el as SVGPathElement;
        return typeof p.getTotalLength === 'function' && p.getTotalLength() > 0;
      });
      if (drawables.length) {
        gsap.fromTo(
          drawables,
          {
            strokeDasharray: (_i: number, el: Element) => (el as SVGPathElement).getTotalLength(),
            strokeDashoffset: (_i: number, el: Element) => (el as SVGPathElement).getTotalLength(),
          },
          { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut', stagger: 0.08 },
        );
      }
    }
    return () => window.clearTimeout(id);
  }, [className, range]);

  /* ---- 实时事件流 ---- */
  useEffect(() => {
    const stream = createRealtimeStream(className, (e) => {
      setEvents((prev) => [...prev, e].slice(-2));
      setFlash((v) => v + 1);
      window.setTimeout(() => setEvents((prev) => prev.filter((x) => x.id !== e.id)), 3500);
    });
    streamRef.current = stream;
    stream.setMuted(muted);
    stream.start();
    return () => {
      stream.stop();
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className]);

  useEffect(() => {
    streamRef.current?.setMuted(muted);
  }, [muted]);

  const pushToast = useCallback((text: string) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text }].slice(-3));
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);

  const openStudent = useCallback((s: Student) => {
    setSelected(s);
    setDrawerOpen(true);
  }, []);

  const weeklyGames = useMemo(
    () => metrics.trend.slice(-7).reduce((a, p) => a + p.games, 0),
    [metrics.trend],
  );

  const nowHour = new Date().getHours();

  return (
    <div className="relative min-h-full" style={{ background: 'var(--background)', minHeight: '100vh' }}>
      <TopBar
        classes={CLASSES}
        current={className}
        onClass={setClassName}
        range={range}
        onRange={setRange}
        search={rawQuery}
        onSearch={setRawQuery}
        theme={theme}
        onToggleTheme={onToggleTheme}
        muted={muted}
        onToggleMute={() => setMuted((v) => !v)}
        onLogout={onLogout}
      />

      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-5 md:px-8">
        {/* 问候语 */}
        <div data-anim="greeting" className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              className="font-display"
              style={{ fontSize: 24, fontWeight: 500, color: 'var(--foreground)' }}
            >
              {greeting(nowHour)}，吴老师
            </h2>
            <p className="mt-1 text-[12.5px]" style={{ color: 'var(--muted)' }}>
              {metrics.className} · {metrics.total} 名学生 · 近 7 天共完成{' '}
              <b className="tnum" style={{ color: 'var(--foreground)' }}>
                {weeklyGames}
              </b>{' '}
              局
            </p>
          </div>
          <p className="text-[11.5px]" style={{ color: 'var(--muted)' }}>
            数据口径：班级平均 = 按作答量加权平均，与下方图表一致
          </p>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Users size={14} strokeWidth={1.5} />}
            label="活跃学生"
            value={metrics.activeCount}
            digits={0}
            format={(v) => `${Math.round(v)} / ${metrics.total}`}
            unit="人"
            delta={metrics.delta.active}
            deltaFormat={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}`}
            spark={metrics.spark.active}
            color="#C3695C"
            flash={flash > 0}
            sub={`有对局记录的人数 · ${range === '7d' ? '近 7 天' : range === '30d' ? '近 30 天' : '本学期'}`}
          />
          <KpiCard
            icon={<Target size={14} strokeWidth={1.5} />}
            label="平均正确率"
            value={metrics.avgAccuracy}
            digits={1}
            step={0.0005}
            format={(v) => `${pctNum(v)}%`}
            delta={metrics.delta.accuracy}
            deltaFormat={(v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`}
            spark={metrics.spark.accuracy}
            color="#6E8B5A"
          />
          <KpiCard
            icon={<Trophy size={14} strokeWidth={1.5} />}
            label="平均得分"
            value={metrics.avgScore}
            digits={1}
            format={(v) => v.toFixed(1)}
            unit="分"
            delta={metrics.delta.score}
            deltaFormat={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
            spark={metrics.spark.score}
            color="#5A8B93"
          />
          <KpiCard
            icon={<Clock size={14} strokeWidth={1.5} />}
            label="总学习时长"
            value={metrics.totalMinutes}
            digits={1}
            format={(v) => minutesToHours(v)}
            unit="小时"
            delta={metrics.delta.minutes / 60}
            deltaFormat={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}h`}
            spark={metrics.spark.minutes}
            color="#9BAF5F"
          />
        </div>

        {/* 图表区 2×2 */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card card="trend" title="学习趋势" sub="平均正确率 % / 平均得分 · 悬停查看每日明细">
            <TrendArea trend={metrics.trend} />
          </Card>
          <Card card="radar" title="栖息地掌握度" sub="本班 vs 年级平均 · 内凹处即为全班共性难点">
            <HabitatRadar values={metrics.perHabitat} compare={metrics.gradePerHabitat} dark={dark} />
          </Card>
          <Card card="hist" title="得分分布" sub="按小游戏分组的堆叠柱状 · 悬停查看各段人数">
            <ScoreHistogram bins={metrics.histogram} />
          </Card>
          <Card card="mistake" title="错误热点" sub="Top 8「动物 → 被误选的栖息地」配对">
            <MistakeBars hotspots={metrics.hotspots} dark={dark} />
          </Card>
        </div>

        {/* 学生明细 + 需要关注 */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="order-2 xl:order-1" data-card="table">
            <StudentTable
              students={students}
              query={query}
              filter={filter}
              onFilter={setFilter}
              onSelect={openStudent}
              selectedId={selected?.id ?? null}
            />
          </div>
          <div className="order-1 xl:order-2" data-card="attention">
            <AttentionPanel
              items={metrics.attention}
              onAssign={(it) => pushToast(`已为 ${it.student.name} 布置针对性练习`)}
              onSelect={(it) => openStudent(it.student)}
            />
            <div className="mt-4">
              <Card card="status" title="班级状态分布" sub="按学习状态统计人数">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { key: 'steady', label: '稳步提升', color: 'var(--down)' },
                    { key: 'needs-attention', label: '需关注', color: '#B8892F' },
                    { key: 'at-risk', label: '落后', color: 'var(--up)' },
                    { key: 'inactive', label: '未活跃', color: 'var(--muted)' },
                  ].map((row) => {
                    const n =
                      (metrics.statusCount.steady ?? 0) +
                      (metrics.statusCount.improving ?? 0);
                    const total = metrics.total || 1;
                    const value =
                      row.key === 'steady'
                        ? n
                        : (metrics.statusCount[row.key] ?? 0);
                    return (
                      <div key={row.key} className="flex items-center gap-2 text-[12px]">
                        <span style={{ color: 'var(--muted)', width: 56 }}>{row.label}</span>
                        <span
                          className="h-1.5 flex-1 overflow-hidden rounded-full"
                          style={{ background: 'var(--panel)' }}
                        >
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${(value / total) * 100}%`,
                              background: row.color,
                            }}
                          />
                        </span>
                        <span className="tnum w-8 text-right" style={{ color: 'var(--foreground)' }}>
                          {value}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--muted)' }}>
                  <Activity size={12} strokeWidth={1.5} />
                  共 {metrics.totalGames} 局 · 累计 {minutesToHours(metrics.totalMinutes)} 小时
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* 抽屉 / 实时 / toast */}
      <StudentDrawer
        student={selected}
        open={drawerOpen}
        dark={dark}
        onClose={() => setDrawerOpen(false)}
        onToast={pushToast}
      />
      <RealtimeToast events={events} studentOf={(id) => STUDENTS.find((s) => s.id === id)} />

      <div
        className="pointer-events-none fixed bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        style={{ zIndex: 58 }}
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            data-toast
            className="rounded-full border border-border px-4 py-2 text-[12.5px]"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-float)', color: 'var(--foreground)' }}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* 转场期间的骨架屏 */}
      {skeleton && <DashboardSkeleton />}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div
      data-skeleton
      className="absolute inset-0"
      style={{ background: 'var(--background)', zIndex: 40 }}
      aria-hidden
    >
      <div className="mx-auto max-w-[1440px] px-4 pt-5 md:px-8">
        <div className="h-14 border-b border-border" />
        <div className="h-6 w-56 rounded-lg" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="hq-card p-4">
              <div className="h-4 w-20 rounded" style={{ background: 'var(--panel)' }} />
              <div className="mt-3 h-7 w-28 rounded-lg" style={{ background: 'var(--panel)' }} />
              <div className="mt-3 h-6 w-full rounded-lg" style={{ background: 'var(--panel)' }} />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="hq-card p-4">
              <div className="h-4 w-24 rounded" style={{ background: 'var(--panel)' }} />
              <div className="mt-3 h-[236px] w-full rounded-xl" style={{ background: 'var(--panel)' }} />
            </div>
          ))}
        </div>
        <div className="mt-4 h-[420px] w-full rounded-2xl" style={{ background: 'var(--panel)' }} />
      </div>
    </div>
  );
}

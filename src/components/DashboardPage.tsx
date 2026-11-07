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
import { useI18n } from '../i18n';
import type { DictKey } from '../i18n/dict';
import { classLabel, statusLabel, studentName } from '../i18n/labels';

interface Props {
  theme: ThemeName;
  onToggleTheme: () => void;
  onLogout: () => void;
  skeleton: boolean;
}

function greetingKey(hour: number): DictKey {
  if (hour < 6) return 'greeting.night';
  if (hour < 11) return 'greeting.morning';
  if (hour < 14) return 'greeting.noon';
  if (hour < 18) return 'greeting.afternoon';
  return 'greeting.evening';
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
  const { locale, t } = useI18n();
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
  const rangeText =
    range === '7d' ? t('kpi.range7') : range === '30d' ? t('kpi.range30') : t('kpi.rangeTerm');

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
              {t('dashboard.greeting', {
                greeting: t(greetingKey(nowHour)),
                name: t('dashboard.teacherName'),
              })}
            </h2>
            <p className="mt-1 text-[12.5px]" style={{ color: 'var(--muted)' }}>
              {t('dashboard.summaryPrefix', {
                className: classLabel(metrics.className, locale),
                total: metrics.total,
              })}{' '}
              <b className="tnum" style={{ color: 'var(--foreground)' }}>
                {weeklyGames}
              </b>{' '}
              {t('dashboard.summarySuffix')}
            </p>
          </div>
          <p className="text-[11.5px]" style={{ color: 'var(--muted)' }}>
            {t('dashboard.methodNote')}
          </p>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Users size={14} strokeWidth={1.5} />}
            label={t('kpi.active')}
            value={metrics.activeCount}
            digits={0}
            format={(v) => `${Math.round(v)} / ${metrics.total}`}
            unit={t('kpi.unitPerson')}
            delta={metrics.delta.active}
            deltaFormat={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}`}
            spark={metrics.spark.active}
            color="#C3695C"
            flash={flash > 0}
            sub={t('kpi.subActive', { range: rangeText })}
          />
          <KpiCard
            icon={<Target size={14} strokeWidth={1.5} />}
            label={t('kpi.accuracy')}
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
            label={t('kpi.score')}
            value={metrics.avgScore}
            digits={1}
            format={(v) => v.toFixed(1)}
            unit={t('kpi.unitPoint')}
            delta={metrics.delta.score}
            deltaFormat={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
            spark={metrics.spark.score}
            color="#5A8B93"
          />
          <KpiCard
            icon={<Clock size={14} strokeWidth={1.5} />}
            label={t('kpi.minutes')}
            value={metrics.totalMinutes}
            digits={1}
            format={(v) => minutesToHours(v)}
            unit={t('kpi.unitHour')}
            delta={metrics.delta.minutes / 60}
            deltaFormat={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}h`}
            spark={metrics.spark.minutes}
            color="#9BAF5F"
          />
        </div>

        {/* 图表区 2×2 */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card card="trend" title={t('card.trend')} sub={t('card.trendSub')}>
            <TrendArea trend={metrics.trend} />
          </Card>
          <Card card="radar" title={t('card.radar')} sub={t('card.radarSub')}>
            <HabitatRadar values={metrics.perHabitat} compare={metrics.gradePerHabitat} dark={dark} />
          </Card>
          <Card card="hist" title={t('card.hist')} sub={t('card.histSub')}>
            <ScoreHistogram bins={metrics.histogram} />
          </Card>
          <Card card="mistake" title={t('card.mistake')} sub={t('card.mistakeSub')}>
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
              onAssign={(it) => pushToast(t('toast.practiceAssigned', { name: studentName(it.student, locale) }))}
              onSelect={(it) => openStudent(it.student)}
            />
            <div className="mt-4">
              <Card card="status" title={t('card.status')} sub={t('card.statusSub')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { key: 'steady', label: statusLabel('steady', locale), color: 'var(--down)' },
                    { key: 'needs-attention', label: statusLabel('needs-attention', locale), color: '#B8892F' },
                    { key: 'at-risk', label: statusLabel('at-risk', locale), color: 'var(--up)' },
                    { key: 'inactive', label: statusLabel('inactive', locale), color: 'var(--muted)' },
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
                        <span
                          style={{ color: 'var(--muted)', minWidth: locale === 'en' ? 92 : 56, flexShrink: 0 }}
                        >
                          {row.label}
                        </span>
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
                  {t('card.statusNote', {
                    games: metrics.totalGames,
                    hours: minutesToHours(metrics.totalMinutes),
                  })}
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

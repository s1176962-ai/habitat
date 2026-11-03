import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Award, Flame, X } from 'lucide-react';
import AvatarShape from './AvatarShape';
import HabitatRadar from './charts/HabitatRadar';
import Sparkline from './charts/Sparkline';
import { durationSec, pctNum, relativeTime } from '../lib/format';
import { BADGES, GAME_MAP, habitatColorFor, habitatLabel } from '../mock/names';
import { recentSessions, topMistakes } from '../mock/students';
import type { Student } from '../mock/generator';

interface Props {
  student: Student | null;
  open: boolean;
  dark: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

const BADGE_MAP = new Map<string, { id: string; cn: string; en: string }>(
  BADGES.map((b) => [b.id, b]),
);

export default function StudentDrawer({ student, open, dark, onClose, onToast }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState('');
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (open && student) {
      setMounted(true);
      setNote('');
    }
  }, [open, student]);

  useEffect(() => {
    if (!mounted) return;
    const panel = panelRef.current;
    const mask = maskRef.current;
    if (!panel || !mask) return;
    if (open) {
      gsap.killTweensOf([panel, mask]);
      gsap.fromTo(mask, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.01 : 0.3, ease: 'power2.out' });
      gsap.fromTo(
        panel,
        { xPercent: 100 },
        { xPercent: 0, duration: reduced ? 0.01 : 0.45, ease: 'power3.out' },
      );
    } else {
      gsap.killTweensOf([panel, mask]);
      gsap.to(mask, { opacity: 0, duration: reduced ? 0.01 : 0.28, ease: 'power2.in' });
      gsap.to(panel, {
        xPercent: 100,
        duration: reduced ? 0.01 : 0.3,
        ease: 'power2.in',
        onComplete: () => setMounted(false),
      });
    }
  }, [open, mounted, reduced]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted || !student) return null;

  const radarValues = Object.fromEntries(
    Object.entries(student.perHabitat).map(([k, v]) => [k, v.accuracy]),
  ) as Record<keyof typeof student.perHabitat, number>;
  const trend = student.trend.slice(-30).map((p) => p.score);
  const sessions = recentSessions(student, 5);
  const mistakes = topMistakes(student, 3);

  return (
    <div data-drawer className="fixed inset-0" style={{ zIndex: 60 }} role="dialog" aria-modal="true" aria-label={`${student.name} 学习详情`}>
      <div
        ref={maskRef}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }}
      />
      <div
        ref={panelRef}
        className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-border"
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-float)' }}
      >
        {/* 头部 */}
        <div className="flex items-start gap-3 border-b border-border p-4">
          <AvatarShape name={student.name} idx={student.avatarIdx} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>
                {student.name}
              </h3>
              <span
                className="rounded-full px-2 py-0.5 text-[11px]"
                style={{ background: 'var(--panel)', color: 'var(--muted)' }}
              >
                {student.className}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--muted)' }}>
              <span className="rounded-full border border-border px-2 py-0.5">Lv.{student.level}</span>
              <span className="inline-flex items-center gap-1">
                <Flame size={11} strokeWidth={1.5} /> 连续 {student.streakDays} 天
              </span>
              <span>{relativeTime(student.lastActiveAt)}活跃</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border"
            style={{ color: 'var(--muted)' }}
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Block title="栖息地掌握度">
            <HabitatRadar values={radarValues} size={240} dark={dark} warnBelow={0.7} />
          </Block>

          <Block title="最近 30 天得分趋势">
            <div style={{ background: 'var(--panel)', borderRadius: 12, padding: 10 }}>
              <Sparkline data={trend} width={360} height={54} color="var(--accent)" />
              <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--muted)' }}>
                <span>30 天前</span>
                <span>今天</span>
              </div>
            </div>
          </Block>

          <Block title={`最近 ${sessions.length} 场对局`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-border p-2.5"
                  style={{ background: 'var(--panel)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-medium" style={{ color: 'var(--foreground)' }}>
                      {GAME_MAP[s.game].cn}
                    </span>
                    <span className="tnum text-[12.5px] font-semibold" style={{ color: 'var(--accent)' }}>
                      {s.score} 分
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--muted)' }}>
                    <span style={{ color: habitatColorFor(s.habitat, dark) }}>{habitatLabel(s.habitat)}</span>
                    <span>正确率 {pctNum(s.accuracy)}%</span>
                    <span>{durationSec(s.durationSec)}</span>
                    <span>错题 {s.mistakes.length}</span>
                    <span className="ml-auto">{relativeTime(s.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block title="高频错题 Top 3">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mistakes.length === 0 && (
                <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                  最近没有重复出现的错题 👏
                </div>
              )}
              {mistakes.map((m) => (
                <div key={m.key} className="flex items-center gap-2 text-[12.5px]">
                  <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{m.animal}</span>
                  <span style={{ color: 'var(--muted)' }}>→</span>
                  <span style={{ color: habitatColorFor(m.chosen, dark), fontWeight: 600 }}>
                    {habitatLabel(m.chosen)}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                    应为 {habitatLabel(m.correct)}
                  </span>
                  <span className="tnum ml-auto rounded-full px-2 py-0.5 text-[11px]" style={{ background: 'var(--panel)', color: 'var(--muted)' }}>
                    {m.count} 次
                  </span>
                </div>
              ))}
            </div>
          </Block>

          <Block title={`已获得徽章 · ${student.badges.length}`}>
            <div className="flex flex-wrap gap-2">
              {student.badges.map((b) => {
                const meta = BADGE_MAP.get(b);
                return (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px]"
                    style={{ background: 'var(--panel)', color: 'var(--foreground)' }}
                  >
                    <Award size={12} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                    {meta?.cn ?? b}
                  </span>
                );
              })}
            </div>
          </Block>

          <Block title="教师备注">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="例如：湿地类动物容易混淆，下次课前先复习红树林蟹与水獭"
              className="w-full resize-none rounded-xl border border-border bg-surface p-2.5 text-[12.5px] outline-none"
              style={{ color: 'var(--foreground)' }}
            />
            <button
              onClick={() => onToast(`已保存对 ${student.name} 的备注`)}
              className="mt-2 h-9 rounded-xl border border-border px-3 text-[12.5px] transition-all duration-300 hover:-translate-y-0.5"
              style={{ color: 'var(--foreground)' }}
            >
              保存备注
            </button>
          </Block>
        </div>

        {/* 底部操作 */}
        <div className="border-t border-border p-4">
          <button
            onClick={() => onToast(`已为 ${student.name} 布置针对性练习（${habitatLabel(student.weakHabitats[0])}专题）`)}
            className="h-11 w-full rounded-xl text-[13.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-card-hover)' }}
          >
            布置针对性练习
          </button>
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[12px] font-medium" style={{ color: 'var(--muted)' }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

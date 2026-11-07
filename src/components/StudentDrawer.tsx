import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Award, Flame, X } from 'lucide-react';
import AvatarShape from './AvatarShape';
import HabitatRadar from './charts/HabitatRadar';
import Sparkline from './charts/Sparkline';
import { durationSec, pctNum, relativeTime } from '../lib/format';
import { habitatColorFor } from '../mock/names';
import { recentSessions, topMistakes } from '../mock/students';
import type { Student } from '../mock/generator';
import { useI18n } from '../i18n';
import {
  animalLabel,
  badgeLabel,
  classLabel,
  gameLabel,
  habitatLabel,
  studentName,
} from '../i18n/labels';

interface Props {
  student: Student | null;
  open: boolean;
  dark: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function StudentDrawer({ student, open, dark, onClose, onToast }: Props) {
  const { locale, t } = useI18n();
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

  const displayName = studentName(student, locale);
  const radarValues = Object.fromEntries(
    Object.entries(student.perHabitat).map(([k, v]) => [k, v.accuracy]),
  ) as Record<keyof typeof student.perHabitat, number>;
  const trend = student.trend.slice(-30).map((p) => p.score);
  const sessions = recentSessions(student, 5);
  const mistakes = topMistakes(student, 3);

  return (
    <div
      data-drawer
      className="fixed inset-0"
      style={{ zIndex: 60 }}
      role="dialog"
      aria-modal="true"
      aria-label={t('drawer.aria', { name: displayName })}
    >
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
                {displayName}
              </h3>
              <span
                className="rounded-full px-2 py-0.5 text-[11px]"
                style={{ background: 'var(--panel)', color: 'var(--muted)' }}
              >
                {classLabel(student.className, locale)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--muted)' }}>
              <span className="rounded-full border border-border px-2 py-0.5">Lv.{student.level}</span>
              <span className="inline-flex items-center gap-1">
                <Flame size={11} strokeWidth={1.5} /> {t('drawer.streak', { n: student.streakDays })}
              </span>
              <span>{t('drawer.lastActive', { time: relativeTime(student.lastActiveAt, locale) })}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border"
            style={{ color: 'var(--muted)' }}
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Block title={t('drawer.mastery')}>
            <HabitatRadar values={radarValues} size={240} dark={dark} warnBelow={0.7} />
          </Block>

          <Block title={t('drawer.scoreTrend')}>
            <div style={{ background: 'var(--panel)', borderRadius: 12, padding: 10 }}>
              <Sparkline data={trend} width={360} height={54} color="var(--accent)" />
              <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--muted)' }}>
                <span>{t('drawer.daysAgo30')}</span>
                <span>{t('drawer.today')}</span>
              </div>
            </div>
          </Block>

          <Block title={t('drawer.recentSessions', { n: sessions.length })}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-border p-2.5"
                  style={{ background: 'var(--panel)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-medium" style={{ color: 'var(--foreground)' }}>
                      {gameLabel(s.game, locale)}
                    </span>
                    <span className="tnum text-[12.5px] font-semibold" style={{ color: 'var(--accent)' }}>
                      {t('common.points', { v: s.score })}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--muted)' }}>
                    <span style={{ color: habitatColorFor(s.habitat, dark) }}>{habitatLabel(s.habitat, locale)}</span>
                    <span>{t('common.accuracy', { v: pctNum(s.accuracy) })}</span>
                    <span>{durationSec(s.durationSec, locale)}</span>
                    <span>{t('drawer.mistakesCount', { n: s.mistakes.length })}</span>
                    <span className="ml-auto">{relativeTime(s.at, locale)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block title={t('drawer.topMistakes')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mistakes.length === 0 && (
                <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                  {t('drawer.noMistakes')}
                </div>
              )}
              {mistakes.map((m) => (
                <div key={m.key} className="flex items-center gap-2 text-[12.5px]">
                  <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                    {animalLabel(m.animal, m.en, locale)}
                  </span>
                  <span style={{ color: 'var(--muted)' }}>→</span>
                  <span style={{ color: habitatColorFor(m.chosen, dark), fontWeight: 600 }}>
                    {habitatLabel(m.chosen, locale)}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                    {t('drawer.shouldBe', { habitat: habitatLabel(m.correct, locale) })}
                  </span>
                  <span className="tnum ml-auto rounded-full px-2 py-0.5 text-[11px]" style={{ background: 'var(--panel)', color: 'var(--muted)' }}>
                    {t('common.times', { n: m.count })}
                  </span>
                </div>
              ))}
            </div>
          </Block>

          <Block title={t('drawer.badges', { n: student.badges.length })}>
            <div className="flex flex-wrap gap-2">
              {student.badges.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px]"
                  style={{ background: 'var(--panel)', color: 'var(--foreground)' }}
                >
                  <Award size={12} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                  {badgeLabel(b, locale)}
                </span>
              ))}
            </div>
          </Block>

          <Block title={t('drawer.notes')}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t('drawer.notePlaceholder')}
              className="w-full resize-none rounded-xl border border-border bg-surface p-2.5 text-[12.5px] outline-none"
              style={{ color: 'var(--foreground)' }}
            />
            <button
              onClick={() => onToast(t('toast.noteSaved', { name: displayName }))}
              className="mt-2 h-9 rounded-xl border border-border px-3 text-[12.5px] transition-all duration-300 hover:-translate-y-0.5"
              style={{ color: 'var(--foreground)' }}
            >
              {t('drawer.saveNote')}
            </button>
          </Block>
        </div>

        {/* 底部操作 */}
        <div className="border-t border-border p-4">
          <button
            onClick={() =>
              onToast(
                t('toast.practiceAssignedWith', {
                  name: displayName,
                  habitat: habitatLabel(student.weakHabitats[0], locale),
                }),
              )
            }
            className="h-11 w-full rounded-xl text-[13.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-card-hover)' }}
          >
            {t('drawer.assignPractice')}
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

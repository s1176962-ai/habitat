import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Trophy } from 'lucide-react';
import AvatarShape from './AvatarShape';
import { pctNum } from '../lib/format';
import type { RealtimeEvent } from '../mock/realtime';
import type { Student } from '../mock/generator';

interface Props {
  events: RealtimeEvent[];
  studentOf: (id: string) => Student | undefined;
}

/** 右下角实时活动 toast：最多同时 2 条 */
export default function RealtimeToast({ events, studentOf }: Props) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 flex flex-col items-end gap-2"
      style={{ zIndex: 55 }}
      aria-live="polite"
    >
      {events.slice(-2).map((e) => (
        <Toast key={e.id} event={e} student={studentOf(e.studentId)} />
      ))}
    </div>
  );
}

function Toast({ event, student }: { event: RealtimeEvent; student?: Student }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { opacity: 0, y: 18, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: reduced ? 0.01 : 0.45, ease: 'power3.out' },
    );
  }, [reduced]);

  return (
    <div
      ref={ref}
      data-realtime
      className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-border px-3 py-2.5"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-float)', minWidth: 248 }}
    >
      <AvatarShape
        name={event.studentName}
        idx={student?.avatarIdx ?? 0}
        size={32}
      />
      <div className="leading-tight">
        <div className="text-[12.5px]" style={{ color: 'var(--foreground)' }}>
          <b style={{ fontWeight: 600 }}>{event.studentName}</b> 刚在《{event.gameCn}》拿到{' '}
          <span className="tnum" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            {event.score}
          </span>{' '}
          分
        </div>
        <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
          正确率 {pctNum(event.accuracy)}% · {new Date(event.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <Trophy size={14} strokeWidth={1.5} style={{ color: 'var(--accent)', marginLeft: 'auto' }} />
    </div>
  );
}

import { PartyPopper, Sparkles } from 'lucide-react';
import AvatarShape from './AvatarShape';
import type { AttentionItem } from '../mock/students';

interface Props {
  items: AttentionItem[];
  onAssign: (item: AttentionItem) => void;
  onSelect: (item: AttentionItem) => void;
}

/** 需要关注面板：正确率 < 70% 或 3 天未活跃的学生 */
export default function AttentionPanel({ items, onAssign, onSelect }: Props) {
  return (
    <section data-anim="panel" className="hq-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13.5px] font-medium" style={{ color: 'var(--foreground)' }}>
          需要关注
        </h3>
        <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
          {items.length} 人
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <PartyPopper size={26} strokeWidth={1.5} style={{ color: 'var(--down)' }} />
          <div className="text-[13px]" style={{ color: 'var(--foreground)' }}>
            全班都在稳步前进 🎉
          </div>
          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
            暂时没有需要额外辅导的同学
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it) => (
            <div
              key={it.student.id}
              className="flex items-center gap-2.5 rounded-xl border border-border p-2.5 transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: 'var(--panel)' }}
            >
              <button onClick={() => onSelect(it)} aria-label={`查看 ${it.student.name} 详情`}>
                <AvatarShape name={it.student.name} idx={it.student.avatarIdx} size={34} />
              </button>
              <div className="min-w-0 flex-1">
                <button onClick={() => onSelect(it)} className="text-left">
                  <div className="text-[12.5px] font-medium" style={{ color: 'var(--foreground)' }}>
                    {it.student.name}
                  </div>
                  <div className="truncate text-[11px]" style={{ color: 'var(--muted)' }}>
                    {it.reason}
                  </div>
                </button>
              </div>
              <button
                onClick={() => onAssign(it)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-all duration-300 hover:-translate-y-0.5"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <Sparkles size={11} strokeWidth={1.5} />
                布置练习
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

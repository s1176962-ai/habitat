import { PartyPopper, Sparkles } from 'lucide-react';
import AvatarShape from './AvatarShape';
import type { AttentionItem } from '../mock/students';
import { useI18n, type Locale, type TFunction } from '../i18n';
import { habitatLabel, studentName } from '../i18n/labels';

interface Props {
  items: AttentionItem[];
  onAssign: (item: AttentionItem) => void;
  onSelect: (item: AttentionItem) => void;
}

/** 原因由结构化字段按当前语言拼装，数据层不含任何 UI 文案 */
function reasonText(it: AttentionItem, t: TFunction, locale: Locale): string {
  const habitat = habitatLabel(it.habitat, locale);
  const pct = (it.accuracy * 100).toFixed(0);
  if (it.reasonKey === 'inactive-both') {
    return t('attention.reasonBoth', { days: it.days, habitat, pct });
  }
  if (it.reasonKey === 'inactive') {
    return t('attention.reasonInactive', { days: it.days });
  }
  return t('attention.reasonAccuracy', { habitat, pct });
}

/** 需要关注面板：正确率 < 70% 或 3 天未活跃的学生 */
export default function AttentionPanel({ items, onAssign, onSelect }: Props) {
  const { locale, t } = useI18n();

  return (
    <section data-anim="panel" className="hq-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13.5px] font-medium" style={{ color: 'var(--foreground)' }}>
          {t('attention.title')}
        </h3>
        <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
          {t('attention.count', { n: items.length })}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <PartyPopper size={26} strokeWidth={1.5} style={{ color: 'var(--down)' }} />
          <div className="text-[13px]" style={{ color: 'var(--foreground)' }}>
            {t('attention.emptyTitle')}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
            {t('attention.emptySub')}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it) => {
            const name = studentName(it.student, locale);
            const reason = reasonText(it, t, locale);
            return (
              <div
                key={it.student.id}
                className="flex items-center gap-2.5 rounded-xl border border-border p-2.5 transition-all duration-300 hover:-translate-y-0.5"
                style={{ background: 'var(--panel)' }}
              >
                <button onClick={() => onSelect(it)} aria-label={t('attention.viewDetail', { name })}>
                  <AvatarShape name={it.student.name} idx={it.student.avatarIdx} size={34} />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => onSelect(it)}
                    className="block w-full min-w-0 text-left"
                    title={reason}
                  >
                    <div
                      className="truncate text-[12.5px] font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {name}
                    </div>
                    <div
                      className="line-clamp-2 text-[11px] leading-[1.35]"
                      style={{ color: 'var(--muted)' }}
                    >
                      {reason}
                    </div>
                  </button>
                </div>
                <button
                  onClick={() => onAssign(it)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <Sparkles size={11} strokeWidth={1.5} />
                  {t('attention.assign')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

import { useI18n, type Locale } from '../i18n';

/** 中 / EN 分段切换，与顶栏班级、时间范围控件保持同一视觉语言 */
export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const options: { key: Locale; label: string; aria: string }[] = [
    { key: 'zh', label: '中', aria: t('lang.zh') },
    { key: 'en', label: 'EN', aria: t('lang.en') },
  ];

  return (
    <div
      role="group"
      aria-label={t('lang.aria')}
      title={locale === 'zh' ? t('lang.toEn') : t('lang.toZh')}
      className={`inline-flex items-center rounded-full border border-border p-0.5 ${compact ? 'h-8' : 'h-9'}`}
      style={{ background: 'var(--surface)' }}
    >
      {options.map((o) => {
        const active = o.key === locale;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setLocale(o.key)}
            aria-label={o.aria}
            aria-pressed={active}
            className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 text-[11px] transition-all duration-300 ${compact ? 'h-6' : 'h-7'}`}
            style={{
              background: active ? 'var(--panel)' : 'transparent',
              color: active ? 'var(--foreground)' : 'var(--muted)',
              fontWeight: active ? 600 : 400,
              boxShadow: active ? 'var(--shadow-card)' : 'none',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

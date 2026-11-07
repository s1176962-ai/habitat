import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en, zh, type DictKey } from './dict';

export type Locale = 'zh' | 'en';

const STORAGE_KEY = 'hq-locale';

export type TParams = Record<string, string | number>;
export type TFunction = (key: DictKey, params?: TParams) => string;

interface I18nValue {
  locale: Locale;
  isEn: boolean;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  t: TFunction;
}

const I18nContext = createContext<I18nValue | null>(null);

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    /* 隐私模式下忽略 */
  }
  // 默认中文（原项目语言）；不跟随浏览器语言，避免演示时意外改变首屏
  return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'zh';
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const toggleLocale = useCallback(
    () => setLocaleState((v) => (v === 'zh' ? 'en' : 'zh')),
    [],
  );

  const t = useCallback<TFunction>(
    (key, params) => {
      const table = locale === 'en' ? en : zh;
      const raw: string = table[key] ?? zh[key] ?? key;
      return interpolate(raw, params);
    },
    [locale],
  );

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('lang', locale === 'en' ? 'en' : 'zh-CN');
    html.setAttribute('data-locale', locale);
    document.title = t('meta.title');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('meta.description'));
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* 隐私模式下忽略 */
    }
  }, [locale, t]);

  const value = useMemo<I18nValue>(
    () => ({ locale, isEn: locale === 'en', setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

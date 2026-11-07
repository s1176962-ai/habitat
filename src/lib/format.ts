import type { Locale } from '../i18n';

/** 百分比：0.784 → "78.4%" */
export function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

/** 百分比数值（不带 % 号） */
export function pctNum(v: number, digits = 1): string {
  return (v * 100).toFixed(digits);
}

/** 分钟 → 小时：2200 → "36.7" */
export function minutesToHours(minutes: number, digits = 1): string {
  return (minutes / 60).toFixed(digits);
}

export function score(v: number, digits = 1): string {
  return v.toFixed(digits);
}

/** 带符号的环比变化 */
export function signed(v: number, digits = 1): string {
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}

/** 相对时间：3 分钟前 / 2 天前 —— 按界面语言输出 */
export function relativeTime(iso: string, locale: Locale = 'zh', now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  const en = locale === 'en';
  if (min < 1) return en ? 'just now' : '刚刚';
  if (min < 60) return en ? `${min} min ago` : `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return en ? `${hr} h ago` : `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return en ? `${day} d ago` : `${day} 天前`;
  return en ? `${Math.floor(day / 30)} mo ago` : `${Math.floor(day / 30)} 个月前`;
}

/** 秒 → "1分20秒" / "45秒" */
export function durationSec(sec: number, locale: Locale = 'zh'): string {
  if (locale === 'en') {
    if (sec < 60) return `${Math.round(sec)} s`;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return s === 0 ? `${m} m` : `${m} m ${s} s`;
  }
  if (sec < 60) return `${Math.round(sec)} 秒`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s === 0 ? `${m} 分` : `${m} 分 ${s} 秒`;
}

/** ISO 日期 → "11-03"（中文）/ "11/03"（英文） */
export function shortDate(iso: string, locale: Locale = 'zh'): string {
  const d = new Date(iso);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return locale === 'en' ? `${m}/${day}` : `${m}-${day}`;
}

/** 日期 → 星期短名 */
export function weekdayLabel(iso: string, locale: Locale = 'zh'): string {
  const names =
    locale === 'en'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[new Date(iso).getDay()];
}

/** 是否周末（用于趋势图的弱化处理） */
export function isWeekend(iso: string): boolean {
  const d = new Date(iso).getDay();
  return d === 0 || d === 6;
}

/** 大数字千分位 */
export function num(v: number, locale: Locale = 'zh'): string {
  return Math.round(v).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN');
}

/**
 * 数据实体的双语标签。
 * mock 数据里的中文是「主键」（姓名/动物名/班级名都参与运算与匹配），
 * 因此不在数据层改写，只在这里按 locale 选择展示用的文字。
 */
import type { Locale } from './index';
import {
  BADGES,
  CLASS_LABELS,
  GAME_MAP,
  HABITAT_MAP,
  STATUS_META,
  type GameId,
  type Habitat,
  type Status,
} from '../mock/names';
import { RANGE_LABEL, type RangeKey } from '../mock/students';

const BADGE_MAP = new Map<string, { cn: string; en: string }>(
  BADGES.map((b) => [b.id, { cn: b.cn, en: b.en }]),
);

export function pick(pair: { cn: string; en: string }, locale: Locale): string {
  return locale === 'en' ? pair.en : pair.cn;
}

export function habitatLabel(id: Habitat, locale: Locale = 'zh'): string {
  const meta = HABITAT_MAP[id];
  return meta ? pick(meta, locale) : id;
}

export function gameLabel(id: GameId, locale: Locale = 'zh'): string {
  return pick(GAME_MAP[id], locale);
}

export function gameDesc(id: GameId, locale: Locale = 'zh'): string {
  const g = GAME_MAP[id];
  return locale === 'en' ? g.descEn : g.desc;
}

export function statusLabel(status: Status, locale: Locale = 'zh'): string {
  const meta = STATUS_META[status];
  return locale === 'en' ? meta.en : meta.cn;
}

export function badgeLabel(id: string, locale: Locale = 'zh'): string {
  const meta = BADGE_MAP.get(id);
  return meta ? pick(meta, locale) : id;
}

export function classLabel(name: string, locale: Locale = 'zh'): string {
  const meta = CLASS_LABELS[name];
  if (!meta) return name;
  return locale === 'en' ? meta.en : meta.cn;
}

export function classShortLabel(name: string, locale: Locale = 'zh'): string {
  const meta = CLASS_LABELS[name];
  if (!meta) return name;
  return locale === 'en' ? meta.shortEn : meta.shortCn;
}

export function rangeLabel(range: RangeKey, locale: Locale = 'zh'): string {
  return RANGE_LABEL[range][locale];
}

export function studentName(
  student: { name: string; nameEn: string },
  locale: Locale = 'zh',
): string {
  return locale === 'en' ? student.nameEn : student.name;
}

/** 动物在 mock 中以中文名做关联键，英文展示名单独存放在 en 字段 */
export function animalLabel(cn: string, en: string, locale: Locale = 'zh'): string {
  return locale === 'en' ? en : cn;
}

/**
 * 派生指标（纯函数）：切换班级 / 时间范围时实时重算，不做任何硬编码。
 * 口径保证：班级平均正确率 = 该班学生按作答量加权平均；雷达图各栖息地同理。
 */
import { STUDENTS, TREND_DAYS, type Student, type Session } from './generator';
import {
  ANIMALS,
  HABITAT_IDS,
  HABITAT_MAP,
  GAME_IDS,
  type GameId,
  type Habitat,
} from './names';

export type RangeKey = '7d' | '30d' | 'term';

export const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, term: TREND_DAYS };
export const RANGE_LABEL: Record<RangeKey, string> = {
  '7d': '7 天',
  '30d': '30 天',
  term: '本学期',
};
export const RANGE_KEYS: RangeKey[] = ['7d', '30d', 'term'];

export interface TrendPoint {
  date: string;
  accuracy: number;
  score: number;
  games: number;
  minutes: number;
  active: number;
}

export interface Hotspot {
  key: string;
  animal: string;
  en: string;
  correct: Habitat;
  chosen: Habitat;
  count: number;
  rate: number;
}

export interface AttentionItem {
  student: Student;
  reason: string;
  habitat: Habitat;
  accuracy: number;
}

export interface HistogramBin {
  from: number;
  to: number;
  label: string;
  byGame: Record<GameId, number>;
  total: number;
}

export interface ClassMetrics {
  className: string;
  total: number;
  activeCount: number;
  avgAccuracy: number;
  avgScore: number;
  totalMinutes: number;
  totalGames: number;
  delta: { accuracy: number; score: number; active: number; minutes: number };
  trend: TrendPoint[];
  perHabitat: Record<Habitat, number>;
  gradePerHabitat: Record<Habitat, number>;
  histogram: HistogramBin[];
  hotspots: Hotspot[];
  attention: AttentionItem[];
  spark: { accuracy: number[]; score: number[]; active: number[]; minutes: number[] };
  statusCount: Record<string, number>;
}

const EMPTY_BY_GAME = (): Record<GameId, number> => ({
  'habitat-match': 0,
  'migration-rush': 0,
  'biome-builder': 0,
});

function weightedAccuracy(points: { accuracy: number; games: number }[]): number {
  let g = 0;
  let a = 0;
  for (const p of points) {
    g += p.games;
    a += p.accuracy * p.games;
  }
  return g > 0 ? a / g : 0;
}

function weightedScore(points: { score: number; games: number }[]): number {
  let g = 0;
  let a = 0;
  for (const p of points) {
    g += p.games;
    a += p.score * p.games;
  }
  return g > 0 ? a / g : 0;
}

export function classStudents(className: string): Student[] {
  return STUDENTS.filter((s) => s.className === className);
}

/** 某学生在最近 n 天是否活跃 / 作答量 */
function windowGames(s: Student, days: number): number {
  const slice = s.trend.slice(-days);
  let g = 0;
  for (const p of slice) g += p.games;
  return g;
}

/** 全班每个栖息地的加权正确率 */
function habitatAccuracy(students: Student[]): Record<Habitat, number> {
  const out = {} as Record<Habitat, number>;
  for (const h of HABITAT_IDS) {
    let att = 0;
    let acc = 0;
    for (const s of students) {
      att += s.perHabitat[h].attempts;
      acc += s.perHabitat[h].accuracy * s.perHabitat[h].attempts;
    }
    out[h] = att > 0 ? acc / att : 0;
  }
  return out;
}

const GRADE_PER_HABITAT = habitatAccuracy(STUDENTS);

/** 得分分布：按小游戏分组的堆叠柱状 */
function buildHistogram(students: Student[]): HistogramBin[] {
  const bins: HistogramBin[] = [
    { from: 0, to: 40, label: '0–40', byGame: EMPTY_BY_GAME(), total: 0 },
    { from: 40, to: 60, label: '40–60', byGame: EMPTY_BY_GAME(), total: 0 },
    { from: 60, to: 75, label: '60–75', byGame: EMPTY_BY_GAME(), total: 0 },
    { from: 75, to: 88, label: '75–88', byGame: EMPTY_BY_GAME(), total: 0 },
    { from: 88, to: 101, label: '88–100', byGame: EMPTY_BY_GAME(), total: 0 },
  ];
  for (const s of students) {
    for (const sess of s.sessions) {
      const bin = bins.find((b) => sess.score >= b.from && sess.score < b.to);
      if (!bin) continue;
      bin.byGame[sess.game] += 1;
      bin.total += 1;
    }
  }
  return bins;
}

/** 错误热点：动物 → 被误选的栖息地，Top N */
function buildHotspots(students: Student[], top = 8): Hotspot[] {
  const pairCount = new Map<string, number>();
  const appear = new Map<string, number>();
  const SHOWN_PER_SESSION = 12;

  const poolSize = {} as Record<Habitat, number>;
  for (const h of HABITAT_IDS) poolSize[h] = ANIMALS.filter((a) => a.habitat === h).length || 1;

  for (const s of students) {
    for (const sess of s.sessions) {
      const per = SHOWN_PER_SESSION / poolSize[sess.habitat];
      for (const a of ANIMALS) {
        if (a.habitat !== sess.habitat) continue;
        appear.set(a.cn, (appear.get(a.cn) ?? 0) + per);
      }
      for (const m of sess.mistakes) {
        const key = `${m.animal}|${m.chosen}`;
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }

  const metaCache = new Map<string, { en: string; correct: Habitat; chosen: Habitat }>();
  const out: Hotspot[] = [];
  for (const [key, count] of pairCount) {
    const [animal, chosen] = key.split('|');
    const meta = metaCache.get(animal) ?? {
      en: ANIMALS.find((a) => a.cn === animal)?.en ?? animal,
      correct: (ANIMALS.find((a) => a.cn === animal)?.habitat ?? 'forest') as Habitat,
      chosen: chosen as Habitat,
    };
    metaCache.set(animal, meta);
    const app = Math.max(1, appear.get(animal) ?? 1);
    out.push({
      key,
      animal,
      en: meta.en,
      correct: meta.correct,
      chosen: chosen as Habitat,
      count,
      rate: Math.min(0.95, count / app),
    });
  }
  out.sort((a, b) => b.count - a.count || b.rate - a.rate);
  return out.slice(0, top);
}

/** 需要关注：正确率 < 70% 或 3 天未活跃（取最严重的 3–6 人） */
function buildAttention(students: Student[], now: number): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const s of students) {
    const daysSince = (now - new Date(s.lastActiveAt).getTime()) / 86400000;
    const inactive = daysSince > 3;
    if (s.avgAccuracy >= 0.7 && !inactive) continue;

    let worst: Habitat = 'wetland';
    let worstAcc = 1;
    for (const h of HABITAT_IDS) {
      if (s.perHabitat[h].accuracy < worstAcc) {
        worstAcc = s.perHabitat[h].accuracy;
        worst = h;
      }
    }
    let reason: string;
    if (inactive && s.avgAccuracy < 0.7) {
      reason = `${Math.floor(daysSince)} 天未活跃 · ${HABITAT_MAP[worst].cn}正确率仅 ${(worstAcc * 100).toFixed(0)}%`;
    } else if (inactive) {
      reason = `${Math.floor(daysSince)} 天未活跃，建议提醒一次`;
    } else {
      reason = `${HABITAT_MAP[worst].cn}正确率仅 ${(worstAcc * 100).toFixed(0)}%`;
    }
    items.push({ student: s, reason, habitat: worst, accuracy: worstAcc });
  }
  items.sort((a, b) => a.accuracy - b.accuracy);
  return items.slice(0, 6);
}

export function computeClassMetrics(className: string, range: RangeKey, now = Date.now()): ClassMetrics {
  const students = classStudents(className);
  const days = RANGE_DAYS[range];
  const half = Math.max(1, Math.floor(days / 2));

  // ---- 趋势（全班按天聚合）----
  const trend: TrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const idx = TREND_DAYS - days + i;
    let games = 0;
    let minutes = 0;
    let acc = 0;
    let sc = 0;
    let active = 0;
    for (const s of students) {
      const p = s.trend[idx];
      if (!p) continue;
      games += p.games;
      minutes += p.minutes;
      acc += p.accuracy * p.games;
      sc += p.score * p.games;
      if (p.games > 0) active++;
    }
    const date = students[0]?.trend[idx]?.date ?? new Date().toISOString();
    trend.push({
      date,
      games,
      minutes,
      accuracy: games > 0 ? acc / games : 0,
      score: games > 0 ? sc / games : 0,
      active,
    });
  }

  const cur = trend.slice(-half);
  const prev = trend.slice(Math.max(0, days - half * 2), Math.max(0, days - half));

  // ---- KPI ----
  let activeCount = 0;
  let gSum = 0;
  let accSum = 0;
  let scSum = 0;
  let minSum = 0;
  for (const s of students) {
    const pts = s.trend.slice(-days);
    const g = pts.reduce((a, p) => a + p.games, 0);
    const m = pts.reduce((a, p) => a + p.minutes, 0);
    gSum += g;
    minSum += m;
    accSum += weightedAccuracy(pts) * g;
    scSum += weightedScore(pts) * g;
    if (g > 0) activeCount++;
  }
  const avgAccuracy = gSum > 0 ? accSum / gSum : 0;
  const avgScore = gSum > 0 ? scSum / gSum : 0;

  const prevActive = students.filter((s) => {
    const pts = s.trend.slice(Math.max(0, TREND_DAYS - days * 2), TREND_DAYS - days);
    return pts.reduce((a, p) => a + p.games, 0) > 0;
  }).length;

  // ---- Sparkline ----
  const sparkLen = Math.min(14, trend.length);
  const sparkSrc = trend.slice(-sparkLen);
  const spark = {
    accuracy: sparkSrc.map((p) => p.accuracy),
    score: sparkSrc.map((p) => p.score),
    active: sparkSrc.map((p) => p.active),
    minutes: sparkSrc.map((p) => p.minutes),
  };

  const statusCount: Record<string, number> = {};
  for (const s of students) statusCount[s.status] = (statusCount[s.status] ?? 0) + 1;

  return {
    className,
    total: students.length,
    activeCount,
    avgAccuracy,
    avgScore,
    totalMinutes: minSum,
    totalGames: gSum,
    delta: {
      accuracy: weightedAccuracy(cur) - weightedAccuracy(prev),
      score: weightedScore(cur) - weightedScore(prev),
      active: activeCount - prevActive,
      minutes:
        cur.reduce((a, p) => a + p.minutes, 0) - prev.reduce((a, p) => a + p.minutes, 0),
    },
    trend,
    perHabitat: habitatAccuracy(students),
    gradePerHabitat: GRADE_PER_HABITAT,
    histogram: buildHistogram(students),
    hotspots: buildHotspots(students),
    attention: buildAttention(students, now),
    spark,
    statusCount,
  };
}

/** 年级（三个班合计）平均正确率，用于概览对标 */
export function gradeAverageAccuracy(): number {
  let att = 0;
  let acc = 0;
  for (const s of STUDENTS) {
    for (const h of HABITAT_IDS) {
      att += s.perHabitat[h].attempts;
      acc += s.perHabitat[h].accuracy * s.perHabitat[h].attempts;
    }
  }
  return att > 0 ? acc / att : 0;
}

/** 学生个人的高频错题 Top N */
export function topMistakes(s: Student, top = 3): Hotspot[] {
  const map = new Map<string, number>();
  for (const sess of s.sessions) {
    for (const m of sess.mistakes) {
      const key = `${m.animal}|${m.chosen}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  const out: Hotspot[] = [];
  for (const [key, count] of map) {
    const [animal, chosen] = key.split('|');
    const meta = ANIMALS.find((a) => a.cn === animal);
    out.push({
      key,
      animal,
      en: meta?.en ?? animal,
      correct: (meta?.habitat ?? 'forest') as Habitat,
      chosen: chosen as Habitat,
      count,
      rate: Math.min(0.95, count / Math.max(3, s.sessions.length * 0.5)),
    });
  }
  out.sort((a, b) => b.count - a.count);
  return out.slice(0, top);
}

/** 学生最近若干场对局 */
export function recentSessions(s: Student, n = 5): Session[] {
  return s.sessions.slice(0, n);
}

export function gamesInWindow(s: Student, days: number): number {
  return windowGames(s, days);
}

export const GAME_ORDER: GameId[] = [...GAME_IDS];

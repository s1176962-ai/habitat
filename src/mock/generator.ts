/**
 * 种子化 mock 数据生成器
 * 同一 seed → 每次刷新数据完全一致（演示时数字不会乱跳）
 * 个体差异：talent / diligence / weakHabitat / improvementSlope
 * 班级共性难点：湿地、极地（让"错误热点"图表有故事可讲）
 */
import { mulberry32, randRange, randInt, pick, randNormal, clamp } from '../lib/prng';
import {
  ANIMALS,
  BADGES,
  CLASS_NAMES,
  CONFUSION,
  GAME_IDS,
  HABITAT_IDS,
  randomName,
  type GameId,
  type Habitat,
  type Status,
} from './names';

export const SEED = 20260515;
export const TREND_DAYS = 90; // 本学期
export const SESSION_WINDOW = 30; // 最近 30 天生成对局明细

export interface DailyPoint {
  date: string;
  games: number;
  accuracy: number;
  score: number;
  minutes: number;
}

export interface Mistake {
  animal: string;
  en: string;
  chosen: Habitat;
  correct: Habitat;
}

export interface Session {
  id: string;
  at: string;
  game: GameId;
  habitat: Habitat;
  score: number;
  accuracy: number;
  durationSec: number;
  mistakes: Mistake[];
}

export interface Student {
  id: string;
  name: string;
  className: string;
  /** 几何裁切框编号（0–4），头像本体由姓名哈希生成 Q 版简笔画 */
  avatarIdx: 0 | 1 | 2 | 3 | 4;
  level: number;
  xp: number;
  streakDays: number;
  lastActiveAt: string;
  totalGames: number;
  avgAccuracy: number;
  avgScore: number;
  totalMinutes: number;
  perHabitat: Record<Habitat, { accuracy: number; attempts: number }>;
  perGame: Record<GameId, { avgScore: number; plays: number }>;
  trend: DailyPoint[];
  sessions: Session[];
  badges: string[];
  status: Status;
  deltaAccuracy7d: number;
  weakHabitats: Habitat[];
}

/** 全班共性难点：湿地 / 极地 显著低于其他栖息地 */
const CLASS_WEAK: Record<Habitat, number> = {
  forest: 0.01,
  ocean: 0.0,
  desert: 0.03,
  grassland: 0.02,
  wetland: 0.1,
  polar: 0.09,
};

function isoDate(d: Date): string {
  return d.toISOString();
}

function dayAt(daysAgo: number, hours: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(Math.floor(hours), Math.floor((hours % 1) * 60), 0, 0);
  return d;
}

const NOW = new Date();
const NOW_HOURS = NOW.getHours() + NOW.getMinutes() / 60;

/** 每天的学习时段（今天截断到当前时刻，避免出现"未来"的时间戳） */
function timeOfDay(rand: () => number, daysAgo: number): number {
  if (daysAgo === 0) {
    const latest = Math.max(8, Math.min(21.5, NOW_HOURS));
    return randRange(rand, 7.5, latest);
  }
  return randRange(rand, 7.5, 21.5);
}

function buildStudent(rand: () => number, className: string, index: number): Student {
  /* ---- 个体差异参数 ---- */
  const talent = randRange(rand, 0.42, 0.95);
  const diligence = randRange(rand, 0.35, 1.0);
  const slope = randRange(rand, 0.0008, 0.0032); // 每天正确率进步速度
  const weakPool: Habitat[] = [
    'wetland',
    'polar',
    'wetland',
    'polar',
    'forest',
    'ocean',
    'desert',
    'grassland',
  ];
  const weak: Habitat[] = [pick(rand, weakPool)];
  if (rand() < 0.35) {
    const w2 = pick(rand, weakPool);
    if (w2 !== weak[0]) weak.push(w2);
  }

  const penalty = {} as Record<Habitat, number>;
  for (const h of HABITAT_IDS) {
    let p = CLASS_WEAK[h];
    if (weak.includes(h)) p += randRange(rand, 0.12, 0.22);
    penalty[h] = p;
  }

  /* ---- 90 天趋势 ---- */
  // 正确率基线：talent 0.42 → 0.58；talent 0.95 → 0.84（叠加进步后全班均值 ≈ 0.78）
  const accBase = 0.368 + talent * 0.5;
  const trend: DailyPoint[] = [];
  let lastAcc = accBase;
  let lastScore = 60;
  const dayHours: number[] = [];
  for (let i = 0; i < TREND_DAYS; i++) {
    const daysAgo = TREND_DAYS - 1 - i;
    const hours = timeOfDay(rand, daysAgo);
    dayHours.push(hours);
    const d = dayAt(daysAgo, hours);
    const dow = d.getDay();
    const weekendFactor = dow === 0 || dow === 6 ? 0.45 : 1;
    const active = rand() < diligence * 0.82 * weekendFactor + 0.06;
    const games = active
      ? Math.max(1, Math.round(randRange(rand, 1.4, 5.2) * (0.55 + diligence) * weekendFactor))
      : 0;
    const progress = Math.min(0.12, i * slope);
    if (games > 0) {
      lastAcc = clamp(accBase + progress + randNormal(rand, 0, 0.032, -0.07, 0.07), 0.32, 0.98);
      lastScore = clamp(36 + lastAcc * 60 + randNormal(rand, 0, 4.5, -12, 12), 25, 100);
    }
    const minutes = games > 0 ? Math.round(games * randRange(rand, 2.2, 5.0)) : 0;
    trend.push({
      date: isoDate(d),
      games,
      accuracy: lastAcc,
      score: lastScore,
      minutes,
    });
  }

  let totalGames = 0;
  let totalMinutes = 0;
  let accSum = 0;
  let scSum = 0;
  for (const p of trend) {
    totalGames += p.games;
    totalMinutes += p.minutes;
    accSum += p.accuracy * p.games;
    scSum += p.score * p.games;
  }
  // 口径统一：学生总平均正确率 / 得分 = 90 天趋势按作答量加权平均
  const avgAccuracy = totalGames > 0 ? accSum / totalGames : 0;
  const avgScore = totalGames > 0 ? scSum / totalGames : 0;

  /* ---- 每个栖息地的正确率（全班共性难点已在 penalty 中体现） ----
     以 avgAccuracy 为中心摊到 6 个栖息地，再重新归一，
     保证"雷达图加权平均 = KPI 平均正确率" 口径一致。 */
  const weights = HABITAT_IDS.map(() => randRange(rand, 0.7, 1.3));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const perHabitat = {} as Record<Habitat, { accuracy: number; attempts: number }>;
  let rawWeighted = 0;
  let attemptsSum = 0;
  HABITAT_IDS.forEach((h, i) => {
    const attempts = Math.max(1, Math.round((weights[i] / wsum) * totalGames));
    const acc = clamp(avgAccuracy - penalty[h] + randNormal(rand, 0, 0.03, -0.06, 0.06), 0.18, 0.99);
    perHabitat[h] = { accuracy: acc, attempts };
    rawWeighted += acc * attempts;
    attemptsSum += attempts;
  });
  const shift = avgAccuracy - rawWeighted / Math.max(1, attemptsSum);
  for (const h of HABITAT_IDS) {
    perHabitat[h].accuracy = clamp(perHabitat[h].accuracy + shift, 0.15, 0.995);
  }

  /* ---- 小游戏维度 ---- */
  const gameW = GAME_IDS.map(() => randRange(rand, 0.6, 1.4));
  const gw = gameW.reduce((a, b) => a + b, 0);
  const perGame = {} as Record<GameId, { avgScore: number; plays: number }>;
  GAME_IDS.forEach((g, i) => {
    const plays = Math.max(1, Math.round((gameW[i] / gw) * totalGames));
    const bias = g === 'migration-rush' ? -3 : g === 'biome-builder' ? 2 : 0;
    perGame[g] = {
      plays,
      avgScore: clamp(avgScore + bias + randNormal(rand, 0, 4, -10, 10), 25, 100),
    };
  });

  /* ---- 最近活跃 / 连续打卡 ---- */
  let lastActiveIdx = -1;
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    if (trend[i].games > 0) {
      lastActiveIdx = i;
      break;
    }
  }
  let streak = 0;
  if (lastActiveIdx >= 0) {
    for (let i = lastActiveIdx; i >= 0; i--) {
      if (trend[i].games > 0) streak++;
      else break;
    }
  }
  const lastActiveAt =
    lastActiveIdx >= 0
      ? isoDate(dayAt(TREND_DAYS - 1 - lastActiveIdx, dayHours[lastActiveIdx]))
      : isoDate(dayAt(30, 12));

  /* ---- 对局明细（最近 30 天） ---- */
  const sessions: Session[] = [];
  const windowTrend = trend.slice(TREND_DAYS - SESSION_WINDOW);
  const nSessions = clamp(Math.round(totalGames * 0.22), 6, 26);
  for (let s = 0; s < nSessions; s++) {
    // 优先落在本月有对局的日子
    let dayIdx = randInt(rand, 0, SESSION_WINDOW - 1);
    for (let k = 0; k < 4 && windowTrend[dayIdx].games === 0; k++) {
      dayIdx = randInt(rand, 0, SESSION_WINDOW - 1);
    }
    const daysAgo = SESSION_WINDOW - 1 - dayIdx;
    const habitat = pick(rand, HABITAT_IDS);
    const hAcc = clamp(perHabitat[habitat].accuracy + randNormal(rand, 0, 0.07, -0.15, 0.15), 0.15, 1);
    const sc = clamp(30 + hAcc * 68 + randNormal(rand, 0, 6, -18, 18), 20, 100);
    const game = pick(rand, GAME_IDS);
    const sessionsMistakes: Mistake[] = [];
    const mistakeCount = clamp(Math.round((1 - hAcc) * randRange(rand, 4, 9)), 0, 5);
    for (let m = 0; m < mistakeCount; m++) {
      const pool = ANIMALS.filter((a) => a.habitat === habitat);
      const animal = pool.length ? pick(rand, pool) : pick(rand, ANIMALS);
      const r = rand();
      let chosen: Habitat;
      if (r < 0.58) chosen = CONFUSION[animal.habitat];
      else if (r < 0.82) chosen = pick(rand, weak);
      else chosen = pick(rand, HABITAT_IDS);
      if (chosen === animal.habitat) chosen = CONFUSION[animal.habitat];
      sessionsMistakes.push({
        animal: animal.cn,
        en: animal.en,
        chosen,
        correct: animal.habitat,
      });
    }
    sessions.push({
      id: `s-${index}-${s}`,
      at: isoDate(dayAt(daysAgo, timeOfDay(rand, daysAgo))),
      game,
      habitat,
      score: Math.round(sc),
      accuracy: hAcc,
      durationSec: Math.round(randRange(rand, 45, 260)),
      mistakes: sessionsMistakes,
    });
  }
  sessions.sort((a, b) => (a.at < b.at ? 1 : -1));

  /* ---- 徽章 ---- */
  const badgeCount = randInt(rand, 3, 5);
  const shuffled = [...BADGES].sort(() => rand() - 0.5);
  const badges = shuffled.slice(0, badgeCount).map((b) => b.id);

  /* ---- 状态 ---- */
  const w = (pts: DailyPoint[]) => {
    let g = 0;
    let a = 0;
    for (const p of pts) {
      g += p.games;
      a += p.accuracy * p.games;
    }
    return g > 0 ? a / g : 0;
  };
  const deltaAccuracy7d = w(trend.slice(-7)) - w(trend.slice(-14, -7));
  const daysSince = (NOW.getTime() - new Date(lastActiveAt).getTime()) / 86400000;
  let status: Status;
  if (daysSince > 6) status = 'inactive';
  else if (avgAccuracy < 0.68 || (avgAccuracy < 0.72 && daysSince > 2)) status = 'at-risk';
  else if (avgAccuracy < 0.72 || daysSince > 2) status = 'needs-attention';
  else if (deltaAccuracy7d > 0.015) status = 'improving';
  else status = 'steady';

  const avatarIdx = randInt(rand, 0, 4) as 0 | 1 | 2 | 3 | 4;

  return {
    id: `stu-${index}`,
    name: randomName(rand),
    className,
    avatarIdx,
    level: clamp(Math.floor(totalGames / 14) + randInt(rand, 2, 5), 1, 12),
    xp: totalGames * 30 + randInt(rand, 0, 240),
    streakDays: streak,
    lastActiveAt,
    totalGames,
    avgAccuracy,
    avgScore,
    totalMinutes,
    perHabitat,
    perGame,
    trend,
    sessions,
    badges,
    status,
    deltaAccuracy7d,
    weakHabitats: weak,
  };
}

function generate(): Student[] {
  const rand = mulberry32(SEED);
  const out: Student[] = [];
  let index = 0;
  for (const className of CLASS_NAMES) {
    const n = 27;
    for (let i = 0; i < n; i++) {
      out.push(buildStudent(rand, className, index));
      index++;
    }
  }
  return out;
}

export const STUDENTS: Student[] = generate();
export const CLASSES: string[] = [...CLASS_NAMES];

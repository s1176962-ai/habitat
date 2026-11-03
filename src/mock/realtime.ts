/**
 * 模拟实时事件流：每 6–10 秒（随机）推送一条"某同学刚完成一局"
 * 提供静音开关；stop() 必须被调用，否则定时器泄漏。
 */
import { mulberry32 } from '../lib/prng';
import { STUDENTS } from './generator';
import { GAME_MAP, GAME_IDS, type GameId } from './names';

export interface RealtimeEvent {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  game: GameId;
  gameCn: string;
  score: number;
  accuracy: number;
  at: number;
}

export interface RealtimeStream {
  start: () => void;
  stop: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  /** 立即推一条（演示时手动触发） */
  emitNow: () => void;
}

let seq = 0;

export function createRealtimeStream(
  className: string,
  onEvent: (e: RealtimeEvent) => void,
  seed = 424242,
): RealtimeStream {
  const rand = mulberry32(seed);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let muted = false;
  let stopped = false;

  const emit = () => {
    const pool = STUDENTS.filter((s) => s.className === className);
    const list = pool.length ? pool : STUDENTS;
    const s = list[Math.floor(rand() * list.length)];
    const game = GAME_IDS[Math.floor(rand() * GAME_IDS.length)];
    const acc = Math.min(0.99, Math.max(0.4, s.avgAccuracy + (rand() * 0.3 - 0.12)));
    const score = Math.round(Math.min(100, Math.max(35, 30 + acc * 68 + (rand() * 10 - 5))));
    onEvent({
      id: `rt-${++seq}`,
      studentId: s.id,
      studentName: s.name,
      className: s.className,
      game,
      gameCn: GAME_MAP[game].cn,
      score,
      accuracy: acc,
      at: Date.now(),
    });
  };

  const schedule = () => {
    if (stopped) return;
    const delay = 6000 + rand() * 4000;
    timer = setTimeout(() => {
      if (!muted && !stopped) emit();
      schedule();
    }, delay);
  };

  return {
    start() {
      if (timer || stopped) return;
      schedule();
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
    setMuted(m: boolean) {
      muted = m;
    },
    isMuted() {
      return muted;
    },
    emitNow() {
      emit();
    },
  };
}

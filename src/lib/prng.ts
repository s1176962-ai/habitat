/**
 * mulberry32 —— 32 位种子伪随机数发生器
 * 同一 seed 永远产出同一序列，保证刷新页面演示数据不变。
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 便捷包装：在 [min, max) 之间取随机数 */
export function randRange(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

export function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(min + rand() * (max - min + 1));
}

/** 从数组中等概率取一个元素 */
export function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length) % arr.length];
}

/** 近似正态分布（Box-Muller），并把结果夹到 [min, max] */
export function randNormal(
  rand: () => number,
  mean: number,
  sd: number,
  min = -Infinity,
  max = Infinity,
): number {
  const u = Math.max(1e-9, rand());
  const v = rand();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.min(max, Math.max(min, mean + z * sd));
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 按 seed 生成稳定的哈希字符串，用于 id */
export function hashId(seed: number, prefix = 'id'): string {
  const r = mulberry32(seed * 2654435761);
  return `${prefix}-${Math.floor(r() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`;
}

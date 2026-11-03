/** 明暗双套大地色板（RGB 元组，便于逐通道插值） */
export type RGB = readonly [number, number, number];

export const PALETTE_LIGHT: RGB[] = [
  [195, 105, 80],
  [165, 125, 70],
  [110, 145, 90],
  [85, 140, 150],
  [165, 105, 130],
  [130, 120, 165],
  [180, 140, 85],
  [105, 135, 100],
];

export const PALETTE_DARK: RGB[] = [
  [215, 145, 120],
  [190, 155, 115],
  [170, 195, 150],
  [145, 185, 190],
  [195, 150, 170],
  [175, 165, 200],
  [210, 175, 130],
  [155, 175, 145],
];

export type ThemeName = 'light' | 'dark';

export function paletteFor(theme: ThemeName): RGB[] {
  return theme === 'dark' ? PALETTE_DARK : PALETTE_LIGHT;
}

/**
 * 取色：随机色号 + 每通道 ±10 噪声，且不与上一枚同色号。
 * 返回 { rgb, index }，index 供调用方记录。
 */
export function pickColor(
  rand: () => number,
  theme: ThemeName,
  lastIndex: number,
): { rgb: RGB; index: number } {
  const pal = paletteFor(theme);
  let index = Math.floor(rand() * pal.length) % pal.length;
  if (index === lastIndex) index = (index + 1 + Math.floor(rand() * (pal.length - 1))) % pal.length;
  const base = pal[index];
  const n = () => (rand() * 20 - 10);
  return {
    rgb: [
      Math.max(0, Math.min(255, base[0] + n())),
      Math.max(0, Math.min(255, base[1] + n())),
      Math.max(0, Math.min(255, base[2] + n())),
    ],
    index,
  };
}

/** 读取当前主题下的 --accent（转场汇聚时统一向它靠拢） */
export function readAccent(): RGB {
  if (typeof window === 'undefined') return [195, 105, 92];
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  return parseHex(raw) ?? (isDark() ? [215, 139, 114] : [195, 105, 92]);
}

export function parseHex(hex: string): RGB | null {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  if (h.length === 6) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

export function isDark(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

export function currentTheme(): ThemeName {
  return isDark() ? 'dark' : 'light';
}

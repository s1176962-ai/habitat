/**
 * 10 种几何形状，每种统一 48 个顶点 —— 顶点数一致才能做逐点形变插值（morph）。
 *
 * 生成策略：
 *   1. 先用高密度采样生成轮廓（多边形走周长、贝塞尔按半展开、极坐标花瓣曲线…）
 *   2. 再按弧长均匀重采样到 48 点
 * 所有形状在模块加载时一次性预计算，主循环里零对象分配。
 */

export const POINT_COUNT = 48;

type Pt = { x: number; y: number };

const TAU = Math.PI * 2;

/* ------------------------------ 几何工具 ------------------------------ */

function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function norm(a: Pt): Pt {
  const d = Math.hypot(a.x, a.y) || 1e-9;
  return { x: a.x / d, y: a.y / d };
}

function quad(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

function cubic(a: Pt, c1: Pt, c2: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
}

/** 按弧长把闭合轮廓均匀重采样成 n 个点 */
function resampleClosed(dense: Pt[], n: number): Pt[] {
  const m = dense.length;
  const ring = dense.concat([dense[0]]);
  const cum = new Array<number>(m + 1);
  cum[0] = 0;
  for (let i = 1; i <= m; i++) {
    cum[i] = cum[i - 1] + dist(ring[i], ring[i - 1]);
  }
  const total = cum[m] || 1e-9;
  const out = new Array<Pt>(n);
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const target = (total * i) / n;
    while (seg < m - 1 && cum[seg + 1] < target) seg++;
    const segLen = cum[seg + 1] - cum[seg] || 1e-9;
    const t = (target - cum[seg]) / segLen;
    out[i] = {
      x: ring[seg].x + (ring[seg + 1].x - ring[seg].x) * t,
      y: ring[seg].y + (ring[seg + 1].y - ring[seg].y) * t,
    };
  }
  return out;
}

/** 平移到包围盒中心，并把最大半径归一到 1 */
function normalize(dense: Pt[]): Pt[] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of dense) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let maxR = 1e-9;
  for (const p of dense) maxR = Math.max(maxR, Math.hypot(p.x - cx, p.y - cy));
  const s = 1 / maxR;
  return dense.map((p) => ({ x: (p.x - cx) * s, y: (p.y - cy) * s }));
}

/** 打包成 Float32Array（x,y 交错），渲染时零分配读取 */
function pack(pts: Pt[]): Float32Array {
  const out = new Float32Array(POINT_COUNT * 2);
  for (let i = 0; i < POINT_COUNT; i++) {
    out[i * 2] = pts[i].x;
    out[i * 2 + 1] = pts[i].y;
  }
  return out;
}

/* ------------------------------ 形状构造 ------------------------------ */

function regularVertices(sides: number, rot = -Math.PI / 2): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * TAU) / sides;
    out.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  return out;
}

/** 带圆角的多边形（"粗三角 / 方 / 六边形 / 五边形" 都用它） */
function roundedPolygon(sides: number, corner: number, rot = -Math.PI / 2): Pt[] {
  const v = regularVertices(sides, rot);
  const pts: Pt[] = [];
  const ARC = 10;
  for (let i = 0; i < sides; i++) {
    const prev = v[(i - 1 + sides) % sides];
    const cur = v[i];
    const next = v[(i + 1) % sides];
    const dPrev = norm(sub(prev, cur));
    const dNext = norm(sub(next, cur));
    const cut = Math.min(corner, dist(cur, next) * 0.45);
    const a: Pt = { x: cur.x + dPrev.x * cut, y: cur.y + dPrev.y * cut };
    const b: Pt = { x: cur.x + dNext.x * cut, y: cur.y + dNext.y * cut };
    for (let s = 0; s < ARC; s++) pts.push(quad(a, cur, b, s / ARC));
    pts.push(b); // 直边由下一段的起点隐式连接
  }
  return pts;
}

/** 尖锐多边形（星形 / 闪电 / 雪佛龙） */
function polygon(verts: Pt[], stepsPerEdge = 6): Pt[] {
  const out: Pt[] = [];
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    for (let s = 0; s < stepsPerEdge; s++) {
      const t = s / stepsPerEdge;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

function circle(steps = 240): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    out.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  return out;
}

/** 六芒星：外顶点 r=1，内顶点 r=inner */
function star(points: number, inner: number): Pt[] {
  const verts: Pt[] = [];
  const n = points * 2;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 === 0 ? 1 : inner;
    verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return verts;
}

/** 花瓣：极坐标玫瑰线 r = base + amp * |cos(k·θ)| */
function petal(petals: number, steps = 240): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const r = 0.34 + 0.66 * Math.abs(Math.cos((petals * a) / 2));
    out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return out;
}

/** 水滴：左右各一条三次贝塞尔，每半 24 点 */
function droplet(): Pt[] {
  const tip: Pt = { x: 0, y: -1 };
  const bottom: Pt = { x: 0, y: 0.82 };
  const l1: Pt = { x: -0.92, y: -0.3 };
  const l2: Pt = { x: -0.7, y: 0.55 };
  const r1: Pt = { x: 0.7, y: 0.55 };
  const r2: Pt = { x: 0.92, y: -0.3 };
  const out: Pt[] = [];
  for (let i = 0; i < 24; i++) out.push(cubic(tip, l1, l2, bottom, i / 24));
  for (let i = 0; i < 24; i++) out.push(cubic(bottom, r1, r2, tip, i / 24));
  return out;
}

/* ------------------------------ 形状表（顺序即索引） ------------------------------ */

export const SHAPE_NAMES = [
  '花瓣',
  '三角',
  '圆',
  '雪佛龙',
  '六芒星',
  '方',
  '闪电',
  '水滴',
  '六边形',
  '五边形',
] as const;

const CHEVRON: Pt[] = [
  { x: -0.9, y: -0.35 },
  { x: 0, y: 0.5 },
  { x: 0.9, y: -0.35 },
  { x: 0.9, y: 0.15 },
  { x: 0, y: 1.0 },
  { x: -0.9, y: 0.15 },
];

const LIGHTNING: Pt[] = [
  { x: 0.18, y: -1.0 },
  { x: -0.5, y: 0.08 },
  { x: 0.02, y: 0.08 },
  { x: -0.22, y: 1.0 },
  { x: 0.5, y: -0.12 },
  { x: 0.0, y: -0.12 },
];

function build(dense: Pt[]): Float32Array {
  return pack(resampleClosed(normalize(dense), POINT_COUNT));
}

/** SHAPES[i] = Float32Array(96)，x,y 交错，半径归一到 1 */
export const SHAPES: Float32Array[] = [
  build(petal(4)), // 0 花瓣
  build(roundedPolygon(3, 0.3)), // 1 三角
  build(circle()), // 2 圆
  build(polygon(CHEVRON, 8)), // 3 雪佛龙
  build(polygon(star(6, 0.48), 6)), // 4 六芒星
  build(roundedPolygon(4, 0.24)), // 5 方
  build(polygon(LIGHTNING, 8)), // 6 闪电
  build(droplet()), // 7 水滴
  build(roundedPolygon(6, 0.2)), // 8 六边形
  build(roundedPolygon(5, 0.22)), // 9 五边形
];

export const SHAPE_COUNT = SHAPES.length;

/**
 * ShapeTrailEngine —— 原生 Canvas 2D 几何形状粒子系统
 *
 * 职责：鼠标轨迹生成形状 / 悬停形变 / 点击爆发 + 彩色波纹 / 转场向心汇聚 / 低频环境态
 * 严格遵守：粒子上限 200、dt 上限 50ms、主循环零对象分配（点集预计算 + 对象池）
 */
import { SHAPES, POINT_COUNT, SHAPE_COUNT } from './shapes';
import { pickColor, readAccent, paletteFor, RGB, currentTheme, ThemeName } from './palettes';

const MAX_PARTICLES = 200;
const BASE_SPAWN_STEP = 8; // 每移动 8px 生成一枚
const LIFE = 2.0;
const OVERLAP_FACTOR = 0.14; // 重叠检测：距离 < (直径和) * 系数 时不生成
const WAVE_SPEED = 150; // px/s
const WAVE_BAND = 150; // 带宽
const POP_IN = 0.06;
const HOLD_END = 0.6;
const AMBIENT_INTERVAL = 1.2; // 工作台低频背景
const IDLE_DELAY = 3.0; // 静止 3s 后自动零星生成

interface Particle {
  active: boolean;
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  sizeScale: number;
  rot: number;
  rotSpeed: number;
  age: number;
  decayRate: number;
  shape: number;
  targetShape: number;
  morphT: number;
  r: number;
  g: number;
  b: number;
  mr: number;
  mg: number;
  mb: number;
  tr: number;
  tg: number;
  tb: number;
  converging: boolean;
  convScale: number;
  convSpin: number;
  bornAt: number;
}

interface Wave {
  x: number;
  y: number;
  r: number;
  color: RGB;
  dead: boolean;
}

export interface BurstOptions {
  count?: number;
  color?: RGB;
  sizeScale?: number;
  spread?: number;
}

function makeParticle(): Particle {
  return {
    active: false,
    id: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 24,
    sizeScale: 1,
    rot: 0,
    rotSpeed: 0,
    age: 0,
    decayRate: 1,
    shape: 0,
    targetShape: 0,
    morphT: 1,
    r: 0,
    g: 0,
    b: 0,
    mr: 0,
    mg: 0,
    mb: 0,
    tr: 0,
    tg: 0,
    tb: 0,
    converging: false,
    convScale: 1,
    convSpin: 1,
    bornAt: 0,
  };
}

export class ShapeTrailEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private dpr = 1;

  private pool: Particle[] = [];
  private cursor = 0;
  private waves: Wave[] = [];

  private raf = 0;
  private last = 0;
  private running = false;

  private theme: ThemeName;
  private lastColorIdx = -1;

  private rand = Math.random;

  private pointerX = -9999;
  private pointerY = -9999;
  private lastSpawnX = -9999;
  private lastSpawnY = -9999;
  private spawnAcc = 0;
  private spawnStep = BASE_SPAWN_STEP;
  private smoothSpeed = 0;
  private idleTimer = 0;
  private ambientTimer = 0;
  private ambient = false;
  private paused = false;

  private pulse = 0;
  private pulseTarget = 0;

  private hoverId = -1;
  private clickStreak = 0;
  private lastClickAt = -10;

  private mode: 'normal' | 'converge' = 'normal';
  private convCx = 0;
  private convCy = 0;
  private convT = 0;
  private convDur = 1;
  private convAccent: RGB;

  private opacity = 1;
  private nextId = 1;
  private destroyed = false;

  private mo: MutationObserver | null = null;

  /* ------------------------------ 生命周期 ------------------------------ */

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Canvas 2D context 不可用');
    this.ctx = ctx;
    this.theme = currentTheme();
    this.convAccent = readAccent();
    for (let i = 0; i < MAX_PARTICLES; i++) this.pool.push(makeParticle());
    this.resize();
    this.bind();
  }

  start(): void {
    if (this.running || this.destroyed) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    this.destroyed = true;
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerleave', this.onPointerLeave);
    this.mo?.disconnect();
    this.mo = null;
    this.pool.length = 0;
    this.waves.length = 0;
  }

  private bind(): void {
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    window.addEventListener('pointerleave', this.onPointerLeave, { passive: true });

    if (typeof MutationObserver !== 'undefined') {
      this.mo = new MutationObserver(() => {
        const next = currentTheme();
        if (next !== this.theme) {
          this.theme = next;
          this.convAccent = readAccent();
          this.recolorAll();
        }
      });
      this.mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }
  }

  private onResize = (): void => {
    this.resize();
  };

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width || window.innerWidth));
    const h = Math.max(1, Math.round(rect.height || window.innerHeight));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = w;
    this.H = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /* ------------------------------ 输入 ------------------------------ */

  private onPointerMove = (e: PointerEvent): void => {
    const x = e.clientX;
    const y = e.clientY;
    this.pointerX = x;
    this.pointerY = y;
    this.idleTimer = 0;

    if (this.lastSpawnX < -9000) {
      this.lastSpawnX = x;
      this.lastSpawnY = y;
      return;
    }
    const dx = x - this.lastSpawnX;
    const dy = y - this.lastSpawnY;
    const d = Math.hypot(dx, dy);
    if (d <= 0.01) return;

    // 沿路径插值补点，快速移动也不断线
    const step = this.spawnStep;
    let along = step - this.spawnAcc;
    let guard = 0;
    while (along <= d && guard < 40) {
      const t = along / d;
      this.spawnAt(this.lastSpawnX + dx * t, this.lastSpawnY + dy * t);
      along += step;
      guard++;
    }
    this.spawnAcc = d - (along - step);
    this.lastSpawnX = x;
    this.lastSpawnY = y;

    // 悬停已有形状 → 平滑 morph
    this.tryHoverMorph(x, y);
  };

  private onPointerLeave = (): void => {
    this.pointerX = -9999;
    this.pointerY = -9999;
    this.lastSpawnX = -9999;
    this.lastSpawnY = -9999;
    this.spawnAcc = 0;
    this.hoverId = -1;
  };

  private onPointerDown = (e: PointerEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.('button, a, input, textarea, select, label, [data-no-canvas]')) return;
    const now = performance.now() / 1000;
    if (now - this.lastClickAt <= 2) this.clickStreak++;
    else this.clickStreak = 0;
    this.lastClickAt = now;
    this.burst(e.clientX, e.clientY, { count: 5 + this.clickStreak * 5 });
  };

  private tryHoverMorph(x: number, y: number): void {
    let best: Particle | null = null;
    let bestD = Infinity;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active || p.morphT < 1 || p.converging) continue;
      const r = (p.size * p.sizeScale) / 2;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < r * 1.15 && d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (!best || best.id === this.hoverId) return;
    this.hoverId = best.id;
    const pal = paletteFor(this.theme);
    const c = pal[Math.floor(this.rand() * pal.length) % pal.length];
    let next = Math.floor(this.rand() * SHAPE_COUNT) % SHAPE_COUNT;
    if (next === best.shape) next = (next + 1) % SHAPE_COUNT;
    best.mr = best.r;
    best.mg = best.g;
    best.mb = best.b;
    best.tr = c[0];
    best.tg = c[1];
    best.tb = c[2];
    best.targetShape = next;
    best.morphT = 0;
  }

  /* ------------------------------ 生成 ------------------------------ */

  /** 尺寸对角渐变：左下 21px → 右上 42px */
  private sizeAt(x: number, y: number): number {
    const diag = Math.min(1, Math.max(0, (x / this.W + (1 - y / this.H)) / 2));
    return 21 + diag * 21;
  }

  private take(): Particle | null {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const idx = (this.cursor + i) % MAX_PARTICLES;
      const p = this.pool[idx];
      if (!p.active) {
        this.cursor = (idx + 1) % MAX_PARTICLES;
        p.active = true;
        return p;
      }
    }
    return null;
  }

  /** 生成单枚形状。返回是否成功（重叠或超上限时失败） */
  spawnAt(x: number, y: number, opts?: { sizeScale?: number; shape?: number }): Particle | null {
    if (this.destroyed) return null;
    // 重叠检测：与已有形状距离过近则不生成
    const base = this.sizeAt(x, y);
    const newSize = base * (opts?.sizeScale ?? 1);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const q = this.pool[i];
      if (!q.active) continue;
      const minD = (newSize + q.size * q.sizeScale) * OVERLAP_FACTOR;
      if (Math.abs(q.x - x) < minD && Math.abs(q.y - y) < minD && Math.hypot(q.x - x, q.y - y) < minD)
        return null;
    }
    const p = this.take();
    if (!p) return null;

    const { rgb, index } = pickColor(this.rand, this.theme, this.lastColorIdx);
    this.lastColorIdx = index;
    const shape = opts?.shape ?? Math.floor(this.rand() * SHAPE_COUNT) % SHAPE_COUNT;

    p.id = this.nextId++;
    p.x = x;
    p.y = y;
    p.vx = (this.rand() * 2 - 1) * 6;
    p.vy = (this.rand() * 2 - 1) * 6;
    p.size = base;
    p.sizeScale = opts?.sizeScale ?? 1;
    p.rot = this.rand() * Math.PI * 2;
    p.rotSpeed = (this.rand() * 2 - 1) * 1.0;
    p.age = 0;
    p.decayRate = 1 + Math.min(1, this.smoothSpeed / 45) * 2.5;
    p.shape = shape;
    p.targetShape = shape;
    p.morphT = 1;
    p.r = rgb[0];
    p.g = rgb[1];
    p.b = rgb[2];
    p.mr = rgb[0];
    p.mg = rgb[1];
    p.mb = rgb[2];
    p.tr = rgb[0];
    p.tg = rgb[1];
    p.tb = rgb[2];
    p.converging = false;
    p.convScale = 1;
    p.convSpin = 1;
    p.bornAt = performance.now();
    return p;
  }

  /** 同心环爆发 + 彩色波纹 */
  burst(x: number, y: number, opts: BurstOptions = {}): void {
    if (this.destroyed) return;
    const count = Math.max(1, Math.round(opts.count ?? 5));
    const baseSize = this.sizeAt(x, y) * (opts.sizeScale ?? 1);
    const spacing = baseSize * 2.2 * 0.62;
    const { rgb } = pickColor(this.rand, this.theme, this.lastColorIdx);
    const color = opts.color ?? rgb;

    let placed = 0;
    let ring = 1;
    while (placed < count && ring < 12) {
      const R = ring * spacing;
      const n = Math.max(6, Math.floor((2 * Math.PI * R) / spacing));
      const perRing = Math.min(n, count - placed);
      const offset = this.rand() * Math.PI * 2;
      for (let i = 0; i < perRing; i++) {
        const a = offset + (i / perRing) * Math.PI * 2;
        const px = x + Math.cos(a) * R;
        const py = y + Math.sin(a) * R;
        const p = this.spawnAt(px, py, { sizeScale: (opts.sizeScale ?? 1) * 0.82 });
        if (p) {
          const push = (opts.spread ?? 1) * 26;
          p.vx += Math.cos(a) * push;
          p.vy += Math.sin(a) * push;
          p.r = color[0];
          p.g = color[1];
          p.b = color[2];
          p.mr = color[0];
          p.mg = color[1];
          p.mb = color[2];
          p.tr = color[0];
          p.tg = color[1];
          p.tb = color[2];
        }
        placed++;
      }
      ring++;
    }

    this.waves.push({ x, y, r: 0, color, dead: false });
    this.pulseTarget = Math.min(1.5, this.pulseTarget + 0.15);
  }

  /* ------------------------------ 转场 API ------------------------------ */

  /** 所有现存形状被接管：向心加速 + 切向涡旋 + 缩小 + 向 accent 靠拢 */
  converge(cx: number, cy: number, duration: number): void {
    this.mode = 'converge';
    this.convCx = cx;
    this.convCy = cy;
    this.convT = 0;
    this.convDur = Math.max(0.2, duration);
    this.convAccent = readAccent();
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.converging = true;
      p.morphT = 1;
      p.targetShape = p.shape;
      p.convScale = 0.3 + this.rand() * 0.25;
      p.convSpin = 3;
      // 颜色统一向 accent 靠拢（lerp 0.5）
      p.mr = p.r;
      p.mg = p.g;
      p.mb = p.b;
      p.tr = p.r + (this.convAccent[0] - p.r) * 0.5;
      p.tg = p.g + (this.convAccent[1] - p.g) * 0.5;
      p.tb = p.b + (this.convAccent[2] - p.b) * 0.5;
      p.morphT = 0;
    }
    // 中心叠一轮小 burst，形成"吸入点"
    this.burst(cx, cy, { count: 8, color: this.convAccent, sizeScale: 0.7, spread: 0.4 });
    this.pulseTarget = Math.min(1.5, this.pulseTarget + 0.3);
  }

  /** 解除汇聚，恢复正常物理与生命周期 */
  release(): void {
    this.mode = 'normal';
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.converging = false;
      p.convSpin = 1;
      p.age = Math.max(p.age, LIFE * 0.42); // 让它们自然消散
      const a = this.rand() * Math.PI * 2;
      p.vx += Math.cos(a) * 40;
      p.vy += Math.sin(a) * 40;
    }
  }

  /** 低频自动 spawn（工作台背景态） */
  setAmbientMode(on: boolean): void {
    this.ambient = on;
    this.ambientTimer = 0;
  }

  setOpacity(alpha: number): void {
    this.opacity = Math.max(0, Math.min(1, alpha));
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  /** 密码框聚焦时略微提升生成速度（呼应交互） */
  setSpawnBoost(mult: number): void {
    this.spawnStep = BASE_SPAWN_STEP / Math.max(0.2, mult);
  }

  get activeCount(): number {
    let n = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) if (this.pool[i].active) n++;
    return n;
  }

  /* ------------------------------ 主循环 ------------------------------ */

  private tick = (now: number): void => {
    if (this.destroyed) return;
    const dt = Math.min(50, now - this.last) / 1000;
    this.last = now;
    if (!this.paused) {
      this.update(dt);
      this.render();
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    // 指针速度（平滑）
    const raw =
      this.pointerX > -9000 ? Math.min(3000, this.smoothSpeedRaw(dt)) : 0;
    this.smoothSpeed += (raw - this.smoothSpeed) * 0.25;
    this.idleTimer += dt;

    // 脉冲：快起慢落
    if (this.pulse < this.pulseTarget) this.pulse += dt * 8;
    else this.pulse -= dt * 1.5;
    this.pulse = Math.max(0, this.pulse);
    this.pulseTarget = Math.max(0, this.pulseTarget - dt * 0.55);

    // 环境态 / 静止补偿
    if (this.ambient) {
      this.ambientTimer += dt;
      if (this.ambientTimer >= AMBIENT_INTERVAL) {
        this.ambientTimer = 0;
        this.spawnAt(this.rand() * this.W, this.rand() * this.H);
      }
    } else if (this.idleTimer > IDLE_DELAY && this.mode === 'normal') {
      this.ambientTimer += dt;
      if (this.ambientTimer >= 0.7) {
        this.ambientTimer = 0;
        const n = 1 + Math.floor(this.rand() * 2);
        for (let i = 0; i < n; i++) {
          this.spawnAt(
            this.W * (0.08 + this.rand() * 0.84),
            this.H * (0.08 + this.rand() * 0.84),
          );
        }
      }
    }

    // 汇聚进度
    if (this.mode === 'converge') this.convT = Math.min(1, this.convT + dt / this.convDur);

    // 波纹
    const maxR = Math.hypot(this.W, this.H) * 0.8;
    for (const w of this.waves) {
      w.r += WAVE_SPEED * dt;
      if (w.r > maxR) w.dead = true;
    }

    // 粒子
    const decayBase = 1 + Math.min(1, this.smoothSpeed / 45) * 2.5;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      if (p.converging) {
        p.age += dt * 0.12;
        const dx = this.convCx - p.x;
        const dy = this.convCy - p.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const ux = dx / d;
        const uy = dy / d;
        const progress = this.convT;
        const near = Math.min(1, 60 / Math.max(30, d));
        const inSpeed = 140 + 900 * progress * progress;
        const swirl = 260 * (1 - progress * 0.35) + 120 * near;
        const tvx = ux * inSpeed * (1 - near * 0.55) + -uy * swirl;
        const tvy = uy * inSpeed * (1 - near * 0.55) + ux * swirl;
        p.vx += (tvx - p.vx) * Math.min(1, dt * 6);
        p.vy += (tvy - p.vy) * Math.min(1, dt * 6);
        p.sizeScale += (p.convScale - p.sizeScale) * Math.min(1, dt * 4);
        p.rotSpeed *= Math.pow(0.999, dt * 60);
      } else {
        p.age += dt * Math.max(decayBase, p.decayRate);
        p.sizeScale += (1 - p.sizeScale) * Math.min(1, dt * 2.5);
        p.vx *= Math.pow(0.985, dt * 60);
        p.vy *= Math.pow(0.985, dt * 60);
        p.rotSpeed *= Math.pow(0.997, dt * 60);
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt * (p.converging ? p.convSpin : 1);

      if (p.morphT < 1) p.morphT = Math.min(1, p.morphT + dt * 2.2);

      // 波纹扫过：永久改色，不回弹
      for (let w = 0; w < this.waves.length; w++) {
        const wave = this.waves[w];
        if (wave.dead) continue;
        const d = Math.hypot(p.x - wave.x, p.y - wave.y);
        const fromEdge = Math.abs(d - wave.r);
        if (fromEdge < WAVE_BAND) {
          const strength = (1 - fromEdge / WAVE_BAND) * dt * 3.2;
          p.r += (wave.color[0] - p.r) * Math.min(1, strength);
          p.g += (wave.color[1] - p.g) * Math.min(1, strength);
          p.b += (wave.color[2] - p.b) * Math.min(1, strength);
          if (p.morphT >= 1) {
            p.tr = p.r;
            p.tg = p.g;
            p.tb = p.b;
          }
        }
      }

      if (p.age >= LIFE) {
        p.active = false;
        if (p.id === this.hoverId) this.hoverId = -1;
      }
    }

    // 清理死亡波纹
    if (this.waves.length) {
      let k = 0;
      for (let i = 0; i < this.waves.length; i++) {
        if (!this.waves[i].dead) this.waves[k++] = this.waves[i];
      }
      this.waves.length = k;
    }
  }

  private smoothSpeedRaw(dt: number): number {
    if (!this._prevPX) {
      this._prevPX = this.pointerX;
      this._prevPY = this.pointerY;
    }
    const d = Math.hypot(this.pointerX - this._prevPX, this.pointerY - this._prevPY);
    this._prevPX = this.pointerX;
    this._prevPY = this.pointerY;
    return dt > 0 ? d / dt : 0;
  }
  private _prevPX = 0;
  private _prevPY = 0;

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    if (this.opacity <= 0.001) return;
    ctx.globalAlpha = this.opacity;

    const pulseBoost = 1 + this.pulse * 0.1;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      const t = Math.min(1, p.age / LIFE);
      // 生命周期：0–0.06 pop-in / 0.06–0.6 hold / 0.6–1.0 收缩
      let phaseScale: number;
      if (t < POP_IN) {
        const k = t / POP_IN;
        phaseScale = k * k * (3 - 2 * k) * 1.06;
      } else if (t < HOLD_END) {
        phaseScale = 1;
      } else {
        const k = (t - HOLD_END) / (1 - HOLD_END);
        phaseScale = Math.max(0, 1 - k * k * k);
      }
      if (phaseScale <= 0.001) continue;

      let alpha = 1;
      if (t < POP_IN) alpha = t / POP_IN;
      else if (t > 0.78) alpha = 1 - (t - 0.78) / 0.22;
      alpha = Math.max(0, Math.min(1, alpha));

      const size = p.size * p.sizeScale * phaseScale * pulseBoost;
      const s = size / 2;

      // 形变插值
      const e = p.morphT >= 1 ? 1 : p.morphT * p.morphT * (3 - 2 * p.morphT);
      let r: number;
      let g: number;
      let b: number;
      if (e >= 1) {
        r = p.tr;
        g = p.tg;
        b = p.tb;
      } else {
        r = p.mr + (p.tr - p.mr) * e;
        g = p.mg + (p.tg - p.mg) * e;
        b = p.mb + (p.tb - p.mb) * e;
      }

      const A = SHAPES[p.shape];
      const B = SHAPES[p.targetShape];
      const cos = Math.cos(p.rot);
      const sin = Math.sin(p.rot);

      ctx.beginPath();
      for (let k = 0; k < POINT_COUNT; k++) {
        const ax = A[k * 2];
        const ay = A[k * 2 + 1];
        const bx = B[k * 2];
        const by = B[k * 2 + 1];
        const x = (ax + (bx - ax) * e) * s;
        const y = (ay + (by - ay) * e) * s;
        const rx = x * cos - y * sin;
        const ry = x * sin + y * cos;
        if (k === 0) ctx.moveTo(p.x + rx, p.y + ry);
        else ctx.lineTo(p.x + rx, p.y + ry);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
      ctx.fill();
    }

    // 波纹环
    for (let i = 0; i < this.waves.length; i++) {
      const w = this.waves[i];
      if (w.dead) continue;
      const fade = Math.max(0, 1 - w.r / (Math.hypot(this.W, this.H) * 0.8));
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${w.color[0] | 0},${w.color[1] | 0},${w.color[2] | 0},${0.22 * fade})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  /** 主题切换时把现存形状柔和过渡到新色板 */
  private recolorAll(): void {
    const pal = paletteFor(this.theme);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const c = pal[Math.floor(this.rand() * pal.length) % pal.length];
      p.mr = p.r;
      p.mg = p.g;
      p.mb = p.b;
      p.tr = c[0];
      p.tg = c[1];
      p.tb = c[2];
      p.targetShape = p.shape;
      p.morphT = 0;
    }
  }
}

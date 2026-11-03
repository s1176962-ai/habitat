/** 栖息地 / 小游戏 / 动物 / 姓名词表 —— 全站语义与配色的唯一来源 */

export type Habitat = 'forest' | 'ocean' | 'desert' | 'grassland' | 'wetland' | 'polar';
export type GameId = 'habitat-match' | 'migration-rush' | 'biome-builder';
export type Status = 'improving' | 'steady' | 'needs-attention' | 'at-risk' | 'inactive';

export interface HabitatMeta {
  id: Habitat;
  cn: string;
  en: string;
  color: string;
}

/** 图表颜色语义绑定栖息地：全站一致，老师一眼能对应 */
export const HABITATS: HabitatMeta[] = [
  { id: 'forest', cn: '森林', en: 'Forest', color: '#6E8B5A' },
  { id: 'ocean', cn: '海洋', en: 'Ocean', color: '#5A8B93' },
  { id: 'desert', cn: '沙漠', en: 'Desert', color: '#C9A24A' },
  { id: 'grassland', cn: '草原', en: 'Grassland', color: '#9BAF5F' },
  { id: 'wetland', cn: '湿地', en: 'Wetland', color: '#6F9C9E' },
  { id: 'polar', cn: '极地', en: 'Polar', color: '#8E9BB8' },
];

export const HABITAT_IDS: Habitat[] = HABITATS.map((h) => h.id);

export const HABITAT_MAP: Record<Habitat, HabitatMeta> = HABITATS.reduce(
  (acc, h) => {
    acc[h.id] = h;
    return acc;
  },
  {} as Record<Habitat, HabitatMeta>,
);

export function habitatColor(id: Habitat): string {
  return HABITAT_MAP[id]?.color ?? '#A8A29A';
}

export function habitatLabel(id: Habitat): string {
  return HABITAT_MAP[id]?.cn ?? id;
}

/** 暗色主题下略微提亮，保证对比度 */
export function habitatColorFor(id: Habitat, dark: boolean): string {
  const c = habitatColor(id);
  if (!dark) return c;
  const n = parseInt(c.slice(1), 16);
  const mix = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.18));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
}

export interface GameMeta {
  id: GameId;
  cn: string;
  en: string;
  desc: string;
}

export const GAMES: GameMeta[] = [
  {
    id: 'habitat-match',
    cn: '栖息地配对',
    en: 'Habitat Match',
    desc: '给动物选栖息地 · 正确率导向',
  },
  {
    id: 'migration-rush',
    cn: '限时迁徙',
    en: 'Migration Rush',
    desc: '限时连击 · 速度导向',
  },
  {
    id: 'biome-builder',
    cn: '生态拼图',
    en: 'Biome Builder',
    desc: '拼装完整生态系统 · 综合分',
  },
];

export const GAME_MAP: Record<GameId, GameMeta> = GAMES.reduce(
  (acc, g) => {
    acc[g.id] = g;
    return acc;
  },
  {} as Record<GameId, GameMeta>,
);

export const GAME_IDS: GameId[] = GAMES.map((g) => g.id);

/* ------------------------------ 动物词表（54 条 · 中英对照） ------------------------------ */

export interface AnimalMeta {
  cn: string;
  en: string;
  habitat: Habitat;
}

export const ANIMALS: AnimalMeta[] = [
  // 森林
  { cn: '树懒', en: 'Sloth', habitat: 'forest' },
  { cn: '猩猩', en: 'Orangutan', habitat: 'forest' },
  { cn: '啄木鸟', en: 'Woodpecker', habitat: 'forest' },
  { cn: '松鼠', en: 'Squirrel', habitat: 'forest' },
  { cn: '老虎', en: 'Tiger', habitat: 'forest' },
  { cn: '大熊猫', en: 'Giant Panda', habitat: 'forest' },
  { cn: '长臂猿', en: 'Gibbon', habitat: 'forest' },
  { cn: '犀鸟', en: 'Hornbill', habitat: 'forest' },
  { cn: '梅花鹿', en: 'Sika Deer', habitat: 'forest' },
  { cn: '云豹', en: 'Clouded Leopard', habitat: 'forest' },
  { cn: '蜘蛛猴', en: 'Spider Monkey', habitat: 'forest' },
  { cn: '萤火虫', en: 'Firefly', habitat: 'forest' },
  // 海洋
  { cn: '海豚', en: 'Dolphin', habitat: 'ocean' },
  { cn: '大白鲨', en: 'Great White Shark', habitat: 'ocean' },
  { cn: '章鱼', en: 'Octopus', habitat: 'ocean' },
  { cn: '海龟', en: 'Sea Turtle', habitat: 'ocean' },
  { cn: '小丑鱼', en: 'Clownfish', habitat: 'ocean' },
  { cn: '座头鲸', en: 'Humpback Whale', habitat: 'ocean' },
  { cn: '海星', en: 'Starfish', habitat: 'ocean' },
  { cn: '水母', en: 'Jellyfish', habitat: 'ocean' },
  { cn: '珊瑚虫', en: 'Coral Polyp', habitat: 'ocean' },
  // 沙漠
  { cn: '骆驼', en: 'Camel', habitat: 'desert' },
  { cn: '蝎子', en: 'Scorpion', habitat: 'desert' },
  { cn: '响尾蛇', en: 'Rattlesnake', habitat: 'desert' },
  { cn: '沙狐', en: 'Fennec Fox', habitat: 'desert' },
  { cn: '沙漠蜥蜴', en: 'Desert Lizard', habitat: 'desert' },
  { cn: '沙漠甲虫', en: 'Desert Beetle', habitat: 'desert' },
  // 草原
  { cn: '狮子', en: 'Lion', habitat: 'grassland' },
  { cn: '斑马', en: 'Zebra', habitat: 'grassland' },
  { cn: '长颈鹿', en: 'Giraffe', habitat: 'grassland' },
  { cn: '非洲象', en: 'African Elephant', habitat: 'grassland' },
  { cn: '羚羊', en: 'Antelope', habitat: 'grassland' },
  { cn: '猎豹', en: 'Cheetah', habitat: 'grassland' },
  { cn: '犀牛', en: 'Rhino', habitat: 'grassland' },
  { cn: '鸵鸟', en: 'Ostrich', habitat: 'grassland' },
  { cn: '土拨鼠', en: 'Prairie Dog', habitat: 'grassland' },
  // 湿地
  { cn: '水獭', en: 'Otter', habitat: 'wetland' },
  { cn: '红树林蟹', en: 'Mangrove Crab', habitat: 'wetland' },
  { cn: '苍鹭', en: 'Grey Heron', habitat: 'wetland' },
  { cn: '火烈鸟', en: 'Flamingo', habitat: 'wetland' },
  { cn: '树蛙', en: 'Tree Frog', habitat: 'wetland' },
  { cn: '蜻蜓', en: 'Dragonfly', habitat: 'wetland' },
  { cn: '鳄鱼', en: 'Crocodile', habitat: 'wetland' },
  { cn: '白鹭', en: 'Little Egret', habitat: 'wetland' },
  { cn: '河马', en: 'Hippo', habitat: 'wetland' },
  { cn: '水雉', en: 'Pheasant-tailed Jacana', habitat: 'wetland' },
  // 极地
  { cn: '企鹅', en: 'Penguin', habitat: 'polar' },
  { cn: '北极熊', en: 'Polar Bear', habitat: 'polar' },
  { cn: '北极狐', en: 'Arctic Fox', habitat: 'polar' },
  { cn: '海象', en: 'Walrus', habitat: 'polar' },
  { cn: '驯鹿', en: 'Reindeer', habitat: 'polar' },
  { cn: '雪鸮', en: 'Snowy Owl', habitat: 'polar' },
  { cn: '海豹', en: 'Seal', habitat: 'polar' },
  { cn: '磷虾', en: 'Krill', habitat: 'polar' },
];

/** 常见混淆方向：湿地常被误选成森林、极地常被误选成海洋…（让"错误热点"有故事） */
export const CONFUSION: Record<Habitat, Habitat> = {
  forest: 'grassland',
  ocean: 'wetland',
  desert: 'grassland',
  grassland: 'desert',
  wetland: 'forest',
  polar: 'ocean',
};

/* ------------------------------ 姓名池 ------------------------------ */

const SURNAMES = [
  '王','李','张','刘','陈','杨','赵','黄','周','吴','徐','孙','马','朱','胡',
  '郭','何','高','林','罗','郑','梁','谢','宋','唐','许','韩','冯','邓','曹',
];
const GIVEN = [
  '小明','思远','雨桐','子涵','嘉怡','浩然','梓萱','宇轩','欣妍','俊杰',
  '诗琪','泽宇','若曦','博文','一诺','晨曦','慕白','知微','书瑶','语彤',
  '沐辰','清和','望舒','子墨','安琪','皓月','亦寒','南乔','沐白','云舟',
];

export function randomName(rand: () => number): string {
  const s = SURNAMES[Math.floor(rand() * SURNAMES.length)];
  const g = GIVEN[Math.floor(rand() * GIVEN.length)];
  return s + g;
}

export const CLASS_NAMES = ['三年级 A 班', '三年级 B 班', '三年级 C 班'] as const;

/* ------------------------------ 徽章 ------------------------------ */

export const BADGES = [
  { id: 'forest-explorer', cn: '森林探险家', en: 'Forest Explorer' },
  { id: 'ocean-diver', cn: '深海潜水员', en: 'Ocean Diver' },
  { id: 'desert-crosser', cn: '穿越沙漠', en: 'Desert Crosser' },
  { id: 'grass-runner', cn: '草原疾风', en: 'Grass Runner' },
  { id: 'wetland-guard', cn: '湿地守护者', en: 'Wetland Guard' },
  { id: 'polar-navigator', cn: '极地领航员', en: 'Polar Navigator' },
  { id: 'streak-7', cn: '连续打卡 7 天', en: '7-Day Streak' },
  { id: 'perfect-round', cn: '满分一局', en: 'Perfect Round' },
  { id: 'comeback', cn: '进步之星', en: 'Comeback Star' },
] as const;

/* ------------------------------ 状态标签 ------------------------------ */

export const STATUS_META: Record<Status, { cn: string; tone: 'good' | 'warn' | 'bad' | 'idle' }> = {
  improving: { cn: '稳步提升', tone: 'good' },
  steady: { cn: '稳步提升', tone: 'good' },
  'needs-attention': { cn: '需关注', tone: 'warn' },
  'at-risk': { cn: '落后', tone: 'bad' },
  inactive: { cn: '未活跃', tone: 'idle' },
};

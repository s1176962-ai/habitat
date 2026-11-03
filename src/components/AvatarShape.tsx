/**
 * Q 版简笔画头像
 * —— 全站不使用真人/外网照片，改为按姓名哈希确定生成的简笔小学生形象：
 *    大头 + 发型变体 + 腮红 + 简笔五官，外框仍是 5 种几何裁切（保持设计语言统一）。
 */

/** 5 个几何裁切形状（objectBoundingBox 归一化坐标） —— 全站头像统一语言 */
export function ClipPathDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: 'absolute', pointerEvents: 'none' }}>
      <defs>
        <clipPath id="hq-clip-0" clipPathUnits="objectBoundingBox">
          <polygon points="0.5,0 1,0.25 1,0.75 0.5,1 0,0.75 0,0.25" />
        </clipPath>
        <clipPath id="hq-clip-1" clipPathUnits="objectBoundingBox">
          <circle cx="0.5" cy="0.5" r="0.5" />
        </clipPath>
        <clipPath id="hq-clip-2" clipPathUnits="objectBoundingBox">
          <path d="M0.28,0 H0.72 C0.87,0 1,0.13 1,0.28 V0.72 C1,0.87 0.87,1 0.72,1 H0.28 C0.13,1 0,0.87 0,0.72 V0.28 C0,0.13 0.13,0 0.28,0 Z" />
        </clipPath>
        <clipPath id="hq-clip-3" clipPathUnits="objectBoundingBox">
          <polygon points="0.5,0 1,0.38 0.82,1 0.18,1 0,0.38" />
        </clipPath>
        <clipPath id="hq-clip-4" clipPathUnits="objectBoundingBox">
          <polygon points="0.3,0 0.7,0 1,0.3 1,0.7 0.7,1 0.3,1 0,0.7 0,0.3" />
        </clipPath>
      </defs>
    </svg>
  );
}

/* ------------------------------ 配色（栖息地色板同源） ------------------------------ */
const TINT = ['#EDF2E5', '#E4EEF0', '#F8F0DE', '#F0F4E4', '#E6EFEF', '#EBEDF4', '#F7EAE6'];
const SKIN = ['#F9E1CC', '#F4D4B9', '#EFC8AA'];
const HAIR = ['#3B3330', '#4B3A32', '#6A4A38', '#2E2A28', '#5C4234'];
const SHIRT = ['#6E8B5A', '#5A8B93', '#C9A24A', '#9BAF5F', '#6F9C9E', '#8E9BB8', '#C3695C'];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** 发型变体：0 短发 · 1 双马尾 · 2 丸子头 · 3 齐刘海 · 4 侧马尾 */
function Hair({ style, color }: { style: number; color: string }) {
  const cap = 'M22 46 Q22 14 50 14 Q78 14 78 46 Q70 30 50 31 Q30 30 22 46 Z';
  return (
    <g fill={color}>
      {style === 0 && <path d={cap} />}
      {style === 1 && (
        <>
          <path d={cap} />
          <circle cx="15" cy="52" r="10" />
          <circle cx="85" cy="52" r="10" />
        </>
      )}
      {style === 2 && (
        <>
          <path d={cap} />
          <circle cx="50" cy="12" r="11" />
        </>
      )}
      {style === 3 && (
        <path d="M20 48 Q20 12 50 12 Q80 12 80 48 L80 36 Q66 30 50 36 Q34 30 20 36 Z" />
      )}
      {style === 4 && (
        <>
          <path d={cap} />
          <path d="M74 40 Q94 50 88 76 Q80 64 72 52 Z" />
        </>
      )}
    </g>
  );
}

interface FaceProps {
  skin: string;
  hair: string;
  shirt: string;
  tint: string;
  style: number;
  teacher?: boolean;
}

function KidFace({ skin, hair, shirt, tint, style, teacher = false }: FaceProps) {
  const line = '#4A3F38';
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden style={{ display: 'block' }}>
      <rect x="0" y="0" width="100" height="100" fill={tint} />

      {/* 身体 / 校服 */}
      <path d="M14 100 Q16 80 31 74 L69 74 Q84 80 86 100 Z" fill={shirt} />
      {teacher ? (
        <path d="M43 74 L50 88 L57 74 L52 71 L48 71 Z" fill="#FFFDF8" />
      ) : (
        <path d="M43 75 L50 86 L57 75 L52 72 L48 72 Z" fill="#FFFDF8" />
      )}

      {/* 脖子 + 耳朵 */}
      <rect x="43" y="64" width="14" height="14" rx="6" fill={skin} />
      <circle cx="23" cy="50" r="6" fill={skin} />
      <circle cx="77" cy="50" r="6" fill={skin} />

      {/* 头 */}
      <ellipse cx="50" cy="46" rx="28" ry="29" fill={skin} />

      {/* 头发 */}
      <Hair style={style} color={hair} />

      {/* 眉毛 */}
      <g stroke={hair} strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M36 40 Q39 38 42 40" />
        <path d="M58 40 Q61 38 64 40" />
      </g>

      {/* 眼睛（简笔：实心点 + 高光） */}
      <circle cx="40" cy="48" r="3.6" fill={line} />
      <circle cx="60" cy="48" r="3.6" fill={line} />
      <circle cx="41.3" cy="46.8" r="1.2" fill="#FFFFFF" />
      <circle cx="61.3" cy="46.8" r="1.2" fill="#FFFFFF" />

      {/* 腮红 */}
      <circle cx="31" cy="56" r="5" fill="#EDA79C" opacity="0.5" />
      <circle cx="69" cy="56" r="5" fill="#EDA79C" opacity="0.5" />

      {/* 嘴 */}
      <path
        d="M45 58 Q50 63.5 55 58"
        stroke={line}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* 老师：眼镜 + 丸子头收紧 */}
      {teacher && (
        <g stroke="#8A7A6A" strokeWidth="2" fill="none">
          <rect x="31" y="42" width="18" height="13" rx="5" />
          <rect x="51" y="42" width="18" height="13" rx="5" />
          <path d="M49 48 Q50 46 51 48" />
        </g>
      )}
    </svg>
  );
}

interface Props {
  name: string;
  idx?: number;
  size?: number;
  className?: string;
  ring?: boolean;
  /** 教师形象：加眼镜与衬衫领 */
  teacher?: boolean;
}

/** 几何裁切 + Q 版简笔画头像 */
export default function AvatarShape({
  name,
  idx = 0,
  size = 36,
  className,
  ring = true,
  teacher = false,
}: Props) {
  const h = hash(name || 'hq');
  const style = teacher ? 2 : (h >>> 12) % 5;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flex: '0 0 auto',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        clipPath: `url(#hq-clip-${idx % 5})`,
        backgroundColor: TINT[h % TINT.length],
        boxShadow: ring ? 'inset 0 0 0 1px rgba(0,0,0,0.08)' : undefined,
        overflow: 'hidden',
        verticalAlign: 'middle',
      }}
      title={name}
      role="img"
      aria-label={name}
    >
      <KidFace
        skin={teacher ? SKIN[0] : SKIN[(h >>> 3) % SKIN.length]}
        hair={teacher ? HAIR[0] : HAIR[(h >>> 6) % HAIR.length]}
        shirt={teacher ? '#C3695C' : SHIRT[(h >>> 9) % SHIRT.length]}
        tint={teacher ? '#F7EAE6' : TINT[h % TINT.length]}
        style={style}
        teacher={teacher}
      />
    </span>
  );
}

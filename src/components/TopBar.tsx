import { Bell, BellOff, LogOut, Search, X } from 'lucide-react';
import type { ThemeName } from '../lib/shapeTrail/palettes';
import { RANGE_KEYS, RANGE_LABEL, type RangeKey } from '../mock/students';
import ThemeToggle from './ThemeToggle';
import AvatarShape from './AvatarShape';

interface Props {
  classes: string[];
  current: string;
  onClass: (c: string) => void;
  range: RangeKey;
  onRange: (r: RangeKey) => void;
  search: string;
  onSearch: (s: string) => void;
  theme: ThemeName;
  onToggleTheme: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onLogout: () => void;
}

export function HexLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <polygon
        points="16,2.5 28.5,9.75 28.5,22.25 16,29.5 3.5,22.25 3.5,9.75"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="4.6" fill="var(--accent)" opacity="0.85" />
    </svg>
  );
}

export default function TopBar({
  classes,
  current,
  onClass,
  range,
  onRange,
  search,
  onSearch,
  theme,
  onToggleTheme,
  muted,
  onToggleMute,
  onLogout,
}: Props) {
  return (
    <header
      data-anim="topbar"
      className="sticky top-0 z-30 border-b border-border"
      style={{ background: 'color-mix(in srgb, var(--background) 86%, transparent)', backdropFilter: 'blur(10px)' }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 md:px-8">
        {/* 左：品牌（FLIP 落点） */}
        <div className="flex items-center gap-2.5">
          <span data-flip-target className="inline-flex h-8 w-8 items-center justify-center">
            <span data-flip-logo-slot style={{ display: 'inline-flex', opacity: 0 }}>
              <HexLogo size={32} />
            </span>
          </span>
          <span className="hidden text-[13px] font-medium sm:inline" style={{ color: 'var(--foreground)' }}>
            HabitatQuest
            <span style={{ color: 'var(--muted)' }}> · 教师工作台</span>
          </span>
        </div>

        {/* 中：班级切换 */}
        <div
          className="flex items-center rounded-full border border-border p-0.5"
          style={{ background: 'var(--panel)' }}
          role="tablist"
          aria-label="班级切换"
        >
          {classes.map((c) => {
            const active = c === current;
            return (
              <button
                key={c}
                role="tab"
                aria-selected={active}
                onClick={() => onClass(c)}
                className="rounded-full px-3 py-1 text-[12px] transition-all duration-300"
                style={{
                  background: active ? 'var(--surface)' : 'transparent',
                  color: active ? 'var(--foreground)' : 'var(--muted)',
                  boxShadow: active ? 'var(--shadow-card)' : 'none',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {c.replace('三年级 ', '')}
              </button>
            );
          })}
        </div>

        {/* 右：时间范围 / 搜索 / 实时 / 主题 / 头像 / 退出 */}
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center rounded-full border border-border p-0.5 md:flex" style={{ background: 'var(--panel)' }}>
            {RANGE_KEYS.map((r) => {
              const active = r === range;
              return (
                <button
                  key={r}
                  onClick={() => onRange(r)}
                  className="rounded-full px-2.5 py-1 text-[12px] transition-all duration-300"
                  style={{
                    background: active ? 'var(--surface)' : 'transparent',
                    color: active ? 'var(--foreground)' : 'var(--muted)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {RANGE_LABEL[r]}
                </button>
              );
            })}
          </div>

          <div className="relative hidden lg:block">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="搜索学生"
              aria-label="搜索学生"
              className="h-9 w-[150px] rounded-xl border border-border bg-surface pl-8 pr-7 text-[12px] outline-none transition-all duration-300 focus:w-[190px]"
              style={{ color: 'var(--foreground)' }}
            />
            {search && (
              <button
                onClick={() => onSearch('')}
                aria-label="清空搜索"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--muted)' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={onToggleMute}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-2.5 text-[12px] transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: 'var(--surface)', color: muted ? 'var(--muted)' : 'var(--foreground)' }}
            title={muted ? '实时提醒已静音，点击开启' : '实时提醒开启中，点击静音'}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${muted ? '' : 'hq-breathe'}`}
              style={{ background: muted ? 'var(--muted)' : 'var(--down)' }}
            />
            <span className="hidden sm:inline">实时</span>
            {muted ? <BellOff size={13} strokeWidth={1.5} /> : <Bell size={13} strokeWidth={1.5} />}
          </button>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          <div className="flex items-center gap-2 pl-1">
            <AvatarShape name="吴老师" idx={1} size={32} teacher />
            <span className="hidden text-[12px] xl:inline" style={{ color: 'var(--muted)' }}>
              Ms. 吴
            </span>
          </div>

          <button
            onClick={onLogout}
            data-logout
            aria-label="退出登录"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-[12px] transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
          >
            <LogOut size={13} strokeWidth={1.5} />
            <span className="hidden sm:inline">退出登录</span>
          </button>

          <span
            className="hidden rounded-full border px-2 py-0.5 text-[10.5px] xl:inline"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)', whiteSpace: 'nowrap' }}
            title="本界面为课程项目原型"
          >
            演示原型 · Demo
          </span>
        </div>
      </div>
    </header>
  );
}

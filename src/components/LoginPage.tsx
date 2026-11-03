import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import AvatarShape from './AvatarShape';
import { HexLogo } from './TopBar';
import { classStudents } from '../mock/students';

interface Props {
  onLogin: (origin: { x: number; y: number }) => void;
  onPasswordFocus: (focused: boolean) => void;
  busy: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 演示账号（无真实鉴权，仅做格式校验） */
export const DEMO_ACCOUNT = {
  email: 'teacher@habitatquest.edu',
  password: 'habitat2026',
};

function Chars({ text, dim }: { text: string; dim?: boolean }) {
  return (
    <span className="inline-block" style={{ opacity: dim ? 0.78 : 1 }}>
      {text.split('').map((c, i) => (
        <span key={i} data-login-char className="inline-block will-change-transform">
          {c}
        </span>
      ))}
    </span>
  );
}

export default function LoginPage({ onLogin, onPasswordFocus, busy }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<{ email?: boolean; password?: boolean }>({});

  const emailRef = useRef<HTMLDivElement>(null);
  const pwdRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const peers = useMemo(() => classStudents('三年级 A 班').slice(0, 5), []);

  // 入场：大标题逐字 + 卡片
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const chars = root.querySelectorAll('[data-login-char]');
    const tl = gsap.timeline();
    if (reduced) {
      tl.set(chars, { opacity: 1, y: 0, filter: 'blur(0px)' });
      tl.set('[data-login-card]', { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' });
      return () => {
        tl.kill();
      };
    }
    tl.fromTo(
      chars,
      { opacity: 0, y: 20, filter: 'blur(4px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power4.out', stagger: 0.03 },
    );
    const titleEnd = tl.duration();
    tl.fromTo(
      '[data-login-sub]',
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power4.out' },
      titleEnd - 0.5,
    );
    tl.fromTo(
      '[data-login-avatars]',
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power4.out' },
      titleEnd - 0.4,
    );
    tl.fromTo(
      '[data-login-card]',
      { opacity: 0, y: 30, scale: 0.94, filter: 'blur(6px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1, ease: 'power4.out' },
      titleEnd - 0.42,
    );
    tl.fromTo(
      '[data-login-hint]',
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: 'power2.out' },
      titleEnd + 0.3,
    );
    return () => tl.kill();
  }, []);

  const shake = (el: HTMLElement | null) => {
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.killTweensOf(el);
    gsap.to(el, {
      keyframes: { x: [-6, 6, -5, 5, -3, 3, 0] },
      duration: 0.4,
      ease: 'sine.inOut',
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next: { email?: boolean; password?: boolean } = {};
    if (!EMAIL_RE.test(email)) next.email = true;
    if (password.length < 6) next.password = true;
    setErr(next);
    if (next.email) {
      shake(emailRef.current);
      return;
    }
    if (next.password) {
      shake(pwdRef.current);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    onLogin({
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    });
  };

  const fieldStyle = (bad?: boolean) => ({
    borderColor: bad ? 'var(--up)' : 'var(--border)',
    background: 'var(--surface)',
    color: 'var(--foreground)',
  });

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-screen w-full flex-col md:flex-row"
      style={{ cursor: busy ? 'progress' : undefined, background: 'var(--background)' }}
    >
      {/* 左下：品牌叙事 */}
      <div className="flex flex-1 flex-col justify-end items-start px-6 pb-8 pt-20 md:px-14 md:pb-16 md:pt-0">
        <h1
          className="font-display leading-[0.95]"
          style={{ fontSize: 'clamp(48px, 8vw, 92px)', color: 'var(--foreground)', fontWeight: 500 }}
        >
          <span className="block">
            <Chars text="Habitat" />
          </span>
          <span className="block">
            <Chars text="Quest" dim />
          </span>
        </h1>
        <p data-login-sub className="mt-4 text-[13px]" style={{ color: 'var(--muted)' }}>
          Game-based learning · 动物栖息地探索平台
        </p>
        <div data-login-avatars className="mt-5 flex items-center gap-3">
          <div className="flex items-center">
            {peers.map((s, i) => (
              <span key={s.id} style={{ marginLeft: i === 0 ? 0 : -10, display: 'inline-flex' }}>
                <AvatarShape name={s.name} idx={i % 5} size={34} />
              </span>
            ))}
          </div>
          <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
            本班 <b style={{ color: 'var(--foreground)' }}>{classStudents('三年级 A 班').length}</b> 位同学正在探索{' '}
            <b style={{ color: 'var(--foreground)' }}>6 大栖息地</b>
          </span>
        </div>
      </div>

      {/* 右侧：登录卡片 */}
      <div className="flex w-full items-center justify-center px-6 pb-12 md:w-[46%] md:pb-0">
        <div className="w-full max-w-[380px]">
          <div data-login-card className="hq-card p-6" style={{ boxShadow: 'var(--shadow-float)' }}>
            <div data-flip-logo className="mb-4 inline-flex h-11 w-11 items-center justify-center">
              <HexLogo size={40} />
            </div>

            <h2 className="text-[18px] font-semibold" style={{ color: 'var(--foreground)' }}>
              教师工作台
            </h2>
            <p className="mt-0.5 text-[12px]" style={{ color: 'var(--muted)' }}>
              Teacher Console
            </p>

            <form onSubmit={submit} className="mt-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div ref={emailRef}>
                <label className="mb-1.5 block text-[11.5px]" style={{ color: 'var(--muted)' }}>
                  邮箱
                </label>
                <div className="relative">
                  <Mail size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                  <input
                    type="email"
                    value={email}
                    disabled={busy}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErr((v) => ({ ...v, email: false }));
                    }}
                    placeholder="teacher@habitatquest.edu"
                    className="h-11 w-full rounded-xl border pl-9 pr-3 text-[13px] outline-none transition-colors disabled:opacity-60"
                    style={fieldStyle(err.email)}
                    aria-invalid={!!err.email}
                  />
                </div>
                {err.email && (
                  <span className="mt-1 block text-[11px]" style={{ color: 'var(--up)' }}>
                    请输入有效的邮箱地址
                  </span>
                )}
              </div>

              <div ref={pwdRef}>
                <label className="mb-1.5 block text-[11.5px]" style={{ color: 'var(--muted)' }}>
                  密码
                </label>
                <div className="relative">
                  <Lock size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    disabled={busy}
                    onFocus={() => onPasswordFocus(true)}
                    onBlur={() => onPasswordFocus(false)}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErr((v) => ({ ...v, password: false }));
                    }}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-xl border pl-9 pr-10 text-[13px] outline-none transition-colors disabled:opacity-60"
                    style={fieldStyle(err.password)}
                    aria-invalid={!!err.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? '隐藏密码' : '显示密码'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--muted)' }}
                  >
                    {showPwd ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                  </button>
                </div>
                {err.password && (
                  <span className="mt-1 block text-[11px]" style={{ color: 'var(--up)' }}>
                    密码至少 6 位
                  </span>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[11.5px]" style={{ color: 'var(--muted)' }}>
                  角色
                </label>
                <div
                  className="flex h-11 items-center gap-2 rounded-xl border px-3 text-[13px]"
                  style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--muted)' }}
                  aria-disabled
                >
                  <ShieldCheck size={15} strokeWidth={1.5} />
                  教师 · Teacher
                  <span className="ml-auto text-[11px]">固定</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--muted)' }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[var(--accent)]"
                  />
                  记住我
                </label>
                <button
                  type="button"
                  data-login-demo
                  onClick={() => {
                    setEmail(DEMO_ACCOUNT.email);
                    setPassword(DEMO_ACCOUNT.password);
                    setErr({});
                  }}
                  className="text-[11.5px] underline-offset-2 transition-opacity hover:underline hover:opacity-80"
                  style={{ color: 'var(--accent)' }}
                >
                  使用演示账号
                </button>
              </div>

              <button
                ref={buttonRef}
                data-login-submit
                type="submit"
                disabled={busy}
                className="relative mt-1 inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-[13.5px] font-medium text-white transition-all duration-300 disabled:cursor-progress"
                style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-card-hover)' }}
              >
                <span data-login-cta>{busy ? '正在进入…' : '以演示身份登录'}</span>
                <ArrowRight size={15} strokeWidth={1.5} />
                <span
                  data-login-shimmer
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.42) 50%, transparent 65%)',
                    transform: 'translateX(-120%)',
                    opacity: 0,
                  }}
                />
              </button>
            </form>
          </div>

          <p data-login-hint className="mt-3 text-center text-[11px]" style={{ color: 'var(--muted)' }}>
            演示账号 <b className="tnum" style={{ color: 'var(--foreground)' }}>{DEMO_ACCOUNT.email}</b> /{' '}
            <b className="tnum" style={{ color: 'var(--foreground)' }}>{DEMO_ACCOUNT.password}</b>
            <span className="mt-0.5 block">无真实鉴权 · 也可自行输入任意邮箱 + 6 位以上密码</span>
          </p>
        </div>
      </div>
    </div>
  );
}

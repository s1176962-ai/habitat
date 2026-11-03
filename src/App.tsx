import { useCallback, useRef, useState } from 'react';
import ShapeTrailCanvas from './components/ShapeTrailCanvas';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import { ClipPathDefs } from './components/AvatarShape';
import { useTheme } from './lib/useTheme';
import type { ShapeTrailEngine } from './lib/shapeTrail/engine';
import { usePageTransition, type Stage } from './transition/usePageTransition';

export default function App() {
  const engineRef = useRef<ShapeTrailEngine | null>(null);
  const { theme, toggle } = useTheme();
  const [stage, setStage] = useState<Stage>('login');
  const [skeleton, setSkeleton] = useState(false);

  const { play, logout, busy } = usePageTransition({ engineRef, setStage, setSkeleton });

  const onPasswordFocus = useCallback((focused: boolean) => {
    engineRef.current?.setSpawnBoost(focused ? 1.7 : 1);
  }, []);

  return (
    <>
      <ClipPathDefs />

      {/* 形状粒子层：常驻挂载、永不卸载 —— 两页连续动效的技术前提 */}
      <ShapeTrailCanvas
        engineRef={engineRef}
        zIndex={stage === 'dashboard' ? 20 : 1}
        interactive={stage !== 'dashboard'}
      />

      {/* 页面一：登录 */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          pointerEvents: stage === 'dashboard' ? 'none' : 'auto',
          overflowY: 'auto',
          background: 'var(--background)',
        }}
        aria-hidden={stage === 'dashboard'}
      >
        <LoginPage
          onLogin={play}
          onPasswordFocus={onPasswordFocus}
          busy={busy || stage === 'transition'}
        />
        {stage !== 'dashboard' && (
          <span
            className="fixed right-4 top-4 z-50 rounded-full border px-2.5 py-1 text-[10.5px]"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--muted)',
              background: 'color-mix(in srgb, var(--surface) 80%, transparent)',
              backdropFilter: 'blur(6px)',
            }}
            title="本界面为课程项目原型"
          >
            演示原型 · Demo
          </span>
        )}
      </div>

      {/* 页面二：工作台（由 clip-path 圆形揭示，不卸载） */}
      <div
        data-dashboard
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 15,
          overflowY: 'auto',
          overflowX: 'hidden',
          background: 'var(--background)',
          clipPath: 'circle(0% at 50% 50%)',
          // 由 stage 驱动：转场中与登录态都不拦截指针，避免遮住登录页
          pointerEvents: stage === 'dashboard' ? 'auto' : 'none',
        }}
        aria-hidden={stage === 'login'}
      >
        <DashboardPage
          theme={theme}
          onToggleTheme={toggle}
          onLogout={logout}
          skeleton={skeleton}
        />
      </div>
    </>
  );
}

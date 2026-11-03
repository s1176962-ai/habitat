import { useEffect, type MutableRefObject } from 'react';
import { ShapeTrailEngine } from './shapeTrail/engine';

/**
 * 把 ShapeTrailEngine 挂到 canvas 上。
 * engine 实例通过 ref 暴露给上层（转场时间线需要调用 burst / converge / release）。
 */
export function useShapeTrail(
  canvasRef: MutableRefObject<HTMLCanvasElement | null>,
  engineRef: MutableRefObject<ShapeTrailEngine | null>,
  options?: { autoStart?: boolean },
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new ShapeTrailEngine(canvas);
    engineRef.current = engine;
    if (options?.autoStart !== false) engine.start();

    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

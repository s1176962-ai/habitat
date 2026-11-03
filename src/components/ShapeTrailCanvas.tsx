import { useRef, type MutableRefObject } from 'react';
import { ShapeTrailEngine } from '../lib/shapeTrail/engine';
import { useShapeTrail } from '../lib/useShapeTrail';

interface Props {
  engineRef: MutableRefObject<ShapeTrailEngine | null>;
  /** z-index：转场期间在 dashboard 层之下被"吞没"，工作台态浮在内容之上做低频背景 */
  zIndex: number;
  className?: string;
  interactive?: boolean;
}

/**
 * 全屏几何形状粒子层。
 * 必须在 App 里常驻挂载、永不卸载 —— 这是"两页用动效连接"能成立的技术前提。
 */
export default function ShapeTrailCanvas({ engineRef, zIndex, className, interactive = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useShapeTrail(canvasRef, engineRef);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex,
        pointerEvents: interactive ? 'auto' : 'none',
        display: 'block',
      }}
    />
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  sigmoid, relu, softplus, tanhActivation,
  sigmoidDerivative, reluDerivative, softplusDerivative, tanhDerivative,
} from '../algorithms/index';

type FnName = 'sigmoid' | 'relu' | 'softplus' | 'tanh';

const FN_MAP: Record<FnName, (x: number) => number> = {
  sigmoid, relu, softplus, tanh: tanhActivation,
};
const DERIV_MAP: Record<FnName, (x: number) => number> = {
  sigmoid: sigmoidDerivative, relu: reluDerivative,
  softplus: softplusDerivative, tanh: tanhDerivative,
};
const COLOR = '#10B981';
const DERIV_COLOR = '#F59E0B';
const W = 340, H = 180, MARGIN = { top: 16, right: 16, bottom: 28, left: 40 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;
const X_MIN = -4, X_MAX = 4, Y_MIN = -1.5, Y_MAX = 1.5;

function toSvgX(x: number) { return MARGIN.left + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_W; }
function toSvgY(y: number) {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, y));
  return MARGIN.top + (1 - (clamped - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H;
}

function buildPath(fn: (x: number) => number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 200; i++) {
    const x = X_MIN + (i / 200) * (X_MAX - X_MIN);
    const y = fn(x);
    pts.push(`${i === 0 ? 'M' : 'L'}${toSvgX(x).toFixed(2)},${toSvgY(y).toFixed(2)}`);
  }
  return pts.join(' ');
}

const STEPS: number[] = [];
for (let i = 0; i <= 160; i++) STEPS.push(X_MIN + (i / 160) * (X_MAX - X_MIN));

export default function ActivationFunctionViz() {
  const [fn, setFn] = useState<FnName>('sigmoid');
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stop = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setPlaying(false);
  }, []);

  const reset = useCallback(() => { stop(); setStepIdx(0); }, [stop]);

  useEffect(() => {
    if (!playing || prefersReduced) return;
    const framesPerStep = Math.max(1, Math.round(60 / speed));
    const tick = () => {
      frameRef.current++;
      if (frameRef.current >= framesPerStep) {
        frameRef.current = 0;
        setStepIdx((s) => {
          if (s >= STEPS.length - 1) { stop(); return s; }
          return s + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed, stop, prefersReduced]);

  const x = STEPS[stepIdx] ?? 0;
  const fVal = FN_MAP[fn](x);
  const dVal = DERIV_MAP[fn](x);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
    if (e.key === 'ArrowRight') setStepIdx((s) => Math.min(s + 8, STEPS.length - 1));
    if (e.key === 'ArrowLeft') setStepIdx((s) => Math.max(s - 8, 0));
    if (e.key === 'r' || e.key === 'R') reset();
  };

  const fnPath = buildPath(FN_MAP[fn]);
  const derivPath = buildPath(DERIV_MAP[fn]);
  const cx = toSvgX(x), cy = toSvgY(fVal), dcx = toSvgX(x), dcy = toSvgY(dVal);

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKey}
      aria-label="Activation Function Visualization"
      style={{ outline: 'none', fontFamily: 'var(--font-sans, system-ui)' }}
    >
      {/* Function selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['sigmoid', 'relu', 'softplus', 'tanh'] as FnName[]).map((f) => (
          <button key={f} onClick={() => { setFn(f); reset(); }}
            aria-label={`Show ${f} function`}
            aria-pressed={fn === f}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: fn === f ? COLOR : 'var(--surface-3, #242430)',
              color: fn === f ? '#fff' : '#9CA3AF', fontWeight: 600, fontSize: 14 }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* SVG plot */}
        <svg width={W} height={H} role="img" aria-label={`Plot of ${fn} and its derivative`}
          style={{ background: 'var(--surface-2, #1A1A24)', borderRadius: 12, flexShrink: 0 }}>
          {/* Grid lines */}
          <line x1={MARGIN.left} y1={toSvgY(0)} x2={W - MARGIN.right} y2={toSvgY(0)}
            stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          <line x1={toSvgX(0)} y1={MARGIN.top} x2={toSvgX(0)} y2={H - MARGIN.bottom}
            stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          {/* Axes labels */}
          {[-4,-2,0,2,4].map((v) => (
            <text key={v} x={toSvgX(v)} y={H - 4} textAnchor="middle"
              fill="#6B7280" fontSize={10}>{v}</text>
          ))}
          {/* Function curve */}
          <path d={fnPath} fill="none" stroke={COLOR} strokeWidth={2.5} />
          {/* Derivative curve */}
          {!prefersReduced && <path d={derivPath} fill="none" stroke={DERIV_COLOR} strokeWidth={1.5} strokeDasharray="4 2" />}
          {/* Current x marker */}
          {!prefersReduced && (
            <>
              <circle cx={cx} cy={cy} r={5} fill={COLOR} stroke="#fff" strokeWidth={1.5} />
              <circle cx={dcx} cy={dcy} r={4} fill={DERIV_COLOR} stroke="#fff" strokeWidth={1} />
              <line x1={cx} y1={MARGIN.top} x2={cx} y2={H - MARGIN.bottom}
                stroke="rgba(255,255,255,0.3)" strokeWidth={1} strokeDasharray="3 3" />
            </>
          )}
          {/* Legend */}
          <line x1={MARGIN.left} y1={12} x2={MARGIN.left + 20} y2={12} stroke={COLOR} strokeWidth={2} />
          <text x={MARGIN.left + 24} y={16} fill={COLOR} fontSize={11}>{fn}(x)</text>
          <line x1={MARGIN.left + 80} y1={12} x2={MARGIN.left + 100} y2={12} stroke={DERIV_COLOR} strokeWidth={1.5} strokeDasharray="4 2" />
          <text x={MARGIN.left + 104} y={16} fill={DERIV_COLOR} fontSize={11}>{fn}'(x)</text>
        </svg>

        {/* State panel */}
        <div role="region" aria-label="Current state"
          style={{ background: 'var(--surface-2, #1A1A24)', borderRadius: 12,
            padding: '16px', minWidth: 160, border: '1px solid var(--surface-border, rgba(255,255,255,0.08))' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>Current State</div>
          {[['x', x.toFixed(3)], [`${fn}(x)`, fVal.toFixed(4)], [`${fn}'(x)`, dVal.toFixed(4)]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
              <span style={{ color: '#9CA3AF', fontSize: 13 }}>{k}</span>
              <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, padding: '6px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', fontSize: 12, color: '#818CF8' }}>
            Solid: f(x) &nbsp;·&nbsp; Dashed: f'(x)
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause animation' : 'Play animation'}
          style={ctrlBtn(playing)}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => setStepIdx((s) => Math.max(s - 8, 0))}
          aria-label="Step backward"
          style={ctrlBtn(false)}>← Step</button>
        <button onClick={() => setStepIdx((s) => Math.min(s + 8, STEPS.length - 1))}
          aria-label="Step forward"
          style={ctrlBtn(false)}>Step →</button>
        <button onClick={reset} aria-label="Reset" style={ctrlBtn(false)}>↺ Reset</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF', fontSize: 13 }}>
          Speed
          <input type="range" min={0.5} max={3} step={0.5} value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="Animation speed" style={{ width: 80 }} />
          <span style={{ color: '#fff', minWidth: 28 }}>{speed}x</span>
        </label>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#4B5563' }}>
        Keyboard: Space=play/pause · ←/→=step · R=reset
      </div>
    </div>
  );
}

function ctrlBtn(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: active ? COLOR : 'var(--surface-3, #242430)',
    color: active ? '#fff' : '#D1D5DB', fontSize: 14,
  };
}

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  gradientDescent,
  type GradientDescentStep,
} from '../algorithms/index';
import { renderDisplayMath } from '../utils/mathUtils';

const INITIAL_X = 6.5;
const DEFAULT_STEP_SIZE = 0.05;
const MAX_ITER = 60;
const TOLERANCE = 0.001;

const X_MIN = -1;
const X_MAX = 7;
const SVG_W = 700;
const SVG_H = 220;
const PAD = { top: 16, right: 16, bottom: 32, left: 48 };

const f = (x: number) => (x - 3) ** 2 + 2 * Math.sin(5 * x);
const grad = (x: number) => 2 * (x - 3) + 10 * Math.cos(5 * x);

function toSvgX(x: number): number {
  return PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (SVG_W - PAD.left - PAD.right);
}
function toSvgY(y: number, yMin: number, yMax: number): number {
  return PAD.top + (1 - (y - yMin) / (yMax - yMin)) * (SVG_H - PAD.top - PAD.bottom);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#1A1A24' : '#242430',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px',
        color: disabled ? '#4B5563' : '#E5E7EB',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '16px',
        height: '36px',
        minWidth: '36px',
        padding: '0 10px',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ─── Curve data (static, depends only on domain) ─────────────────────────────

const CURVE_POINTS_N = 300;
const curveXs = Array.from({ length: CURVE_POINTS_N }, (_, i) =>
  X_MIN + (i / (CURVE_POINTS_N - 1)) * (X_MAX - X_MIN),
);
const curveYs = curveXs.map(f);
const CURVE_Y_MIN = Math.min(...curveYs) - 0.5;
const CURVE_Y_MAX = Math.max(...curveYs) + 0.5;

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GradientDescentViz(): JSX.Element {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [stepSize, setStepSize] = useState(DEFAULT_STEP_SIZE);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const steps = useMemo(
    () => gradientDescent(INITIAL_X, stepSize, MAX_ITER, TOLERANCE),
    [stepSize],
  );

  // Reset to step 0 when stepSize changes (recalculated)
  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
  }, [stepSize]);

  const totalSteps = steps.length;
  const clampedIndex = Math.min(stepIndex, totalSteps - 1);
  const step = steps[clampedIndex] as GradientDescentStep;

  // RAF-based playback
  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastTimeRef.current = 0;
    const interval = 1000 / speed;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      if (timestamp - lastTimeRef.current >= interval) {
        lastTimeRef.current = timestamp;
        setStepIndex(prev => {
          if (prev >= totalSteps - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [isPlaying, speed, totalSteps, prefersReducedMotion]);

  const handleReset = () => { setIsPlaying(false); setStepIndex(0); };
  const handleStepBack = () => { setIsPlaying(false); setStepIndex(p => Math.max(0, p - 1)); };
  const handlePlayPause = () => {
    if (clampedIndex >= totalSteps - 1) { setStepIndex(0); setIsPlaying(true); }
    else setIsPlaying(p => !p);
  };
  const handleStepForward = () => { setIsPlaying(false); setStepIndex(p => Math.min(totalSteps - 1, p + 1)); };

  const formulaHtml = renderDisplayMath(
    String.raw`x \leftarrow x - \alpha \nabla f(x)`,
  );

  // SVG curve path
  const curvePath = curveXs
    .map((x, i) => {
      const sx = toSvgX(x);
      const sy = toSvgY(curveYs[i]!, CURVE_Y_MIN, CURVE_Y_MAX);
      return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
    })
    .join(' ');

  // Current position SVG coords
  const cx = toSvgX(step.x);
  const cy = toSvgY(step.fx, CURVE_Y_MIN, CURVE_Y_MAX);

  // Tangent line endpoints (short segment in direction of -gradient)
  const tangentLen = 30;
  const gNorm = Math.sqrt(1 + step.gradient ** 2);
  const dx = tangentLen / gNorm;
  const dy = (step.gradient * tangentLen) / gNorm;
  const tx1 = cx - dx;
  const ty1 = cy + dy;
  const tx2 = cx + dx;
  const ty2 = cy - dy;

  // Trajectory dots (past positions)
  const trajectorySteps = steps.slice(0, clampedIndex + 1) as GradientDescentStep[];

  // Y-axis tick values
  const yTicks = Array.from({ length: 5 }, (_, i) =>
    CURVE_Y_MIN + (i / 4) * (CURVE_Y_MAX - CURVE_Y_MIN),
  );

  const statLabelStyle: React.CSSProperties = { fontSize: '12px', color: '#6B7280', marginBottom: '2px' };
  const statValueStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#E5E7EB', fontFamily: 'monospace' };

  return (
    <div style={{
      background: '#111118',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '780px',
      margin: '24px auto 0',
    }}>
      <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
        Gradient Descent (Continuous Spaces)
      </h3>
      <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '16px', lineHeight: 1.5 }}>
        Minimises{' '}
        <span style={{ color: '#E5E7EB', fontFamily: 'monospace' }}>f(x) = (x−3)² + 2·sin(5x)</span>{' '}
        by iteratively stepping opposite to the gradient. Adjust α to see how step size affects convergence.
      </p>

      <div
        aria-label="Formula: x gets x minus alpha times gradient of f(x)"
        dangerouslySetInnerHTML={{ __html: formulaHtml }}
        style={{ marginBottom: '16px', overflowX: 'auto' }}
      />

      {/* What-if: step size slider */}
      <div style={{
        padding: '12px 16px',
        background: '#0D1117',
        borderRadius: '10px',
        border: '1px solid rgba(99,102,241,0.3)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '13px', color: '#A78BFA', fontWeight: 600 }}>What-if: Step size α</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#D1D5DB' }}>
          <input
            type="range"
            min={0.001}
            max={0.2}
            step={0.001}
            value={stepSize}
            onChange={e => setStepSize(Number(e.target.value))}
            aria-label="Step size alpha"
            style={{ width: '120px' }}
          />
          α = {stepSize.toFixed(3)}
        </label>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>
          {stepSize < 0.02
            ? '⚠ Very small α → slow convergence'
            : stepSize > 0.12
            ? '⚠ Large α → may overshoot / oscillate'
            : '✓ Moderate α → stable convergence'}
        </span>
      </div>

      {/* SVG chart */}
      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          role="img"
          aria-label={`Gradient descent on f(x). Current position x=${step.x.toFixed(4)}, f(x)=${step.fx.toFixed(4)}`}
          style={{ display: 'block', minWidth: '320px' }}
        >
          {/* Grid lines */}
          {yTicks.map((yt, i) => {
            const sy = toSvgY(yt, CURVE_Y_MIN, CURVE_Y_MAX);
            return (
              <g key={i}>
                <line
                  x1={PAD.left} y1={sy}
                  x2={SVG_W - PAD.right} y2={sy}
                  stroke="rgba(255,255,255,0.06)" strokeWidth={1}
                />
                <text x={PAD.left - 6} y={sy + 4} textAnchor="end"
                  fill="#6B7280" fontSize={10}>{yt.toFixed(1)}</text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {[-1, 0, 1, 2, 3, 4, 5, 6, 7].map(xv => {
            const sx = toSvgX(xv);
            return (
              <text key={xv} x={sx} y={SVG_H - PAD.bottom + 14}
                textAnchor="middle" fill="#6B7280" fontSize={10}>{xv}</text>
            );
          })}

          {/* Zero line */}
          <line
            x1={PAD.left} y1={toSvgY(0, CURVE_Y_MIN, CURVE_Y_MAX)}
            x2={SVG_W - PAD.right} y2={toSvgY(0, CURVE_Y_MIN, CURVE_Y_MAX)}
            stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="4,4"
          />

          {/* Curve */}
          <path d={curvePath} fill="none" stroke="#3B82F6" strokeWidth={2} />

          {/* Trajectory dots */}
          {trajectorySteps.map((s, i) => {
            const tdx = toSvgX(s.x);
            const tdy = toSvgY(s.fx, CURVE_Y_MIN, CURVE_Y_MAX);
            return (
              <circle
                key={i}
                cx={tdx} cy={tdy} r={2.5}
                fill="rgba(99,102,241,0.5)"
              />
            );
          })}

          {/* Tangent line */}
          <line
            x1={tx1} y1={ty1} x2={tx2} y2={ty2}
            stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7}
          />

          {/* Current position */}
          <circle cx={cx} cy={cy} r={6} fill="#6366F1" stroke="white" strokeWidth={1.5} />
          <text x={cx + 10} y={cy - 6} fill="#E5E7EB" fontSize={11} fontWeight={600}>
            x={step.x.toFixed(3)}
          </text>
        </svg>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <ControlButton label="Reset" onClick={handleReset}>⏮</ControlButton>
        <ControlButton label="Step backward" onClick={handleStepBack} disabled={clampedIndex === 0}>◀</ControlButton>
        <ControlButton label={isPlaying ? 'Pause' : 'Play'} onClick={handlePlayPause}>
          {isPlaying ? '⏸' : '▶'}
        </ControlButton>
        <ControlButton label="Step forward" onClick={handleStepForward} disabled={clampedIndex >= totalSteps - 1}>▶|</ControlButton>
        <span style={{ color: '#6B7280', fontSize: '13px', marginLeft: '8px' }}>
          Step {clampedIndex + 1} / {totalSteps}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '13px', marginLeft: 'auto' }}>
          Speed
          <input
            type="range" min={0.5} max={6} step={0.5} value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            aria-label="Playback speed"
            style={{ width: '80px' }}
          />
          {speed}×
        </label>
      </div>

      {/* State inspection panel */}
      <div
        role="region"
        aria-label="State inspection panel"
        style={{
          marginTop: '8px',
          padding: '14px 16px',
          background: '#0A0A0F',
          borderRadius: '10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px',
        }}
      >
        <div>
          <div style={statLabelStyle}>Iteration</div>
          <div style={statValueStyle}>{step.iteration}</div>
        </div>
        <div>
          <div style={statLabelStyle}>x</div>
          <div style={statValueStyle}>{step.x.toFixed(4)}</div>
        </div>
        <div>
          <div style={statLabelStyle}>f(x)</div>
          <div style={statValueStyle}>{step.fx.toFixed(4)}</div>
        </div>
        <div>
          <div style={statLabelStyle}>Gradient ∇f(x)</div>
          <div style={{ ...statValueStyle, color: Math.abs(step.gradient) < TOLERANCE ? '#10B981' : '#F59E0B' }}>
            {step.gradient.toFixed(4)}
          </div>
        </div>
        <div>
          <div style={statLabelStyle}>Step size α</div>
          <div style={statValueStyle}>{stepSize.toFixed(3)}</div>
        </div>
      </div>

      {/* Action description */}
      <div style={{
        marginTop: '12px',
        padding: '10px 14px',
        background: '#0D1117',
        borderRadius: '8px',
        borderLeft: '3px solid #3B82F6',
        fontSize: '13px',
        color: '#D1D5DB',
        lineHeight: 1.5,
      }}>
        {step.action}
      </div>

      {/* What-if explanation */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        background: '#0D1117',
        borderRadius: '10px',
        fontSize: '13px',
        color: '#9CA3AF',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: '#A78BFA' }}>What-if analysis:</strong>{' '}
        With a <em>very small α</em> the agent takes tiny steps and converges slowly, potentially getting stuck far from
        the minimum. With a <em>large α</em> the agent may overshoot the minimum and oscillate or diverge entirely.
        A moderate α (≈ 0.05) balances convergence speed and stability for this landscape.
      </div>
    </div>
  );
}

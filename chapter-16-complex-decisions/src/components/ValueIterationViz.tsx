import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { buildGridMDP, valueIteration, ValueIterationStep } from '../algorithms/index';
import { renderDisplayMath, renderInlineMath, interpolateColor } from '../utils/mathUtils';

const CHAPTER_COLOR = '#EC4899';
const SURFACE2 = '#1A1A24';
const SURFACE3 = '#242430';
const BORDER = 'rgba(255,255,255,0.08)';

const cardStyle: React.CSSProperties = {
  background: '#111118',
  border: `1px solid ${BORDER}`,
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
};

const btnStyle = (active?: boolean): React.CSSProperties => ({
  background: active ? CHAPTER_COLOR : SURFACE3,
  color: active ? 'white' : '#9CA3AF',
  border: `1px solid ${BORDER}`,
  borderRadius: '8px',
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: '14px',
});

const ARROW: Record<string, string> = { Up: '↑', Down: '↓', Left: '←', Right: '→' };

function utilColor(u: number, minU: number, maxU: number): string {
  const range = maxU - minU;
  const t = range < 1e-9 ? 0.5 : (u - minU) / range;
  return interpolateColor('#EF4444', '#10B981', Math.max(0, Math.min(1, t)));
}

// States to track in convergence chart
const TRACKED_STATES = ['(1,3)', '(3,3)', '(1,1)', '(3,2)'];
const TRACKED_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EC4899'];

/** Simple SVG line chart for utility convergence. */
function ConvergenceChart({ steps, currentIdx }: {
  steps: ReadonlyArray<ValueIterationStep>;
  currentIdx: number;
}) {
  const W = 340;
  const H = 180;
  const PAD = { top: 16, right: 16, bottom: 32, left: 48 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  // Compute value ranges across all steps
  let minV = Infinity;
  let maxV = -Infinity;
  for (const s of steps) {
    for (const state of TRACKED_STATES) {
      const v = s.U.get(state) ?? 0;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }
  if (maxV - minV < 0.1) { maxV = minV + 0.1; }

  const xScale = (i: number) => PAD.left + (i / Math.max(1, steps.length - 1)) * iW;
  const yScale = (v: number) => PAD.top + iH - ((v - minV) / (maxV - minV)) * iH;

  const visSteps = steps.slice(0, currentIdx + 1);

  return (
    <svg width={W} height={H} role="img" aria-label="Utility convergence chart" style={{ display: 'block', maxWidth: '100%' }}>
      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + iH} stroke="#4B5563" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + iH} x2={PAD.left + iW} y2={PAD.top + iH} stroke="#4B5563" strokeWidth={1} />
      {/* Y labels */}
      {[minV, (minV + maxV) / 2, maxV].map((v, i) => (
        <text key={i} x={PAD.left - 4} y={yScale(v) + 4} fill="#9CA3AF" fontSize={10} textAnchor="end">
          {v.toFixed(2)}
        </text>
      ))}
      {/* X label */}
      <text x={PAD.left + iW / 2} y={H - 4} fill="#9CA3AF" fontSize={10} textAnchor="middle">Iteration</text>
      {/* Lines per tracked state */}
      {TRACKED_STATES.map((state, si) => {
        const pts = visSteps.map((s, i) => {
          const v = s.U.get(state) ?? 0;
          return `${xScale(i)},${yScale(v)}`;
        });
        return (
          <polyline
            key={state}
            points={pts.join(' ')}
            fill="none"
            stroke={TRACKED_COLORS[si]}
            strokeWidth={1.5}
          />
        );
      })}
      {/* Current step vertical line */}
      <line
        x1={xScale(currentIdx)} y1={PAD.top}
        x2={xScale(currentIdx)} y2={PAD.top + iH}
        stroke="white" strokeWidth={1} strokeDasharray="4,4" opacity={0.5}
      />
      {/* Legend */}
      {TRACKED_STATES.map((state, si) => (
        <g key={state}>
          <line
            x1={PAD.left + si * 78} y1={H - 2}
            x2={PAD.left + si * 78 + 12} y2={H - 2}
            stroke={TRACKED_COLORS[si]} strokeWidth={2}
          />
          <text x={PAD.left + si * 78 + 14} y={H - 1} fill={TRACKED_COLORS[si]} fontSize={9}>{state}</text>
        </g>
      ))}
    </svg>
  );
}

export default function ValueIterationViz() {
  const [gamma, setGamma] = useState(1.0);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const steps = useMemo<ReadonlyArray<ValueIterationStep>>(() => {
    const mdp = buildGridMDP(-0.04, gamma);
    return valueIteration(mdp, 0.001, 200);
  }, [gamma]);

  const step = steps[stepIdx] ?? steps[steps.length - 1]!;
  const allU = Array.from(step.U.values());
  const minU = Math.min(...allU);
  const maxU = Math.max(...allU);

  const reset = useCallback(() => {
    setPlaying(false);
    setStepIdx(0);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const play = useCallback(() => {
    if (prefersReducedMotion) { setStepIdx(steps.length - 1); return; }
    if (stepIdx >= steps.length - 1) setStepIdx(0);
    setPlaying(true);
  }, [prefersReducedMotion, stepIdx, steps.length]);

  useEffect(() => {
    if (!playing) return;
    const delay = 1000 / speed;
    const tick = (time: number) => {
      if (time - lastTimeRef.current >= delay) {
        lastTimeRef.current = time;
        setStepIdx(prev => {
          if (prev >= steps.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed, steps.length]);

  useEffect(() => { setStepIdx(0); setPlaying(false); }, [steps]);

  const NON_TERMINAL = ['(1,1)', '(2,1)', '(3,1)', '(4,1)', '(1,2)', '(3,2)', '(1,3)', '(2,3)', '(3,3)'];

  return (
    <div style={cardStyle} role="region" aria-label="Value Iteration visualization">
      <h2 style={{ color: CHAPTER_COLOR, fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        Value Iteration (§16.2.1)
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        Iteratively applies the Bellman update to all states until utility values converge, then extracts a greedy policy.
      </p>

      {/* Bellman update equation */}
      <div
        style={{ marginBottom: '16px', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{
          __html: renderDisplayMath(
            String.raw`U_{i+1}(s) \leftarrow \max_{a} \sum_{s'} P(s' \mid s,a)\!\left[R(s,a,s') + \gamma\, U_i(s')\right]`,
          ),
        }}
        aria-label="Bellman update equation"
      />

      {/* Gamma slider */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ color: '#E5E7EB', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span dangerouslySetInnerHTML={{ __html: renderInlineMath('\\gamma') }} /> = {gamma.toFixed(2)}
          <input
            type="range" min={0.1} max={1.0} step={0.01} value={gamma}
            onChange={e => setGamma(Number(e.target.value))}
            aria-label={`Discount gamma = ${gamma.toFixed(2)}`}
            style={{ accentColor: CHAPTER_COLOR, flex: 1, maxWidth: '200px' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '16px' }}>
        {/* Grid */}
        <div
          role="grid"
          aria-label="4x3 MDP grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 80px)', gridTemplateRows: 'repeat(3, 80px)', gap: '4px', flexShrink: 0 }}
        >
          {[3, 2, 1].map(row =>
            [1, 2, 3, 4].map(col => {
              const s = `(${col},${row})`;
              const isWall = s === '(2,2)';
              const isTermPos = s === '(4,3)';
              const isTermNeg = s === '(4,2)';
              const u = step.U.get(s);
              const action = step.policy.get(s);
              const bg = isWall ? SURFACE3
                : isTermPos ? '#10B981'
                : isTermNeg ? '#EF4444'
                : u != null ? utilColor(u, minU, maxU) : SURFACE2;
              return (
                <div
                  key={s}
                  role="gridcell"
                  aria-label={`${s}: ${isWall ? 'wall' : isTermPos ? 'terminal +1' : isTermNeg ? 'terminal -1' : `U=${u?.toFixed(3) ?? '?'}`}`}
                  style={{
                    background: bg,
                    border: `1px solid ${BORDER}`,
                    borderRadius: '8px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    backgroundImage: isWall ? 'repeating-linear-gradient(45deg, rgba(0,0,0,0.3) 0, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 8px)' : undefined,
                    color: isWall ? '#6B7280' : '#0A0A0F', fontWeight: 600, fontSize: '11px',
                  }}
                >
                  {isWall ? <span style={{ fontSize: '16px', color: '#6B7280' }}>■</span>
                    : isTermPos ? <><span style={{ fontSize: '18px' }}>+1</span><span style={{ fontSize: '9px' }}>{s}</span></>
                    : isTermNeg ? <><span style={{ fontSize: '18px' }}>-1</span><span style={{ fontSize: '9px' }}>{s}</span></>
                    : <><span style={{ fontSize: '20px', lineHeight: 1 }}>{action ? ARROW[action] : '?'}</span>
                        <span style={{ fontSize: '10px' }}>{u?.toFixed(3) ?? '?'}</span>
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>{s}</span></>}
                </div>
              );
            })
          )}
        </div>

        {/* State panel */}
        <div style={{ background: SURFACE2, borderRadius: '8px', padding: '16px', minWidth: '200px', flex: 1 }}>
          <div style={{ color: CHAPTER_COLOR, fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>State Panel</div>
          <div style={{ color: '#E5E7EB', fontSize: '12px', display: 'grid', gap: '4px', marginBottom: '10px' }}>
            <div>Iteration: {step.iteration}</div>
            <div>Delta (δ): {step.delta.toFixed(6)}</div>
            <div>Converged: {step.converged ? '✅ Yes' : '⏳ No'}</div>
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Utility values:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            {NON_TERMINAL.map(s => (
              <div key={s} style={{ color: '#E5E7EB', fontSize: '11px' }}>
                {s}: {(step.U.get(s) ?? 0).toFixed(3)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Convergence chart */}
      <div style={{ background: SURFACE2, borderRadius: '8px', padding: '16px', marginBottom: '16px', overflowX: 'auto' }}>
        <div style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>
          Utility convergence for selected states across iterations
        </div>
        <ConvergenceChart steps={steps} currentIdx={stepIdx} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        <button style={btnStyle(playing)} onClick={playing ? () => setPlaying(false) : play}
          aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button style={btnStyle()} onClick={() => setStepIdx(i => Math.max(0, i - 1))}
          disabled={stepIdx === 0} aria-label="Step backward">⏮ Back</button>
        <button style={btnStyle()} onClick={() => setStepIdx(i => Math.min(steps.length - 1, i + 1))}
          disabled={stepIdx >= steps.length - 1} aria-label="Step forward">Step ⏭</button>
        <button style={btnStyle()} onClick={reset} aria-label="Reset">↺ Reset</button>
        <label style={{ color: '#9CA3AF', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Speed:
          {([1, 2, 3, 4] as const).map(s => (
            <button key={s} style={{ ...btnStyle(speed === s), padding: '4px 10px' }}
              onClick={() => setSpeed(s)} aria-label={`Speed ${s}x`} aria-pressed={speed === s}>
              {s}×
            </button>
          ))}
        </label>
        <span style={{ color: '#6B7280', fontSize: '12px' }}>Step {stepIdx + 1} / {steps.length}</span>
      </div>
    </div>
  );
}

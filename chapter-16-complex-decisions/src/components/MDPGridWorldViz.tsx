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

/** Returns the color for a utility value normalized in [min, max]. */
function utilColor(u: number, minU: number, maxU: number): string {
  const range = maxU - minU;
  const t = range < 1e-9 ? 0.5 : (u - minU) / range;
  return interpolateColor('#EF4444', '#10B981', Math.max(0, Math.min(1, t)));
}

export default function MDPGridWorldViz() {
  const [r, setR] = useState(-0.04);
  const [gamma, setGamma] = useState(1.0);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const steps = useMemo<ReadonlyArray<ValueIterationStep>>(() => {
    const mdp = buildGridMDP(r, gamma);
    return valueIteration(mdp, 0.001, 200);
  }, [r, gamma]);

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

  // Reset stepIdx when steps change
  useEffect(() => { setStepIdx(0); setPlaying(false); }, [steps]);

  const hoveredInfo = hoveredCell ? (() => {
    const u = step.U.get(hoveredCell);
    const a = step.policy.get(hoveredCell);
    return { state: hoveredCell, utility: u?.toFixed(4) ?? '—', action: a ?? '—' };
  })() : null;

  return (
    <div style={cardStyle} role="region" aria-label="MDP Grid World visualization">
      <h2 style={{ color: CHAPTER_COLOR, fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        MDP Grid World (§16.1)
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
        The classic 4×3 grid-world MDP. Cells are colored by utility — red (low) to green (high) — and policy arrows show the optimal action.
      </p>

      {/* Bellman equation */}
      <div
        style={{ marginBottom: '16px', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{
          __html: renderDisplayMath(
            String.raw`U(s) = R(s) + \gamma \max_{a} \sum_{s'} P(s' \mid s,a)\, U(s')`,
          ),
        }}
        aria-label="Bellman equation"
      />

      {/* Parameter sliders */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '16px' }}>
        <label style={{ color: '#E5E7EB', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span>
            Step reward{' '}
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('r') }} /> = {r.toFixed(2)}
          </span>
          <input
            type="range" min={-1} max={0} step={0.01} value={r}
            onChange={e => setR(Number(e.target.value))}
            aria-label={`Step reward r = ${r.toFixed(2)}`}
            style={{ accentColor: CHAPTER_COLOR }}
          />
        </label>
        <label style={{ color: '#E5E7EB', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span>
            Discount{' '}
            <span dangerouslySetInnerHTML={{ __html: renderInlineMath('\\gamma') }} /> = {gamma.toFixed(2)}
          </span>
          <input
            type="range" min={0.1} max={1.0} step={0.01} value={gamma}
            onChange={e => setGamma(Number(e.target.value))}
            aria-label={`Discount gamma = ${gamma.toFixed(2)}`}
            style={{ accentColor: CHAPTER_COLOR }}
          />
        </label>
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div
          role="grid"
          aria-label="4x3 MDP grid world"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 80px)', gridTemplateRows: 'repeat(3, 80px)', gap: '4px' }}
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
              const isHovered = hoveredCell === s;

              return (
                <div
                  key={s}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${s}: ${isWall ? 'wall' : isTermPos ? 'terminal +1' : isTermNeg ? 'terminal -1' : `utility ${u?.toFixed(3) ?? '—'}, action ${action ?? '—'}`}`}
                  onMouseEnter={() => setHoveredCell(s)}
                  onMouseLeave={() => setHoveredCell(null)}
                  onFocus={() => setHoveredCell(s)}
                  onBlur={() => setHoveredCell(null)}
                  style={{
                    background: bg,
                    border: isHovered ? `2px solid white` : `1px solid ${BORDER}`,
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isWall ? 'default' : 'pointer',
                    backgroundImage: isWall ? 'repeating-linear-gradient(45deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 8px)' : undefined,
                    transition: 'border 0.1s',
                    position: 'relative',
                    fontSize: '11px',
                    color: isWall ? '#6B7280' : '#0A0A0F',
                    fontWeight: 600,
                  }}
                >
                  {isWall ? (
                    <span style={{ color: '#6B7280', fontSize: '16px' }}>■</span>
                  ) : isTermPos ? (
                    <>
                      <span style={{ fontSize: '18px' }}>+1</span>
                      <span style={{ fontSize: '10px', opacity: 0.8 }}>{s}</span>
                    </>
                  ) : isTermNeg ? (
                    <>
                      <span style={{ fontSize: '18px' }}>-1</span>
                      <span style={{ fontSize: '10px', opacity: 0.8 }}>{s}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '20px', lineHeight: 1 }}>{action ? ARROW[action] : '?'}</span>
                      <span style={{ fontSize: '10px' }}>{u?.toFixed(3) ?? '?'}</span>
                      <span style={{ fontSize: '9px', opacity: 0.7 }}>{s}</span>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* State inspection panel */}
        <div style={{ background: SURFACE2, borderRadius: '8px', padding: '16px', minWidth: '200px', flex: 1 }}>
          <div style={{ color: CHAPTER_COLOR, fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            State Panel
          </div>
          <div style={{ color: '#E5E7EB', fontSize: '13px', display: 'grid', gap: '6px' }}>
            <div>Step: {stepIdx + 1} / {steps.length}</div>
            <div>Iteration: {step.iteration}</div>
            <div>Delta (δ): {step.delta.toFixed(6)}</div>
            <div>Converged: {step.converged ? '✅ Yes' : '⏳ No'}</div>
          </div>
          {hoveredInfo && (
            <div style={{ marginTop: '12px', borderTop: `1px solid ${BORDER}`, paddingTop: '12px' }}>
              <div style={{ color: CHAPTER_COLOR, fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Hovered: {hoveredInfo.state}
              </div>
              <div style={{ color: '#E5E7EB', fontSize: '12px', display: 'grid', gap: '4px' }}>
                <div>Utility: {hoveredInfo.utility}</div>
                <div>Policy: {hoveredInfo.action !== '—' ? `${ARROW[hoveredInfo.action] ?? ''} ${hoveredInfo.action}` : '—'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        <button style={btnStyle(playing)} onClick={playing ? () => setPlaying(false) : play}
          aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button style={btnStyle()} onClick={() => setStepIdx(i => Math.max(0, i - 1))}
          disabled={stepIdx === 0} aria-label="Step backward">
          ⏮ Back
        </button>
        <button style={btnStyle()} onClick={() => setStepIdx(i => Math.min(steps.length - 1, i + 1))}
          disabled={stepIdx >= steps.length - 1} aria-label="Step forward">
          Step ⏭
        </button>
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
      </div>
    </div>
  );
}

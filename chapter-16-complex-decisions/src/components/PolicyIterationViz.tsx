import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { buildGridMDP, policyIteration, PolicyIterationStep } from '../algorithms/index';
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

const NON_TERMINAL = ['(1,1)', '(2,1)', '(3,1)', '(4,1)', '(1,2)', '(3,2)', '(1,3)', '(2,3)', '(3,3)'];

/** Mini grid for comparison panel */
function MiniGrid({ policy, label }: { policy: ReadonlyMap<string, string>; label: string }) {
  return (
    <div>
      <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '6px', textAlign: 'center' }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 40px)', gridTemplateRows: 'repeat(3, 40px)', gap: '2px' }}>
        {[3, 2, 1].map(row =>
          [1, 2, 3, 4].map(col => {
            const s = `(${col},${row})`;
            const isWall = s === '(2,2)';
            const isTermPos = s === '(4,3)';
            const isTermNeg = s === '(4,2)';
            const action = policy.get(s);
            return (
              <div
                key={s}
                style={{
                  background: isWall ? SURFACE3 : isTermPos ? '#10B981' : isTermNeg ? '#EF4444' : SURFACE2,
                  border: `1px solid ${BORDER}`,
                  borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isTermPos || isTermNeg ? '9px' : '14px',
                  color: isWall ? '#6B7280' : isTermPos || isTermNeg ? '#0A0A0F' : '#E5E7EB',
                  fontWeight: 600,
                  backgroundImage: isWall ? 'repeating-linear-gradient(45deg, rgba(0,0,0,0.3) 0, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 8px)' : undefined,
                }}
              >
                {isWall ? '' : isTermPos ? '+1' : isTermNeg ? '-1' : (action ? ARROW[action] ?? '?' : '?')}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function PolicyIterationViz() {
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

  const steps = useMemo<ReadonlyArray<PolicyIterationStep>>(() => {
    const mdp = buildGridMDP(-0.04, gamma);
    return policyIteration(mdp, 50);
  }, [gamma]);

  const step = steps[stepIdx] ?? steps[steps.length - 1]!;
  const prevStep = stepIdx > 0 ? steps[stepIdx - 1] : null;

  const allU = Array.from(step.U.values());
  const minU = Math.min(...allU);
  const maxU = Math.max(...allU);

  // Detect which states changed policy this step
  const changedStates = useMemo<Set<string>>(() => {
    if (!prevStep || step.phase !== 'improvement') return new Set();
    const changed = new Set<string>();
    for (const s of NON_TERMINAL) {
      if (prevStep.policy.get(s) !== step.policy.get(s)) changed.add(s);
    }
    return changed;
  }, [prevStep, step]);

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

  // Phase background tint
  const phaseBg = step.phase === 'evaluation'
    ? 'linear-gradient(135deg, #1E3A5F22, #111118)'
    : 'linear-gradient(135deg, #1A3A2A22, #111118)';
  const phaseColor = step.phase === 'evaluation' ? '#60A5FA' : '#34D399';

  return (
    <div
      style={{ ...cardStyle, backgroundImage: phaseBg, transition: 'background-image 0.4s' }}
      role="region"
      aria-label="Policy Iteration visualization"
    >
      <h2 style={{ color: CHAPTER_COLOR, fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        Policy Iteration (§16.2.2)
      </h2>
      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '12px' }}>
        Alternates between evaluating the current policy and improving it by acting greedily, until the policy stabilises.
      </p>

      {/* Phase badge */}
      <div style={{ marginBottom: '12px' }}>
        <span style={{
          background: `${phaseColor}22`, color: phaseColor,
          border: `1px solid ${phaseColor}44`,
          borderRadius: '999px', padding: '4px 14px', fontSize: '13px', fontWeight: 600,
        }} aria-live="polite">
          {step.phase === 'evaluation' ? '📊 Policy Evaluation' : '⚡ Policy Improvement'}
        </span>
        {step.phase === 'improvement' && !step.unchanged && changedStates.size > 0 && (
          <span style={{
            marginLeft: '8px', background: '#EC489922', color: '#EC4899',
            border: '1px solid #EC489944',
            borderRadius: '999px', padding: '4px 14px', fontSize: '12px',
          }}>
            {changedStates.size} state{changedStates.size > 1 ? 's' : ''} changed
          </span>
        )}
        {step.phase === 'improvement' && step.unchanged && (
          <span style={{
            marginLeft: '8px', background: '#34D39922', color: '#34D399',
            border: '1px solid #34D39944',
            borderRadius: '999px', padding: '4px 14px', fontSize: '12px',
          }}>
            ✅ Policy stable
          </span>
        )}
      </div>

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
        {/* Main grid */}
        <div
          role="grid"
          aria-label="4x3 policy grid"
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
              const changed = changedStates.has(s);
              const bg = isWall ? SURFACE3
                : isTermPos ? '#10B981'
                : isTermNeg ? '#EF4444'
                : u != null ? utilColor(u, minU, maxU) : SURFACE2;
              return (
                <div
                  key={s}
                  role="gridcell"
                  aria-label={`${s}: ${isWall ? 'wall' : isTermPos ? 'terminal +1' : isTermNeg ? 'terminal -1' : `policy ${action ?? '?'}, U=${u?.toFixed(3) ?? '?'}`}`}
                  style={{
                    background: bg,
                    border: changed ? '2px solid #EC4899' : `1px solid ${BORDER}`,
                    borderRadius: '8px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    backgroundImage: isWall ? 'repeating-linear-gradient(45deg, rgba(0,0,0,0.3) 0, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 8px)' : undefined,
                    color: isWall ? '#6B7280' : '#0A0A0F', fontWeight: 600, fontSize: '11px',
                    transition: 'border 0.2s',
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

        {/* Right panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '200px' }}>
          {/* State panel */}
          <div style={{ background: SURFACE2, borderRadius: '8px', padding: '16px' }}>
            <div style={{ color: CHAPTER_COLOR, fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>State Panel</div>
            <div style={{ color: '#E5E7EB', fontSize: '12px', display: 'grid', gap: '4px', marginBottom: '8px' }}>
              <div>Step: {stepIdx + 1} / {steps.length}</div>
              <div>Iteration: {step.iteration}</div>
              <div>Phase: <span style={{ color: phaseColor }}>{step.phase}</span></div>
              <div>Policy unchanged: {step.unchanged ? '✅ Yes' : '❌ No'}</div>
            </div>
            <div style={{ color: '#9CA3AF', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Utilities:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
              {NON_TERMINAL.map(s => (
                <div key={s} style={{ color: '#E5E7EB', fontSize: '11px' }}>
                  {s}: {(step.U.get(s) ?? 0).toFixed(3)}
                </div>
              ))}
            </div>
          </div>

          {/* Comparison panel */}
          {step.phase === 'improvement' && prevStep && (
            <div style={{ background: SURFACE2, borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>Policy comparison</div>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', flexWrap: 'wrap' }}>
                <MiniGrid policy={prevStep.policy} label="Before" />
                <MiniGrid policy={step.policy} label="After" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Policy evaluation equation */}
      <div
        style={{ marginBottom: '16px', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{
          __html: renderDisplayMath(
            String.raw`U_{i+1}(s) \leftarrow \sum_{s'} P(s' \mid s, \pi(s))\!\left[R(s,\pi(s),s') + \gamma\, U_i(s')\right]`,
          ),
        }}
        aria-label="Policy evaluation equation"
      />

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

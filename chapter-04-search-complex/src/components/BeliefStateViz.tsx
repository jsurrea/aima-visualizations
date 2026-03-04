import { useState, useEffect, useRef, useMemo } from 'react';
import {
  sensorlessSearch,
  type BeliefStateStep,
} from '../algorithms/index';

const INITIAL_BELIEF = [1, 2, 3, 4, 5, 6, 7, 8];

interface StateInfo {
  pos: 'L' | 'R';
  left: 'D' | 'C';
  right: 'D' | 'C';
  label: string;
}

const STATE_INFO: Record<number, StateInfo> = {
  1: { pos: 'L', left: 'D', right: 'D', label: 'L,D,D' },
  2: { pos: 'R', left: 'D', right: 'D', label: 'R,D,D' },
  3: { pos: 'L', left: 'D', right: 'C', label: 'L,D,C' },
  4: { pos: 'R', left: 'D', right: 'C', label: 'R,D,C' },
  5: { pos: 'L', left: 'C', right: 'D', label: 'L,C,D' },
  6: { pos: 'R', left: 'C', right: 'D', label: 'R,C,D' },
  7: { pos: 'L', left: 'C', right: 'C', label: 'L,C,C ✓' },
  8: { pos: 'R', left: 'C', right: 'C', label: 'R,C,C ✓' },
};

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

// ─── Vacuum state cell ───────────────────────────────────────────────────────

function BeliefCell({
  stateNum,
  inBelief,
  wasInPrev,
}: {
  stateNum: number;
  inBelief: boolean;
  wasInPrev: boolean;
}) {
  const info = STATE_INFO[stateNum];
  if (!info) return null;
  const isGoal = stateNum === 7 || stateNum === 8;

  const bg = inBelief ? '#1D3A6D' : '#0D1117';
  const border = inBelief
    ? `2px solid ${isGoal ? '#10B981' : '#3B82F6'}`
    : wasInPrev
    ? '1px dashed rgba(99,102,241,0.4)'
    : '1px solid rgba(255,255,255,0.06)';
  const opacity = inBelief ? 1 : 0.4;

  return (
    <div
      role="img"
      aria-label={`State ${stateNum}: ${info.label}${isGoal ? ' (goal)' : ''}${inBelief ? ' — in belief state' : ' — excluded'}`}
      style={{
        background: bg,
        border,
        borderRadius: '8px',
        padding: '8px 10px',
        opacity,
        transition: 'background 0.25s, opacity 0.25s, border 0.25s',
      }}
    >
      <div style={{ fontSize: '11px', color: inBelief ? '#9CA3AF' : '#4B5563', marginBottom: '4px' }}>
        State {stateNum}{isGoal ? ' 🎯' : ''}
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <div style={{
          width: '26px', height: '26px', borderRadius: '5px',
          background: info.pos === 'L' ? '#1E3A5F' : '#1A2E1A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', border: info.pos === 'L' ? '1px solid #3B82F6' : '1px solid #374151',
        }}>
          {info.pos === 'L' ? '🤖' : (info.left === 'D' ? '●' : '○')}
        </div>
        <div style={{
          width: '26px', height: '26px', borderRadius: '5px',
          background: info.pos === 'R' ? '#1E3A5F' : '#1A2E1A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', border: info.pos === 'R' ? '1px solid #3B82F6' : '1px solid #374151',
        }}>
          {info.pos === 'R' ? '🤖' : (info.right === 'D' ? '●' : '○')}
        </div>
      </div>
      <div style={{ fontSize: '10px', marginTop: '4px' }}>
        {info.pos === 'L'
          ? <span style={{ color: '#3B82F6' }}>L</span>
          : <span style={{ color: '#9CA3AF' }}>R</span>}
        {' '}[{info.left === 'D' ? <span style={{ color: '#D97706' }}>D</span> : <span style={{ color: '#10B981' }}>C</span>}
        ,{info.right === 'D' ? <span style={{ color: '#D97706' }}>D</span> : <span style={{ color: '#10B981' }}>C</span>}]
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function BeliefStateViz(): JSX.Element {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.5);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const { steps, plan } = useMemo(() => sensorlessSearch(INITIAL_BELIEF), []);

  // stepIndex represents the number of actions taken so far (0 = initial, 1 = after first action, etc.)
  // steps[i] records: beliefState (before action i+1), action, nextBeliefState (after action i+1)
  const totalSteps = steps.length;

  // Current belief state to display:
  // stepIndex=0 → initial; stepIndex=k → steps[k-1].nextBeliefState (result after k-th action)
  const currentBelief = useMemo((): ReadonlyArray<number> => {
    if (totalSteps === 0 || stepIndex === 0) return INITIAL_BELIEF;
    const s = steps[stepIndex - 1] as BeliefStateStep;
    return s.nextBeliefState;
  }, [stepIndex, steps, totalSteps]);

  // prevBelief: the belief state one action earlier (used to show which states were just removed)
  // stepIndex=0 → empty; stepIndex=1 → INITIAL_BELIEF; stepIndex=k → steps[k-2].nextBeliefState
  const prevBelief = useMemo((): ReadonlyArray<number> => {
    if (stepIndex === 0) return [];
    if (stepIndex === 1) return INITIAL_BELIEF;
    const s = steps[stepIndex - 2] as BeliefStateStep;
    return s.nextBeliefState;
  }, [stepIndex, steps]);

  const currentStep = totalSteps > 0 && stepIndex > 0
    ? (steps[stepIndex - 1] as BeliefStateStep)
    : null;

  const clampedIndex = Math.min(stepIndex, totalSteps);

  // RAF-based playback
  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    lastTimeRef.current = 0;
    const interval = 1000 / speed;
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      if (timestamp - lastTimeRef.current >= interval) {
        lastTimeRef.current = timestamp;
        setStepIndex(prev => {
          if (prev >= totalSteps) { setIsPlaying(false); return prev; }
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
    if (clampedIndex >= totalSteps) { setStepIndex(0); setIsPlaying(true); }
    else setIsPlaying(p => !p);
  };
  const handleStepForward = () => { setIsPlaying(false); setStepIndex(p => Math.min(totalSteps, p + 1)); };

  const beliefSet = useMemo(() => new Set(currentBelief), [currentBelief]);
  const prevBeliefSet = useMemo(() => new Set(prevBelief), [prevBelief]);

  const statLabelStyle: React.CSSProperties = { fontSize: '12px', color: '#6B7280', marginBottom: '2px' };
  const statValueStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#E5E7EB' };

  const isGoalBelief = currentBelief.every(s => s === 7 || s === 8);

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
        Belief-State Search (Sensorless / Conformant)
      </h3>
      <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '16px', lineHeight: 1.5 }}>
        With no sensors, the agent maintains a <strong style={{ color: '#E5E7EB' }}>belief state</strong> — the set of all
        possible world states it might be in. Actions are chosen to drive every possible state to a goal.
      </p>

      {/* Plan display */}
      {plan.length > 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 14px',
          background: '#0D1117',
          borderRadius: '8px',
          border: '1px solid rgba(16,185,129,0.3)',
        }}>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>Solution plan: </span>
          {plan.map((action, i) => (
            <span key={i}>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                background: i < stepIndex ? '#10B981' : '#1A1A24',
                color: i < stepIndex ? 'white' : '#6B7280',
                fontSize: '12px',
                fontWeight: 600,
                margin: '2px',
                transition: 'background 0.2s',
              }}>
                {action}
              </span>
              {i < plan.length - 1 && <span style={{ color: '#4B5563', fontSize: '12px' }}> →</span>}
            </span>
          ))}
        </div>
      )}

      {/* Vacuum world states grid */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
          Belief State: {'{'}
          <span style={{ color: '#3B82F6', fontWeight: 600 }}>{currentBelief.join(', ')}</span>
          {'}'}
          {isGoalBelief && <span style={{ color: '#10B981', marginLeft: '8px' }}>🎯 Goal reached!</span>}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
          gap: '8px',
        }}>
          {([1, 2, 3, 4, 5, 6, 7, 8] as const).map(s => (
            <BeliefCell
              key={s}
              stateNum={s}
              inBelief={beliefSet.has(s)}
              wasInPrev={prevBeliefSet.has(s)}
            />
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
          🔵 In belief state · grayed = excluded · dashed = was in previous belief state
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <ControlButton label="Reset" onClick={handleReset}>⏮</ControlButton>
        <ControlButton label="Step backward" onClick={handleStepBack} disabled={clampedIndex === 0}>◀</ControlButton>
        <ControlButton label={isPlaying ? 'Pause' : 'Play'} onClick={handlePlayPause}>
          {isPlaying ? '⏸' : '▶'}
        </ControlButton>
        <ControlButton label="Step forward" onClick={handleStepForward} disabled={clampedIndex >= totalSteps}>▶|</ControlButton>
        <span style={{ color: '#6B7280', fontSize: '13px', marginLeft: '8px' }}>
          Step {clampedIndex} / {totalSteps}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '13px', marginLeft: 'auto' }}>
          Speed
          <input
            type="range" min={0.5} max={4} step={0.5} value={speed}
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
          padding: '14px 16px',
          background: '#0A0A0F',
          borderRadius: '10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        <div>
          <div style={statLabelStyle}>Step</div>
          <div style={statValueStyle}>{clampedIndex} / {totalSteps}</div>
        </div>
        <div>
          <div style={statLabelStyle}>Belief State Size</div>
          <div style={{ ...statValueStyle, color: isGoalBelief ? '#10B981' : '#E5E7EB' }}>
            {currentBelief.length}
          </div>
        </div>
        {currentStep && (
          <>
            <div>
              <div style={statLabelStyle}>Action Applied</div>
              <div style={{ ...statValueStyle, color: '#6366F1' }}>{currentStep.action}</div>
            </div>
            <div>
              <div style={statLabelStyle}>Before → After</div>
              <div style={{ ...statValueStyle, fontSize: '12px' }}>
                {'{'}{currentStep.beliefState.join(',')}{'}'}
                {' → '}
                {'{'}{currentStep.nextBeliefState.join(',')}{'}'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Description */}
      <div style={{
        marginTop: '12px',
        padding: '10px 14px',
        background: '#0D1117',
        borderRadius: '8px',
        borderLeft: '3px solid #EC4899',
        fontSize: '13px',
        color: '#D1D5DB',
        lineHeight: 1.5,
      }}>
        {currentStep
          ? currentStep.description
          : `Initial belief state: all ${INITIAL_BELIEF.length} states possible. No observations available — the agent acts without knowing which state it's in.`}
      </div>
    </div>
  );
}

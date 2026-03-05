import { useState, useEffect, useRef, useMemo } from 'react';
import {
  andOrSearch,
  type AndOrSearchStep,
} from '../algorithms/index';

// State encoding:
//   1=[L,D,D]  2=[R,D,D]  3=[L,D,C]  4=[R,D,C]
//   5=[L,C,D]  6=[R,C,D]  7=[L,C,C]  8=[R,C,C] ← goals

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

function VacuumCell({
  stateNum,
  isActive,
  isPath,
}: {
  stateNum: number;
  isActive: boolean;
  isPath: boolean;
}) {
  const info = STATE_INFO[stateNum];
  if (!info) return null;
  const isGoal = stateNum === 7 || stateNum === 8;

  const bg = isActive
    ? '#1D3A6D'
    : isPath
    ? '#1A1A2E'
    : '#0D1117';
  const border = isActive
    ? '2px solid #3B82F6'
    : isGoal
    ? '1px solid #10B981'
    : '1px solid rgba(255,255,255,0.08)';

  return (
    <div
      role="img"
      aria-label={`State ${stateNum}: position=${info.pos}, left=${info.left}, right=${info.right}${isGoal ? ' (goal)' : ''}${isActive ? ' (active)' : ''}`}
      style={{
        background: bg,
        border,
        borderRadius: '8px',
        padding: '8px 10px',
        minWidth: '90px',
        transition: 'background 0.2s, border 0.2s',
      }}
    >
      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
        State {stateNum}{isGoal ? ' 🎯' : ''}
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {/* Robot icon in its room */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '5px',
          background: info.pos === 'L' ? '#1E3A5F' : '#1A2E1A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', border: info.pos === 'L' ? '1px solid #3B82F6' : '1px solid #374151',
        }}>
          {info.pos === 'L' ? '🤖' : (info.left === 'D' ? '●' : '○')}
        </div>
        <div style={{
          width: '28px', height: '28px', borderRadius: '5px',
          background: info.pos === 'R' ? '#1E3A5F' : '#1A2E1A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', border: info.pos === 'R' ? '1px solid #3B82F6' : '1px solid #374151',
        }}>
          {info.pos === 'R' ? '🤖' : (info.right === 'D' ? '●' : '○')}
        </div>
      </div>
      <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>
        [{info.left === 'D' ? <span style={{ color: '#D97706' }}>D</span> : <span style={{ color: '#10B981' }}>C</span>}
        ,{info.right === 'D' ? <span style={{ color: '#D97706' }}>D</span> : <span style={{ color: '#10B981' }}>C</span>}]
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AndOrSearchViz(): JSX.Element {
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

  const { steps } = useMemo(() => andOrSearch(1), []);
  const totalSteps = steps.length;
  const clampedIndex = Math.min(stepIndex, totalSteps - 1);
  const step = steps[clampedIndex] as AndOrSearchStep;

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

  // Collect visited states and path states up to current step
  const visitedStates = useMemo(() => {
    const v = new Set<number>();
    for (let i = 0; i <= clampedIndex; i++) {
      v.add((steps[i] as AndOrSearchStep).visiting);
    }
    return v;
  }, [clampedIndex, steps]);

  const pathStates = useMemo(
    () => new Set(step.path),
    [step],
  );

  // Build tree nodes to display (steps visited so far)
  const treeSteps = useMemo(
    () => steps.slice(0, clampedIndex + 1) as AndOrSearchStep[],
    [clampedIndex, steps],
  );

  const statLabelStyle: React.CSSProperties = { fontSize: '12px', color: '#6B7280', marginBottom: '2px' };
  const statValueStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#E5E7EB' };

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
        AND-OR Search — Erratic Vacuum World
      </h3>
      <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '16px', lineHeight: 1.5 }}>
        Builds a conditional plan for nondeterministic actions. <strong style={{ color: '#E5E7EB' }}>OR nodes</strong> choose
        an action; <strong style={{ color: '#F59E0B' }}>AND nodes</strong> must succeed for every possible outcome.
      </p>

      {/* Vacuum world states grid */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Vacuum World States</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '8px',
        }}>
          {([1, 2, 3, 4, 5, 6, 7, 8] as const).map(s => (
            <VacuumCell
              key={s}
              stateNum={s}
              isActive={step.visiting === s}
              isPath={pathStates.has(s)}
            />
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
          🤖 = robot position · ● = dirty · ○ = clean · 🎯 = goal state
        </div>
      </div>

      {/* Search tree (compact list) */}
      <div style={{
        marginBottom: '16px',
        padding: '12px 14px',
        background: '#0D1117',
        borderRadius: '10px',
        maxHeight: '180px',
        overflowY: 'auto',
      }}>
        <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Search Tree (exploration order)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {treeSteps.map((s, i) => {
            const isCurrentStep = i === clampedIndex;
            const indent = s.path.length * 12;
            return (
              <div
                key={i}
                style={{
                  paddingLeft: `${indent}px`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '18px',
                  borderRadius: s.nodeType === 'OR' ? '3px' : '50%',
                  background: isCurrentStep
                    ? '#3B82F6'
                    : s.nodeType === 'OR'
                    ? '#1D3A6D'
                    : '#2D1F5E',
                  border: `1px solid ${s.nodeType === 'OR' ? '#3B82F6' : '#8B5CF6'}`,
                  fontSize: '9px',
                  color: isCurrentStep ? 'white' : '#9CA3AF',
                  flexShrink: 0,
                }}>
                  {s.nodeType}
                </span>
                <span style={{ fontSize: '12px', color: isCurrentStep ? '#E5E7EB' : '#6B7280' }}>
                  State {s.visiting} — {STATE_INFO[s.visiting]?.label}
                </span>
              </div>
            );
          })}
        </div>
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px',
        }}
      >
        <div>
          <div style={statLabelStyle}>Step</div>
          <div style={statValueStyle}>{step.step}</div>
        </div>
        <div>
          <div style={statLabelStyle}>Visiting State</div>
          <div style={statValueStyle}>{step.visiting} — {STATE_INFO[step.visiting]?.label}</div>
        </div>
        <div>
          <div style={statLabelStyle}>Node Type</div>
          <div style={{
            ...statValueStyle,
            color: step.nodeType === 'OR' ? '#3B82F6' : '#A78BFA',
          }}>
            {step.nodeType}
          </div>
        </div>
        <div>
          <div style={statLabelStyle}>Path from Root</div>
          <div style={{ ...statValueStyle, fontSize: '12px' }}>
            {step.path.length > 0 ? step.path.join(' → ') : '(root)'}
          </div>
        </div>
        <div>
          <div style={statLabelStyle}>States Visited</div>
          <div style={statValueStyle}>{visitedStates.size}</div>
        </div>
      </div>

      {/* Action description */}
      <div style={{
        marginTop: '12px',
        padding: '10px 14px',
        background: '#0D1117',
        borderRadius: '8px',
        borderLeft: `3px solid ${step.nodeType === 'OR' ? '#3B82F6' : '#A78BFA'}`,
        fontSize: '13px',
        color: '#D1D5DB',
        lineHeight: 1.5,
      }}>
        {step.action}
      </div>
    </div>
  );
}

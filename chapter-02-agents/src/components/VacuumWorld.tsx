import { useState, useEffect, useRef } from 'react';
import {
  simulateVacuumWorld,
  type VacuumWorldState,
  type VacuumStep,
  type AgentPosition,
  type RoomStatus,
} from '../algorithms/index';

/** Delay between auto-advance steps during playback (milliseconds). */
const STEP_INTERVAL_MS = 800;

// All 8 possible initial states
const INITIAL_STATES: Array<{ label: string; state: VacuumWorldState }> = [
  { label: 'Left | Clean | Clean', state: { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'clean' } },
  { label: 'Left | Clean | Dirty', state: { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'dirty' } },
  { label: 'Left | Dirty | Clean', state: { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'clean' } },
  { label: 'Left | Dirty | Dirty', state: { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'dirty' } },
  { label: 'Right | Clean | Clean', state: { agentPosition: 'Right', leftRoom: 'clean', rightRoom: 'clean' } },
  { label: 'Right | Clean | Dirty', state: { agentPosition: 'Right', leftRoom: 'clean', rightRoom: 'dirty' } },
  { label: 'Right | Dirty | Clean', state: { agentPosition: 'Right', leftRoom: 'dirty', rightRoom: 'clean' } },
  { label: 'Right | Dirty | Dirty', state: { agentPosition: 'Right', leftRoom: 'dirty', rightRoom: 'dirty' } },
];

const ACTION_LABELS: Record<string, string> = {
  Suck: '🌀 Suck',
  MoveLeft: '← Move Left',
  MoveRight: '→ Move Right',
  NoOp: '✓ No-Op',
};

function DirtParticles() {
  return (
    <div aria-hidden="true" style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '6px' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#92400E',
            opacity: 0.7 - i * 0.08,
          }}
        />
      ))}
    </div>
  );
}

function RoomBox({
  label,
  status,
  hasAgent,
  agentAnimating,
}: {
  label: string;
  status: RoomStatus;
  hasAgent: boolean;
  agentAnimating: boolean;
}) {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      aria-label={`${label} room — ${status}`}
      style={{
        flex: 1,
        minHeight: '140px',
        borderRadius: '10px',
        border: `2px solid ${status === 'dirty' ? '#92400E' : 'rgba(255,255,255,0.1)'}`,
        background: status === 'dirty' ? 'rgba(146,64,14,0.1)' : '#1A1A24',
        padding: '16px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        transition: prefersReduced ? 'none' : 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: '14px',
          color: '#9CA3AF',
          marginBottom: '4px',
        }}
      >
        {label} Room
      </div>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: status === 'dirty' ? '#F59E0B' : '#10B981',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {status}
      </div>
      {status === 'dirty' && <DirtParticles />}

      {/* Agent icon */}
      {hasAgent && (
        <div
          aria-label="Vacuum agent"
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(99,102,241,0.2)',
            border: '2px solid #6366F1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            transition: prefersReduced ? 'none' : (agentAnimating ? 'transform 0.3s ease' : 'none'),
            transform: agentAnimating && !prefersReduced ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          🤖
        </div>
      )}
    </div>
  );
}

// Default initial state index
const DEFAULT_STATE_IDX = 3;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const DEFAULT_STATE = INITIAL_STATES[DEFAULT_STATE_IDX]!;

export default function VacuumWorld() {
  const [initialStateIdx, setInitialStateIdx] = useState(DEFAULT_STATE_IDX);
  const [steps, setSteps] = useState<ReadonlyArray<VacuumStep>>(() =>
    simulateVacuumWorld(DEFAULT_STATE.state),
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [agentAnimating, setAgentAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recompute simulation when initial state changes
  function applyInitialState(idx: number) {
    const entry = INITIAL_STATES[idx];
    if (!entry) return;
    setInitialStateIdx(idx);
    const newSteps = simulateVacuumWorld(entry.state);
    setSteps(newSteps);
    setCurrentStep(0);
    setIsPlaying(false);
  }

  function stepTo(idx: number) {
    if (idx < 0 || idx >= steps.length) return;
    const prev = steps[currentStep];
    const next = steps[idx];
    if (prev && next && prev.state.agentPosition !== next.state.agentPosition) {
      setAgentAnimating(true);
      setTimeout(() => setAgentAnimating(false), 350);
    }
    setCurrentStep(idx);
  }

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          const s1 = steps[prev];
          const s2 = steps[next];
          if (s1 && s2 && s1.state.agentPosition !== s2.state.agentPosition) {
            setAgentAnimating(true);
            setTimeout(() => setAgentAnimating(false), 350);
          }
          return next;
        });
      }, STEP_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, steps]);

  const step = steps[currentStep] ?? steps[0]!;
  const isAtEnd = currentStep >= steps.length - 1;

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
        The <strong style={{ color: '#E5E7EB' }}>simple-reflex vacuum agent</strong> operates in a
        two-room world. Each room may be clean or dirty. The agent sucks if the current room is dirty,
        moves if the other room is dirty, or does nothing if both are clean.
      </p>

      {/* Initial state picker */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <label
          htmlFor="initial-state-select"
          style={{ color: '#9CA3AF', fontSize: '14px', whiteSpace: 'nowrap' }}
        >
          Initial state:
        </label>
        <select
          id="initial-state-select"
          value={initialStateIdx}
          onChange={(e) => applyInitialState(Number(e.target.value))}
          aria-label="Select initial world state"
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: '#1A1A24',
            color: '#E5E7EB',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {INITIAL_STATES.map((s, idx) => (
            <option key={idx} value={idx}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* World visualization */}
      <div
        style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}
        aria-live="polite"
        aria-label="Vacuum world state"
      >
        <RoomBox
          label="Left"
          status={step.state.leftRoom}
          hasAgent={step.state.agentPosition === 'Left'}
          agentAnimating={agentAnimating}
        />
        <RoomBox
          label="Right"
          status={step.state.rightRoom}
          hasAgent={step.state.agentPosition === 'Right'}
          agentAnimating={agentAnimating}
        />
      </div>

      {/* Step info panel */}
      <div
        style={{
          background: '#111118',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '16px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
            Step {currentStep + 1} / {steps.length}
          </div>
          <div style={{ fontWeight: 600, color: '#A5B4FC', fontSize: '16px', marginBottom: '4px' }}>
            {ACTION_LABELS[step.action]}
          </div>
          <div style={{ color: '#E5E7EB', fontSize: '14px' }}>{step.description}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Score
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: step.score >= 0 ? '#10B981' : '#EF4444',
            }}
          >
            {step.score >= 0 ? '+' : ''}{step.score}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}
        role="group"
        aria-label="Playback controls"
      >
        <button
          onClick={() => stepTo(currentStep - 1)}
          disabled={currentStep === 0}
          aria-label="Step backward"
          style={controlBtnStyle(currentStep === 0)}
        >
          ⏮ Back
        </button>

        <button
          onClick={() => {
            if (isAtEnd) {
              setCurrentStep(0);
              setIsPlaying(true);
            } else {
              setIsPlaying((p) => !p);
            }
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={controlBtnStyle(false, true)}
        >
          {isPlaying ? '⏸ Pause' : isAtEnd ? '↺ Replay' : '▶ Play'}
        </button>

        <button
          onClick={() => stepTo(currentStep + 1)}
          disabled={isAtEnd}
          aria-label="Step forward"
          style={controlBtnStyle(isAtEnd)}
        >
          Next ⏭
        </button>

        <button
          onClick={() => applyInitialState(initialStateIdx)}
          aria-label="Reset simulation"
          style={controlBtnStyle(false)}
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}

function controlBtnStyle(disabled: boolean, primary = false): React.CSSProperties {
  return {
    padding: '9px 18px',
    borderRadius: '8px',
    border: `1px solid ${primary ? '#6366F1' : 'rgba(255,255,255,0.1)'}`,
    background: primary ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
    color: disabled ? '#4B5563' : primary ? '#A5B4FC' : '#E5E7EB',
    fontSize: '13px',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease',
  };
}

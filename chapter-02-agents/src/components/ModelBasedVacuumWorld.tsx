import { useState, useEffect, useRef } from 'react';
import {
  simulateModelBasedVacuumAgent,
  simulateVacuumWorld,
  type VacuumWorldState,
  type VacuumStep,
  type ModelBasedStep,
  type BeliefStatus,
  type RoomStatus,
} from '../algorithms/index';

const INITIAL_STATES: Array<{ label: string; state: VacuumWorldState }> = [
  { label: 'Left | Dirty | Dirty', state: { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'dirty' } },
  { label: 'Left | Clean | Dirty', state: { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'dirty' } },
  { label: 'Left | Dirty | Clean', state: { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'clean' } },
  { label: 'Left | Clean | Clean', state: { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'clean' } },
  { label: 'Right | Dirty | Dirty', state: { agentPosition: 'Right', leftRoom: 'dirty', rightRoom: 'dirty' } },
  { label: 'Right | Clean | Dirty', state: { agentPosition: 'Right', leftRoom: 'clean', rightRoom: 'dirty' } },
  { label: 'Right | Dirty | Clean', state: { agentPosition: 'Right', leftRoom: 'dirty', rightRoom: 'clean' } },
  { label: 'Right | Clean | Clean', state: { agentPosition: 'Right', leftRoom: 'clean', rightRoom: 'clean' } },
];

const STEP_INTERVAL_MS = 900;

const ACTION_LABELS: Record<string, string> = {
  Suck: '🌀 Suck',
  MoveLeft: '← Move Left',
  MoveRight: '→ Move Right',
  NoOp: '✓ No-Op',
};

const BELIEF_COLORS: Record<BeliefStatus, string> = {
  clean: '#10B981',
  dirty: '#F59E0B',
  unknown: '#6B7280',
};

function BeliefBadge({ belief }: { belief: BeliefStatus }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 9px',
        borderRadius: '5px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        background: `${BELIEF_COLORS[belief]}22`,
        border: `1px solid ${BELIEF_COLORS[belief]}66`,
        color: BELIEF_COLORS[belief],
      }}
    >
      {belief}
    </span>
  );
}

function RoomBox({
  label,
  status,
  hasAgent,
  belief,
}: {
  label: string;
  status: RoomStatus;
  hasAgent: boolean;
  belief?: BeliefStatus;
}) {
  return (
    <div
      aria-label={`${label} room — actual: ${status}${belief ? `, believed: ${belief}` : ''}${hasAgent ? ', agent here' : ''}`}
      style={{
        flex: 1,
        minHeight: '130px',
        borderRadius: '10px',
        border: `2px solid ${status === 'dirty' ? '#92400E' : 'rgba(255,255,255,0.1)'}`,
        background: status === 'dirty' ? 'rgba(146,64,14,0.1)' : '#1A1A24',
        padding: '14px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '13px', color: '#9CA3AF' }}>
        {label} Room
      </div>
      <div>
        <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '3px' }}>Actual</div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: status === 'dirty' ? '#F59E0B' : '#10B981',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {status}
        </span>
      </div>
      {belief !== undefined && (
        <div>
          <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '3px' }}>
            Agent believes
          </div>
          <BeliefBadge belief={belief} />
        </div>
      )}
      {hasAgent && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(99,102,241,0.2)',
            border: '2px solid #6366F1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          🤖
        </div>
      )}
    </div>
  );
}

function controlBtnStyle(disabled: boolean, primary = false): React.CSSProperties {
  return {
    padding: '8px 16px',
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

type Mode = 'simple' | 'model-based';

export default function ModelBasedVacuumWorld() {
  const [mode, setMode] = useState<Mode>('model-based');
  const [initIdx, setInitIdx] = useState(0);
  const [steps, setSteps] = useState<ReadonlyArray<ModelBasedStep | VacuumStep>>(() =>
    simulateModelBasedVacuumAgent(INITIAL_STATES[0]!.state),
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function applyConfig(m: Mode, idx: number) {
    const entry = INITIAL_STATES[idx];
    if (!entry) return;
    setMode(m);
    setInitIdx(idx);
    const newSteps =
      m === 'model-based'
        ? simulateModelBasedVacuumAgent(entry.state)
        : simulateVacuumWorld(entry.state);
    setSteps(newSteps);
    setCurrentStep(0);
    setIsPlaying(false);
  }

  function stepTo(idx: number) {
    if (idx < 0 || idx >= steps.length) return;
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
          return prev + 1;
        });
      }, STEP_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, steps]);

  const isAtEnd = currentStep >= steps.length - 1;
  const isModelBased = mode === 'model-based';

  // Type-narrow the current step
  const mbStep = isModelBased ? (steps[currentStep] as ModelBasedStep | undefined) : undefined;
  const srStep = !isModelBased ? (steps[currentStep] as VacuumStep | undefined) : undefined;

  const currentAction = mbStep?.action ?? srStep?.action ?? 'NoOp';
  const currentDescription = mbStep?.description ?? srStep?.description ?? '';
  const currentScore = mbStep?.score ?? srStep?.score ?? 0;
  const worldState = mbStep?.worldState ?? srStep?.state;

  return (
    <div>
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, marginBottom: '8px' }}>
        The <strong style={{ color: '#E5E7EB' }}>model-based reflex agent</strong> (§2.4.3) maintains
        an internal belief about the state of both rooms. Unlike the simple reflex agent, it{' '}
        <em>remembers</em> what it has seen and doesn't oscillate once it knows both rooms are clean.
      </p>
      <p style={{ color: '#6B7280', fontSize: '13px', marginBottom: '20px', lineHeight: 1.5 }}>
        Watch the <strong style={{ color: '#A5B4FC' }}>Agent Believes</strong> badges update as
        the agent explores — and compare with the simple reflex agent which has no internal model.
      </p>

      {/* Mode toggle + initial state */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        <div
          role="group"
          aria-label="Agent type"
          style={{ display: 'flex', gap: '6px' }}
        >
          {(['model-based', 'simple'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => applyConfig(m, initIdx)}
              aria-pressed={mode === m}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1px solid ${mode === m ? '#6366F1' : 'rgba(255,255,255,0.1)'}`,
                background: mode === m ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                color: mode === m ? '#A5B4FC' : '#9CA3AF',
                fontSize: '13px',
                fontWeight: mode === m ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {m === 'model-based' ? '🧠 Model-Based' : '⚡ Simple Reflex'}
            </button>
          ))}
        </div>

        <select
          value={initIdx}
          onChange={(e) => applyConfig(mode, Number(e.target.value))}
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
        aria-live="polite"
        aria-label="Vacuum world state"
        style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}
      >
        {worldState && (
          <>
            <RoomBox
              label="Left"
              status={worldState.leftRoom}
              hasAgent={worldState.agentPosition === 'Left'}
              {...(isModelBased && mbStep ? { belief: mbStep.belief.leftBelief } : {})}
            />
            <RoomBox
              label="Right"
              status={worldState.rightRoom}
              hasAgent={worldState.agentPosition === 'Right'}
              {...(isModelBased && mbStep ? { belief: mbStep.belief.rightBelief } : {})}
            />
          </>
        )}
      </div>

      {/* Step info */}
      <div
        style={{
          background: '#111118',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '3px' }}>
            Step {currentStep + 1} / {steps.length}
          </div>
          <div style={{ fontWeight: 600, color: '#A5B4FC', fontSize: '15px', marginBottom: '3px' }}>
            {ACTION_LABELS[currentAction]}
          </div>
          <div style={{ color: '#E5E7EB', fontSize: '13px', lineHeight: 1.5 }}>
            {currentDescription}
          </div>
          {isModelBased && mbStep && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                Percept:{' '}
                <code
                  style={{
                    background: '#1A1A24',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    color: '#A5B4FC',
                    fontSize: '12px',
                  }}
                >
                  {mbStep.percept}
                </code>
              </span>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                Belief: L=<BeliefBadge belief={mbStep.belief.leftBelief} /> R=
                <BeliefBadge belief={mbStep.belief.rightBelief} />
              </span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '10px',
              color: '#6B7280',
              marginBottom: '2px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Score
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: currentScore >= 0 ? '#10B981' : '#EF4444',
            }}
          >
            {currentScore >= 0 ? '+' : ''}
            {currentScore}
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div
        style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
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
          onClick={() => applyConfig(mode, initIdx)}
          aria-label="Reset simulation"
          style={controlBtnStyle(false)}
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}

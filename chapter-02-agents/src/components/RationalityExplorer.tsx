import { useState, useEffect, useRef } from 'react';
import {
  simulateWithScoringRule,
  type ScoringRule,
  type RationalityStep,
  type VacuumWorldState,
  type AgentPosition,
  type RoomStatus,
} from '../algorithms/index';

const SCORING_OPTIONS: Array<{
  id: ScoringRule;
  label: string;
  formula: string;
  colour: string;
  warning?: string;
}> = [
  {
    id: 'clean-squares',
    label: '+1 per clean room per step',
    formula: 'score += #{clean rooms}',
    colour: '#10B981',
  },
  {
    id: 'dirt-cleaned',
    label: '+10 per Suck action',
    formula: 'score += 10 × #{Suck actions}',
    colour: '#EF4444',
    warning:
      '⚠ Perverse incentive: a rational agent maximises Suck events — it will clean a room just to immediately re-dirty it and suck again. This is the "King Midas" problem.',
  },
  {
    id: 'actions-minimised',
    label: '−1 per action taken',
    formula: 'score −= 1 per action',
    colour: '#F59E0B',
    warning:
      '⚠ Misaligned measure: a rational agent maximises score by doing nothing — even when dirt is accumulating everywhere.',
  },
];

const INITIAL_STATES: Array<{ label: string; state: VacuumWorldState }> = [
  { label: 'Left | Dirty | Dirty', state: { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'dirty' } },
  { label: 'Left | Clean | Dirty', state: { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'dirty' } },
  { label: 'Left | Dirty | Clean', state: { agentPosition: 'Left', leftRoom: 'dirty', rightRoom: 'clean' } },
  { label: 'Left | Clean | Clean', state: { agentPosition: 'Left', leftRoom: 'clean', rightRoom: 'clean' } },
];

const STEP_INTERVAL_MS = 900;

const ACTION_LABELS: Record<string, string> = {
  Suck: '🌀 Suck',
  MoveLeft: '← Move Left',
  MoveRight: '→ Move Right',
  NoOp: '✓ No-Op',
};

function RoomBox({
  label,
  status,
  hasAgent,
}: {
  label: string;
  status: RoomStatus;
  hasAgent: boolean;
}) {
  return (
    <div
      aria-label={`${label} room — ${status}${hasAgent ? ' — agent here' : ''}`}
      style={{
        flex: 1,
        minHeight: '110px',
        borderRadius: '10px',
        border: `2px solid ${status === 'dirty' ? '#92400E' : 'rgba(255,255,255,0.1)'}`,
        background: status === 'dirty' ? 'rgba(146,64,14,0.12)' : '#1A1A24',
        padding: '14px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '13px', color: '#9CA3AF', marginBottom: '3px' }}>
        {label} Room
      </div>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: status === 'dirty' ? '#F59E0B' : '#10B981',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {status}
      </div>
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

export default function RationalityExplorer() {
  const [scoringId, setScoringId] = useState<ScoringRule>('clean-squares');
  const [initIdx, setInitIdx] = useState(0);
  const [steps, setSteps] = useState<ReadonlyArray<RationalityStep>>(() =>
    simulateWithScoringRule(INITIAL_STATES[0]!.state, 'clean-squares'),
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function applyConfig(rule: ScoringRule, idx: number) {
    const entry = INITIAL_STATES[idx];
    if (!entry) return;
    setScoringId(rule);
    setInitIdx(idx);
    setSteps(simulateWithScoringRule(entry.state, rule));
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

  const step = steps[currentStep] ?? steps[0]!;
  const isAtEnd = currentStep >= steps.length - 1;
  const scoring = SCORING_OPTIONS.find((s) => s.id === scoringId) ?? SCORING_OPTIONS[0]!;

  return (
    <div>
      {/* Teaching text */}
      <div
        style={{
          background: '#111118',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#A5B4FC', marginBottom: '10px' }}>
          What is a rational agent?
        </h3>
        <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.65, marginBottom: '12px' }}>
          A <strong style={{ color: '#E5E7EB' }}>rational agent</strong> selects actions that
          are expected to maximise its <em>performance measure</em>, given everything it has
          perceived so far. Crucially, rationality is not perfection — the agent can only
          maximise <em>expected</em> performance based on available information.
        </p>
        <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.65, marginBottom: '12px' }}>
          Rationality depends on four things (§2.2.2):
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            ['Performance measure', 'How do we score success?'],
            ['Prior knowledge', 'What does the agent know about the world before acting?'],
            ['Available actions', 'What can the agent actually do?'],
            ['Percept sequence so far', 'What has the agent observed to date?'],
          ].map(([term, explain]) => (
            <li
              key={term}
              style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '6px',
                color: '#E5E7EB',
                fontSize: '14px',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: '#6366F1', flexShrink: 0, fontWeight: 700 }}>›</span>
              <span>
                <strong>{term}:</strong> {explain}
              </span>
            </li>
          ))}
        </ul>
        <p
          style={{
            color: '#6B7280',
            fontSize: '13px',
            lineHeight: 1.6,
            marginTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '12px',
          }}
        >
          <strong style={{ color: '#9CA3AF' }}>Key insight:</strong> The performance measure
          must be designed to capture what we <em>actually want</em>, not just how we think the
          agent should behave. The vacuum world below demonstrates what happens when the
          performance measure is subtly wrong.
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Scoring rule picker */}
        <div>
          <label
            htmlFor="scoring-rule"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '8px',
            }}
          >
            Performance Measure
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {SCORING_OPTIONS.map((opt) => {
              const isActive = opt.id === scoringId;
              return (
                <button
                  key={opt.id}
                  onClick={() => applyConfig(opt.id, initIdx)}
                  aria-pressed={isActive}
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${isActive ? opt.colour : 'rgba(255,255,255,0.08)'}`,
                    background: isActive ? `${opt.colour}18` : '#111118',
                    color: isActive ? opt.colour : '#9CA3AF',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>{opt.label}</div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      opacity: 0.7,
                    }}
                  >
                    {opt.formula}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Initial state picker */}
        <div>
          <label
            htmlFor="rationality-initial-state"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '8px',
            }}
          >
            Initial State
          </label>
          <select
            id="rationality-initial-state"
            value={initIdx}
            onChange={(e) => applyConfig(scoringId, Number(e.target.value))}
            aria-label="Select initial world state"
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: '#1A1A24',
              color: '#E5E7EB',
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            {INITIAL_STATES.map((s, idx) => (
              <option key={idx} value={idx}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Warning box */}
          {scoring.warning && (
            <div
              role="alert"
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#FCA5A5',
                fontSize: '13px',
                lineHeight: 1.6,
              }}
            >
              {scoring.warning}
            </div>
          )}
        </div>
      </div>

      {/* World visualization */}
      <div
        aria-live="polite"
        aria-label="Vacuum world state"
        style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}
      >
        <RoomBox
          label="Left"
          status={step.state.leftRoom as RoomStatus}
          hasAgent={step.state.agentPosition === 'Left'}
        />
        <RoomBox
          label="Right"
          status={step.state.rightRoom as RoomStatus}
          hasAgent={(step.state.agentPosition as AgentPosition) === 'Right'}
        />
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
            {ACTION_LABELS[step.action]}
          </div>
          <div style={{ color: '#E5E7EB', fontSize: '13px', lineHeight: 1.5 }}>
            {step.description}
          </div>
          <div
            style={{
              marginTop: '6px',
              fontSize: '12px',
              color: '#6B7280',
              fontFamily: 'monospace',
            }}
          >
            This step: {step.scoringExplain}
          </div>
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
              color: step.score >= 0 ? scoring.colour : '#EF4444',
            }}
          >
            {step.score >= 0 ? '+' : ''}
            {step.score}
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
          onClick={() => applyConfig(scoringId, initIdx)}
          aria-label="Reset simulation"
          style={controlBtnStyle(false)}
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}

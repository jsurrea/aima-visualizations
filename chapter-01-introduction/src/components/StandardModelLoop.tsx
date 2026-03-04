import { useState, useCallback, useEffect, useRef } from 'react';
import { getStandardModelSteps, type StandardModelStep } from '../algorithms/index';

/** Delay between auto-advance steps when playing (milliseconds). */
const ANIMATION_INTERVAL_MS = 1400;

const DIRECTION_COLOR: Record<StandardModelStep['direction'], string> = {
  'env-to-agent': '#10B981',
  'agent-internal': '#6366F1',
  'agent-to-env': '#F59E0B',
  'env-internal': '#3B82F6',
};

const ACCENT = '#6366F1';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function Arrow({
  label,
  direction,
  active,
}: {
  label: string;
  direction: 'ltr' | 'rtl';
  active: boolean;
}) {
  const color = active ? '#FFFFFF' : '#4B5563';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: '12px', color: active ? '#E5E7EB' : '#6B7280', fontWeight: active ? 600 : 400 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
        {direction === 'rtl' && (
          <span style={{ color, fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>◀</span>
        )}
        <div
          style={{
            flex: 1,
            height: '2px',
            background: active
              ? `linear-gradient(to ${direction === 'ltr' ? 'right' : 'left'}, ${ACCENT}, #10B981)`
              : '#374151',
            transition: 'background 0.3s',
          }}
        />
        {direction === 'ltr' && (
          <span style={{ color, fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>▶</span>
        )}
      </div>
    </div>
  );
}

function AgentBox({ active }: { active: boolean }) {
  return (
    <div
      aria-label="Agent"
      style={{
        width: '110px',
        height: '90px',
        borderRadius: '12px',
        border: `2px solid ${active ? ACCENT : 'rgba(255,255,255,0.12)'}`,
        background: active ? `${ACCENT}18` : '#1A1A24',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'border-color 0.3s, background 0.3s',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '26px' }}>🤖</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: active ? '#FFFFFF' : '#9CA3AF' }}>
        Agent
      </span>
    </div>
  );
}

function EnvBox({ active }: { active: boolean }) {
  const envColor = '#10B981';
  return (
    <div
      aria-label="Environment"
      style={{
        width: '110px',
        height: '90px',
        borderRadius: '12px',
        border: `2px solid ${active ? envColor : 'rgba(255,255,255,0.12)'}`,
        background: active ? `${envColor}18` : '#1A1A24',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'border-color 0.3s, background 0.3s',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '26px' }}>🌍</span>
      <span
        style={{ fontSize: '13px', fontWeight: 600, color: active ? '#FFFFFF' : '#9CA3AF' }}
      >
        Environment
      </span>
    </div>
  );
}

export default function StandardModelLoop() {
  const steps = getStandardModelSteps();
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const prefersReduced = usePrefersReducedMotion();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playing, setPlaying] = useState(false);

  const currentStep = stepIndex >= 0 ? steps[stepIndex] : null;

  const advance = useCallback(() => {
    setStepIndex((i) => (i + 1) % steps.length);
  }, [steps.length]);

  const reset = useCallback(() => {
    setStepIndex(-1);
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  useEffect(() => {
    if (playing && !prefersReduced) {
      intervalRef.current = setInterval(advance, ANIMATION_INTERVAL_MS);
      return () => {
        if (intervalRef.current !== null) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      return undefined;
    }
  }, [playing, prefersReduced, advance]);

  const agentActive =
    currentStep?.direction === 'agent-internal' || currentStep?.direction === 'env-to-agent';
  const envActive =
    currentStep?.direction === 'env-internal' || currentStep?.direction === 'agent-to-env';
  const perceptActive = currentStep?.direction === 'env-to-agent';
  const actionActive = currentStep?.direction === 'agent-to-env';

  return (
    <section aria-label="Standard Agent-Environment Model Loop">
      <p style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
        The standard model of rational agents: an agent receives{' '}
        <strong style={{ color: '#E5E7EB' }}>percepts</strong> from the environment through sensors,
        decides on an <strong style={{ color: '#E5E7EB' }}>action</strong>, and executes it via
        actuators. Step through the loop to see each phase.
      </p>

      {/* Diagram */}
      <div
        style={{
          background: '#111118',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '32px 24px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'nowrap',
          }}
        >
          <AgentBox active={agentActive} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: 0 }}>
            <Arrow label="Percept (sensors)" direction="ltr" active={perceptActive} />
            <Arrow label="Action (actuators)" direction="rtl" active={actionActive} />
          </div>

          <EnvBox active={envActive} />
        </div>
      </div>

      {/* Step description */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          minHeight: '88px',
          padding: '16px 20px',
          borderRadius: '12px',
          background: '#1A1A24',
          border: `1px solid ${currentStep ? DIRECTION_COLOR[currentStep.direction] + '40' : 'rgba(255,255,255,0.06)'}`,
          marginBottom: '20px',
          transition: 'border-color 0.3s',
        }}
      >
        {currentStep ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: DIRECTION_COLOR[currentStep.direction],
                  flexShrink: 0,
                  display: 'inline-block',
                }}
                aria-hidden="true"
              />
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>
                Step {stepIndex + 1}/{steps.length}: {currentStep.label}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0, lineHeight: 1.65 }}>
              {currentStep.description}
            </p>
          </>
        ) : (
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            Press <strong style={{ color: '#9CA3AF' }}>Step</strong> or{' '}
            <strong style={{ color: '#9CA3AF' }}>Play</strong> to walk through the agent loop.
          </p>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={advance}
          aria-label="Step forward through the agent loop"
          style={btnStyle(ACCENT)}
        >
          Step →
        </button>

        {!prefersReduced && (
          <button
            onClick={togglePlay}
            aria-label={playing ? 'Pause auto-play' : 'Auto-play the agent loop'}
            style={btnStyle(playing ? '#EF4444' : '#10B981')}
          >
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
        )}

        <button
          onClick={reset}
          aria-label="Reset to initial state"
          style={btnStyle('#4B5563')}
        >
          ↺ Reset
        </button>
      </div>

      {/* Step legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStepIndex(i)}
            aria-label={`Jump to step: ${s.label}`}
            aria-current={stepIndex === i ? 'step' : undefined}
            style={{
              padding: '5px 14px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 500,
              background: stepIndex === i ? `${DIRECTION_COLOR[s.direction]}22` : 'transparent',
              color: stepIndex === i ? DIRECTION_COLOR[s.direction] : '#6B7280',
              border: `1px solid ${stepIndex === i ? DIRECTION_COLOR[s.direction] + '60' : 'rgba(255,255,255,0.08)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {i + 1}. {s.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: '9px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    background: `${color}20`,
    color,
    border: `1px solid ${color}50`,
    cursor: 'pointer',
    transition: 'background 0.2s',
  };
}

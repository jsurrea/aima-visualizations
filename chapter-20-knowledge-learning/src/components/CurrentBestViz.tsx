import { useState, useEffect, useRef } from 'react';
import { renderInlineMath, btnStyle } from '../utils/mathUtils';
import {
  currentBestLearning,
  type Example,
  type HypothesisSpec,
  type CBHStep,
} from '../algorithms/index';

const ALL_VALUES = {
  size: ['small', 'large'],
  color: ['red', 'blue'],
  shape: ['circle', 'square'],
} as const;

const PRESET_EXAMPLES: Example[] = [
  { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: true },
  { attrs: { size: 'large', color: 'blue', shape: 'circle' }, label: false },
  { attrs: { size: 'small', color: 'red', shape: 'square' }, label: true },
  { attrs: { size: 'large', color: 'red', shape: 'circle' }, label: true },
  { attrs: { size: 'large', color: 'blue', shape: 'square' }, label: false },
];

const INITIAL_H: HypothesisSpec = { size: null, color: null, shape: null };
const CHAPTER_COLOR = '#10B981';

function hypothesisToString(h: HypothesisSpec): string {
  const parts = Object.entries(h)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}=${v as string}`);
  return parts.length === 0 ? '⊤ (matches everything)' : parts.join(' ∧ ');
}

function consistencyBadge(c: CBHStep['consistency']) {
  const styles: Record<CBHStep['consistency'], { label: string; color: string }> = {
    consistent: { label: '✓ Consistent', color: '#10B981' },
    false_positive: { label: '✗ False Positive', color: '#F59E0B' },
    false_negative: { label: '✗ False Negative', color: '#6366F1' },
  };
  const { label, color } = styles[c];
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: '999px',
        background: `${color}15`,
        color,
        fontSize: '11px',
        fontWeight: 600,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  );
}

export default function CurrentBestViz() {
  const [stepIdx, setStepIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1400);
  const [initialH, setInitialH] = useState<HypothesisSpec>(INITIAL_H);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [prefersReduced, setPrefersReduced] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const steps: ReadonlyArray<CBHStep> = currentBestLearning(
    PRESET_EXAMPLES,
    initialH,
    ALL_VALUES,
  );
  const totalSteps = steps.length;

  useEffect(() => {
    if (!playing || prefersReduced) return;
    intervalRef.current = setInterval(() => {
      setStepIdx(prev => {
        if (prev >= totalSteps - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speed, totalSteps, prefersReduced]);

  const currentStep = stepIdx >= 0 ? steps[stepIdx] : null;
  const displayH: HypothesisSpec = currentStep?.newHypothesis ?? initialH;

  return (
    <section aria-label="Current-Best-Hypothesis Visualization">
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#E5E7EB', marginBottom: '10px' }}>
        Current-Best-Hypothesis Search
      </h3>
      <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.7, marginBottom: '6px' }}>
        Maintain a <strong style={{ color: '#E5E7EB' }}>single hypothesis</strong> and refine it
        as examples arrive:
      </p>
      <ul style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.8, paddingLeft: '20px', marginBottom: '16px' }}>
        <li>
          <span style={{ color: '#F59E0B', fontWeight: 600 }}>False positive</span> (predicted
          positive, actually negative) →{' '}
          <strong style={{ color: '#E5E7EB' }}>specialize</strong> (add a condition)
        </li>
        <li>
          <span style={{ color: '#6366F1', fontWeight: 600 }}>False negative</span> (predicted
          negative, actually positive) →{' '}
          <strong style={{ color: '#E5E7EB' }}>generalize</strong> (drop a condition)
        </li>
      </ul>

      {/* What-if: initial hypothesis selector */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '20px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p
          style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '10px', fontWeight: 600 }}
        >
          🔧 What-If: Change the Starting Hypothesis
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {(Object.keys(ALL_VALUES) as Array<keyof typeof ALL_VALUES>).map(attr => (
            <label key={attr} style={{ fontSize: '12px', color: '#9CA3AF' }}>
              {attr}:{' '}
              <select
                value={initialH[attr] ?? ''}
                onChange={e => {
                  setInitialH(prev => ({
                    ...prev,
                    [attr]: e.target.value === '' ? null : e.target.value,
                  }));
                  setStepIdx(-1);
                  setPlaying(false);
                }}
                style={{
                  background: 'var(--surface-3)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '12px',
                }}
                aria-label={`Initial hypothesis ${attr}`}
              >
                <option value="">any (∅)</option>
                {ALL_VALUES[attr].map(v => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '8px' }}>
          Try starting with a specific hypothesis (e.g., size=small). Notice how the algorithm
          backtracks differently and may produce different final hypotheses.
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '18px',
        }}
      >
        <button
          onClick={() => {
            setStepIdx(-1);
            setPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }}
          disabled={stepIdx < 0}
          aria-label="Reset"
          style={btnStyle(false, stepIdx < 0)}
        >
          ⏮ Reset
        </button>
        <button
          onClick={() => setStepIdx(p => Math.max(-1, p - 1))}
          disabled={stepIdx < 0}
          aria-label="Step back"
          style={btnStyle(false, stepIdx < 0)}
        >
          ◀ Back
        </button>
        <button
          onClick={() => {
            if (prefersReduced) setStepIdx(totalSteps - 1);
            else setPlaying(p => !p);
          }}
          aria-label={playing ? 'Pause' : 'Play'}
          style={btnStyle(playing, false)}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={() => setStepIdx(p => Math.min(totalSteps - 1, p + 1))}
          disabled={stepIdx >= totalSteps - 1}
          aria-label="Step forward"
          style={btnStyle(false, stepIdx >= totalSteps - 1)}
        >
          Next ▶
        </button>
        <label
          style={{
            fontSize: '12px',
            color: '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Speed
          <input
            type="range"
            min={400}
            max={2500}
            step={100}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            aria-label="Speed"
            style={{ width: '80px' }}
          />
        </label>
      </div>

      {/* Current hypothesis display */}
      <div
        style={{
          background: `${CHAPTER_COLOR}10`,
          border: `1px solid ${CHAPTER_COLOR}30`,
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
          Current hypothesis h:
        </p>
        <p
          style={{
            fontSize: '15px',
            fontFamily: 'monospace',
            color: CHAPTER_COLOR,
            fontWeight: 600,
          }}
        >
          WillWait(x) ⟺ {hypothesisToString(displayH)}
        </p>
        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
          Step {stepIdx + 1} / {totalSteps}
        </p>
      </div>

      {/* Step timeline */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '16px',
          maxHeight: '280px',
          overflowY: 'auto',
        }}
        role="log"
        aria-label="Algorithm steps"
        aria-live="polite"
      >
        {steps.map((step, i) => {
          const isActive = i === stepIdx;
          const isPast = i < stepIdx;
          const isFuture = i > stepIdx;
          const borderColor =
            step.consistency === 'consistent'
              ? '#10B981'
              : step.consistency === 'false_positive'
                ? '#F59E0B'
                : '#6366F1';
          return (
            <div
              key={i}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${isActive ? borderColor : 'rgba(255,255,255,0.06)'}`,
                background: isActive ? `${borderColor}10` : 'transparent',
                opacity: isFuture ? 0.35 : 1,
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => setStepIdx(i)}
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setStepIdx(i)}
              aria-label={`Step ${i + 1}`}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                  x{i + 1}:{' '}
                  {Object.entries(step.example.attrs)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ')}
                  {' → '}
                  <span
                    style={{ color: step.example.label ? '#10B981' : '#EF4444', fontWeight: 600 }}
                  >
                    {step.example.label ? 'positive' : 'negative'}
                  </span>
                </span>
                {(isActive || isPast) && consistencyBadge(step.consistency)}
              </div>
              {(isActive || isPast) && (
                <>
                  <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{step.action}</p>
                  <p style={{ fontSize: '11px', color: CHAPTER_COLOR, fontFamily: 'monospace', marginTop: '4px' }}>
                    → {hypothesisToString(step.newHypothesis)}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* State panel */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '14px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        role="status"
        aria-live="polite"
      >
        <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '8px' }}>
          State Inspection
        </p>
        {currentStep == null ? (
          <p style={{ fontSize: '13px', color: '#9CA3AF' }}>Press Play or Next to start.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12px' }}>
            <StateRow label="Step" value={`${stepIdx + 1} / ${totalSteps}`} />
            <StateRow
              label="Example"
              value={`${Object.entries(currentStep.example.attrs)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ')} (${currentStep.example.label ? '+' : '−'})`}
            />
            <StateRow label="Before h" value={hypothesisToString(currentStep.hypothesis)} />
            <StateRow
              label="Verdict"
              value={currentStep.consistency}
              color={
                currentStep.consistency === 'consistent'
                  ? '#10B981'
                  : currentStep.consistency === 'false_positive'
                    ? '#F59E0B'
                    : '#6366F1'
              }
            />
            <StateRow label="After h" value={hypothesisToString(currentStep.newHypothesis)} color={CHAPTER_COLOR} />
            <StateRow label="Action" value={currentStep.action} />
          </div>
        )}
      </div>
    </section>
  );
}

function StateRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <span style={{ color: '#6B7280', minWidth: '80px', flexShrink: 0, fontSize: '11px' }}>{label}:</span>
      <span style={{ color: color ?? '#D1D5DB', fontFamily: 'monospace', fontSize: '11px' }}>{value}</span>
    </div>
  );
}



import { useState, useEffect, useRef } from 'react';
import { renderInlineMath } from '../utils/mathUtils';
import {
  versionSpaceLearning,
  type Example,
  type HypothesisSpec,
  type VersionSpaceStep,
} from '../algorithms/index';

// ── Domain ──────────────────────────────────────────────────────────────────
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

const CHAPTER_COLOR = '#10B981';

// ── Helpers ──────────────────────────────────────────────────────────────────
function hypothesisToString(h: HypothesisSpec): string {
  const parts = Object.entries(h)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}=${v as string}`);
  return parts.length === 0 ? '⊤ (matches everything)' : parts.join(' ∧ ');
}

function ExampleBadge({ ex, idx }: { ex: Example; idx: number }) {
  const color = ex.label ? '#10B981' : '#EF4444';
  const symbol = ex.label ? '+' : '−';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '20px',
        border: `1px solid ${color}40`,
        background: `${color}10`,
        fontSize: '12px',
        color,
        fontWeight: 600,
      }}
      title={`x${idx + 1}: ${Object.entries(ex.attrs)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')} → ${ex.label ? 'positive' : 'negative'}`}
    >
      <span>{symbol}</span>
      <span style={{ color: '#D1D5DB' }}>x{idx + 1}</span>
    </div>
  );
}

function HypothesisChip({
  h,
  color,
  label,
}: {
  h: HypothesisSpec;
  color: string;
  label: string;
}) {
  return (
    <div
      style={{
        padding: '8px 12px',
        borderRadius: '8px',
        border: `1px solid ${color}40`,
        background: `${color}10`,
        fontSize: '12px',
        color,
        fontFamily: 'monospace',
      }}
    >
      <span style={{ fontSize: '10px', opacity: 0.7, display: 'block', marginBottom: '2px' }}>
        {label}
      </span>
      {hypothesisToString(h)}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VersionSpaceViz() {
  const [stepIdx, setStepIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1200);
  const [examples, setExamples] = useState<Example[]>(PRESET_EXAMPLES);
  const [showAdd, setShowAdd] = useState(false);
  const [newAttrs, setNewAttrs] = useState({ size: 'small', color: 'red', shape: 'circle' });
  const [newLabel, setNewLabel] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const steps: ReadonlyArray<VersionSpaceStep> = versionSpaceLearning(examples, ALL_VALUES);
  const totalSteps = steps.length;

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  const sSet = currentStep?.sSet ?? [];
  const gSet = currentStep?.gSet ?? [{ size: null, color: null, shape: null }];

  function handleReset() {
    setStepIdx(-1);
    setPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function handleAddExample() {
    setExamples(prev => [...prev, { attrs: { ...newAttrs }, label: newLabel }]);
    setShowAdd(false);
    handleReset();
  }

  return (
    <section aria-label="Version Space Learning Visualization">
      {/* Explanation */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#E5E7EB', marginBottom: '10px' }}>
          Version Space: Tracking All Consistent Hypotheses
        </h3>
        <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.7, marginBottom: '8px' }}>
          Instead of guessing one hypothesis and revising it, the{' '}
          <strong style={{ color: '#E5E7EB' }}>version space</strong> algorithm tracks the
          complete set of hypotheses consistent with all examples seen so far — represented
          compactly using two boundary sets:
        </p>
        <ul style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.8, paddingLeft: '20px' }}>
          <li>
            <span
              style={{ color: '#F59E0B', fontWeight: 600 }}
              dangerouslySetInnerHTML={{
                __html: renderInlineMath('S'),
              }}
            />{' '}
            <strong style={{ color: '#F59E0B' }}>-set</strong> — most <em>specific</em>{' '}
            consistent hypotheses (lower boundary)
          </li>
          <li>
            <span
              style={{ color: '#6366F1', fontWeight: 600 }}
              dangerouslySetInnerHTML={{
                __html: renderInlineMath('G'),
              }}
            />{' '}
            <strong style={{ color: '#6366F1' }}>-set</strong> — most <em>general</em>{' '}
            consistent hypotheses (upper boundary)
          </li>
        </ul>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '8px', lineHeight: 1.6 }}>
          Any hypothesis between{' '}
          <span
            dangerouslySetInnerHTML={{ __html: renderInlineMath('S') }}
            style={{ color: '#F59E0B' }}
          />{' '}
          and{' '}
          <span
            dangerouslySetInnerHTML={{ __html: renderInlineMath('G') }}
            style={{ color: '#6366F1' }}
          />{' '}
          is guaranteed to be consistent. No need to enumerate all hypotheses!
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={() => setStepIdx(-1)}
          disabled={stepIdx < 0}
          aria-label="Reset to start"
          style={btnStyle(false, stepIdx < 0)}
        >
          ⏮ Reset
        </button>
        <button
          onClick={() => setStepIdx(prev => Math.max(-1, prev - 1))}
          disabled={stepIdx < 0}
          aria-label="Step backward"
          style={btnStyle(false, stepIdx < 0)}
        >
          ◀ Back
        </button>
        <button
          onClick={() => {
            if (prefersReduced) {
              setStepIdx(totalSteps - 1);
            } else {
              setPlaying(p => !p);
            }
          }}
          aria-label={playing ? 'Pause' : 'Play'}
          style={btnStyle(playing, false)}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={() => setStepIdx(prev => Math.min(totalSteps - 1, prev + 1))}
          disabled={stepIdx >= totalSteps - 1}
          aria-label="Step forward"
          style={btnStyle(false, stepIdx >= totalSteps - 1)}
        >
          Next ▶
        </button>
        <label
          style={{ fontSize: '12px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          Speed
          <input
            type="range"
            min={400}
            max={2500}
            step={100}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            aria-label="Animation speed"
            style={{ width: '80px' }}
          />
        </label>
        <button
          onClick={() => setShowAdd(s => !s)}
          style={{
            ...btnStyle(false, false),
            marginLeft: 'auto',
            fontSize: '12px',
          }}
        >
          + Add Example
        </button>
      </div>

      {/* Add example panel */}
      {showAdd && (
        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>
            Add a custom example
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            {(Object.keys(ALL_VALUES) as Array<keyof typeof ALL_VALUES>).map(attr => (
              <label key={attr} style={{ fontSize: '12px', color: '#9CA3AF' }}>
                {attr}:{' '}
                <select
                  value={newAttrs[attr]}
                  onChange={e => setNewAttrs(prev => ({ ...prev, [attr]: e.target.value }))}
                  style={{
                    background: 'var(--surface-3)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '12px',
                  }}
                  aria-label={`Select ${attr} value`}
                >
                  {ALL_VALUES[attr].map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label style={{ fontSize: '12px', color: '#9CA3AF' }}>
              label:{' '}
              <select
                value={String(newLabel)}
                onChange={e => setNewLabel(e.target.value === 'true')}
                style={{
                  background: 'var(--surface-3)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '12px',
                }}
                aria-label="Select example label"
              >
                <option value="true">positive (+)</option>
                <option value="false">negative (−)</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleAddExample} style={btnStyle(true, false)}>
              Add
            </button>
            <button onClick={() => setShowAdd(false)} style={btnStyle(false, false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          height: '4px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '2px',
          marginBottom: '20px',
          overflow: 'hidden',
        }}
        aria-label={`Progress: step ${stepIdx + 1} of ${totalSteps}`}
        role="progressbar"
        aria-valuenow={stepIdx + 1}
        aria-valuemin={0}
        aria-valuemax={totalSteps}
      >
        <div
          style={{
            height: '100%',
            width: `${totalSteps > 0 ? ((stepIdx + 1) / totalSteps) * 100 : 0}%`,
            background: CHAPTER_COLOR,
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Example sequence */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
          Training sequence:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {examples.map((ex, i) => (
            <div
              key={i}
              style={{
                opacity: i <= stepIdx ? 1 : 0.35,
                transform: i === stepIdx ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s',
                outline:
                  i === stepIdx ? `2px solid ${ex.label ? '#10B981' : '#EF4444'}` : 'none',
                outlineOffset: '2px',
                borderRadius: '20px',
              }}
            >
              <ExampleBadge ex={ex} idx={i} />
            </div>
          ))}
        </div>
      </div>

      {/* S-set and G-set display */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* G-set */}
        <div
          style={{
            background: '#6366F110',
            border: '1px solid #6366F130',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <span
              dangerouslySetInnerHTML={{ __html: renderInlineMath('G') }}
              style={{ color: '#6366F1', fontSize: '16px', fontWeight: 700 }}
            />
            <span style={{ fontSize: '13px', color: '#6366F1', fontWeight: 600 }}>
              -set (most general)
            </span>
          </div>
          {gSet.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#EF4444', fontStyle: 'italic' }}>
              ∅ — version space collapsed!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {gSet.map((h, i) => (
                <HypothesisChip key={i} h={h} color="#6366F1" label={`G${i + 1}`} />
              ))}
            </div>
          )}
        </div>

        {/* S-set */}
        <div
          style={{
            background: '#F59E0B10',
            border: '1px solid #F59E0B30',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <span
              dangerouslySetInnerHTML={{ __html: renderInlineMath('S') }}
              style={{ color: '#F59E0B', fontSize: '16px', fontWeight: 700 }}
            />
            <span style={{ fontSize: '13px', color: '#F59E0B', fontWeight: 600 }}>
              -set (most specific)
            </span>
          </div>
          {stepIdx < 0 ? (
            <p style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
              ⊥ (will be initialized on first positive example)
            </p>
          ) : sSet.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#EF4444', fontStyle: 'italic' }}>
              ∅ — version space collapsed!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sSet.map((h, i) => (
                <HypothesisChip key={i} h={h} color="#F59E0B" label={`S${i + 1}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* State inspection panel */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        role="status"
        aria-live="polite"
        aria-label="Algorithm state"
      >
        <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '8px' }}>
          State Inspection
        </p>
        {currentStep == null ? (
          <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
            Press Play or Next to start the algorithm.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            <Row label="Step" value={`${stepIdx + 1} / ${totalSteps}`} />
            <Row
              label="Current example"
              value={`x${stepIdx + 1}: ${Object.entries(currentStep.example.attrs)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ')} → ${currentStep.example.label ? 'positive' : 'negative'}`}
              color={currentStep.example.label ? '#10B981' : '#EF4444'}
            />
            <Row label="Action" value={currentStep.action} />
            <Row label="|S|" value={String(currentStep.sSet.length)} color="#F59E0B" />
            <Row label="|G|" value={String(currentStep.gSet.length)} color="#6366F1" />
            {currentStep.collapsed && (
              <Row label="⚠ Status" value="Version space collapsed!" color="#EF4444" />
            )}
          </div>
        )}
      </div>

      {/* What-if panel */}
      <div
        style={{
          marginTop: '16px',
          background: 'var(--surface-2)',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '8px' }}>
          💡 What-If: Try Adding a Contradictory Example
        </p>
        <p style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.6 }}>
          Click "+ Add Example" and add an example with the same attributes as an existing one
          but the opposite label. Watch the version space <strong style={{ color: '#EF4444' }}>
          collapse</strong> (S or G becomes empty) — meaning no hypothesis is consistent with all
          examples. This models <em>noisy data</em>.
        </p>
        <button
          onClick={() => {
            setExamples([
              ...PRESET_EXAMPLES,
              { attrs: { size: 'small', color: 'red', shape: 'circle' }, label: false }, // contradicts x1
            ]);
            handleReset();
          }}
          style={{ ...btnStyle(false, false), marginTop: '10px', fontSize: '12px' }}
        >
          Inject Contradiction
        </button>
        <button
          onClick={() => {
            setExamples(PRESET_EXAMPLES);
            handleReset();
          }}
          style={{ ...btnStyle(false, false), marginTop: '10px', marginLeft: '8px', fontSize: '12px' }}
        >
          Reset to Default
        </button>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <span style={{ color: '#6B7280', minWidth: '120px', flexShrink: 0 }}>{label}:</span>
      <span style={{ color: color ?? '#D1D5DB', fontFamily: 'monospace', fontSize: '12px' }}>
        {value}
      </span>
    </div>
  );
}

function btnStyle(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: '7px 14px',
    borderRadius: '7px',
    border: `1px solid ${active ? '#10B981' : 'rgba(255,255,255,0.12)'}`,
    background: active ? '#10B98120' : 'transparent',
    color: disabled ? '#374151' : active ? '#10B981' : '#D1D5DB',
    fontSize: '13px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
    opacity: disabled ? 0.4 : 1,
  };
}

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SPRINKLER_NET,
  priorSample,
  rejectionSampling,
  likelihoodWeighting,
  enumerationAsk,
  RejectionSamplingStep,
  LikelihoodWeightingStep,
} from '../algorithms';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

const QUERY = 'Rain';
const EVIDENCE = new Map<string, boolean>([['Sprinkler', true]]);
const NUM_SAMPLES = 200;
const SEED = 42;
const CHAPTER_COLOR = '#EC4899';
const SPEEDS = [50, 150, 300, 600];

type MethodName = 'prior' | 'rejection' | 'lw';

interface PriorEntry {
  queryValue: boolean;
}

function SampleGrid({
  method,
  priorEntries,
  rejSteps,
  lwSteps,
  currentIdx,
}: {
  method: MethodName;
  priorEntries: PriorEntry[];
  rejSteps: RejectionSamplingStep[];
  lwSteps: LikelihoodWeightingStep[];
  currentIdx: number;
}) {
  const COLS = 20;
  const ROWS = 10;

  return (
    <div
      aria-label={`Sample grid for ${method} sampling`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gap: '2px',
      }}
    >
      {Array.from({ length: COLS * ROWS }, (_, i) => {
        let bg = 'var(--surface-3)';
        let opacity = 1;
        let title = `Sample ${i + 1}`;

        if (i <= currentIdx) {
          if (method === 'prior') {
            const entry = priorEntries[i];
            if (entry) {
              bg = entry.queryValue ? '#10B981' : '#EF4444';
              title = `Sample ${i + 1}: Rain=${entry.queryValue ? 'T' : 'F'}`;
            }
          } else if (method === 'rejection') {
            const step = rejSteps[i];
            if (step) {
              if (!step.consistent) {
                bg = '#6B7280';
                title = `Sample ${i + 1}: Rejected`;
              } else {
                bg = step.sample[QUERY] === true ? '#10B981' : '#EF4444';
                title = `Sample ${i + 1}: Rain=${step.sample[QUERY] ? 'T' : 'F'} (accepted)`;
              }
            }
          } else {
            const step = lwSteps[i];
            if (step) {
              bg = step.sample[QUERY] === true ? '#10B981' : '#EF4444';
              // Clamp weight for opacity display
              opacity = Math.max(0.15, Math.min(1, step.weight * 8));
              title = `Sample ${i + 1}: Rain=${step.sample[QUERY] ? 'T' : 'F'}, w=${step.weight.toFixed(3)}`;
            }
          }
        }

        return (
          <div
            key={i}
            title={title}
            style={{
              height: '14px',
              borderRadius: '2px',
              background: bg,
              opacity,
              transition: 'background 0.1s',
            }}
          />
        );
      })}
    </div>
  );
}

export default function SamplingViz() {
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const [method, setMethod] = useState<MethodName>('prior');
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);

  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const speed = SPEEDS[speedIdx] ?? 150;

  // Pre-compute all samples
  const priorEntries = useMemo<PriorEntry[]>(() => {
    return Array.from({ length: NUM_SAMPLES }, (_, i) => {
      const result = priorSample(SPRINKLER_NET, i + 1);
      return { queryValue: result.assignment[QUERY] === true };
    });
  }, []);

  const rejResult = useMemo(
    () => rejectionSampling(QUERY, EVIDENCE, SPRINKLER_NET, NUM_SAMPLES, SEED),
    [],
  );

  const lwResult = useMemo(
    () => likelihoodWeighting(QUERY, EVIDENCE, SPRINKLER_NET, NUM_SAMPLES, SEED),
    [],
  );

  const trueValue = useMemo(() => {
    const r = enumerationAsk(QUERY, EVIDENCE, SPRINKLER_NET);
    return r.distribution[1];
  }, []);

  // Compute current estimate
  const currentEstimate = useMemo<number>(() => {
    if (currentIdx < 0) return 0;
    if (method === 'prior') {
      const slice = priorEntries.slice(0, currentIdx + 1);
      const trueCount = slice.filter((e) => e.queryValue).length;
      return slice.length > 0 ? trueCount / slice.length : 0;
    } else if (method === 'rejection') {
      const step = rejResult.steps[currentIdx];
      return step ? step.estimate : 0;
    } else {
      const step = lwResult.steps[currentIdx];
      return step ? step.estimate : 0;
    }
  }, [method, currentIdx, priorEntries, rejResult.steps, lwResult.steps]);

  // Reset when method changes
  useEffect(() => {
    setCurrentIdx(-1);
    setPlaying(false);
    lastTimeRef.current = 0;
  }, [method]);

  // Animation loop
  useEffect(() => {
    if (!playing || prefersReducedMotion) return;
    if (currentIdx >= NUM_SAMPLES - 1) {
      setPlaying(false);
      return;
    }

    const frame = (ts: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = ts;
      if (ts - lastTimeRef.current >= speed) {
        lastTimeRef.current = ts;
        setCurrentIdx((prev) => Math.min(prev + 1, NUM_SAMPLES - 1));
      }
      animRef.current = requestAnimationFrame(frame);
    };

    animRef.current = requestAnimationFrame(frame);
    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [playing, currentIdx, speed, prefersReducedMotion]);

  useEffect(() => {
    if (playing && currentIdx >= NUM_SAMPLES - 1) {
      setPlaying(false);
    }
  }, [playing, currentIdx]);

  const handleReset = () => {
    setPlaying(false);
    setCurrentIdx(-1);
    lastTimeRef.current = 0;
  };

  const methodFormulas: Record<MethodName, string> = {
    prior: '\\hat{P}(Q) = \\frac{\\#(Q=T)}{N}',
    rejection:
      '\\hat{P}(Q|\\mathbf{e}) = \\frac{\\#(Q=T, \\text{consistent})}{\\#(\\text{consistent})}',
    lw: '\\hat{P}(Q|\\mathbf{e}) = \\frac{\\sum_{s: Q=T} w(s)}{\\sum_s w(s)}',
  };

  const methodDescriptions: Record<MethodName, string> = {
    prior:
      'Prior Sampling generates samples from the joint prior P(X₁,…,Xₙ). No evidence conditioning — shows P(Rain) from the prior.',
    rejection:
      'Rejection Sampling draws prior samples and discards any inconsistent with Sprinkler=true. Only accepted samples count.',
    lw: 'Likelihood Weighting fixes Sprinkler=true and weights each sample by P(Sprinkler=true | parents). No samples are rejected.',
  };

  const panelStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px',
    padding: '16px',
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid',
    borderColor: active ? CHAPTER_COLOR : 'var(--surface-border)',
    background: active ? CHAPTER_COLOR + '22' : 'var(--surface-3)',
    color: active ? CHAPTER_COLOR : '#9CA3AF',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Method selector */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(['prior', 'rejection', 'lw'] as MethodName[]).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            aria-pressed={method === m}
            style={btnStyle(method === m)}
          >
            {m === 'prior'
              ? 'Prior Sampling'
              : m === 'rejection'
                ? 'Rejection Sampling'
                : 'Likelihood Weighting'}
          </button>
        ))}
      </div>

      {/* Description */}
      <div
        style={{
          ...panelStyle,
          background: 'var(--surface-3)',
          fontSize: '13px',
          color: '#D1D5DB',
          lineHeight: 1.6,
        }}
      >
        {methodDescriptions[method]}
        <div style={{ marginTop: '8px' }}>
          <span
            dangerouslySetInnerHTML={{
              __html: renderInlineMath(`\\text{Query: }P(${QUERY}=T \\mid \\text{Sprinkler}=T)`),
            }}
          />
        </div>
      </div>

      {/* Formula */}
      <div style={panelStyle}>
        <div
          dangerouslySetInnerHTML={{ __html: renderDisplayMath(methodFormulas[method]) }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            lastTimeRef.current = 0;
            setPlaying((p) => !p);
          }}
          aria-label={playing ? 'Pause' : 'Play'}
          style={btnStyle(playing)}
          disabled={prefersReducedMotion}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={handleReset} aria-label="Reset" style={btnStyle(false)}>
          ↺ Reset
        </button>
        <button
          onClick={() => {
            setCurrentIdx(NUM_SAMPLES - 1);
            setPlaying(false);
          }}
          aria-label="Show all samples"
          style={btnStyle(false)}
        >
          Show All
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="speed-slider-sv" style={{ fontSize: '12px', color: '#9CA3AF' }}>
            Speed
          </label>
          <input
            id="speed-slider-sv"
            type="range"
            min={0}
            max={SPEEDS.length - 1}
            value={speedIdx}
            onChange={(e) => setSpeedIdx(Number(e.target.value))}
            aria-label="Animation speed"
            style={{ accentColor: CHAPTER_COLOR, width: '80px' }}
          />
          <span style={{ fontSize: '11px', color: '#6B7280' }}>{speed}ms</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9CA3AF' }}>
          {currentIdx + 1} / {NUM_SAMPLES}
        </span>
      </div>

      {/* Sample grid */}
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#E5E7EB' }}>
          {NUM_SAMPLES} Samples
        </h3>
        <SampleGrid
          method={method}
          priorEntries={priorEntries}
          rejSteps={[...rejResult.steps]}
          lwSteps={[...lwResult.steps]}
          currentIdx={currentIdx}
        />
        <div
          style={{
            marginTop: '8px',
            display: 'flex',
            gap: '16px',
            fontSize: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: '#10B981' }}>■ Rain=T</span>
          <span style={{ color: '#EF4444' }}>■ Rain=F</span>
          {method === 'rejection' && <span style={{ color: '#6B7280' }}>■ Rejected</span>}
          {method === 'lw' && (
            <span style={{ color: '#9CA3AF' }}>■ opacity ∝ weight</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div
          style={{
            ...panelStyle,
            borderColor: CHAPTER_COLOR,
            background: CHAPTER_COLOR + '11',
          }}
        >
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
            Current Estimate
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: CHAPTER_COLOR }}>
            {currentIdx >= 0 ? currentEstimate.toFixed(4) : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            <span
              dangerouslySetInnerHTML={{
                __html: renderInlineMath(`\\hat{P}(${QUERY}=T)`),
              }}
            />
          </div>
        </div>
        <div
          style={{
            ...panelStyle,
            borderColor: '#10B981',
            background: '#10B98111',
          }}
        >
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
            True Value (Enumeration)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10B981' }}>
            {trueValue.toFixed(4)}
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            <span
              dangerouslySetInnerHTML={{
                __html: renderInlineMath(
                  `P(${QUERY}=T \\mid \\text{Sprinkler}=T)`,
                ),
              }}
            />
          </div>
        </div>
      </div>

      {/* Rejection stats */}
      {method === 'rejection' && currentIdx >= 0 && (
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#E5E7EB' }}>
            Rejection Statistics
          </h3>
          {(() => {
            const step = rejResult.steps[currentIdx];
            if (!step) return null;
            const total = currentIdx + 1;
            const accepted = step.totalAccepted;
            const rejected = total - accepted;
            return (
              <div style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.8 }}>
                <div>
                  Drawn: <strong>{total}</strong> | Accepted:{' '}
                  <strong style={{ color: '#10B981' }}>{accepted}</strong> | Rejected:{' '}
                  <strong style={{ color: '#6B7280' }}>{rejected}</strong>
                </div>
                <div>
                  Acceptance rate:{' '}
                  <strong style={{ color: '#F59E0B' }}>
                    {total > 0 ? ((accepted / total) * 100).toFixed(1) : '0'}%
                  </strong>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* LW stats */}
      {method === 'lw' && currentIdx >= 0 && (
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#E5E7EB' }}>
            Weighting Statistics
          </h3>
          {(() => {
            const step = lwResult.steps[currentIdx];
            if (!step) return null;
            return (
              <div style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.8 }}>
                <div>
                  Weighted count (T):{' '}
                  <strong style={{ color: '#10B981' }}>
                    {step.weightedCountTrue.toFixed(4)}
                  </strong>
                </div>
                <div>
                  Weighted count (F):{' '}
                  <strong style={{ color: '#EF4444' }}>
                    {step.weightedCountFalse.toFixed(4)}
                  </strong>
                </div>
                <div>
                  Current weight:{' '}
                  <strong style={{ color: '#F59E0B' }}>{step.weight.toFixed(4)}</strong>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

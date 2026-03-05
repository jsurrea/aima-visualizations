import { useState, useEffect, useRef, useCallback } from 'react';
import { renderDisplayMath, renderInlineMath } from '../utils/mathUtils';
import { bayesianCandyLearning, type CandyObs, type BayesianCandyStep } from '../algorithms';

const COLOR = '#10B981';

const HYPOTHESIS_COLORS = [
  '#6366F1',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
] as const;

const HYPOTHESIS_LABELS = ['h₁ (100% cherry)', 'h₂ (75% cherry)', 'h₃ (50/50)', 'h₄ (75% lime)', 'h₅ (100% lime)'];
const HYPOTHESIS_CHERRY = [1.0, 0.75, 0.5, 0.25, 0.0];

const DEFAULT_OBS: CandyObs[] = ['lime','lime','lime','cherry','lime','lime','lime','lime','lime','lime'];
const DEFAULT_PRIOR = [0.1, 0.2, 0.4, 0.2, 0.1];

function MathBlock({ latex }: { latex: string }) {
  return (
    <div
      style={{ overflowX: 'auto', margin: '8px 0' }}
      dangerouslySetInnerHTML={{ __html: renderDisplayMath(latex) }}
    />
  );
}
function InlineMath({ latex }: { latex: string }) {
  return (
    <span dangerouslySetInnerHTML={{ __html: renderInlineMath(latex) }} />
  );
}

function PosteriorBarChart({ posteriors }: { posteriors: ReadonlyArray<number> }) {
  const max = Math.max(...posteriors, 0.01);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {posteriors.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '120px', fontSize: '12px', color: '#9CA3AF', flexShrink: 0 }}>
            {HYPOTHESIS_LABELS[i]}
          </div>
          <div style={{ flex: 1, height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(p / max) * 100}%`,
                background: HYPOTHESIS_COLORS[i],
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ width: '54px', fontSize: '12px', color: '#E5E7EB', textAlign: 'right', flexShrink: 0 }}>
            {(p * 100).toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}

function PredictionChart({ steps }: { steps: ReadonlyArray<BayesianCandyStep>; currentIdx: number }) {
  return null; // placeholder — handled inline
}

export function BayesianLearningVisualizer() {
  const [observations, setObservations] = useState<CandyObs[]>(DEFAULT_OBS);
  const [prior, setPrior] = useState(DEFAULT_PRIOR);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const steps = bayesianCandyLearning(observations, prior);

  const stop = useCallback(() => {
    setPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!playing || prefersReducedMotion.current) return;
    intervalRef.current = setInterval(() => {
      setCurrentStep(s => {
        if (s >= steps.length - 1) { stop(); return s; }
        return s + 1;
      });
    }, speed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, steps.length, stop]);

  const step = steps[currentStep] ?? null;
  const displayPrior = currentStep === 0 ? prior : (steps[currentStep - 1]?.posteriors ?? prior);
  const currentPosteriors = step?.posteriors ?? prior;

  function toggleObs(idx: number) {
    const next = [...observations];
    next[idx] = next[idx] === 'cherry' ? 'lime' : 'cherry';
    setObservations(next);
    setCurrentStep(0);
    stop();
  }

  function addObs(obs: CandyObs) {
    setObservations(prev => [...prev, obs]);
    setCurrentStep(0);
    stop();
  }

  function removeLastObs() {
    if (observations.length > 1) {
      setObservations(prev => prev.slice(0, -1));
      setCurrentStep(0);
      stop();
    }
  }

  function reset() {
    setObservations(DEFAULT_OBS);
    setPrior(DEFAULT_PRIOR);
    setCurrentStep(0);
    stop();
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: 'white' }}>
      {/* Explanation */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: COLOR }}>§21.1 Bayesian Learning — The Candy Bag Example</h3>
        <p style={{ color: '#9CA3AF', lineHeight: 1.7, marginBottom: '12px' }}>
          There are five types of candy bags: <strong style={{ color: '#E5E7EB' }}>h₁</strong> (all cherry) through <strong style={{ color: '#E5E7EB' }}>h₅</strong> (all lime). You don't know which type you have — but after each candy you unwrap, you update your belief. This is <strong style={{ color: COLOR }}>Bayesian learning</strong>: use probability to learn a theory of the world.
        </p>
        <MathBlock latex="P(h_i \mid d) = \alpha \, P(d \mid h_i) \, P(h_i) \quad\text{(Eq. 21.1)}" />
        <p style={{ color: '#9CA3AF', lineHeight: 1.7, marginBottom: '12px' }}>
          The prediction for the <em>next</em> candy uses all hypotheses weighted by their posteriors — not just the best one:
        </p>
        <MathBlock latex="P(X \mid d) = \sum_i P(X \mid h_i) \, P(h_i \mid d) \quad\text{(Eq. 21.2)}" />
      </div>

      {/* Observation sequence editor */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>Observation Sequence (click to flip)</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {observations.map((obs, i) => (
            <button
              key={i}
              onClick={() => toggleObs(i)}
              title={`Click to flip observation ${i + 1}`}
              aria-label={`Observation ${i + 1}: ${obs}. Click to toggle.`}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: `2px solid ${i < currentStep ? (obs === 'lime' ? '#EF4444' : '#10B981') + '80' : (obs === 'lime' ? '#EF4444' : '#10B981')}`,
                background: i === currentStep
                  ? (obs === 'lime' ? '#EF4444' : '#10B981') + '30'
                  : i < currentStep
                  ? (obs === 'lime' ? '#EF4444' : '#10B981') + '15'
                  : 'rgba(255,255,255,0.03)',
                color: obs === 'lime' ? '#EF4444' : '#10B981',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: i > currentStep ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {i + 1}: {obs === 'lime' ? '🟢 lime' : '🍒 cherry'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => addObs('cherry')} style={btnStyle('#10B981')}>+ Cherry</button>
          <button onClick={() => addObs('lime')} style={btnStyle('#EF4444')}>+ Lime</button>
          <button onClick={removeLastObs} disabled={observations.length <= 1} style={btnStyle('#6B7280')}>Remove Last</button>
        </div>
      </div>

      {/* Playback controls */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={reset} aria-label="Reset" style={btnStyle('#6B7280')}>↺ Reset</button>
          <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} aria-label="Step back" disabled={currentStep === 0} style={btnStyle(COLOR)}>◀ Back</button>
          <button
            onClick={() => {
              if (playing) stop();
              else {
                if (currentStep >= steps.length - 1) setCurrentStep(0);
                setPlaying(true);
              }
            }}
            aria-label={playing ? 'Pause' : 'Play'}
            style={btnStyle(COLOR)}
          >
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))} aria-label="Step forward" disabled={currentStep >= steps.length - 1} style={btnStyle(COLOR)}>Next ▶</button>
          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Speed:
            <input
              type="range" min={200} max={2000} step={100} value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              style={{ accentColor: COLOR }}
              aria-label="Animation speed"
            />
            {speed}ms
          </label>
        </div>
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#6B7280' }}>
          Step {currentStep} / {steps.length} {step ? `— ${step.action}` : '(before any observation)'}
        </div>
      </div>

      {/* Main visualization */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Posterior chart */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#E5E7EB' }}>
            Posterior <InlineMath latex="P(h_i \mid d_{1..N})" />
          </h4>
          <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
            {currentStep === 0 ? 'Prior distribution (no observations yet)' : `After ${currentStep} observation${currentStep > 1 ? 's' : ''}`}
          </p>
          <PosteriorBarChart posteriors={currentStep === 0 ? prior : currentPosteriors} />
        </div>

        {/* Prediction & State panel */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#E5E7EB' }}>State Inspection</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <StateRow label="Observations so far (N)" value={String(currentStep)} />
            <StateRow
              label="Latest observation"
              value={currentStep === 0 ? '—' : (step?.observation ?? '—')}
              {...(step?.observation === 'lime'
                ? { color: '#EF4444' }
                : step?.observation === 'cherry'
                ? { color: '#10B981' }
                : {})}
            />
            <StateRow
              label={<>MAP hypothesis <InlineMath latex="h_{\text{MAP}}" /></>}
              value={currentStep === 0
                ? `h${prior.indexOf(Math.max(...prior)) + 1}`
                : `h${(currentPosteriors as number[]).indexOf(Math.max(...(currentPosteriors as number[]))) + 1}`
              }
              color={COLOR}
            />
            <div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
                P(next = lime | d) — Bayesian prediction:
              </div>
              <div style={{ height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(step?.predictedLimeProb ?? 0.5) * 100}%`,
                    background: '#EF4444',
                    transition: 'width 0.3s ease',
                  }}
                />
                <span style={{ position: 'absolute', right: '8px', top: '4px', fontSize: '12px', color: '#E5E7EB' }}>
                  {((step?.predictedLimeProb ?? 0.5) * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                Compare MAP prediction: {
                  currentStep === 0 ? '50.0%' :
                  `${((1 - (HYPOTHESIS_CHERRY[(currentPosteriors as number[]).indexOf(Math.max(...(currentPosteriors as number[])))] ?? 0)) * 100).toFixed(1)}%`
                } (sharp but riskier)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction history chart */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#E5E7EB' }}>
          Prediction History — <InlineMath latex="P(\text{next}=\text{lime} \mid d_{1..N})" />
        </h4>
        <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
          Each bar shows the predicted lime probability after N observations. Bayesian prediction (teal) vs MAP prediction (orange dashed).
        </p>
        <div style={{ overflowX: 'auto' }}>
          <svg width={Math.max(400, steps.length * 40 + 60)} height={160} style={{ display: 'block' }} aria-label="Prediction history chart">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map(v => (
              <g key={v}>
                <line x1={40} y1={130 - v * 110} x2={40 + steps.length * 40} y2={130 - v * 110} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                <text x={35} y={133 - v * 110} textAnchor="end" fontSize={10} fill="#6B7280">{v}</text>
              </g>
            ))}
            {/* Bayesian bars */}
            {steps.map((s, i) => (
              <g key={i}>
                <rect
                  x={44 + i * 40}
                  y={130 - s.predictedLimeProb * 110}
                  width={16}
                  height={s.predictedLimeProb * 110}
                  fill={i === currentStep - 1 ? COLOR : COLOR + '60'}
                  rx={2}
                />
                {/* MAP bar (to the right, orange) */}
                <rect
                  x={62 + i * 40}
                  y={130 - (1 - (HYPOTHESIS_CHERRY[(s.posteriors as number[]).indexOf(Math.max(...(s.posteriors as number[])))] ?? 0)) * 110}
                  width={14}
                  height={(1 - (HYPOTHESIS_CHERRY[(s.posteriors as number[]).indexOf(Math.max(...(s.posteriors as number[])))] ?? 0)) * 110}
                  fill={i === currentStep - 1 ? '#F59E0B' : '#F59E0B40'}
                  rx={2}
                />
                <text x={52 + i * 40} y={148} textAnchor="middle" fontSize={10} fill="#6B7280">{i + 1}</text>
              </g>
            ))}
            {/* Vertical marker */}
            {currentStep > 0 && (
              <line
                x1={52 + (currentStep - 1) * 40}
                y1={20}
                x2={52 + (currentStep - 1) * 40}
                y2={130}
                stroke={COLOR}
                strokeWidth={1.5}
                strokeDasharray="4,2"
              />
            )}
            <text x={44} y={18} fontSize={10} fill={COLOR}>▌ Bayesian</text>
            <text x={140} y={18} fontSize={10} fill="#F59E0B">▌ MAP</text>
          </svg>
        </div>
      </div>
    </div>
  );
}

function StateRow({ label, value, color }: { label: React.ReactNode; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: color ?? '#E5E7EB', fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: '8px',
    border: `1px solid ${color}40`,
    background: `${color}15`,
    color: color,
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  };
}

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { renderDisplayMath } from '../utils/mathUtils';
import {
  generateLettersTrace,
  generateMarkovLettersTrace,
  runMCMC,
  mulberry32,
  type ExecutionTrace,
  type TraceChoice,
} from '../algorithms';

const COLOR = '#EC4899';

function MathBlock({ latex }: { latex: string }) {
  return (
    <div
      style={{ overflowX: 'auto', margin: '8px 0' }}
      dangerouslySetInnerHTML={{ __html: renderDisplayMath(latex) }}
    />
  );
}

interface PlaybackControlsProps {
  currentStep: number;
  totalSteps: number;
  playing: boolean;
  speed: number;
  color: string;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

function PlaybackControls({
  currentStep,
  totalSteps,
  playing,
  speed,
  color,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onReset,
  onSpeedChange,
}: PlaybackControlsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <button
        onClick={onReset}
        aria-label="Reset to beginning"
        title="Reset"
        style={btnStyle('#6B7280')}
      >
        ⏮
      </button>
      <button
        onClick={onStepBack}
        disabled={currentStep <= 0}
        aria-label="Step backward"
        title="Step back"
        style={btnStyle(color, currentStep <= 0)}
      >
        ◀
      </button>
      <button
        onClick={playing ? onPause : onPlay}
        aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause' : 'Play'}
        style={btnStyle(color)}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <button
        onClick={onStepForward}
        disabled={currentStep >= totalSteps - 1}
        aria-label="Step forward"
        title="Step forward"
        style={btnStyle(color, currentStep >= totalSteps - 1)}
      >
        ▶
      </button>
      <div
        style={{
          width: '1px',
          height: '24px',
          background: 'rgba(255,255,255,0.15)',
          margin: '0 4px',
        }}
      />
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#9CA3AF',
        }}
      >
        Speed:
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.5}
          value={speed}
          onChange={e => onSpeedChange(Number(e.target.value))}
          aria-label="Animation speed"
          style={{ accentColor: color, width: '80px' }}
        />
        <span style={{ color: 'white', minWidth: '28px' }}>{speed}x</span>
      </label>
      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6B7280' }}>
        {currentStep + 1} / {totalSteps}
      </span>
    </div>
  );
}

function btnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    background: disabled ? 'rgba(255,255,255,0.04)' : color + '22',
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.1)' : color + '44'}`,
    color: disabled ? '#4B5563' : color,
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '13px',
    opacity: disabled ? 0.5 : 1,
  };
}

function TraceChoiceBox({ choice, color }: { choice: TraceChoice; color: string }) {
  return (
    <div
      style={{
        background: color + '15',
        border: `1px solid ${color}40`,
        borderRadius: '8px',
        padding: '8px 12px',
        minWidth: '80px',
        fontSize: '12px',
      }}
      role="group"
      aria-label={`${choice.name} sampled ${String(choice.value)}`}
    >
      <div style={{ color: '#9CA3AF', marginBottom: '2px' }}>{choice.name}</div>
      <div
        style={{
          color: color,
          fontWeight: 700,
          fontSize: '15px',
          fontFamily: 'monospace',
        }}
      >
        {String(choice.value)}
      </div>
      <div style={{ color: '#6B7280', marginTop: '2px', fontSize: '10px' }}>
        log P = {choice.logProb.toFixed(2)}
      </div>
    </div>
  );
}

type MCMCEntry = { trace: ExecutionTrace; accepted: boolean; iteration: number };

export function GenerativeProgramVisualizer() {
  const [model, setModel] = useState<'independent' | 'markov'>('independent');
  const [traceSeed, setTraceSeed] = useState(1);
  const [mcmcEvidence, setMcmcEvidence] = useState('cat');
  const [noiseRate, setNoiseRate] = useState(0.1);
  const [mcmcSteps, setMcmcSteps] = useState<ReadonlyArray<MCMCEntry>>([]);
  const [currentMcmcIdx, setCurrentMcmcIdx] = useState(0);
  const [mcmcPlaying, setMcmcPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hasRunMcmc, setHasRunMcmc] = useState(false);
  const mcmcRunCountRef = useRef(0);

  const prefersReduced =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const lambda = mcmcEvidence.length > 0 ? mcmcEvidence.length : 3;
  const evidenceLetters = useMemo(
    () => mcmcEvidence.toLowerCase().split('').filter(c => /[a-z]/.test(c)),
    [mcmcEvidence],
  );

  const currentTrace = useMemo<ExecutionTrace>(() => {
    const rng = mulberry32(traceSeed);
    return model === 'independent'
      ? generateLettersTrace(lambda, rng)
      : generateMarkovLettersTrace(lambda, rng);
  }, [traceSeed, model, lambda]);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const mcmcTick = useCallback(
    (ts: number) => {
      const delay = 500 / speedRef.current;
      if (ts - lastTimeRef.current >= delay) {
        lastTimeRef.current = ts;
        setCurrentMcmcIdx(s => {
          if (s >= mcmcSteps.length - 1) {
            setMcmcPlaying(false);
            return s;
          }
          return s + 1;
        });
      }
      rafRef.current = requestAnimationFrame(mcmcTick);
    },
    [mcmcSteps.length],
  );

  useEffect(() => {
    if (mcmcPlaying && !prefersReduced) {
      rafRef.current = requestAnimationFrame(mcmcTick);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [mcmcPlaying, mcmcTick, prefersReduced]);

  function handleRunMcmc() {
    // Multiply by a prime (7919) to scatter seed values and avoid correlated runs
    mcmcRunCountRef.current += 1;
    const rng = mulberry32(mcmcRunCountRef.current * 7919);
    const results = runMCMC(lambda, evidenceLetters, 30, noiseRate, model === 'markov', rng);
    setMcmcSteps(results);
    setCurrentMcmcIdx(0);
    setMcmcPlaying(false);
    setHasRunMcmc(true);
  }

  const currentMcmcEntry = mcmcSteps[currentMcmcIdx];

  const llHistory = mcmcSteps
    .slice(0, currentMcmcIdx + 1)
    .map(s => s.trace.logLikelihood);
  const finiteLL = llHistory.filter(isFinite);
  const minLL = finiteLL.length > 0 ? Math.min(...finiteLL, -20) : -20;
  const maxLL = finiteLL.length > 0 ? Math.max(...finiteLL, 0) : 0;
  const llRange = maxLL - minLL || 1;

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: 'white' }}>
      {/* Explanation */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}
      >
        <h3
          style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: COLOR }}
        >
          §18.4 Programs as Probability Models
        </h3>
        <p style={{ color: '#9CA3AF', lineHeight: 1.7, marginBottom: '12px' }}>
          A <strong style={{ color: '#E5E7EB' }}>probabilistic program</strong> is just code with
          random choices. Each execution generates a different output — an{' '}
          <em>execution trace</em>. The probability of a trace is the product of probabilities of
          each random choice made.
        </p>
        <MathBlock latex="P(\text{trace}) = \prod_{i} P(\text{choice}_i = v_i)" />

        {/* Pseudocode */}
        <div
          style={{
            marginTop: '12px',
            background: '#0A0A0F',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: 1.8,
            color: '#A5F3FC',
          }}
        >
          <div style={{ color: '#F59E0B', fontWeight: 700, marginBottom: '4px' }}>
            GENERATE-LETTERS(λ):
          </div>
          <div>
            <span style={{ color: '#818CF8' }}>n</span>
            <span style={{ color: '#9CA3AF' }}> ← </span>
            <span style={{ color: '#34D399' }}>SAMPLE</span>
            (Poisson(λ))
          </div>
          <div>
            <span style={{ color: '#9CA3AF' }}>for</span> i = 1 to n{' '}
            <span style={{ color: '#9CA3AF' }}>do</span>
          </div>
          <div style={{ paddingLeft: '16px' }}>
            <span style={{ color: '#818CF8' }}>letter[i]</span>
            <span style={{ color: '#9CA3AF' }}> ← </span>
            <span style={{ color: '#34D399' }}>SAMPLE</span>
            (Uniform(a–z))
          </div>
          <div>
            <span style={{ color: '#9CA3AF' }}>return</span> letter[1..n]
          </div>
        </div>
      </div>

      {/* Model selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['independent', 'markov'] as const).map(m => (
          <button
            key={m}
            onClick={() => {
              setModel(m);
              setTraceSeed(s => s + 1);
            }}
            aria-pressed={model === m}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${model === m ? COLOR : 'rgba(255,255,255,0.15)'}`,
              background: model === m ? COLOR + '22' : 'transparent',
              color: model === m ? COLOR : '#9CA3AF',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {m === 'independent' ? '📊 Independent Letters' : '🔗 Markov (Bigram)'}
          </button>
        ))}
      </div>

      {/* Single trace visualizer */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#E5E7EB', margin: 0 }}>
            Execution Trace
          </h4>
          <button
            onClick={() => setTraceSeed(s => s + 1)}
            aria-label="Generate a new execution trace"
            style={{
              background: COLOR + '22',
              border: `1px solid ${COLOR}66`,
              color: COLOR,
              borderRadius: '8px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            🎲 New Trace
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          {currentTrace.choices.map((choice, i) => (
            <TraceChoiceBox
              key={i}
              choice={choice}
              color={i === 0 ? '#6366F1' : COLOR}
            />
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            marginBottom: '8px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
            Output:{' '}
            <strong style={{ color: 'white', letterSpacing: '2px' }}>
              {currentTrace.output.join('') || '(empty)'}
            </strong>
          </div>
          <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
            Log P(trace) ={' '}
            <strong style={{ color: '#34D399', fontFamily: 'monospace' }}>
              {currentTrace.logProb.toFixed(3)}
            </strong>
          </div>
          <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
            Choices: <strong style={{ color: 'white' }}>{currentTrace.choices.length}</strong>
          </div>
        </div>

        {model === 'markov' && (
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
            Markov model: after a vowel, next letter is more likely to be a consonant (and vice
            versa), giving more natural-looking sequences.
          </p>
        )}
      </div>

      {/* MCMC inference */}
      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h4
          style={{ fontSize: '15px', fontWeight: 700, color: '#E5E7EB', marginBottom: '16px' }}
        >
          MCMC Inference
        </h4>
        <p style={{ color: '#9CA3AF', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
          Given observed letters (evidence), MCMC searches for traces that best explain the
          observation using Metropolis-Hastings.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '16px',
            alignItems: 'flex-end',
          }}
        >
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '13px',
              color: '#9CA3AF',
            }}
          >
            Evidence word:
            <input
              type="text"
              value={mcmcEvidence}
              onChange={e =>
                setMcmcEvidence(e.target.value.slice(0, 8).toLowerCase())
              }
              aria-label="Evidence word for MCMC inference"
              maxLength={8}
              style={{
                background: '#1A1A24',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: 'white',
                fontFamily: 'monospace',
                fontSize: '14px',
                width: '100px',
              }}
            />
          </label>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '13px',
              color: '#9CA3AF',
            }}
          >
            Noise rate: <strong style={{ color: 'white' }}>{noiseRate.toFixed(2)}</strong>
            <input
              type="range"
              min={0.01}
              max={0.5}
              step={0.01}
              value={noiseRate}
              onChange={e => setNoiseRate(Number(e.target.value))}
              aria-label="Observation noise rate"
              style={{ accentColor: COLOR, width: '120px' }}
            />
          </label>
          <button
            onClick={handleRunMcmc}
            aria-label="Run MCMC inference"
            style={{
              background: COLOR,
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              padding: '8px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            ▶ Run MCMC (30 iter)
          </button>
        </div>

        {hasRunMcmc && mcmcSteps.length > 0 && (
          <>
            <PlaybackControls
              currentStep={currentMcmcIdx}
              totalSteps={mcmcSteps.length}
              playing={mcmcPlaying}
              speed={speed}
              color={COLOR}
              onPlay={() => {
                if (currentMcmcIdx >= mcmcSteps.length - 1) setCurrentMcmcIdx(0);
                setMcmcPlaying(true);
              }}
              onPause={() => setMcmcPlaying(false)}
              onStepForward={() =>
                setCurrentMcmcIdx(s => Math.min(s + 1, mcmcSteps.length - 1))
              }
              onStepBack={() => setCurrentMcmcIdx(s => Math.max(s - 1, 0))}
              onReset={() => {
                setCurrentMcmcIdx(0);
                setMcmcPlaying(false);
              }}
              onSpeedChange={setSpeed}
            />

            {currentMcmcEntry && (
              <div
                style={{
                  marginTop: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}
              >
                <div
                  style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}
                >
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
                    Iteration {currentMcmcEntry.iteration} —{' '}
                    {currentMcmcEntry.accepted ? '✅ Accepted' : '❌ Rejected'}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      color: currentMcmcEntry.accepted ? '#34D399' : '#9CA3AF',
                      marginBottom: '4px',
                    }}
                  >
                    Output:{' '}
                    <strong>{currentMcmcEntry.trace.output.join('') || '(empty)'}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    Log-likelihood:{' '}
                    <strong
                      style={{
                        color: isFinite(currentMcmcEntry.trace.logLikelihood)
                          ? '#E5E7EB'
                          : '#EF4444',
                        fontFamily: 'monospace',
                      }}
                    >
                      {isFinite(currentMcmcEntry.trace.logLikelihood)
                        ? currentMcmcEntry.trace.logLikelihood.toFixed(3)
                        : '-∞'}
                    </strong>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B7280' }}>
                    Evidence:{' '}
                    <span style={{ color: '#F59E0B', fontFamily: 'monospace' }}>
                      {evidenceLetters.join('')}
                    </span>
                  </div>
                </div>

                {/* Log-likelihood chart */}
                <div
                  style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}
                >
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
                    Log-likelihood over iterations
                  </div>
                  <svg
                    width="100%"
                    viewBox="0 0 200 80"
                    style={{ display: 'block' }}
                    aria-label="Log-likelihood chart"
                  >
                    <line
                      x1={20}
                      y1={5}
                      x2={20}
                      y2={65}
                      stroke="rgba(255,255,255,0.2)"
                    />
                    <line
                      x1={20}
                      y1={65}
                      x2={195}
                      y2={65}
                      stroke="rgba(255,255,255,0.2)"
                    />
                    {llHistory.length > 1 && (
                      <polyline
                        points={llHistory
                          .map((ll, i) => {
                            const x =
                              20 +
                              (i / Math.max(mcmcSteps.length - 1, 1)) * 170;
                            const y = isFinite(ll)
                              ? 65 - ((ll - minLL) / llRange) * 55
                              : 65;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke={COLOR}
                        strokeWidth={1.5}
                      />
                    )}
                    {mcmcSteps.slice(0, currentMcmcIdx + 1).map((s, i) => {
                      if (!s.accepted || !isFinite(s.trace.logLikelihood)) return null;
                      const x =
                        20 + (i / Math.max(mcmcSteps.length - 1, 1)) * 170;
                      const y =
                        65 - ((s.trace.logLikelihood - minLL) / llRange) * 55;
                      return (
                        <circle key={i} cx={x} cy={y} r={2} fill="#34D399" />
                      );
                    })}
                    <text x={22} y={70} fontSize="8" fill="#6B7280">
                      0
                    </text>
                    <text x={185} y={70} fontSize="8" fill="#6B7280">
                      {mcmcSteps.length - 1}
                    </text>
                  </svg>
                </div>
              </div>
            )}

            {/* Best trace found */}
            {mcmcSteps.length > 0 && (() => {
              const best = mcmcSteps.reduce<MCMCEntry>((a, b) =>
                isFinite(b.trace.logLikelihood) &&
                b.trace.logLikelihood >
                  (isFinite(a.trace.logLikelihood) ? a.trace.logLikelihood : -Infinity)
                  ? b
                  : a,
                mcmcSteps[0]!,
              );
              return (
                <div
                  style={{
                    marginTop: '12px',
                    background: '#10B98115',
                    border: '1px solid #10B98130',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#34D399',
                      marginBottom: '4px',
                    }}
                  >
                    Best trace found
                  </div>
                  <div
                    style={{ fontSize: '14px', fontFamily: 'monospace', color: 'white' }}
                  >
                    "{best.trace.output.join('')}" (log-lik ={' '}
                    {isFinite(best.trace.logLikelihood)
                      ? best.trace.logLikelihood.toFixed(3)
                      : '-∞'}
                    )
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

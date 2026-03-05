import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { hmmForward, particleFilter } from '../algorithms';
import type { HMMParams, ParticleFilterStep } from '../algorithms';
import { renderInlineMath } from '../utils/mathUtils';

const COLOR = '#EC4899';

function btnStyle(active = false): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: '8px',
    border: `1px solid ${active ? COLOR : COLOR + '40'}`,
    background: active ? COLOR + '30' : COLOR + '15',
    color: COLOR, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  };
}

const UMBRELLA_HMM: HMMParams = {
  numStates: 2,
  transitionMatrix: [[0.7, 0.3], [0.3, 0.7]],
  prior: [0.5, 0.5],
  observationProbs: [
    [0.9, 0.2],
    [0.1, 0.8],
  ],
};

const DEFAULT_EVIDENCE = [0, 0, 1, 0, 0];

// SIS (Sequential Importance Sampling) - no resampling
interface SISStep {
  t: number;
  particles: number[];
  weights: number[];
  beliefEstimate: number[];
  evidence: number;
}

function runSIS(params: HMMParams, evidence: number[], nParticles: number, seed: number): SISStep[] {
  let rngState = seed;
  function rng(): number {
    rngState |= 0;
    rngState = rngState + 0x6D2B79F5 | 0;
    let z = Math.imul(rngState ^ rngState >>> 15, 1 | rngState);
    z = z + Math.imul(z ^ z >>> 7, 61 | z) ^ z;
    return ((z ^ z >>> 14) >>> 0) / 4294967296;
  }
  function sampleCat(probs: ReadonlyArray<number>): number {
    const r = rng();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i]!;
      if (r < cum) return i;
    }
    return probs.length - 1;
  }
  let particles: number[] = Array.from({ length: nParticles }, () => sampleCat(params.prior));
  let weights: number[] = Array(nParticles).fill(1 / nParticles) as number[];
  const steps: SISStep[] = [];
  for (let t = 0; t < evidence.length; t++) {
    const e = evidence[t]!;
    const obsRow = params.observationProbs[e]!;
    const propagated = particles.map(s => sampleCat(params.transitionMatrix[s]!));
    const newWeights = weights.map((w, i) => w * obsRow[propagated[i]!]!);
    const sum = newWeights.reduce((a, b) => a + b, 0);
    const normWeights = sum > 0 ? newWeights.map(w => w / sum) : newWeights;
    const belief: number[] = [0, 0];
    for (let i = 0; i < propagated.length; i++) {
      belief[propagated[i]!]! += normWeights[i]!;
    }
    steps.push({ t: t + 1, particles: propagated, weights: normWeights, beliefEstimate: belief, evidence: e });
    particles = propagated;
    weights = normWeights;
  }
  return steps;
}

type PhaseView = 'propagate' | 'weight' | 'resample';

// Small deterministic jitter per particle index for visual spread
function jitter(idx: number): number {
  return ((idx * 2654435761) >>> 0) / 4294967296 * 2 - 1; // -1 to 1
}

function ParticleDots({
  pfStep,
  phase,
  svgW,
  svgH,
}: {
  pfStep: ParticleFilterStep;
  phase: PhaseView;
  svgW: number;
  svgH: number;
}): React.ReactElement {
  const particles = phase === 'resample' ? pfStep.resampled : pfStep.particles;
  const weights = phase === 'weight' ? pfStep.weights : null;
  const midY = svgH / 2;

  return (
    <>
      {particles.map((state, i) => {
        const w = weights ? (weights[i] ?? 0) : 1 / particles.length;
        const r = Math.min(8, Math.max(2, w * particles.length * 5));
        const jx = jitter(i) * 30;
        const jy = jitter(i + 1000) * 20;
        const cx = state === 0 ? 100 + jx : 400 + jx;
        const cy = midY + jy;
        const fill = state === 0 ? '#3B82F6' : '#F59E0B';
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.75}
            aria-label={`Particle ${i}: state=${state === 0 ? 'Rain' : 'NoRain'}, weight=${w.toFixed(4)}`}
          />
        );
      })}
    </>
  );
}

export default function ParticleFilterVisualizer(): React.ReactElement {
  const [nParticles, setNParticles] = useState(20);
  const [evidence] = useState<number[]>(DEFAULT_EVIDENCE);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [delay, setDelay] = useState(800);
  const [phase, setPhase] = useState<PhaseView>('propagate');
  const [showSIS, setShowSIS] = useState(false);

  const T = evidence.length;
  const maxStep = T - 1;

  const pfSteps = useMemo(
    () => particleFilter(UMBRELLA_HMM, evidence, nParticles, 42),
    [nParticles, evidence]
  );

  const filterSteps = useMemo(
    () => hmmForward(UMBRELLA_HMM, evidence),
    [evidence]
  );

  const sisSteps = useMemo(
    () => showSIS ? runSIS(UMBRELLA_HMM, evidence, nParticles, 123) : [],
    [showSIS, nParticles, evidence]
  );

  useEffect(() => {
    if (!playing) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setStep(maxStep); setPlaying(false); return; }
    let lastTime = 0;
    let rafId: number;
    const loop = (ts: number) => {
      if (ts - lastTime >= delay) {
        lastTime = ts;
        setStep(prev => {
          if (prev >= maxStep) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [playing, delay, maxStep]);

  const handleReset = useCallback(() => { setStep(0); setPlaying(false); }, []);

  const currentPF = pfSteps[step];
  const currentFilter = filterSteps[step];

  const svgW = 500, svgH = 120;
  const chartW = 480, chartH = 150;

  // Comparison chart data
  const exactRainProbs = filterSteps.map(s => s.belief[0] ?? 0);
  const pfRainProbs = pfSteps.map(s => s.beliefEstimate[0] ?? 0);
  const sisRainProbs = sisSteps.map(s => s.beliefEstimate[0] ?? 0);

  const cTimeToX = (t: number) => 30 + (t / T) * (chartW - 40);
  const cValToY = (v: number) => chartH - 20 - v * (chartH - 35);

  const exactPath = exactRainProbs.map((p, i) => `${cTimeToX(i + 1)},${cValToY(p)}`).join(' ');
  const pfPath = pfRainProbs.map((p, i) => `${cTimeToX(i + 1)},${cValToY(p)}`).join(' ');
  const sisPath = sisRainProbs.map((p, i) => `${cTimeToX(i + 1)},${cValToY(p)}`).join(' ');

  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: '16px', padding: '24px', color: '#E2E8F0', fontFamily: 'var(--font-sans)' }}>
      <h2 style={{ color: COLOR, marginBottom: 8, fontSize: '1.4rem' }}>Particle Filter — Umbrella World</h2>

      {/* Explanatory */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
        <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: 6 }}>
          Particle filters approximate the belief distribution with N weighted samples (particles).
          Each cycle: <strong style={{ color: '#E2E8F0' }}>Propagate</strong> → <strong style={{ color: '#E2E8F0' }}>Weight</strong> → <strong style={{ color: '#E2E8F0' }}>Resample</strong>.
        </p>
        <span dangerouslySetInnerHTML={{ __html: renderInlineMath('P(X_t \\mid e_{1:t}) \\approx \\sum_i w_i^{(t)} \\delta_{X_t^{(i)}}') }} />
      </div>

      {/* Evidence sequence */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#64748B' }}>Evidence:</span>
        {evidence.map((e, i) => (
          <div key={i} style={{
            padding: '4px 8px', borderRadius: 6, fontSize: '13px',
            background: i === step ? COLOR + '20' : 'var(--surface-2)',
            border: `1px solid ${i === step ? COLOR : 'var(--surface-border)'}`,
          }}>
            {i + 1}: {e === 0 ? '☂️' : '☀️'}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <label style={{ fontSize: '12px', color: '#94A3B8' }}>
          N = {nParticles}
          <input type="range" min={10} max={200} step={10} value={nParticles}
            onChange={e => { setNParticles(parseInt(e.target.value)); handleReset(); }}
            style={{ display: 'block', width: 120, accentColor: COLOR }} />
        </label>
        <button style={btnStyle()} onClick={handleReset} aria-label="Reset">⏮</button>
        <button style={btnStyle()} onClick={() => setStep(p => Math.max(0, p - 1))} aria-label="Step back">◀</button>
        <button style={btnStyle(playing)} onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button style={btnStyle()} onClick={() => setStep(p => Math.min(maxStep, p + 1))} aria-label="Step forward">▶|</button>
        <label style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
          Speed
          <input type="range" min={200} max={2000} step={100} value={delay}
            onChange={e => setDelay(parseInt(e.target.value))}
            style={{ width: 80, accentColor: COLOR }} />
        </label>
        <span style={{ fontSize: '12px', color: '#64748B' }}>t={step + 1}/{T}</span>
      </div>

      {/* Phase selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['propagate', 'weight', 'resample'] as const).map(p => (
          <button key={p} style={btnStyle(phase === p)} onClick={() => setPhase(p)} aria-pressed={phase === p}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
        <button style={btnStyle(showSIS)} onClick={() => setShowSIS(s => !s)} aria-pressed={showSIS}>
          {showSIS ? 'Hide SIS' : 'Show SIS'}
        </button>
      </div>

      {/* Particle scatter */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', marginBottom: 6 }}>
          <span style={{ color: '#3B82F6' }}>🌧 Rain particles</span>
          <span>Phase: <strong style={{ color: COLOR }}>{phase}</strong></span>
          <span style={{ color: '#F59E0B' }}>☀️ NoRain particles</span>
        </div>
        <svg width={svgW} height={svgH} style={{ display: 'block', overflow: 'visible', maxWidth: '100%' }}
          role="img" aria-label={`Particle scatter at step ${step + 1}, phase ${phase}`}>
          {/* Background regions */}
          <rect x={20} y={10} width={180} height={svgH - 20} rx={8} fill="#3B82F610" stroke="#3B82F630" strokeWidth={1} />
          <rect x={300} y={10} width={180} height={svgH - 20} rx={8} fill="#F59E0B10" stroke="#F59E0B30" strokeWidth={1} />
          <text x={110} y={svgH - 6} fill="#3B82F6" fontSize={11} textAnchor="middle">Rain (state 0)</text>
          <text x={390} y={svgH - 6} fill="#F59E0B" fontSize={11} textAnchor="middle">NoRain (state 1)</text>

          {currentPF && (
            <ParticleDots pfStep={currentPF} phase={phase} svgW={svgW} svgH={svgH} />
          )}
        </svg>

        {/* Belief summary */}
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '13px' }}>
          <span>
            Particle P(Rain) ≈{' '}
            <strong style={{ color: '#3B82F6' }}>
              {((currentPF?.beliefEstimate[0] ?? 0) * 100).toFixed(1)}%
            </strong>
          </span>
          <span>
            Exact P(Rain) ={' '}
            <strong style={{ color: COLOR }}>
              {((currentFilter?.belief[0] ?? 0) * 100).toFixed(1)}%
            </strong>
          </span>
        </div>
      </div>

      {/* Comparison chart */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px', marginBottom: 16 }}>
        <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: 8 }}>
          Particle Filter vs Exact Filtering
          {showSIS && <span style={{ color: '#64748B', marginLeft: 8 }}>+ SIS (no resample)</span>}
        </div>
        <svg width={chartW} height={chartH} style={{ display: 'block', overflow: 'visible', maxWidth: '100%' }}
          role="img" aria-label="Comparison chart: particle filter vs exact filtering">
          {/* Axes */}
          <line x1={30} y1={chartH - 20} x2={chartW - 10} y2={chartH - 20} stroke="#374151" strokeWidth={1} />
          <line x1={30} y1={15} x2={30} y2={chartH - 20} stroke="#374151" strokeWidth={1} />
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <g key={v}>
              <line x1={26} y1={cValToY(v)} x2={30} y2={cValToY(v)} stroke="#374151" strokeWidth={1} />
              <text x={22} y={cValToY(v)} fill="#64748B" fontSize={8} textAnchor="end" dominantBaseline="middle">{v}</text>
            </g>
          ))}
          {evidence.map((_, i) => (
            <text key={i} x={cTimeToX(i + 1)} y={chartH - 6} fill="#64748B" fontSize={9} textAnchor="middle">t{i + 1}</text>
          ))}

          {/* Exact line */}
          <polyline points={exactPath} fill="none" stroke={COLOR} strokeWidth={2} />
          {exactRainProbs.map((p, i) => (
            <circle key={i} cx={cTimeToX(i + 1)} cy={cValToY(p)} r={3} fill={COLOR} />
          ))}

          {/* Particle filter line */}
          <polyline points={pfPath} fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5,3" />
          {pfRainProbs.map((p, i) => (
            <circle key={i} cx={cTimeToX(i + 1)} cy={cValToY(p)} r={3} fill="#3B82F6" />
          ))}

          {/* SIS line */}
          {showSIS && (
            <>
              <polyline points={sisPath} fill="none" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="3,3" />
              {sisRainProbs.map((p, i) => (
                <circle key={i} cx={cTimeToX(i + 1)} cy={cValToY(p)} r={2.5} fill="#F59E0B" />
              ))}
            </>
          )}

          {/* Current step marker */}
          <line
            x1={cTimeToX(step + 1)} y1={15}
            x2={cTimeToX(step + 1)} y2={chartH - 20}
            stroke="#FFFFFF" strokeWidth={1} strokeOpacity={0.2}
          />
        </svg>
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: '11px' }}>
          <span style={{ color: COLOR }}>— Exact filter</span>
          <span style={{ color: '#3B82F6' }}>-- Particle filter</span>
          {showSIS && <span style={{ color: '#F59E0B' }}>-- SIS (no resample)</span>}
        </div>
      </div>

      {/* State panel */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px' }}>
        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: 6 }}>Step {step + 1} Details</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '13px' }}>
          <span>Evidence: {evidence[step] === 0 ? '☂️ umbrella' : '☀️ no umbrella'}</span>
          <span>
            Particles:
            {' '}
            <span style={{ color: '#3B82F6' }}>
              {currentPF?.particles.filter(p => p === 0).length ?? 0} Rain
            </span>
            {' / '}
            <span style={{ color: '#F59E0B' }}>
              {currentPF?.particles.filter(p => p === 1).length ?? 0} NoRain
            </span>
          </span>
          <span>
            After resample:
            {' '}
            <span style={{ color: '#3B82F6' }}>
              {currentPF?.resampled.filter(p => p === 0).length ?? 0} Rain
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

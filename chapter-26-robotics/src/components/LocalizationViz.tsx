import React, { useState, useEffect, useRef, useCallback } from 'react';
import { runMCL, runEKF, type MCLStep, type EKFStep } from '../algorithms/index';

const CC = '#F59E0B';

const WORLD_LEN = 100;
const NUM_BEACONS = 3;

const MOVES = [5, 8, 6, 7, 5, 8, 6, 5];
const SENSOR_SIGMA = 3;
const MOTION_SIGMA = 1;

export default function LocalizationViz() {
  const [mode, setMode] = useState<'mcl' | 'ekf'>('mcl');
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [numParticles, setNumParticles] = useState(100);
  const [sensorSigma, setSensorSigma] = useState(3);
  const [seed, setSeed] = useState(42);

  const mclSteps = runMCL(numParticles, WORLD_LEN, NUM_BEACONS, MOVES, sensorSigma, MOTION_SIGMA, seed);
  const ekfSteps = runEKF(50, 10, 1, sensorSigma * sensorSigma,
    MOVES, MOVES.map((m, i) => 50 + MOVES.slice(0, i + 1).reduce((s, v) => s + v, 0) + (Math.sin(i * 1.3) * sensorSigma)));

  const steps = mode === 'mcl' ? mclSteps : ekfSteps;
  const totalSteps = steps.length;

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const tick = useCallback((now: number) => {
    const interval = 1000 / (speed * 2);
    if (now - lastTimeRef.current >= interval) {
      setStepIdx(prev => {
        if (prev >= totalSteps - 1) { setPlaying(false); return prev; }
        return prev + 1;
      });
      lastTimeRef.current = now;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [speed, totalSteps]);

  useEffect(() => {
    if (playing) rafRef.current = requestAnimationFrame(tick);
    else if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, tick]);

  const reset = () => { setStepIdx(0); setPlaying(false); };

  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const currentMCL = mode === 'mcl' ? (mclSteps[Math.min(stepIdx, mclSteps.length - 1)] as MCLStep) : null;
  const currentEKF = mode === 'ekf' ? (ekfSteps[Math.min(stepIdx, ekfSteps.length - 1)] as EKFStep) : null;

  const beaconPositions = [1, 2, 3].map(i => (i / (NUM_BEACONS + 1)) * WORLD_LEN);

  const VW = 500;
  const VH = 80;

  const renderMCL = (step: MCLStep) => {
    const maxWeight = Math.max(...step.particles.map(p => p.weight));
    return (
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="MCL particle filter">
        {/* World */}
        <rect x={0} y={20} width={VW} height={30} fill="#1A1A24" />

        {/* Beacons */}
        {beaconPositions.map((bx, i) => {
          const bxPx = (bx / WORLD_LEN) * VW;
          return (
            <g key={i}>
              <line x1={bxPx} y1={15} x2={bxPx} y2={55} stroke="#6366F160" strokeWidth={1} strokeDasharray="3 2" />
              <text x={bxPx} y={10} textAnchor="middle" fill="#6366F1" fontSize={8}>B{i + 1}</text>
            </g>
          );
        })}

        {/* Particles */}
        {step.particles.map((p, i) => {
          const px = (p.x / WORLD_LEN) * VW;
          const opacity = maxWeight > 0 ? (p.weight / maxWeight) * 0.85 + 0.1 : 0.3;
          const h = 4 + (p.weight / (maxWeight || 1)) * 20;
          return (
            <rect key={i} x={px - 1} y={35 - h / 2} width={2} height={h}
              fill={CC} opacity={opacity} />
          );
        })}

        {/* True robot position */}
        <circle cx={(step.truePose.x / WORLD_LEN) * VW} cy={35} r={6}
          fill="#EF4444" stroke="white" strokeWidth={1.5} />
        <text x={(step.truePose.x / WORLD_LEN) * VW} y={70}
          textAnchor="middle" fill="#EF4444" fontSize={8} fontWeight={700}>TRUE</text>
      </svg>
    );
  };

  const renderEKF = (step: EKFStep) => {
    const mu = step.posteriorMean;
    const sigma = Math.sqrt(step.posteriorVariance);
    const muPx = (mu / WORLD_LEN) * VW;
    const sigmaPx = (sigma / WORLD_LEN) * VW;

    // Gaussian curve
    const points: string[] = [];
    for (let xi = 0; xi < VW; xi += 2) {
      const x = (xi / VW) * WORLD_LEN;
      const y = Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
      points.push(`${xi},${35 - y * 20}`);
    }

    return (
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="EKF localization">
        <rect x={0} y={20} width={VW} height={30} fill="#1A1A24" />

        {/* Confidence interval */}
        <rect x={Math.max(0, muPx - 2 * sigmaPx)} y={20} width={Math.min(VW, 4 * sigmaPx)} height={30}
          fill={`${CC}15`} />

        {/* Gaussian curve */}
        <polyline points={points.join(' ')} fill="none" stroke={CC} strokeWidth={2} />

        {/* Mean */}
        <line x1={muPx} y1={15} x2={muPx} y2={55} stroke={CC} strokeWidth={2} />
        <text x={muPx} y={12} textAnchor="middle" fill={CC} fontSize={8}>μ={mu.toFixed(1)}</text>

        {/* Measurement */}
        <line x1={(step.measurement / WORLD_LEN) * VW} y1={20} x2={(step.measurement / WORLD_LEN) * VW} y2={50}
          stroke="#60A5FA" strokeWidth={1.5} strokeDasharray="3 2" />
        <text x={(step.measurement / WORLD_LEN) * VW} y={68}
          textAnchor="middle" fill="#60A5FA" fontSize={8}>z={step.measurement.toFixed(1)}</text>
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '8px' }}>§26.4 Robotic Perception & Localization</h3>
        <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
          Robot localization: estimate where the robot is from sensor data.
          Two key approaches: <strong style={{ color: CC }}>Monte Carlo Localization (MCL)</strong> uses
          particles to represent belief as a distribution; <strong style={{ color: '#60A5FA' }}>Extended Kalman Filter (EKF)</strong>
          represents belief as a Gaussian (mean + covariance).
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['mcl', 'ekf'] as const).map(m => (
            <button key={m}
              onClick={() => { setMode(m); reset(); }}
              style={{
                background: mode === m ? `${m === 'mcl' ? CC : '#60A5FA'}20` : '#1A1A24',
                border: `1px solid ${mode === m ? (m === 'mcl' ? CC : '#60A5FA') : 'rgba(255,255,255,0.08)'}`,
                color: mode === m ? (m === 'mcl' ? CC : '#60A5FA') : '#9CA3AF',
                borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              }}
              aria-pressed={mode === m}>
              {m === 'mcl' ? 'MCL (Particle Filter)' : 'EKF (Kalman Filter)'}
            </button>
          ))}
        </div>

        {/* Visualization */}
        {prefersReducedMotion ? (
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
            Animation disabled. Use step controls to advance.
          </div>
        ) : (
          <div style={{ background: '#1A1A24', borderRadius: '8px', padding: '12px' }}>
            <div style={{ marginBottom: '8px', color: '#6B7280', fontSize: '11px' }}>
              World: 0 ←→ 100 | Beacons at positions B1, B2, B3 | Robot moves right
            </div>
            {mode === 'mcl' && currentMCL && renderMCL(currentMCL)}
            {mode === 'ekf' && currentEKF && renderEKF(currentEKF)}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
            style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
            aria-label="Step back">◀ Step</button>
          <button onClick={() => setPlaying(p => !p)}
            style={{ background: `${CC}20`, border: `1px solid ${CC}`, borderRadius: '6px', color: CC, padding: '6px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
            aria-label={playing ? 'Pause' : 'Play'}>{playing ? '⏸ Pause' : '▶ Play'}</button>
          <button onClick={() => setStepIdx(Math.min(totalSteps - 1, stepIdx + 1))}
            style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'white', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
            aria-label="Step forward">Step ▶</button>
          <button onClick={reset}
            style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#9CA3AF', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
            aria-label="Reset">↺ Reset</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '12px' }}>
            Speed
            <input type="range" min={1} max={8} value={speed} onChange={e => setSpeed(Number(e.target.value))}
              style={{ width: '70px' }} aria-label="Speed" />{speed}×
          </label>
        </div>

        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
          Step {stepIdx + 1} / {totalSteps}
        </div>

        {/* Current action */}
        {steps[Math.min(stepIdx, steps.length - 1)] && (
          <div style={{ marginTop: '8px', background: '#0A0A0F', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#D1D5DB', fontFamily: 'monospace' }}>
            {steps[Math.min(stepIdx, steps.length - 1)]!.action}
          </div>
        )}

        {/* What-if controls */}
        <div style={{ marginTop: '14px', background: '#0A0A0F', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: CC, marginBottom: '10px' }}>🔧 What-If Controls</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            {mode === 'mcl' && (
              <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
                Num Particles: <span style={{ color: CC }}>{numParticles}</span>
                <input type="range" min={10} max={300} step={10} value={numParticles}
                  onChange={e => { setNumParticles(Number(e.target.value)); reset(); }}
                  style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Number of particles" />
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Fewer = coarser belief; more = smoother</div>
              </label>
            )}
            <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
              Sensor Noise σ: <span style={{ color: CC }}>{sensorSigma}</span>
              <input type="range" min={0.5} max={15} step={0.5} value={sensorSigma}
                onChange={e => { setSensorSigma(Number(e.target.value)); reset(); }}
                style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Sensor noise sigma" />
              <div style={{ fontSize: '11px', color: '#6B7280' }}>Higher noise = wider uncertainty</div>
            </label>
            {mode === 'mcl' && (
              <label style={{ color: '#9CA3AF', fontSize: '12px' }}>
                Seed: <span style={{ color: CC }}>{seed}</span>
                <input type="range" min={1} max={100} value={seed}
                  onChange={e => { setSeed(Number(e.target.value)); reset(); }}
                  style={{ display: 'block', width: '100%', marginTop: '4px' }} aria-label="Random seed" />
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Different noise realizations</div>
              </label>
            )}
          </div>
        </div>

        {/* State panel */}
        <div style={{ marginTop: '12px', background: '#0A0A0F', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: CC, marginBottom: '8px' }}>State Inspection</div>
          {mode === 'mcl' && currentMCL && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {[
                { label: 'True Position', value: currentMCL.truePose.x.toFixed(1) },
                { label: 'Sensor Reading', value: currentMCL.sensorReading.toFixed(2) },
                { label: '# Particles', value: currentMCL.particles.length },
                { label: 'Max Weight', value: Math.max(...currentMCL.particles.map(p => p.weight)).toFixed(4) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#111118', borderRadius: '6px', padding: '8px' }}>
                  <div style={{ color: '#6B7280', marginBottom: '2px' }}>{label}</div>
                  <div style={{ color: 'white', fontWeight: 600 }}>{String(value)}</div>
                </div>
              ))}
            </div>
          )}
          {mode === 'ekf' && currentEKF && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {[
                { label: 'Prior Mean', value: currentEKF.priorMean.toFixed(2) },
                { label: 'Prior Variance', value: currentEKF.priorVariance.toFixed(3) },
                { label: 'Kalman Gain K', value: currentEKF.kalmanGain.toFixed(3) },
                { label: 'Posterior Mean', value: currentEKF.posteriorMean.toFixed(2) },
                { label: 'Post. Variance', value: currentEKF.posteriorVariance.toFixed(3) },
                { label: 'Measurement z', value: currentEKF.measurement.toFixed(2) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#111118', borderRadius: '6px', padding: '8px' }}>
                  <div style={{ color: '#6B7280', marginBottom: '2px' }}>{label}</div>
                  <div style={{ color: 'white', fontWeight: 600 }}>{String(value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MCL vs EKF comparison */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: CC, marginBottom: '12px' }}>MCL vs EKF: When to Use Which?</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            {
              name: 'MCL (Particle Filter)', color: CC,
              pros: ['Handles multi-modal beliefs (robot confused about location)', 'Non-parametric (any distribution shape)', 'Easy to implement'],
              cons: ['O(N) memory and compute per step', 'Degrades with many particles needed', 'Particle depletion problem'],
            },
            {
              name: 'EKF (Kalman Filter)', color: '#60A5FA',
              pros: ['O(n²) in state dimension only', 'Closed-form solution', 'Optimal for linear Gaussian systems'],
              cons: ['Assumes unimodal Gaussian belief', 'Linearization errors for non-linear systems', 'Landmark data association problem'],
            },
          ].map(item => (
            <div key={item.name} style={{ background: '#1A1A24', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontWeight: 700, color: item.color, marginBottom: '8px' }}>{item.name}</div>
              <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                {item.pros.map(p => <div key={p} style={{ color: '#34D399', marginBottom: '3px' }}>✓ {p}</div>)}
              </div>
              <div style={{ fontSize: '12px' }}>
                {item.cons.map(c => <div key={c} style={{ color: '#F87171', marginBottom: '3px' }}>✗ {c}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

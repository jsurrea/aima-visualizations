import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { kalmanFilter1D, kalmanFilter2D } from '../algorithms';
import type { KalmanParams1D, KalmanParams2D } from '../algorithms';
import { renderInlineMath, renderDisplayMath } from '../utils/mathUtils';

const COLOR = '#EC4899';

function btnStyle(active = false): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: '8px',
    border: `1px solid ${active ? COLOR : COLOR + '40'}`,
    background: active ? COLOR + '30' : COLOR + '15',
    color: COLOR, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  };
}

const DEFAULT_OBS_1D = [0.5, 1.2, 0.8, 2.1, 1.5, 1.8, 0.9, 1.6];

const TRUE_TRAJ = Array.from({ length: 20 }, (_, i) => ({
  x: Math.cos(i * Math.PI / 10) * 3,
  y: Math.sin(i * Math.PI / 10) * 3,
}));

const OBS_2D: [number, number][] = TRUE_TRAJ.map((p, i) => [
  p.x + (i % 3 === 0 ? 0.5 : -0.3),
  p.y + (i % 2 === 0 ? 0.4 : -0.4),
]);

function buildParams2D(sigmaZRatio: number): KalmanParams2D {
  const dt = 0.5;
  const sigmaObs = sigmaZRatio;
  // Initial velocity estimated from first two trajectory points
  const vx0 = TRUE_TRAJ[1] ? (TRUE_TRAJ[1].x - TRUE_TRAJ[0]!.x) / dt : 0;
  const vy0 = TRUE_TRAJ[1] ? (TRUE_TRAJ[1].y - TRUE_TRAJ[0]!.y) / dt : 0;
  return {
    mu0: [TRUE_TRAJ[0]!.x, TRUE_TRAJ[0]!.y, vx0, vy0] as ReadonlyArray<number>,
    sigma0: [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ] as ReadonlyArray<ReadonlyArray<number>>,
    F: [
      [1, 0, dt, 0],
      [0, 1, 0, dt],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ] as ReadonlyArray<ReadonlyArray<number>>,
    sigmaX: [
      [0.1, 0, 0, 0],
      [0, 0.1, 0, 0],
      [0, 0, 0.1, 0],
      [0, 0, 0, 0.1],
    ] as ReadonlyArray<ReadonlyArray<number>>,
    H: [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
    ] as ReadonlyArray<ReadonlyArray<number>>,
    sigmaZ: [
      [sigmaObs * sigmaObs, 0],
      [0, sigmaObs * sigmaObs],
    ] as ReadonlyArray<ReadonlyArray<number>>,
    observations: OBS_2D as ReadonlyArray<ReadonlyArray<number>>,
  };
}

// Bell curve SVG path (Gaussian) centered at cx, top at cy, width proportional to sigma
function gaussianPath(cx: number, baseY: number, sigma: number, scale: number): string {
  const pts: string[] = [];
  const w = Math.max(sigma * 3, 5);
  for (let dx = -w; dx <= w; dx += w / 20) {
    const x = cx + dx;
    const prob = Math.exp(-(dx * dx) / (2 * sigma * sigma));
    const y = baseY - prob * scale;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
}

// Compute covariance ellipse params from 2×2 matrix [[a,b],[b,d]]
function covEllipse(a: number, b: number, d: number): { rx: number; ry: number; angleDeg: number } {
  const trace2 = (a + d) / 2;
  const det = Math.sqrt(Math.max(0, ((a - d) / 2) ** 2 + b * b));
  const lam1 = trace2 + det;
  const lam2 = trace2 - det;
  const rx = Math.sqrt(Math.abs(lam1));
  const ry = Math.sqrt(Math.abs(lam2));
  const angleDeg = (Math.atan2(b, lam1 - a) * 180) / Math.PI;
  return { rx, ry, angleDeg };
}

// World to SVG coordinate
function worldToSvg(val: number, svgSize: number, worldRange: number): number {
  return ((val + worldRange) / (2 * worldRange)) * svgSize;
}

export default function KalmanFilterVisualizer(): React.ReactElement {
  // 1D params
  const [mu0, setMu0] = useState(0);
  const [sigma0Sq, setSigma0Sq] = useState(1);
  const [sigmaXSq, setSigmaXSq] = useState(0.5);
  const [sigmaZSq, setSigmaZSq] = useState(1);
  const [step1D, setStep1D] = useState(0);
  const [playing1D, setPlaying1D] = useState(false);
  const [delay1D, setDelay1D] = useState(700);

  // 2D params
  const [sigmaZRatio, setSigmaZRatio] = useState(0.5);
  const [step2D, setStep2D] = useState(0);
  const [playing2D, setPlaying2D] = useState(false);
  const [delay2D, setDelay2D] = useState(600);

  const params1D: KalmanParams1D = useMemo(() => ({
    mu0, sigma0Sq, sigmaXSq, sigmaZSq,
    observations: DEFAULT_OBS_1D,
  }), [mu0, sigma0Sq, sigmaXSq, sigmaZSq]);

  const steps1D = useMemo(() => kalmanFilter1D(params1D), [params1D]);
  const T1D = steps1D.length;
  const maxStep1D = T1D - 1;

  const params2D = useMemo(() => buildParams2D(sigmaZRatio), [sigmaZRatio]);
  const steps2D = useMemo(() => kalmanFilter2D(params2D), [params2D]);
  const T2D = steps2D.length;
  const maxStep2D = T2D - 1;

  // 1D animation
  useEffect(() => {
    if (!playing1D) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setStep1D(maxStep1D); setPlaying1D(false); return; }
    let lastTime = 0;
    let rafId: number;
    const loop = (ts: number) => {
      if (ts - lastTime >= delay1D) {
        lastTime = ts;
        setStep1D(prev => {
          if (prev >= maxStep1D) { setPlaying1D(false); return prev; }
          return prev + 1;
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [playing1D, delay1D, maxStep1D]);

  // 2D animation
  useEffect(() => {
    if (!playing2D) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setStep2D(maxStep2D); setPlaying2D(false); return; }
    let lastTime = 0;
    let rafId: number;
    const loop = (ts: number) => {
      if (ts - lastTime >= delay2D) {
        lastTime = ts;
        setStep2D(prev => {
          if (prev >= maxStep2D) { setPlaying2D(false); return prev; }
          return prev + 1;
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [playing2D, delay2D, maxStep2D]);

  const reset1D = useCallback(() => { setStep1D(0); setPlaying1D(false); }, []);
  const reset2D = useCallback(() => { setStep2D(0); setPlaying2D(false); }, []);

  // 1D chart constants
  const chartW = 560, chartH = 200;
  const yMin = -3, yMax = 5;
  const timeToX = (t: number) => 30 + (t / T1D) * (chartW - 50);
  const valToY = (v: number) => chartH - 20 - ((v - yMin) / (yMax - yMin)) * (chartH - 40);

  const currentStep1D = steps1D[step1D];
  const kGain = currentStep1D?.kalmanGain ?? 0;
  const mu = currentStep1D?.posteriorMean ?? 0;
  const varPost = currentStep1D?.posteriorVar ?? 1;
  const sigma = Math.sqrt(Math.max(0, varPost));

  // Build 1D path
  const meanPath = steps1D.slice(0, step1D + 1).map((s, i) =>
    `${timeToX(i + 1)},${valToY(s.posteriorMean)}`
  ).join(' ');

  // Build ±1σ band polygon
  const bandPoints = [
    ...steps1D.slice(0, step1D + 1).map((s, i) => {
      const sx = Math.sqrt(Math.max(0, s.posteriorVar));
      return `${timeToX(i + 1)},${valToY(s.posteriorMean + sx)}`;
    }),
    ...steps1D.slice(0, step1D + 1).reverse().map((s, i, arr) => {
      const sx = Math.sqrt(Math.max(0, s.posteriorVar));
      const origIdx = step1D - i;
      return `${timeToX(origIdx + 1)},${valToY(s.posteriorMean - sx)}`;
    }),
  ].join(' ');

  // 2D chart
  const svgW2 = 400, svgH2 = 350;
  const worldRange = 4;
  const w2s = (v: number) => worldToSvg(v, svgW2, worldRange);
  const h2s = (v: number) => svgH2 - worldToSvg(v, svgH2, worldRange);

  const filteredPath2D = steps2D.slice(0, step2D + 1).map(s =>
    `${w2s(s.mu[0]!)},${h2s(s.mu[1]!)}`
  ).join(' ');

  const truePath2D = TRUE_TRAJ.slice(0, step2D + 1).map(p =>
    `${w2s(p.x)},${h2s(p.y)}`
  ).join(' ');

  const step2DData = steps2D[step2D];
  const cov2D = step2DData?.sigma;
  const mu2D = step2DData?.mu;
  const ellipse = useMemo(() => {
    if (!cov2D) return null;
    const a = cov2D[0]?.[0] ?? 1;
    const b = cov2D[0]?.[1] ?? 0;
    const d = cov2D[1]?.[1] ?? 1;
    return covEllipse(a, b, d);
  }, [cov2D]);

  const ex = mu2D ? w2s(mu2D[0]!) : svgW2 / 2;
  const ey = mu2D ? h2s(mu2D[1]!) : svgH2 / 2;
  const ellipseScale = svgW2 / (2 * worldRange);

  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: '16px', padding: '24px', color: '#E2E8F0', fontFamily: 'var(--font-sans)' }}>
      <h2 style={{ color: COLOR, marginBottom: 8, fontSize: '1.4rem' }}>Kalman Filter</h2>

      {/* ─── 1D Section ─── */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <h3 style={{ color: '#94A3B8', fontSize: '1rem', marginBottom: 8 }}>1D Kalman Filter</h3>
        <div dangerouslySetInnerHTML={{ __html: renderDisplayMath('K_t = \\dfrac{\\sigma^2_{t|t-1}}{\\sigma^2_{t|t-1} + \\sigma^2_z}, \\quad \\mu_t = \\mu_{t|t-1} + K_t(z_t - \\mu_{t|t-1})') }} />

        {/* 1D sliders */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            { label: 'μ₀', min: -2, max: 2, step: 0.1, val: mu0, set: (v: number) => { setMu0(v); reset1D(); } },
            { label: 'σ²₀', min: 0.1, max: 5, step: 0.1, val: sigma0Sq, set: (v: number) => { setSigma0Sq(v); reset1D(); } },
            { label: 'σ²_x', min: 0.01, max: 2, step: 0.01, val: sigmaXSq, set: (v: number) => { setSigmaXSq(v); reset1D(); } },
            { label: 'σ²_z', min: 0.01, max: 5, step: 0.01, val: sigmaZSq, set: (v: number) => { setSigmaZSq(v); reset1D(); } },
          ].map(({ label, min, max, step: stp, val, set }) => (
            <label key={label} style={{ fontSize: '12px', color: '#94A3B8' }}>
              {label} = {val.toFixed(2)}
              <input type="range" min={min} max={max} step={stp} value={val}
                onChange={e => set(parseFloat(e.target.value))}
                style={{ display: 'block', width: 100, accentColor: COLOR }} />
            </label>
          ))}
          <div style={{ fontSize: '12px', color: '#64748B', alignSelf: 'center' }}>
            σ²_x/σ²_z = {(sigmaXSq / sigmaZSq).toFixed(2)}
          </div>
        </div>

        {/* 1D SVG chart */}
        <svg width={chartW} height={chartH} style={{ display: 'block', overflow: 'visible', maxWidth: '100%' }}
          role="img" aria-label="1D Kalman filter chart">
          {/* Axes */}
          <line x1={30} y1={chartH - 20} x2={chartW - 10} y2={chartH - 20} stroke="#374151" strokeWidth={1} />
          <line x1={30} y1={20} x2={30} y2={chartH - 20} stroke="#374151" strokeWidth={1} />
          {[-2, 0, 2, 4].map(v => (
            <g key={v}>
              <line x1={26} y1={valToY(v)} x2={30} y2={valToY(v)} stroke="#374151" strokeWidth={1} />
              <text x={22} y={valToY(v)} fill="#64748B" fontSize={9} textAnchor="end" dominantBaseline="middle">{v}</text>
            </g>
          ))}
          {DEFAULT_OBS_1D.map((_, i) => (
            <text key={i} x={timeToX(i + 1)} y={chartH - 6} fill="#64748B" fontSize={9} textAnchor="middle">t{i + 1}</text>
          ))}

          {/* ±1σ band */}
          {step1D > 0 && (
            <polygon points={bandPoints} fill={COLOR} fillOpacity={0.15} stroke="none" />
          )}

          {/* Mean line */}
          {step1D > 0 && (
            <polyline points={meanPath} fill="none" stroke={COLOR} strokeWidth={2} />
          )}

          {/* Observation dots */}
          {DEFAULT_OBS_1D.slice(0, step1D + 1).map((obs, i) => (
            <circle key={i} cx={timeToX(i + 1)} cy={valToY(obs)} r={4} fill="#9CA3AF" />
          ))}

          {/* Current step vertical line */}
          <line
            x1={timeToX(step1D + 1)} y1={20}
            x2={timeToX(step1D + 1)} y2={chartH - 20}
            stroke={COLOR} strokeWidth={1} strokeDasharray="4,3" />

          {/* Bell curve at current step */}
          {sigma > 0 && (
            <path
              d={gaussianPath(timeToX(step1D + 1), valToY(mu), sigma * 15, 25)}
              fill="none" stroke={COLOR} strokeWidth={1.5} strokeOpacity={0.6}
            />
          )}
        </svg>

        {/* 1D state panel */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10, marginTop: 8 }}>
          {[
            { label: 't', val: String(step1D + 1) },
            { label: 'μ_t', val: mu.toFixed(3) },
            { label: 'σ²_t', val: varPost.toFixed(3) },
            { label: 'K', val: kGain.toFixed(3) },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '6px 12px', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}><span dangerouslySetInnerHTML={{ __html: renderInlineMath(label) }} /></span>
              {' = '}
              <strong style={{ color: COLOR }}>{val}</strong>
            </div>
          ))}
        </div>

        {/* 1D controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={btnStyle()} onClick={reset1D} aria-label="Reset">⏮</button>
          <button style={btnStyle()} onClick={() => setStep1D(p => Math.max(0, p - 1))} aria-label="Step back">◀</button>
          <button style={btnStyle(playing1D)} onClick={() => setPlaying1D(p => !p)} aria-label={playing1D ? 'Pause' : 'Play'}>
            {playing1D ? '⏸' : '▶'}
          </button>
          <button style={btnStyle()} onClick={() => setStep1D(p => Math.min(maxStep1D, p + 1))} aria-label="Step forward">▶|</button>
          <label style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            Speed
            <input type="range" min={200} max={2000} step={100} value={delay1D}
              onChange={e => setDelay1D(parseInt(e.target.value))}
              style={{ width: 80, accentColor: COLOR }} />
          </label>
          <span style={{ fontSize: '12px', color: '#64748B' }}>t={step1D + 1}/{T1D}</span>
        </div>
      </div>

      {/* ─── 2D Section ─── */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '16px 20px' }}>
        <h3 style={{ color: '#94A3B8', fontSize: '1rem', marginBottom: 8 }}>2D Kalman Filter (Constant Velocity)</h3>
        <p style={{ fontSize: '12px', color: '#64748B', marginBottom: 12 }}>
          State = [x, y, vx, vy]. Robot moves in a circle; only position [x,y] is observed.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: '#94A3B8' }}>
            σ_z ratio = {sigmaZRatio.toFixed(1)}
            <input type="range" min={0.1} max={3.0} step={0.1} value={sigmaZRatio}
              onChange={e => { setSigmaZRatio(parseFloat(e.target.value)); reset2D(); }}
              style={{ display: 'block', width: 140, accentColor: COLOR }} />
          </label>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            (Higher σ_z = trust prediction more)
          </div>
        </div>

        <svg width={svgW2} height={svgH2}
          style={{ display: 'block', background: '#0D1117', borderRadius: 10, maxWidth: '100%' }}
          role="img" aria-label="2D Kalman filter trajectory">
          {/* Grid lines */}
          {[-3,-2,-1,0,1,2,3].map(v => (
            <g key={v}>
              <line x1={w2s(v)} y1={0} x2={w2s(v)} y2={svgH2} stroke="#1E293B" strokeWidth={1} />
              <line x1={0} y1={h2s(v)} x2={svgW2} y2={h2s(v)} stroke="#1E293B" strokeWidth={1} />
            </g>
          ))}

          {/* True trajectory (dashed) */}
          {TRUE_TRAJ.length > 1 && (
            <polyline
              points={TRUE_TRAJ.map(p => `${w2s(p.x)},${h2s(p.y)}`).join(' ')}
              fill="none" stroke="#374151" strokeWidth={1.5} strokeDasharray="5,4"
            />
          )}

          {/* Observations */}
          {OBS_2D.slice(0, step2D + 1).map(([ox, oy], i) => (
            <circle key={i} cx={w2s(ox)} cy={h2s(oy)} r={3} fill="#9CA3AF" />
          ))}

          {/* Filtered path */}
          {step2D > 0 && (
            <polyline points={filteredPath2D} fill="none" stroke={COLOR} strokeWidth={2} />
          )}

          {/* Current position + covariance ellipse */}
          {mu2D && ellipse && (
            <>
              <ellipse
                cx={ex} cy={ey}
                rx={ellipse.rx * ellipseScale}
                ry={ellipse.ry * ellipseScale}
                transform={`rotate(${ellipse.angleDeg} ${ex} ${ey})`}
                fill={COLOR} fillOpacity={0.15}
                stroke={COLOR} strokeWidth={1} strokeOpacity={0.5}
              />
              <circle cx={ex} cy={ey} r={5} fill={COLOR} />
            </>
          )}

          {/* True current position */}
          {TRUE_TRAJ[step2D] && (
            <circle cx={w2s(TRUE_TRAJ[step2D]!.x)} cy={h2s(TRUE_TRAJ[step2D]!.y)} r={4} fill="#10B981" />
          )}

          {/* Legend */}
          <g>
            <line x1={10} y1={15} x2={28} y2={15} stroke="#374151" strokeWidth={1.5} strokeDasharray="4,3" />
            <text x={32} y={15} fill="#64748B" fontSize={10} dominantBaseline="middle">True path</text>
            <circle cx={14} cy={30} r={3} fill="#9CA3AF" />
            <text x={22} y={30} fill="#64748B" fontSize={10} dominantBaseline="middle">Obs</text>
            <line x1={10} y1={45} x2={28} y2={45} stroke={COLOR} strokeWidth={2} />
            <text x={32} y={45} fill="#64748B" fontSize={10} dominantBaseline="middle">Filtered</text>
            <circle cx={14} cy={60} r={4} fill="#10B981" />
            <text x={22} y={60} fill="#64748B" fontSize={10} dominantBaseline="middle">True now</text>
          </g>
        </svg>

        {/* 2D controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          <button style={btnStyle()} onClick={reset2D} aria-label="Reset">⏮</button>
          <button style={btnStyle()} onClick={() => setStep2D(p => Math.max(0, p - 1))} aria-label="Step back">◀</button>
          <button style={btnStyle(playing2D)} onClick={() => setPlaying2D(p => !p)} aria-label={playing2D ? 'Pause' : 'Play'}>
            {playing2D ? '⏸' : '▶'}
          </button>
          <button style={btnStyle()} onClick={() => setStep2D(p => Math.min(maxStep2D, p + 1))} aria-label="Step forward">▶|</button>
          <label style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            Speed
            <input type="range" min={200} max={2000} step={100} value={delay2D}
              onChange={e => setDelay2D(parseInt(e.target.value))}
              style={{ width: 80, accentColor: COLOR }} />
          </label>
          <span style={{ fontSize: '12px', color: '#64748B' }}>t={step2D + 1}/{T2D}</span>
        </div>
      </div>
    </div>
  );
}

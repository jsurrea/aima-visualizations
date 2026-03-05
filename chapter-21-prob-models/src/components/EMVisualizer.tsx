import { useState, useEffect, useRef, useCallback } from 'react';
import { renderDisplayMath, renderInlineMath } from '../utils/mathUtils';
import {
  emMixtureOfGaussians,
  gaussianPDF,
  type GaussianComponent,
  type EMStep,
} from '../algorithms';

const COLOR = '#10B981';
const COMPONENT_COLORS = ['#6366F1', '#EF4444', '#F59E0B', '#3B82F6'] as const;

function MathBlock({ latex }: { latex: string }) {
  return (
    <div
      style={{ overflowX: 'auto', margin: '8px 0' }}
      dangerouslySetInnerHTML={{ __html: renderDisplayMath(latex) }}
    />
  );
}
function InlineMath({ latex }: { latex: string }) {
  return <span dangerouslySetInnerHTML={{ __html: renderInlineMath(latex) }} />;
}
function btnStyle(color: string): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: '8px',
    border: `1px solid ${color}40`,
    background: `${color}15`,
    color,
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  };
}

// ─── Default scenario: two-cluster data ──────────────────────────────────────

function generateTwoClusterData(seed = 42): number[] {
  // Seeded PRNG (xorshift)
  let s = seed;
  function rng() {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  }
  // Box-Muller for Gaussian samples
  function randn(mu: number, sigma: number): number {
    const u1 = rng(), u2 = rng();
    return mu + sigma * Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  }
  const data: number[] = [];
  for (let i = 0; i < 25; i++) data.push(randn(2, 0.6));
  for (let i = 0; i < 25; i++) data.push(randn(7, 0.8));
  return data.map(x => Math.round(x * 100) / 100);
}

function generateThreeClusterData(seed = 7): number[] {
  let s = seed;
  function rng() { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; }
  function randn(mu: number, sigma: number) {
    const u1 = rng(), u2 = rng();
    return mu + sigma * Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  }
  const data: number[] = [];
  for (let i = 0; i < 20; i++) data.push(randn(1, 0.4));
  for (let i = 0; i < 20; i++) data.push(randn(5, 0.5));
  for (let i = 0; i < 20; i++) data.push(randn(9, 0.6));
  return data.map(x => Math.round(x * 100) / 100);
}

// ─── EMVisualizer ─────────────────────────────────────────────────────────────

const SCENARIOS = {
  'two-clusters': {
    label: '2 Clusters',
    data: generateTwoClusterData(),
    k: 2,
    initComponents: [
      { weight: 0.5, mean: 1, stdDev: 2 },
      { weight: 0.5, mean: 8, stdDev: 2 },
    ] as GaussianComponent[],
  },
  'three-clusters': {
    label: '3 Clusters',
    data: generateThreeClusterData(),
    k: 3,
    initComponents: [
      { weight: 0.33, mean: 2, stdDev: 2 },
      { weight: 0.34, mean: 5, stdDev: 2 },
      { weight: 0.33, mean: 8, stdDev: 2 },
    ] as GaussianComponent[],
  },
} as const;

export function EMVisualizer() {
  const [scenario, setScenario] = useState<keyof typeof SCENARIOS>('two-clusters');
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const [maxIter, setMaxIter] = useState(15);
  const [customK, setCustomK] = useState<2 | 3>(2);

  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sc = SCENARIOS[scenario];
  const steps = emMixtureOfGaussians(sc.data, sc.k, maxIter, sc.initComponents);

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

  const step = steps[currentStep];
  if (!step) return null;

  const data = sc.data;
  const components = step.components;
  const responsibilities = step.responsibilities;

  // ── Chart: data + Gaussian curves ──────────────────────────────────────────
  const chartW = 480;
  const chartH = 160;
  const pad = { left: 30, right: 10, top: 15, bottom: 22 };
  const plotW = chartW - pad.left - pad.right;
  const plotH = chartH - pad.top - pad.bottom;

  const xMin = Math.min(...data) - 1.5;
  const xMax = Math.max(...data) + 1.5;
  const xRange = xMax - xMin;
  const toX = (v: number) => pad.left + ((v - xMin) / xRange) * plotW;

  // Max density for scaling
  const nPts = 150;
  let maxDensity = 0.01;
  for (const comp of components) {
    const peak = comp.weight * gaussianPDF(comp.mean, comp.mean, comp.stdDev);
    if (peak > maxDensity) maxDensity = peak;
  }
  const toY = (density: number) => pad.top + plotH - (density / maxDensity) * plotH;

  function componentPath(comp: GaussianComponent): string {
    return Array.from({ length: nPts }, (_, i) => {
      const x = xMin + (i / (nPts - 1)) * xRange;
      const d = comp.weight * gaussianPDF(x, comp.mean, comp.stdDev);
      return `${toX(x)},${toY(d)}`;
    }).join(' ');
  }

  // Mixture density path
  const mixturePath = Array.from({ length: nPts }, (_, i) => {
    const x = xMin + (i / (nPts - 1)) * xRange;
    const d = components.reduce((s, c) => s + c.weight * gaussianPDF(x, c.mean, c.stdDev), 0);
    return `${toX(x)},${toY(d)}`;
  }).join(' ');

  // ── Responsibility colors: blend component colors ───────────────────────────
  function getDataPointColor(j: number): string {
    if (!responsibilities) return '#9CA3AF';
    const row = responsibilities[j];
    if (!row) return '#9CA3AF';
    // Take argmax for color
    const maxComp = row.indexOf(Math.max(...row));
    return COMPONENT_COLORS[maxComp % COMPONENT_COLORS.length] ?? '#9CA3AF';
  }

  // ── Log-likelihood sparkline ────────────────────────────────────────────────
  const llValues = steps.filter(s => s.phase !== 'E').map(s => s.logLikelihood);
  const llMin = Math.min(...llValues);
  const llMax = Math.max(...llValues);
  const llRange = llMax - llMin || 1;
  const llPts = llValues.map((ll, i) => {
    const x = 20 + (i / Math.max(llValues.length - 1, 1)) * 200;
    const y = 50 - ((ll - llMin) / llRange) * 40;
    return `${x},${y}`;
  }).join(' ');

  const llStepIdx = steps.slice(0, currentStep + 1).filter(s => s.phase !== 'E').length - 1;

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: 'white' }}>
      {/* Explanation */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: COLOR }}>§21.3 EM Algorithm — Mixture of Gaussians</h3>
        <p style={{ color: '#9CA3AF', lineHeight: 1.7, marginBottom: '12px' }}>
          When data has <strong style={{ color: '#E5E7EB' }}>hidden structure</strong> (which cluster each point came from), we can't compute MLE directly. The <strong style={{ color: COLOR }}>EM algorithm</strong> alternates between:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div style={{ background: '#6366F120', borderRadius: '8px', padding: '14px', border: '1px solid #6366F140' }}>
            <div style={{ fontWeight: 700, color: '#6366F1', marginBottom: '6px' }}>E-step (Expectation)</div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.6 }}>
              Fix parameters → compute <strong>soft assignments</strong>: how likely was each point generated by each component?
            </p>
            <MathBlock latex="p_{ij} = P(C=i \mid x_j) = \frac{w_i \mathcal{N}(x_j;\mu_i,\sigma_i)}{\sum_k w_k \mathcal{N}(x_j;\mu_k,\sigma_k)}" />
          </div>
          <div style={{ background: '#EF444420', borderRadius: '8px', padding: '14px', border: '1px solid #EF444440' }}>
            <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: '6px' }}>M-step (Maximization)</div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.6 }}>
              Fix assignments → update parameters to maximize expected log-likelihood:
            </p>
            <MathBlock latex="\mu_i \leftarrow \sum_j p_{ij} x_j / n_i, \quad w_i \leftarrow n_i / N" />
          </div>
        </div>
        <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6 }}>
          <strong style={{ color: COLOR }}>Key guarantee:</strong> log-likelihood is non-decreasing at every M-step. EM converges to a local maximum.
        </p>
      </div>

      {/* Controls */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {/* Scenario selector */}
          {(Object.keys(SCENARIOS) as Array<keyof typeof SCENARIOS>).map(k => (
            <button
              key={k}
              onClick={() => { setScenario(k); setCurrentStep(0); stop(); }}
              aria-pressed={scenario === k}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: `1px solid ${scenario === k ? COLOR : 'rgba(255,255,255,0.1)'}`,
                background: scenario === k ? COLOR + '20' : 'transparent',
                color: scenario === k ? COLOR : '#9CA3AF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {SCENARIOS[k].label}
            </button>
          ))}
          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Max iterations:
            <input
              type="range" min={3} max={30} step={1} value={maxIter}
              onChange={e => { setMaxIter(Number(e.target.value)); setCurrentStep(0); stop(); }}
              style={{ accentColor: COLOR, width: '80px' }}
              aria-label="Max EM iterations"
            />
            {maxIter}
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => { setCurrentStep(0); stop(); }} aria-label="Reset" style={btnStyle('#6B7280')}>↺ Reset</button>
          <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} aria-label="Step back" style={btnStyle(COLOR)}>◀ Back</button>
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
          <button onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))} disabled={currentStep >= steps.length - 1} aria-label="Step forward" style={btnStyle(COLOR)}>Next ▶</button>
          <label style={{ fontSize: '13px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Speed:
            <input type="range" min={200} max={2000} step={100} value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{ accentColor: COLOR }} />
            {speed}ms
          </label>
        </div>
        <div style={{ marginTop: '8px', fontSize: '13px', color: '#6B7280' }}>
          Step {currentStep} / {steps.length - 1} —{' '}
          <span style={{ color: step.phase === 'E' ? '#6366F1' : step.phase === 'M' ? '#EF4444' : COLOR, fontWeight: 700 }}>
            {step.phase === 'init' ? 'Initialization' : step.phase === 'E' ? 'E-step' : 'M-step'} (iter {step.iteration})
          </span>
          {' '}— {step.action}
        </div>
      </div>

      {/* Visualization */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Density + data points chart */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#E5E7EB' }}>
            Current Model + Data
          </h4>
          <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '10px' }}>
            Data points colored by most-probable component. Curves show component densities (scaled by weight).
          </p>
          <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: 'block' }} aria-label="Gaussian mixture model density chart">
            {/* Background */}
            <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="rgba(0,0,0,0.2)" rx={4} />

            {/* X-axis grid */}
            {[-2, 0, 2, 4, 6, 8, 10, 12].filter(v => v >= xMin && v <= xMax).map(v => (
              <g key={v}>
                <line x1={toX(v)} y1={pad.top} x2={toX(v)} y2={pad.top + plotH} stroke="rgba(255,255,255,0.05)" />
                <text x={toX(v)} y={chartH - 6} textAnchor="middle" fontSize={9} fill="#6B7280">{v}</text>
              </g>
            ))}

            {/* Mixture density */}
            <polyline points={mixturePath} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} strokeDasharray="3,2" />

            {/* Component curves */}
            {components.map((comp, i) => (
              <polyline
                key={i}
                points={componentPath(comp)}
                fill="none"
                stroke={COMPONENT_COLORS[i % COMPONENT_COLORS.length]}
                strokeWidth={2}
                opacity={0.85}
              />
            ))}

            {/* Data points */}
            {data.map((x, j) => (
              <circle
                key={j}
                cx={toX(x)}
                cy={pad.top + plotH + 8}
                r={3.5}
                fill={getDataPointColor(j)}
                opacity={0.85}
                aria-label={`Data point ${x}`}
              />
            ))}

            {/* Component means */}
            {components.map((comp, i) => (
              <g key={i}>
                <line
                  x1={toX(comp.mean)}
                  y1={pad.top}
                  x2={toX(comp.mean)}
                  y2={pad.top + plotH}
                  stroke={COMPONENT_COLORS[i % COMPONENT_COLORS.length]}
                  strokeWidth={1}
                  strokeDasharray="4,2"
                  opacity={0.6}
                />
                <text
                  x={toX(comp.mean)}
                  y={pad.top - 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill={COMPONENT_COLORS[i % COMPONENT_COLORS.length]}
                >
                  μ{i + 1}={comp.mean.toFixed(2)}
                </text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
            {components.map((comp, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COMPONENT_COLORS[i % COMPONENT_COLORS.length] }} />
                <span style={{ color: '#9CA3AF' }}>
                  C{i + 1}: μ={comp.mean.toFixed(2)}, σ={comp.stdDev.toFixed(2)}, w={comp.weight.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* State panel */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#E5E7EB' }}>State Inspection</h4>

          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>Phase:</div>
          <div style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: step.phase === 'init' ? COLOR + '20'
              : step.phase === 'E' ? '#6366F120' : '#EF444420',
            color: step.phase === 'init' ? COLOR
              : step.phase === 'E' ? '#6366F1' : '#EF4444',
            fontWeight: 700,
            fontSize: '14px',
            marginBottom: '12px',
          }}>
            {step.phase === 'init' ? '⚙ Initialization' : step.phase === 'E' ? '🔵 E-step — Compute Responsibilities' : '🔴 M-step — Update Parameters'}
          </div>

          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>Component Parameters:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            {components.map((comp, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  borderLeft: `3px solid ${COMPONENT_COLORS[i % COMPONENT_COLORS.length]}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#E5E7EB', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ color: COMPONENT_COLORS[i % COMPONENT_COLORS.length], fontWeight: 700 }}>C{i + 1}</span>
                  <span>μ = <strong>{comp.mean.toFixed(3)}</strong></span>
                  <span>σ = <strong>{comp.stdDev.toFixed(3)}</strong></span>
                  <span>w = <strong>{comp.weight.toFixed(3)}</strong></span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Log-Likelihood: <strong style={{ color: COLOR, fontFamily: 'monospace' }}>{step.logLikelihood.toFixed(3)}</strong>
          </div>

          {/* LL sparkline */}
          <svg width="100%" viewBox="0 0 240 60" style={{ display: 'block', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }} aria-label="Log-likelihood over iterations">
            {llValues.length > 1 && <polyline points={llPts} fill="none" stroke={COLOR + '60'} strokeWidth={1.5} />}
            {llValues.map((_, i) => {
              const x = 20 + (i / Math.max(llValues.length - 1, 1)) * 200;
              const y = 50 - ((_ - llMin) / llRange) * 40;
              return <circle key={i} cx={x} cy={y} r={i === llStepIdx ? 4 : 2} fill={i === llStepIdx ? COLOR : COLOR + '70'} />;
            })}
            <text x={10} y={14} fontSize={8} fill="#6B7280">LL↑</text>
            <text x={10} y={54} fontSize={8} fill="#6B7280">iter→</text>
          </svg>

          {/* E-step responsibilities preview */}
          {step.phase === 'E' && responsibilities && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
                Soft Assignments <InlineMath latex="p_{ij} = P(C{=}i \mid x_j)" /> (first 10 pts):
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: '11px', color: '#E5E7EB', borderCollapse: 'collapse', minWidth: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '3px 6px', color: '#6B7280', textAlign: 'left' }}>x</th>
                      {components.map((_, i) => (
                        <th key={i} style={{ padding: '3px 6px', color: COMPONENT_COLORS[i % COMPONENT_COLORS.length], textAlign: 'center' }}>C{i+1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {responsibilities.slice(0, 10).map((row, j) => (
                      <tr key={j} style={{ background: j % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td style={{ padding: '3px 6px', fontFamily: 'monospace', color: '#9CA3AF' }}>{data[j]}</td>
                        {row.map((p, i) => (
                          <td key={i} style={{ padding: '3px 6px', textAlign: 'center', color: p > 0.5 ? COMPONENT_COLORS[i % COMPONENT_COLORS.length] : '#6B7280', fontWeight: p > 0.5 ? 700 : 400 }}>
                            {p.toFixed(3)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Original example: candy mixture model */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#E5E7EB' }}>
          §21.3.2 Original Example: Mixed Candy Bags (Discrete EM)
        </h4>
        <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.7, marginBottom: '12px' }}>
          From the book (p. 793–794): Two bags of candy mixed together. Bag 1 is mostly cherry (θ_F1=0.8); Bag 2 mostly lime (θ_F2=0.3). We observe candies but <em>don't know which bag each came from</em> (the Bag variable is hidden).
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: '12px', color: '#E5E7EB', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '8px', color: '#9CA3AF', textAlign: 'left' }}>Parameter</th>
                <th style={{ padding: '8px', color: '#9CA3AF', textAlign: 'center' }}>True Value</th>
                <th style={{ padding: '8px', color: '#9CA3AF', textAlign: 'center' }}>Init (iter 0)</th>
                <th style={{ padding: '8px', color: '#9CA3AF', textAlign: 'center' }}>After 1 iter</th>
                <th style={{ padding: '8px', color: '#6B7280', textAlign: 'center', fontStyle: 'italic' }}>Converged</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'θ (P(Bag=1))', true: '0.500', init: '0.600', iter1: '0.6124', conv: '≈ 0.500' },
                { name: 'θ_F1 (P(cherry|Bag=1))', true: '0.800', init: '0.600', iter1: '0.6684', conv: '≈ 0.800' },
                { name: 'θ_W1 (P(red|Bag=1))', true: '0.800', init: '0.600', iter1: '0.6483', conv: '≈ 0.800' },
                { name: 'θ_H1 (P(hole|Bag=1))', true: '0.800', init: '0.600', iter1: '0.6558', conv: '≈ 0.800' },
                { name: 'θ_F2 (P(cherry|Bag=2))', true: '0.300', init: '0.400', iter1: '0.3887', conv: '≈ 0.300' },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px', color: '#E5E7EB', fontFamily: 'monospace', fontSize: '11px' }}>{row.name}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: COLOR, fontFamily: 'monospace' }}>{row.true}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#F59E0B', fontFamily: 'monospace' }}>{row.init}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#6366F1', fontFamily: 'monospace' }}>{row.iter1}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#6B7280', fontFamily: 'monospace', fontStyle: 'italic' }}>{row.conv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#6B7280' }}>
          Data: N=1000 candies. Log-likelihood after 1 iter: −2021 (from −2044). After 10 iters: −1982 (better than true model's −1990 on the sample!). This illustrates EM's convergence property from the book (Fig. 21.13b).
        </div>
      </div>
    </div>
  );
}

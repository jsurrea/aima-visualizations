import { useState, useCallback } from 'react';
import { renderDisplayMath, renderInlineMath } from '../utils/mathUtils';
import { betaLearningSteps, betaPDF, betaMean, type CandyObs } from '../algorithms';

const COLOR = '#10B981';

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

/** Renders a Beta(a, b) density curve in SVG. */
function BetaCurve({
  a,
  b,
  width = 320,
  height = 130,
  color = COLOR,
  showPrev = false,
  prevA,
  prevB,
}: {
  a: number;
  b: number;
  width?: number;
  height?: number;
  color?: string;
  showPrev?: boolean;
  prevA?: number;
  prevB?: number;
}) {
  const nPts = 120;
  const pad = { left: 28, right: 10, top: 15, bottom: 22 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  function densityPoints(pa: number, pb: number): string {
    // Compute unnormalized beta values and find max for scaling
    const raw = Array.from({ length: nPts }, (_, i) => {
      const theta = (i + 0.5) / nPts;
      return betaPDF(theta, pa, pb);
    });
    const maxVal = Math.max(...raw, 1e-10);
    return raw
      .map((v, i) => {
        const theta = (i + 0.5) / nPts;
        const px = pad.left + theta * plotW;
        const py = pad.top + plotH - (v / maxVal) * plotH;
        return `${px},${py}`;
      })
      .join(' ');
  }

  const mainPts = densityPoints(a, b);
  const prevPts = showPrev && prevA !== undefined && prevB !== undefined ? densityPoints(prevA, prevB) : null;
  const meanX = pad.left + betaMean(a, b) * plotW;

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', width: '100%' }}
      aria-label={`Beta(${a}, ${b}) density curve`}
    >
      {/* Background */}
      <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="rgba(0,0,0,0.2)" rx={4} />

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1.0].map(v => (
        <g key={v}>
          <line
            x1={pad.left + v * plotW}
            y1={pad.top}
            x2={pad.left + v * plotW}
            y2={pad.top + plotH}
            stroke="rgba(255,255,255,0.06)"
          />
          <text x={pad.left + v * plotW} y={height - 6} textAnchor="middle" fontSize={9} fill="#6B7280">
            {v}
          </text>
        </g>
      ))}

      {/* Previous curve (faded) */}
      {prevPts && (
        <polyline points={prevPts} fill="none" stroke={color + '30'} strokeWidth={1.5} strokeDasharray="4,2" />
      )}

      {/* Main curve */}
      <polyline points={mainPts} fill="none" stroke={color} strokeWidth={2} />

      {/* Mean line */}
      <line x1={meanX} y1={pad.top} x2={meanX} y2={pad.top + plotH} stroke={color} strokeWidth={1} strokeDasharray="3,2" opacity={0.7} />
      <text x={meanX} y={pad.top - 2} textAnchor="middle" fontSize={9} fill={color}>
        mean={betaMean(a, b).toFixed(3)}
      </text>

      {/* X-axis label */}
      <text x={pad.left + plotW / 2} y={height - 1} textAnchor="middle" fontSize={9} fill="#6B7280">
        θ (cherry fraction)
      </text>
    </svg>
  );
}

const DEFAULT_OBS_BETA: CandyObs[] = [
  'cherry', 'cherry', 'lime', 'cherry', 'lime',
  'cherry', 'cherry', 'cherry', 'lime', 'cherry',
];

export function BetaPriorVisualizer() {
  const [observations, setObservations] = useState<CandyObs[]>(DEFAULT_OBS_BETA);
  const [initA, setInitA] = useState(1);
  const [initB, setInitB] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = betaLearningSteps(observations, initA, initB);
  const step = steps[currentStep] ?? null;

  // Current a, b — either prior (before any obs) or posterior at currentStep
  const curA = currentStep === 0 ? initA : step?.a ?? initA;
  const curB = currentStep === 0 ? initB : step?.b ?? initB;

  // Previous a, b (one step back)
  const prevA = currentStep <= 1 ? initA : steps[currentStep - 2]?.a ?? initA;
  const prevB = currentStep <= 1 ? initB : steps[currentStep - 2]?.b ?? initB;

  function addObs(obs: CandyObs) {
    const next = [...observations, obs];
    setObservations(next);
    setCurrentStep(next.length);
  }

  function removeLastObs() {
    if (observations.length > 0) {
      const next = observations.slice(0, -1);
      setObservations(next);
      setCurrentStep(Math.min(currentStep, next.length));
    }
  }

  function reset() {
    setObservations(DEFAULT_OBS_BETA);
    setInitA(1);
    setInitB(1);
    setCurrentStep(0);
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: 'white' }}>
      {/* Explanation */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: COLOR }}>§21.2.5 Bayesian Parameter Learning — Beta Conjugate Prior</h3>
        <p style={{ color: '#9CA3AF', lineHeight: 1.7, marginBottom: '12px' }}>
          Instead of a point estimate, Bayesian learning maintains a full <strong style={{ color: '#E5E7EB' }}>distribution</strong> over the parameter θ. For a Bernoulli variable, the <strong style={{ color: COLOR }}>Beta distribution</strong> is the perfect conjugate prior: observing a cherry increments <em>a</em>; lime increments <em>b</em>.
        </p>
        <MathBlock latex="\text{Beta}(\theta;\, a, b) = \alpha\, \theta^{a-1}(1-\theta)^{b-1}, \quad \theta \in [0,1] \quad\text{(Eq. 21.6)}" />
        <p style={{ color: '#9CA3AF', lineHeight: 1.7 }}>
          The <strong style={{ color: '#E5E7EB' }}>mean</strong> of <InlineMath latex="\text{Beta}(a,b)" /> is <InlineMath latex="a/(a+b)" />. The hyperparameters <em>a, b</em> act as <strong style={{ color: COLOR }}>virtual counts</strong>: Beta(1,1) = uniform prior (no prior knowledge).
        </p>
      </div>

      {/* What-if: change prior */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#E5E7EB' }}>
          "What if?" — Change the Prior <InlineMath latex="\text{Beta}(a_0, b_0)" />
        </h4>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '12px' }}>
          Adjust the hyperparameters to represent your prior belief. A larger <em>a₀ + b₀</em> means stronger prior; the posterior will be less influenced by the same data.
        </p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#9CA3AF' }}>
            <span>a₀ (virtual cherry count): <strong style={{ color: COLOR }}>{initA}</strong></span>
            <input
              type="range" min={1} max={20} step={1} value={initA}
              onChange={e => { setInitA(Number(e.target.value)); setCurrentStep(0); }}
              style={{ accentColor: COLOR, width: '160px' }}
              aria-label="Initial alpha hyperparameter"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#9CA3AF' }}>
            <span>b₀ (virtual lime count): <strong style={{ color: '#EF4444' }}>{initB}</strong></span>
            <input
              type="range" min={1} max={20} step={1} value={initB}
              onChange={e => { setInitB(Number(e.target.value)); setCurrentStep(0); }}
              style={{ accentColor: '#EF4444', width: '160px' }}
              aria-label="Initial beta hyperparameter"
            />
          </label>
        </div>
        <div style={{ fontSize: '12px', color: '#6B7280' }}>
          Prior mean: <strong style={{ color: COLOR }}>{betaMean(initA, initB).toFixed(3)}</strong> —
          equivalent to having seen {initA - 1} cherry and {initB - 1} lime before any real data.
        </div>
      </div>

      {/* Observations */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#E5E7EB' }}>Observations (click to jump to step)</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {observations.map((obs, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i + 1)}
              aria-label={`Observation ${i + 1}: ${obs}`}
              aria-pressed={currentStep === i + 1}
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: currentStep === i + 1 ? (obs === 'cherry' ? '#10B981' : '#EF4444') + '30' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${obs === 'cherry' ? '#10B981' : '#EF4444'}${currentStep > i ? '' : '50'}`,
                color: obs === 'cherry' ? '#10B981' : '#EF4444',
                opacity: currentStep <= i ? 0.4 : 1,
              }}
            >
              {obs === 'cherry' ? '🍒' : '🟢'} {i + 1}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => { setCurrentStep(0); }} style={btnStyle('#6B7280')}>⟨ Prior</button>
          <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} style={btnStyle(COLOR)}>◀</button>
          <button onClick={() => setCurrentStep(s => Math.min(steps.length, s + 1))} disabled={currentStep >= steps.length} style={btnStyle(COLOR)}>▶</button>
          <button onClick={() => setCurrentStep(steps.length)} disabled={currentStep >= steps.length} style={btnStyle(COLOR)}>⟩ Posterior</button>
          <button onClick={() => addObs('cherry')} style={btnStyle('#10B981')}>+ Cherry</button>
          <button onClick={() => addObs('lime')} style={btnStyle('#EF4444')}>+ Lime</button>
          <button onClick={removeLastObs} disabled={observations.length === 0} style={btnStyle('#6B7280')}>− Last</button>
          <button onClick={reset} style={btnStyle('#6B7280')}>↺ Reset</button>
        </div>
      </div>

      {/* Main visualization */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Beta curve */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#E5E7EB' }}>
            Posterior <InlineMath latex="P(\Theta = \theta \mid d)" />
          </h4>
          <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
            {currentStep === 0
              ? `Prior: Beta(${initA}, ${initB})`
              : `After ${currentStep} observation${currentStep > 1 ? 's' : ''}: Beta(${curA}, ${curB})`}
          </p>
          <BetaCurve
            a={curA}
            b={curB}
            showPrev={currentStep > 0}
            prevA={prevA}
            prevB={prevB}
          />
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
            Dashed = previous step. Notice how the distribution narrows as N grows.
          </div>
        </div>

        {/* State panel */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#E5E7EB' }}>State Inspection</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <InfoRow label="Step (observations)" value={`${currentStep} / ${steps.length}`} />
            <InfoRow label={<>a (cherry count + prior)</>} value={String(curA)} color={COLOR} />
            <InfoRow label={<>b (lime count + prior)</>} value={String(curB)} color="#EF4444" />
            <InfoRow label={<>Posterior mean <InlineMath latex="a/(a+b)" /></>} value={betaMean(curA, curB).toFixed(4)} color={COLOR} />
            <InfoRow label="Total virtual count a+b" value={String(curA + curB)} />
            {currentStep > 0 && step && (
              <InfoRow label="Latest observation" value={step.observation} color={step.observation === 'cherry' ? '#10B981' : '#EF4444'} />
            )}
          </div>

          {/* Posterior mean history sparkline */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
              Posterior mean over time
            </div>
            <svg width="100%" viewBox="0 0 280 60" style={{ display: 'block' }} aria-label="Posterior mean evolution">
              <line x1={20} y1={10} x2={20} y2={50} stroke="rgba(255,255,255,0.1)" />
              <line x1={20} y1={50} x2={270} y2={50} stroke="rgba(255,255,255,0.1)" />
              {/* True value reference */}
              <line x1={20} y1={30} x2={270} y2={30} stroke={COLOR + '30'} strokeDasharray="3,2" />
              {/* Mean line */}
              {[{ a: initA, b: initB }, ...steps].map((s, i) => {
                const m = 'a' in s ? betaMean(s.a, s.b) : betaMean(initA, initB);
                const x = 20 + (i / Math.max(steps.length, 1)) * 240;
                const y = 50 - m * 40;
                return <circle key={i} cx={x} cy={y} r={i === currentStep ? 4 : 2} fill={i === currentStep ? COLOR : COLOR + '80'} />;
              })}
              {[{ a: initA, b: initB }, ...steps].length > 1 && (
                <polyline
                  points={[{ a: initA, b: initB }, ...steps].map((s, i) => {
                    const m = 'a' in s ? betaMean(s.a, s.b) : betaMean(initA, initB);
                    const x = 20 + (i / Math.max(steps.length, 1)) * 240;
                    const y = 50 - m * 40;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={COLOR + '60'}
                  strokeWidth={1.5}
                />
              )}
              <text x={15} y={14} textAnchor="end" fontSize={8} fill="#6B7280">1</text>
              <text x={15} y={50} textAnchor="end" fontSize={8} fill="#6B7280">0</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Comparison: uniform prior vs strong prior */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#E5E7EB' }}>
          Concept: Conjugate Prior — The Beta Family is Closed Under Update
        </h4>
        <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.7, marginBottom: '10px' }}>
          After seeing 1 cherry: <InlineMath latex="P(\theta \mid \text{cherry}) \propto \theta \cdot \text{Beta}(\theta; a, b) = \text{Beta}(\theta; a+1, b)" />.
          The posterior is still a Beta distribution — just with updated hyperparameters. This is the <strong style={{ color: COLOR }}>conjugate prior</strong> property.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {([
            { label: 'Uniform (no prior)', a: 1, b: 1 },
            { label: 'Slight cherry bias', a: 3, b: 2 },
            { label: 'Strong cherry belief', a: 10, b: 3 },
            { label: 'Converged (a=31, b=11)', a: 31, b: 11 },
          ] as const).map(preset => (
            <div key={preset.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>{preset.label}</div>
              <BetaCurve a={preset.a} b={preset.b} width={200} height={90} />
              <div style={{ fontSize: '11px', color: COLOR, marginTop: '4px' }}>
                Beta({preset.a}, {preset.b}) — mean={betaMean(preset.a, preset.b).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, color }: { label: React.ReactNode; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color: color ?? '#E5E7EB', fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

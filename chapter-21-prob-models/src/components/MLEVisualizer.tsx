import { useState, useCallback } from 'react';
import { renderDisplayMath, renderInlineMath } from '../utils/mathUtils';
import {
  mleDiscreteSteps,
  gaussianMLESteps,
  type CandyObs,
} from '../algorithms';

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

// ─── Discrete MLE sub-panel ───────────────────────────────────────────────────

const DEFAULT_OBS: CandyObs[] = ['cherry', 'lime', 'cherry', 'cherry', 'lime', 'cherry', 'lime', 'lime', 'cherry'];

function DiscreteMLEPanel() {
  const [observations, setObservations] = useState<CandyObs[]>(DEFAULT_OBS);
  const [currentStep, setCurrentStep] = useState(observations.length - 1);

  const steps = mleDiscreteSteps(observations);
  const step = steps[currentStep];

  function addObs(obs: CandyObs) {
    const next = [...observations, obs];
    setObservations(next);
    setCurrentStep(next.length - 1);
  }

  function reset() {
    setObservations(DEFAULT_OBS);
    setCurrentStep(DEFAULT_OBS.length - 1);
  }

  // Log-likelihood curve SVG
  const chartWidth = 320;
  const chartHeight = 100;
  const points = steps.map((s, i) => ({
    x: 20 + (i / Math.max(steps.length - 1, 1)) * (chartWidth - 40),
    y: chartHeight - 10 - ((s.theta) * (chartHeight - 20)),
    theta: s.theta,
    ll: s.logLikelihood,
  }));

  return (
    <div>
      <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#E5E7EB' }}>
        §21.2.1 Discrete MLE — Estimating{' '}
        <InlineMath latex="\theta = P(\text{cherry})" />
      </h4>
      <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '12px', lineHeight: 1.6 }}>
        The MLE estimate is simply the observed fraction:{' '}
        <InlineMath latex="\hat{\theta} = c / N" />. Log-likelihood:{' '}
        <InlineMath latex="\mathcal{L} = c \log\theta + \ell\log(1-\theta)" />.
      </p>

      {/* Observation sequence */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {observations.map((obs, i) => (
          <span
            key={i}
            onClick={() => setCurrentStep(i)}
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: i === currentStep
                ? (obs === 'cherry' ? '#10B981' : '#EF4444') + '30'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${obs === 'cherry' ? '#10B981' : '#EF4444'}${i === currentStep ? '' : '60'}`,
              color: obs === 'cherry' ? '#10B981' : '#EF4444',
            }}
            aria-label={`Obs ${i + 1}: ${obs}`}
          >
            {obs === 'cherry' ? '🍒' : '🟢'} {i + 1}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => addObs('cherry')} style={btnStyle('#10B981')}>+ Cherry</button>
        <button onClick={() => addObs('lime')} style={btnStyle('#EF4444')}>+ Lime</button>
        <button onClick={reset} style={btnStyle('#6B7280')}>↺ Reset</button>
      </div>

      {step && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* θ gauge */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
              MLE estimate <InlineMath latex="\hat{\theta}" />
            </div>
            <div style={{ height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative', marginBottom: '6px' }}>
              <div
                style={{ height: '100%', width: `${step.theta * 100}%`, background: COLOR, borderRadius: '4px', transition: 'width 0.3s' }}
              />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: COLOR, fontFamily: 'monospace' }}>
              {step.theta.toFixed(4)}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {step.cherryCount} cherry, {step.limeCount} lime (N={step.cherryCount + step.limeCount})
            </div>
          </div>
          {/* Log-likelihood */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
              Log-likelihood <InlineMath latex="\mathcal{L}" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: step.logLikelihood === 0 ? '#F59E0B' : COLOR, fontFamily: 'monospace' }}>
              {step.logLikelihood === 0 ? '0' : step.logLikelihood.toFixed(3)}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
              {step.logLikelihood === 0 ? 'Perfect fit (all same)' : 'Higher (less negative) = better fit'}
            </div>
          </div>
        </div>
      )}

      {/* θ vs N chart */}
      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
          MLE estimate θ̂ over time (click observation to highlight)
        </div>
        <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} style={{ display: 'block' }} aria-label="MLE theta over time">
          {/* Horizontal lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map(v => (
            <g key={v}>
              <line x1={20} y1={chartHeight - 10 - v * (chartHeight - 20)} x2={chartWidth - 10} y2={chartHeight - 10 - v * (chartHeight - 20)} stroke="rgba(255,255,255,0.06)" />
              <text x={15} y={chartHeight - 7 - v * (chartHeight - 20)} textAnchor="end" fontSize={9} fill="#6B7280">{v}</text>
            </g>
          ))}
          {/* θ=0.5 reference */}
          <line x1={20} y1={chartHeight - 10 - 0.5 * (chartHeight - 20)} x2={chartWidth - 10} y2={chartHeight - 10 - 0.5 * (chartHeight - 20)} stroke={COLOR + '40'} strokeDasharray="4,2" />
          {/* Path */}
          {points.length > 1 && (
            <polyline
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={COLOR + '80'}
              strokeWidth={1.5}
            />
          )}
          {/* Dots */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === currentStep ? 5 : 3}
              fill={i === currentStep ? COLOR : COLOR + '80'}
              stroke={i === currentStep ? 'white' : 'none'}
              strokeWidth={1.5}
              onClick={() => setCurrentStep(i)}
              style={{ cursor: 'pointer' }}
              aria-label={`Step ${i + 1}: θ=${p.theta.toFixed(3)}`}
            />
          ))}
          {/* X-axis label */}
          <text x={chartWidth / 2} y={chartHeight + 18} textAnchor="middle" fontSize={10} fill="#6B7280">N (observations)</text>
        </svg>
      </div>
    </div>
  );
}

// ─── Gaussian MLE sub-panel ───────────────────────────────────────────────────

const DEFAULT_GAUSSIAN_DATA = [2.1, 3.4, 2.8, 4.1, 3.7, 2.3, 3.9, 3.2, 2.6, 4.0];

function GaussianMLEPanel() {
  const [data, setData] = useState<number[]>(DEFAULT_GAUSSIAN_DATA);
  const [inputVal, setInputVal] = useState('');
  const [currentStep, setCurrentStep] = useState(DEFAULT_GAUSSIAN_DATA.length - 1);

  const steps = gaussianMLESteps(data);
  const step = steps[currentStep];

  function addPoint(val: number) {
    if (!isFinite(val)) return;
    const next = [...data, val];
    setData(next);
    setCurrentStep(next.length - 1);
  }

  function reset() {
    setData(DEFAULT_GAUSSIAN_DATA);
    setCurrentStep(DEFAULT_GAUSSIAN_DATA.length - 1);
  }

  // Draw Gaussian curve
  const canvasWidth = 340;
  const canvasHeight = 110;
  const xMin = step ? step.muMLE - 4 * Math.max(step.sigmaMLE, 0.5) : -2;
  const xMax = step ? step.muMLE + 4 * Math.max(step.sigmaMLE, 0.5) : 8;
  const xRange = xMax - xMin;
  const nCurvePoints = 80;
  const toPx = (x: number) => 20 + ((x - xMin) / xRange) * (canvasWidth - 40);
  const maxDensity = step && step.sigmaMLE > 0 ? 1 / (step.sigmaMLE * Math.sqrt(2 * Math.PI)) : 2;
  const toY = (density: number) => canvasHeight - 20 - (density / maxDensity) * (canvasHeight - 30);

  const curvePts = step && step.sigmaMLE > 0
    ? Array.from({ length: nCurvePoints }, (_, i) => {
        const x = xMin + (i / (nCurvePoints - 1)) * xRange;
        const z = (x - step.muMLE) / step.sigmaMLE;
        const density = Math.exp(-0.5 * z * z) / (step.sigmaMLE * Math.sqrt(2 * Math.PI));
        return `${toPx(x)},${toY(density)}`;
      }).join(' ')
    : null;

  return (
    <div>
      <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#E5E7EB' }}>
        §21.2.4 Gaussian MLE — Estimating <InlineMath latex="\mu, \sigma" />
      </h4>
      <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', lineHeight: 1.6 }}>
        For data from <InlineMath latex="\mathcal{N}(\mu, \sigma^2)" />, MLE gives sample mean and std dev (Eq. 21.4).
        Add data points to see how the fitted Gaussian changes.
      </p>
      <MathBlock latex="\hat{\mu} = \frac{\sum_j x_j}{N}, \quad \hat{\sigma} = \sqrt{\frac{\sum_j (x_j - \hat{\mu})^2}{N}}" />

      {/* Add data */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input
          type="number"
          step="0.1"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder="Enter value..."
          onKeyDown={e => { if (e.key === 'Enter') { addPoint(Number(inputVal)); setInputVal(''); } }}
          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', width: '120px' }}
          aria-label="Enter new data point"
        />
        <button
          onClick={() => { addPoint(Number(inputVal)); setInputVal(''); }}
          style={btnStyle(COLOR)}
          disabled={!inputVal}
        >
          + Add
        </button>
        <button onClick={reset} style={btnStyle('#6B7280')}>↺ Reset</button>
      </div>

      {/* Data points */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {data.map((v, i) => (
          <span
            key={i}
            onClick={() => setCurrentStep(i)}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              background: i === currentStep ? COLOR + '30' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${i === currentStep ? COLOR : 'transparent'}`,
              color: i === currentStep ? COLOR : '#9CA3AF',
            }}
          >
            {v}
          </span>
        ))}
      </div>

      {/* State panel */}
      {step && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          {[
            { label: 'N', value: String(step.data.length) },
            { label: 'μ̂ (MLE mean)', value: step.muMLE.toFixed(3) },
            { label: 'σ̂ (MLE std)', value: step.sigmaMLE.toFixed(3) },
          ].map(item => (
            <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: COLOR, fontFamily: 'monospace' }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Gaussian curve */}
      {step && (
        <svg
          width="100%"
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          style={{ display: 'block', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}
          aria-label="Gaussian density curve"
        >
          {/* Data ticks */}
          {data.slice(0, currentStep + 1).map((v, i) => {
            const px = toPx(v);
            return (
              <line
                key={i}
                x1={px}
                y1={canvasHeight - 18}
                x2={px}
                y2={canvasHeight - 8}
                stroke={i === currentStep ? '#F59E0B' : COLOR + '80'}
                strokeWidth={i === currentStep ? 2 : 1}
              />
            );
          })}
          {/* Curve */}
          {curvePts && (
            <polyline points={curvePts} fill="none" stroke={COLOR} strokeWidth={2} />
          )}
          {/* Mean line */}
          {step.sigmaMLE > 0 && (
            <line
              x1={toPx(step.muMLE)}
              y1={toY(maxDensity)}
              x2={toPx(step.muMLE)}
              y2={canvasHeight - 18}
              stroke={COLOR}
              strokeWidth={1}
              strokeDasharray="4,2"
            />
          )}
          {/* X-axis */}
          <line x1={20} y1={canvasHeight - 18} x2={canvasWidth - 10} y2={canvasHeight - 18} stroke="rgba(255,255,255,0.2)" />
          <text x={toPx(xMin)} y={canvasHeight - 5} fontSize={9} fill="#6B7280" textAnchor="start">{xMin.toFixed(1)}</text>
          <text x={toPx(xMax)} y={canvasHeight - 5} fontSize={9} fill="#6B7280" textAnchor="end">{xMax.toFixed(1)}</text>
          {step.sigmaMLE > 0 && <text x={toPx(step.muMLE)} y={canvasHeight - 5} fontSize={9} fill={COLOR} textAnchor="middle">μ̂={step.muMLE.toFixed(2)}</text>}
        </svg>
      )}
    </div>
  );
}

// ─── Main MLEVisualizer ───────────────────────────────────────────────────────

export function MLEVisualizer() {
  const [tab, setTab] = useState<'discrete' | 'gaussian'>('discrete');

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: 'white' }}>
      {/* Header */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: COLOR }}>§21.2 Maximum Likelihood Estimation</h3>
        <p style={{ color: '#9CA3AF', lineHeight: 1.7, marginBottom: '8px' }}>
          <strong style={{ color: '#E5E7EB' }}>MLE</strong> finds the parameter values that make the observed data most probable — it picks the hypothesis that assigns the highest probability to what we've actually seen.
        </p>
        <p style={{ color: '#9CA3AF', lineHeight: 1.7 }}>
          Key insight: with a <em>uniform prior</em>, MAP reduces to MLE. MLE is the default in statistics when there's no prior preference among hypotheses.
        </p>
        <MathBlock latex="h_{\text{ML}} = \arg\max_\theta \; P(d \mid h_\theta) = \arg\max_\theta \; \mathcal{L}(d \mid h_\theta)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['discrete', 'gaussian'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: `1px solid ${tab === t ? COLOR : 'rgba(255,255,255,0.1)'}`,
              background: tab === t ? COLOR + '20' : 'transparent',
              color: tab === t ? COLOR : '#9CA3AF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t === 'discrete' ? 'Discrete (Candy)' : 'Gaussian (Continuous)'}
          </button>
        ))}
      </div>

      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        {tab === 'discrete' ? <DiscreteMLEPanel /> : <GaussianMLEPanel />}
      </div>
    </div>
  );
}
